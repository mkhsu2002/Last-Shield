// Deterministic rules shared by the standalone and Reddit clients.
export const RULES_VERSION = 'daily-1';
export const RUN_DURATION_MS = 75_000;
export const WAVE_SLOT_MS = 3000;
export const WAVE_COUNT = RUN_DURATION_MS / WAVE_SLOT_MS;
export const PERFECT_WINDOW_MS = 120;
export type TimingGrade = 'perfect' | 'good' | 'early' | 'late';
export type MeteorSpec = {
  sector: number;
  durationMs: number;
  chargeStartMs: number;
  burnMs: number;
  kind: 'normal' | 'fast' | 'heavy';
};
export type Meteor = MeteorSpec & {
  mass: number;
  grade: TimingGrade | null;
  pressedGrade: TimingGrade;
  requireRelease: boolean;
  firing: boolean;
};
export type RunEvent =
  | { type: 'clear'; grade: TimingGrade; points: number; overdrive: boolean; sector: number }
  | { type: 'impact'; damage: number; sector: number }
  | { type: 'wave'; index: number }
  | { type: 'finish' };

export function utcDaySeed(date: Date): number {
  return date.getUTCFullYear() * 10000 + (date.getUTCMonth() + 1) * 100 + date.getUTCDate();
}

function hash(seed: number, index: number): number {
  let x = (seed ^ Math.imul(index + 1, 0x9e3779b1)) >>> 0;
  x ^= x >>> 16;
  x = Math.imul(x, 0x7feb352d);
  x ^= x >>> 15;
  x = Math.imul(x, 0x846ca68b);
  return (x ^ (x >>> 16)) >>> 0;
}

export function meteorSpec(daySeed: number, index: number): MeteorSpec {
  // Fixed slots ensure early clears never create extra scoring opportunities.
  const beat = index % 6;
  const kind = index < 3 ? 'normal' : beat === 3 ? 'fast' : beat === 5 ? 'heavy' : 'normal';
  const variance = (hash(daySeed, index) % 5) * 40;
  return {
    sector: hash(daySeed + 7919, index) % 6,
    kind,
    durationMs: kind === 'heavy' ? 2800 : kind === 'fast' ? 2200 : 2600,
    chargeStartMs: (kind === 'heavy' ? 1100 : kind === 'fast' ? 700 : 900) + variance,
    burnMs: kind === 'heavy' ? 900 : kind === 'fast' ? 500 : 680,
  };
}

export function judgeTiming(offsetMs: number): TimingGrade {
  if (offsetMs < -PERFECT_WINDOW_MS) return 'early';
  if (offsetMs <= PERFECT_WINDOW_MS) return 'perfect';
  return offsetMs <= 450 ? 'good' : 'late';
}

export type ChargeCue = { phase: 'wait' | 'countdown' | 'ready'; count: 0 | 1 | 2 | 3 };
export function chargeCue(elapsedMs: number, chargeStartMs: number): ChargeCue {
  if (elapsedMs >= chargeStartMs) return { phase: 'ready', count: 0 };
  const windowMs = Math.min(1500, chargeStartMs);
  const remaining = chargeStartMs - elapsedMs;
  if (remaining > windowMs) return { phase: 'wait', count: 0 };
  return { phase: 'countdown', count: Math.min(3, Math.ceil(remaining / (windowMs / 3))) as 1 | 2 | 3 };
}

export function debrisDamage(mass: number): number {
  return mass <= 0 ? 0 : Math.max(1, Math.ceil(26 * Math.pow(Math.min(100, mass) / 100, 1.2)));
}

export class DefenseRun {
  readonly daySeed: number;
  elapsedMs = 0;
  waveIndex = 0;
  meteor: Meteor | null;
  integrity = 100;
  sectors = [0, 0, 0, 0, 0, 0];
  score = 0;
  combo = 0;
  bestCombo = 0;
  cleared = 0;
  perfect = 0;
  early = 0;
  late = 0;
  energy = 0;
  firstMiss: number | null = null;
  finished = false;
  reason: 'complete' | 'destroyed' | null = null;
  private wasHolding = false;

  constructor(daySeed: number) {
    this.daySeed = daySeed;
    this.meteor = this.newMeteor(false);
  }

  get waveElapsedMs(): number { return this.elapsedMs - this.waveIndex * WAVE_SLOT_MS; }

  private newMeteor(holding: boolean): Meteor {
    return {
      ...meteorSpec(this.daySeed, this.waveIndex), mass: 100,
      grade: null, pressedGrade: 'early', requireRelease: holding, firing: false,
    };
  }

  // Input is sampled at the start of the step; internal 10ms slices prevent
  // skipped impacts/cues and preserve results across different render rates.
  step(deltaMs: number, holding: boolean): RunEvent[] {
    const events: RunEvent[] = [];
    if (this.finished || !Number.isFinite(deltaMs) || deltaMs < 0) return events;
    let remaining = Math.min(deltaMs, RUN_DURATION_MS - this.elapsedMs);
    const m = this.meteor;
    if (m) {
      if (!holding) { m.requireRelease = false; m.firing = false; }
      if (holding && !this.wasHolding && !m.requireRelease && m.grade === null) {
        m.pressedGrade = judgeTiming(this.waveElapsedMs - m.chargeStartMs);
      }
    }
    this.wasHolding = holding;
    while (remaining > 0 && !this.finished) {
      const dt = Math.min(10, remaining, WAVE_SLOT_MS - this.waveElapsedMs);
      const before = this.waveElapsedMs;
      this.elapsedMs += dt;
      remaining -= dt;
      const current = this.meteor;
      if (current) {
        const after = this.waveElapsedMs;
        const burnTime = Math.max(0, Math.min(after, current.durationMs) - Math.max(before, current.chargeStartMs));
        current.firing = holding && !current.requireRelease && burnTime > 0;
        if (current.firing) {
          current.grade ??= current.pressedGrade;
          current.mass = Math.max(0, current.mass - burnTime * 100 / current.burnMs);
        }
        if (current.mass <= .000001) this.clear(current, events);
        else if (after >= current.durationMs) this.impact(current, events);
      }
      if (this.integrity <= 0) this.finish('destroyed', events);
      else if (this.elapsedMs >= RUN_DURATION_MS) this.finish('complete', events);
      else if (this.waveElapsedMs >= WAVE_SLOT_MS) {
        this.waveIndex++;
        this.meteor = this.newMeteor(holding);
        events.push({ type: 'wave', index: this.waveIndex });
      }
    }
    return events;
  }

  private clear(m: Meteor, events: RunEvent[]): void {
    const grade = m.grade ?? 'early';
    const overdrive = this.energy === 3;
    if (overdrive) this.energy = 0;
    if (grade === 'perfect') { this.perfect++; this.energy = Math.min(3, this.energy + 1); }
    if (grade === 'early') this.early++;
    if (grade === 'late') this.late++;
    this.combo++;
    this.bestCombo = Math.max(this.bestCombo, this.combo);
    this.cleared++;
    const base = grade === 'perfect' ? 200 : grade === 'good' ? 100 : 70;
    const points = Math.round(base * (m.kind === 'heavy' ? 1.5 : 1)) + Math.min(100, (this.combo - 1) * 10) + (overdrive ? 200 : 0);
    this.score += points;
    this.meteor = null;
    events.push({ type: 'clear', grade, points, overdrive, sector: m.sector });
  }

  private impact(m: Meteor, events: RunEvent[]): void {
    const damage = debrisDamage(m.mass);
    this.integrity = Math.max(0, this.integrity - damage);
    this.sectors[m.sector] += damage;
    this.combo = 0;
    this.energy = Math.max(0, this.energy - 1);
    this.firstMiss ??= this.waveIndex + 1;
    this.meteor = null;
    events.push({ type: 'impact', damage, sector: m.sector });
  }

  private finish(reason: 'complete' | 'destroyed', events: RunEvent[]): void {
    this.finished = true;
    this.reason = reason;
    this.meteor = null;
    events.push({ type: 'finish' });
  }
}
