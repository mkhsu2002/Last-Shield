// Deterministic rules shared by the standalone and Reddit clients.
export const RULES_VERSION = 'survival-1';
export const SHIELD_RADIUS = 132;
export const METEOR_SPAWN_RADIUS = 218;
export const PERFECT_WINDOW_MS = 120;
export type TimingGrade = 'perfect' | 'good' | 'early' | 'late';
export type MeteorSpec = {
  sector: number;
  durationMs: number;
  chargeStartMs: number;
  burnMs: number;
  kind: 'normal' | 'fast' | 'heavy';
  recoveryMs: number;
};
export type Meteor = MeteorSpec & {
  mass: number;
  grade: TimingGrade | null;
  pressedGrade: TimingGrade;
  requireRelease: boolean;
  firing: boolean;
};
export type RunEvent =
  | { type: 'clear'; grade: TimingGrade; points: number; overdrive: boolean; sector: number; point: { x: number; y: number } }
  | { type: 'impact'; damage: number; sector: number; point: { x: number; y: number } }
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
  const pick = hash(daySeed + 31, index) % 7;
  const kind = index < 2 ? 'normal' : pick === 6 ? 'heavy' : pick >= 4 ? 'fast' : 'normal';
  const pressure = Math.min(80, index);
  const jitter = hash(daySeed, index) % 401 - 200;
  const durationMs = index < 2 ? 3000 : kind === 'heavy' ? Math.max(1800, 3450 - pressure * 18 + jitter) :
    kind === 'fast' ? Math.max(1050, 1950 - pressure * 14 + jitter / 2) : Math.max(1350, 3000 - pressure * 22 + jitter);
  return {
    sector: hash(daySeed + 7919, index) % 6, kind, durationMs,
    chargeStartMs: Math.round(durationMs * (.28 + (hash(daySeed + 97, index) % 11) / 100)),
    burnMs: kind === 'heavy' ? 900 : kind === 'fast' ? 380 : 620,
    recoveryMs: (kind === 'heavy' ? 460 : 180) + hash(daySeed + 157, index) % Math.max(150, 500 - pressure * 4),
  };
}

/** Drawing and damage use this exact geometry. Smaller residual cores travel
 * farther before contact instead of disappearing at an invisible deadline. */
export function meteorGeometry(spec: MeteorSpec, elapsedMs: number, mass: number) {
  const baseRadius = spec.kind === 'heavy' ? 25 : spec.kind === 'fast' ? 13 : 19;
  const radius = baseRadius * (.35 + .65 * Math.sqrt(Math.max(0, mass) / 100));
  const speed = (METEOR_SPAWN_RADIUS - SHIELD_RADIUS - baseRadius) / spec.durationMs;
  const distance = Math.max(0, METEOR_SPAWN_RADIUS - Math.max(0, elapsedMs) * speed);
  const angle = -Math.PI / 2 + (spec.sector + .5) * Math.PI / 3;
  return { x: Math.cos(angle) * distance, y: Math.sin(angle) * distance,
    distance, radius, angle, clearance: distance - radius - SHIELD_RADIUS };
}

export function judgeTiming(offsetMs: number): TimingGrade {
  if (offsetMs < -PERFECT_WINDOW_MS) return 'early';
  if (offsetMs <= PERFECT_WINDOW_MS) return 'perfect';
  return offsetMs <= 450 ? 'good' : 'late';
}

export function debrisDamage(mass: number): number {
  return mass <= 0 ? 0 : Math.max(1, Math.ceil(34 * Math.pow(Math.min(100, mass) / 100, 1.2)));
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
  reason: 'destroyed' | null = null;
  private waveStartedMs = 0;
  private nextWaveAt = Infinity;
  private wasHolding = false;

  constructor(daySeed: number) {
    this.daySeed = daySeed;
    this.meteor = this.newMeteor(false);
  }

  get waveElapsedMs(): number { return this.elapsedMs - this.waveStartedMs; }

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
    let remaining = deltaMs;
    const m = this.meteor;
    if (m) {
      if (!holding) { m.requireRelease = false; m.firing = false; }
      if (holding && !this.wasHolding && !m.requireRelease && m.grade === null) {
        m.pressedGrade = judgeTiming(this.waveElapsedMs - m.chargeStartMs);
      }
    }
    this.wasHolding = holding;
    while (remaining > 0 && !this.finished) {
      if (!this.meteor && this.elapsedMs >= this.nextWaveAt) {
        this.waveIndex++;
        this.waveStartedMs = this.elapsedMs;
        this.meteor = this.newMeteor(holding);
        events.push({ type: 'wave', index: this.waveIndex });
      }
      const dt = Math.min(10, remaining, this.meteor ? Infinity : this.nextWaveAt - this.elapsedMs);
      const before = this.waveElapsedMs;
      this.elapsedMs += dt;
      remaining -= dt;
      const current = this.meteor;
      if (current) {
        const after = this.waveElapsedMs;
        const burnTime = Math.max(0, after - Math.max(before, current.chargeStartMs));
        current.firing = holding && !current.requireRelease && burnTime > 0;
        if (current.firing) {
          current.grade ??= current.pressedGrade;
          current.mass = Math.max(0, current.mass - burnTime * 100 / current.burnMs);
        }
        if (current.mass <= .000001) this.clear(current, events);
        else if (meteorGeometry(current, after, current.mass).clearance <= 1e-9) this.impact(current, events);
      }
      if (this.integrity <= 0) this.finish(events);
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
    const point = meteorGeometry(m, this.waveElapsedMs, m.mass);
    this.meteor = null;
    this.nextWaveAt = this.elapsedMs + m.recoveryMs;
    events.push({ type: 'clear', grade, points, overdrive, sector: m.sector, point });
  }

  private impact(m: Meteor, events: RunEvent[]): void {
    const damage = debrisDamage(m.mass);
    this.integrity = Math.max(0, this.integrity - damage);
    this.sectors[m.sector] += damage;
    this.combo = 0;
    this.energy = Math.max(0, this.energy - 1);
    this.firstMiss ??= this.waveIndex + 1;
    const point = meteorGeometry(m, this.waveElapsedMs, m.mass);
    this.meteor = null;
    this.nextWaveAt = this.elapsedMs + Math.max(700, m.recoveryMs);
    events.push({ type: 'impact', damage, sector: m.sector, point });
  }

  private finish(events: RunEvent[]): void {
    this.finished = true;
    this.reason = 'destroyed';
    this.meteor = null;
    events.push({ type: 'finish' });
  }
}
