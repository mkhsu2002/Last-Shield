// Deterministic rules shared by the standalone and Reddit clients.
import { dailyStorm, type DailyStorm } from './daily-storm.ts';
export const RULES_VERSION = "survival-8";
/** Daily streak rewards use the combo after this clear; practice stays unscaled. */
export function comboMultiplier(combo: number, practice = false): number {
  if (practice) return 1;
  if (combo >= 100) return 50;
  if (combo >= 75) return 25;
  if (combo >= 50) return 10;
  if (combo >= 25) return 5;
  if (combo >= 10) return 2;
  return 1;
}
export const SHIELD_RADIUS = 132;
export const METEOR_SPAWN_RADIUS = 218;
export const PERFECT_WINDOW_MS = 180;
export const RETRY_INTERVAL_MS = 1000;
export const CHAIN_WINDOW_MS = 750;
export type TimingGrade = "perfect" | "good" | "early" | "late";
export type StormPhase = "approach" | "surge" | "breaker" | "respite" | "storm";
export type Mistakes = {
  unarmed: number;
  untouched: number;
  released: number;
  late: number;
};
export function stormPhase(index: number): StormPhase {
  if (index < 3) return "approach";
  switch (index % 6) {
    case 0:
      return "respite";
    case 2:
      return "breaker";
    case 4:
      return "surge";
    case 5:
      return "storm";
    default:
      return "approach";
  }
}

export function beamPower(grade: TimingGrade): number {
  return grade === "perfect"
    ? 3
    : grade === "early"
    ? 0.85
    : grade === "late"
    ? 1
    : 1.15;
}
export type MeteorSpec = {
  sector: number;
  durationMs: number;
  chargeStartMs: number;
  burnMs: number;
  kind: "normal" | "fast" | "heavy";
  recoveryMs: number;
};
export type Meteor = MeteorSpec & {
  arrestedMs?: number;
  mass: number;
  grade: TimingGrade | null;
  pressedGrade: TimingGrade;
  requireRelease: boolean;
  firing: boolean;
  overdrive: boolean;
  releasedEarly: boolean;
  id: number;
};
export type RunEvent =
  | {
      type: "clear";
      grade: TimingGrade;
      points: number;
      overdrive: boolean;
      sector: number;
      point: { x: number; y: number };
    }
  | {
      type: "impact";
      damage: number;
      brokenCombo: number;
      sector: number;
      point: { x: number; y: number };
    }
  | { type: "engage"; grade: TimingGrade; offsetMs: number; retained?: boolean }
  | { type: "overdrive"; cleared: number }
  | { type: "wave"; index: number }
  | { type: "finish" };

export function utcDaySeed(date: Date): number {
  return (
    date.getUTCFullYear() * 10000 +
    (date.getUTCMonth() + 1) * 100 +
    date.getUTCDate()
  );
}

function hash(seed: number, index: number): number {
  let x = (seed ^ Math.imul(index + 1, 0x9e3779b1)) >>> 0;
  x ^= x >>> 16;
  x = Math.imul(x, 0x7feb352d);
  x ^= x >>> 15;
  x = Math.imul(x, 0x846ca68b);
  return (x ^ (x >>> 16)) >>> 0;
}

export function difficultyScale(index: number): number {
  return index < 3 ? 1 : 1 / (1 + Math.log1p(index / 20) * 0.15);
}

export function meteorSpec(daySeed: number, index: number): MeteorSpec {
  const phase = stormPhase(index),
    pick = hash(daySeed + 31, index) % 7;
  const kind =
    index < 3 || phase === "respite"
      ? "normal"
      : phase === "breaker"
      ? "heavy"
      : pick >= 5
      ? "fast"
      : "normal";
  const scale = difficultyScale(index),
    jitter = (hash(daySeed, index) % 181) - 90;
  const flight =
    index < 3
      ? 3000
      : phase === "storm"
      ? 1640 + jitter / 2
      : kind === "heavy"
      ? Math.max(1750, 2900 - index * 15 + jitter)
      : kind === "fast"
      ? Math.max(1350, 2150 - index * 12 + jitter)
      : Math.max(1500, 2700 - index * 18 + jitter);
  const durationMs = Math.round(
    flight * scale * (1 + 0.25 * Math.max(0, 1 - index / 24)) +
      (phase === "respite" ? 350 : 0) +
      (phase === "storm" ? 1200 * Math.max(0, 1 - index / 24) : 0)
  );
  return {
    sector: hash(daySeed + 7919, index) % 6,
    kind,
    durationMs,
    chargeStartMs: Math.round(durationMs * (phase === "storm" ? 0.43 : 0.29)),
    burnMs:
      kind === "heavy"
        ? 1050
        : kind === "fast"
        ? 650
        : phase === "storm"
        ? 1100
        : 900,
    recoveryMs: phase === "respite" ? 900 : phase === "storm" ? 1000 : 350,
  };
}

export function volleySpecs(daySeed: number, index: number, daily = true): MeteorSpec[] {
  const phase = stormPhase(index),
    level = Math.floor(index / 12);
  const count =
    index < 3
      ? 1
      : phase === "respite"
      ? 1
      : phase === "storm"
      ? Math.min(6, index < 11 ? 3 : 4 + Math.floor(index / 18))
      : Math.min(5, (phase === "surge" && index >= 5 ? 3 : 2) + Math.floor(level / 2));
  const first = meteorSpec(daySeed, index),
    result = [first];
  // Sky sectors are distinct; neither arrival nor readiness waits for a previous clear.
  for (let i = 1; i < count; i++) {
    const kind =
      phase === "storm"
        ? i === count - 1
          ? "heavy"
          : "normal"
        : phase === "breaker"
        ? "fast"
        : hash(daySeed + i * 53, index) % 4 === 0
        ? "fast"
        : "normal";
    const durationMs = Math.round(
      first.durationMs + ((hash(daySeed + i * 19, index) % 111) - 55) + i * 25
    );
    const spread =
      phase === "storm" ? i * 28 : phase === "surge" ? i * 70 : i * 230;
    const burnMs =
      kind === "heavy"
        ? 1050
        : kind === "fast"
        ? 650
        : phase === "storm"
        ? 1100
        : 900;
    result.push({
      ...first,
      kind,
      burnMs,
      sector: (first.sector + i * 5) % 6,
      durationMs,
      chargeStartMs: Math.min(
        Math.round(first.chargeStartMs + spread),
        Math.floor(durationMs - burnMs / 3 - 160)
      ),
    });
  }
  if (!daily || index < 3) return result;
  const profile = dailyStorm(daySeed);
  return result.map((spec,i) => {
    let next = { ...spec };
    if (profile.id === 'heavy' && phase !== 'respite' && i === 0) {
      next.kind = 'heavy'; next.burnMs = 1050;
    }
    if (profile.id === 'relay' && next.kind === 'heavy') next.burnMs = Math.round(next.burnMs * 1.15);
    if (profile.id === 'crosswind' && next.kind === 'fast') {
      next.durationMs = Math.round(next.durationMs * 0.92);
      next.chargeStartMs = Math.round(next.chargeStartMs * 0.92);
      next.burnMs = Math.round(next.burnMs * 0.90);
    }
    next.chargeStartMs = Math.min(next.chargeStartMs, Math.floor(next.durationMs - next.burnMs / 3 - 160));
    return next;
  });
}

/** Drawing and damage use this exact geometry. Smaller residual cores travel
 * farther before contact instead of disappearing at an invisible deadline. */
export function meteorGeometry(
  spec: MeteorSpec & { arrestedMs?: number },
  elapsedMs: number,
  mass: number
) {
  const baseRadius =
    spec.kind === "heavy" ? 25 : spec.kind === "fast" ? 13 : 19;
  const radius =
    baseRadius * (0.35 + 0.65 * Math.sqrt(Math.max(0, mass) / 100));
  const speed =
    (METEOR_SPAWN_RADIUS - SHIELD_RADIUS - baseRadius) / spec.durationMs;
  const distance = Math.max(
    0,
    METEOR_SPAWN_RADIUS - Math.max(0, elapsedMs - (spec.arrestedMs ?? 0)) * speed
  );
  const angle = -Math.PI + ((spec.sector + 0.5) * Math.PI) / 6;
  return {
    x: Math.cos(angle) * distance,
    y: Math.sin(angle) * distance,
    distance,
    radius,
    angle,
    clearance: distance - radius - SHIELD_RADIUS,
  };
}

export function contactInMs(
  spec: MeteorSpec & { arrestedMs?: number },
  elapsedMs: number,
  mass = 100
): number {
  const speed = meteorGeometry(spec, 0, 100).clearance / spec.durationMs;
  return Math.max(0, meteorGeometry(spec, elapsedMs, mass).clearance / speed);
}

/** Nearest recurring gold window, shared by input, HUD and target rings. */
export function timingOffset(spec: MeteorSpec, elapsedMs: number): number {
  const sinceFirst = elapsedMs - spec.chargeStartMs;
  const cycle = Math.max(0, Math.round(sinceFirst / RETRY_INTERVAL_MS));
  return sinceFirst - cycle * RETRY_INTERVAL_MS;
}

export function judgeTiming(offsetMs: number): TimingGrade {
  if (offsetMs < -PERFECT_WINDOW_MS) return "early";
  if (offsetMs <= PERFECT_WINDOW_MS) return "perfect";
  return offsetMs <= 400 ? "good" : "late";
}

export function debrisDamage(mass: number): number {
  return mass <= 0
    ? 0
    : Math.max(1, Math.ceil(34 * Math.pow(Math.min(100, mass) / 100, 1.2)));
}

export type PracticeLesson = 'timing' | 'relay' | 'overdrive';

export class DefenseRun {
  readonly daySeed: number;
  readonly storm: DailyStorm;
  readonly practice: boolean;
  readonly practiceLesson: PracticeLesson | null;
  elapsedMs = 0;
  waveIndex = 0;
  meteors: Meteor[];
  integrity = 100;
  sectors = [0, 0, 0, 0, 0, 0];
  score = 0;
  combo = 0;
  bestCombo = 0;
  longestBrokenCombo = 0;
  brokenComboWave = 0;
  cleared = 0;
  perfect = 0;
  early = 0;
  late = 0;
  energy = 0;
  overdriveUses = 0;
  overdriveCleared = 0;
  firstMiss: number | null = null;
  mistakes: Mistakes = { unarmed: 0, untouched: 0, released: 0, late: 0 };
  finished = false;
  reason: "destroyed" | null = null;
  private waveStartedMs = 0;
  private nextWaveAt = Infinity;
  private wasHolding = false;
  private chainEndsAt = -Infinity;
  private selectedId: number | null = null;
  private needsRelease = false;
  private recoveryMs = 0;

  constructor(daySeed: number, options: {practice?: boolean; lesson?: PracticeLesson} = {}) {
    this.daySeed = daySeed;
    this.storm = dailyStorm(daySeed);
    this.practice = options.practice === true;
    this.practiceLesson = this.practice ? options.lesson ?? 'timing' : null;
    this.energy = this.practiceLesson === 'overdrive' ? 3 : 0;
    this.meteors = this.newVolley(false);
  }

  get waveElapsedMs(): number {
    return this.elapsedMs - this.waveStartedMs;
  }

  get chainRemainingMs(): number {
    return this.meteors.length ? Math.max(0, this.chainEndsAt - this.elapsedMs) : 0;
  }

  timingOffset(m: MeteorSpec): number {
    return this.chainRemainingMs > 0 ? 0 : timingOffset(m, this.waveElapsedMs);
  }

  /** A held beam never jumps targets. Otherwise prioritize actual time to contact. */
  get meteor(): Meteor | null {
    const locked = this.meteors.find((m) => m.id === this.selectedId);
    if (locked) return locked;
    let target: Meteor | null = null;
    let closest = Infinity;
    for (const m of this.meteors) {
      const speed = meteorGeometry(m, 0, 100).clearance / m.durationMs;
      const eta =
        meteorGeometry(m, this.waveElapsedMs, m.mass).clearance / speed;
      if (eta < closest) {
        closest = eta;
        target = m;
      }
    }
    return target;
  }

  private newVolley(holding: boolean): Meteor[] {
    this.chainEndsAt = -Infinity;
    let specs = volleySpecs(this.daySeed, this.waveIndex, !this.practice);
    if (this.waveIndex === 0 && (this.practiceLesson === 'relay' || this.practiceLesson === 'overdrive')) {
      const first = specs[0]!;
      const count = this.practiceLesson === 'relay' ? 2 : 3;
      specs = Array.from({ length: count }, (_, index) => ({ ...first,
        sector: (first.sector + index * 2) % 6,
        durationMs: first.durationMs + (this.practiceLesson === 'relay' ? index * 450 : 0),
      }));
    }
    this.recoveryMs = Math.round(
      Math.max(...specs.map((m) => m.recoveryMs)) *
        difficultyScale(this.waveIndex)
    );
    this.needsRelease = holding;
    this.selectedId = null;
    return specs.map((spec, i) => ({
      ...spec,
      id: this.waveIndex * 6 + i,
      mass: 100,
      grade: null,
      pressedGrade: "early",
      requireRelease: holding,
      firing: false,
      overdrive: false,
      releasedEarly: false,
    }));
  }

  // Input is sampled at the step boundary; independent 10ms slices resolve each core.
  step(deltaMs: number, holding: boolean, targetId?: number): RunEvent[] {
    const events: RunEvent[] = [];
    if (this.finished || !Number.isFinite(deltaMs) || deltaMs < 0)
      return events;
    if (!holding) {
      this.needsRelease = false;
      for (const m of this.meteors) {
        if (m.firing && m.mass > 0) m.releasedEarly = true;
        m.firing = false;
        m.requireRelease = false;
      }
      // Keep the live target so a corrective re-press resumes the same core.
    } else if (!this.wasHolding && !this.needsRelease) {
      const target = this.meteors.find((m) => m.id === targetId) ?? this.meteor;
      if (target) {
        this.selectedId = target.id;
        const offsetMs = this.timingOffset(target);
        const candidate = judgeTiming(offsetMs);
        const retained =
          target.grade !== null && beamPower(target.grade) >= beamPower(candidate);
        target.pressedGrade = retained ? target.grade! : candidate;
        if (target.grade !== null) target.grade = target.pressedGrade;
        events.push({
          type: "engage",
          grade: target.pressedGrade,
          offsetMs,
          ...(retained ? { retained: true } : {}),
        });
      } else this.needsRelease = true;
    }
    this.wasHolding = holding;
    let remaining = deltaMs;
    while (remaining > 1e-7 && !this.finished) {
      if (!this.meteors.length && this.elapsedMs + 1e-7 >= this.nextWaveAt) {
        this.waveIndex++;
        this.waveStartedMs = this.elapsedMs;
        this.meteors = this.newVolley(holding);
        events.push({ type: "wave", index: this.waveIndex });
      }
      let dt = Math.min(
        10,
        remaining,
        this.meteors.length ? Infinity : this.nextWaveAt - this.elapsedMs
      );
      const beam = this.meteors.find((m) => m.id === this.selectedId);
      if (beam && holding && !this.needsRelease) {
        const untilReady = beam.chargeStartMs - this.waveElapsedMs;
        if (untilReady > 1e-7) dt = Math.min(dt, untilReady);
        else {
          const grade = beam.grade ?? beam.pressedGrade;
          // Resolve the exact clear boundary across different screen frame rates.
          dt = Math.min(
            dt,
            (beam.mass * beam.burnMs) / (100 * beamPower(grade))
          );
        }
      }
      const before = this.waveElapsedMs;
      this.elapsedMs += dt;
      remaining -= dt;
      const owner = this.meteors.find((m) => m.id === this.selectedId);
      const burnTime =
        owner && holding && !this.needsRelease
          ? Math.max(
              0,
              this.waveElapsedMs - Math.max(before, owner.chargeStartMs)
            )
          : 0;
      if (owner && burnTime > 0 && owner.grade === null) {
        owner.grade = owner.pressedGrade;
        owner.overdrive = false;
      }
      for (const m of [...this.meteors]) {
        const direct = m === owner;
        m.firing = burnTime > 0 && direct;
        if (m.firing) {
          if (m.grade === "perfect") m.arrestedMs = (m.arrestedMs ?? 0) + burnTime;
          const boost = beamPower(m.grade ?? m.pressedGrade);
          m.mass = Math.max(0, m.mass - (burnTime * 100 * boost) / m.burnMs);
        }
        if (m.mass <= 0.000001) this.clear(m, holding, events);
        else if (
          meteorGeometry(m, this.waveElapsedMs, m.mass).clearance <= 1e-9
        )
          this.impact(m, holding, events);
        if (this.integrity <= 0) {
          this.finish(events);
          break;
        }
      }
    }
    return events;
  }

  activateOverdrive(holding: boolean): RunEvent[] {
    if (this.finished || this.energy !== 3 || this.meteors.length === 0)
      return [];
    this.energy = 0;
    this.overdriveUses++;
    const events: RunEvent[] = [];
    const count = this.meteors.length;
    for (const m of [...this.meteors]) {
      m.grade = "good";
      m.overdrive = true;
      m.mass = 0;
      this.clear(m, holding, events);
    }
    this.overdriveCleared += count;
    events.push({ type: "overdrive", cleared: count });
    return events;
  }

  private remove(m: Meteor, holding: boolean): void {
    this.meteors = this.meteors.filter((other) => other !== m);
    if (this.selectedId === m.id) {
      this.selectedId = null;
      this.needsRelease = holding;
      for (const other of this.meteors) {
        other.requireRelease = holding;
        other.firing = false;
      }
    }
    if (!this.meteors.length)
      this.nextWaveAt = this.elapsedMs + this.recoveryMs;
  }

  private clear(m: Meteor, holding: boolean, events: RunEvent[]): void {
    const grade = m.grade ?? "early";
    const overdrive = m.overdrive;
    if (grade === "perfect") {
      this.perfect++;
      this.energy = Math.min(3, this.energy + 1);
    }
    if (grade === "early") this.early++;
    if (grade === "late") this.late++;
    this.combo++;
    this.bestCombo = Math.max(this.bestCombo, this.combo);
    this.cleared++;
    const base = grade === "perfect" ? 200 : grade === "good" ? 100 : 70;
    const points = (
      Math.round(base * (m.kind === "heavy" ? (!this.practice && this.waveIndex >= 3 ? this.storm.heavyScoreMultiplier : 1.5) : 1)) +
      Math.min(100, (this.combo - 1) * 10) +
      (overdrive ? 200 : 0)
    ) * comboMultiplier(this.combo, this.practice);
    this.score += points;
    const point = meteorGeometry(m, this.waveElapsedMs, m.mass);
    this.remove(m, holding);
    if (grade === "perfect" && this.meteors.length)
      this.chainEndsAt = this.elapsedMs + (this.practice ? CHAIN_WINDOW_MS : this.storm.relayMs);
    events.push({
      type: "clear",
      grade,
      points,
      overdrive,
      sector: m.sector,
      point,
    });
  }

  private impact(m: Meteor, holding: boolean, events: RunEvent[]): void {
    const damage = debrisDamage(m.mass);
    this.integrity = Math.max(0, this.integrity - damage);
    this.sectors[m.sector] += damage;
    const brokenCombo = this.combo;
    if(this.combo>this.longestBrokenCombo){this.longestBrokenCombo=this.combo;this.brokenComboWave=this.waveIndex+1;}
    this.combo = 0;
    // Earned energy is banked until the player explicitly spends it.
    this.firstMiss ??= this.waveIndex + 1;
    const cause = m.requireRelease
      ? "unarmed"
      : m.grade === null
      ? "untouched"
      : m.releasedEarly && !m.firing
      ? "released"
      : "late";
    this.mistakes[cause]++;
    const point = meteorGeometry(m, this.waveElapsedMs, m.mass);
    this.recoveryMs = Math.max(700, this.recoveryMs);
    this.remove(m, holding);
    events.push({ type: "impact", damage, brokenCombo, sector: m.sector, point });
  }

  private finish(events: RunEvent[]): void {
    this.finished = true;
    this.reason = "destroyed";
    this.meteors = [];
    this.selectedId = null;
    events.push({ type: "finish" });
  }
}
