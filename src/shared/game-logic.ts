// Deterministic rules shared by the standalone and Reddit clients.
export const RULES_VERSION = "survival-3";
export const SHIELD_RADIUS = 132;
export const METEOR_SPAWN_RADIUS = 218;
export const PERFECT_WINDOW_MS = 120;
export type TimingGrade = "perfect" | "good" | "early" | "late";
export type StormPhase = "approach" | "surge" | "breaker" | "respite";
export type Mistakes = {
  unarmed: number;
  untouched: number;
  released: number;
  late: number;
};
export function stormPhase(index: number): StormPhase {
  const position = index % 10;
  return position < 4
    ? "approach"
    : position < 8
    ? "surge"
    : position === 8
    ? "breaker"
    : "respite";
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
  mass: number;
  grade: TimingGrade | null;
  pressedGrade: TimingGrade;
  requireRelease: boolean;
  firing: boolean;
  overdrive: boolean;
  releasedEarly: boolean;
  id: number;
  boosted: boolean;
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
      sector: number;
      point: { x: number; y: number };
    }
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

export function meteorSpec(daySeed: number, index: number): MeteorSpec {
  const pick = hash(daySeed + 31, index) % 7;
  const phase = stormPhase(index);
  const kind =
    index < 2 || phase === "respite"
      ? "normal"
      : phase === "breaker"
      ? "heavy"
      : phase === "surge"
      ? index % 2 === 0
        ? "fast"
        : pick === 6
        ? "heavy"
        : "normal"
      : pick === 6
      ? "heavy"
      : pick >= 4
      ? "fast"
      : "normal";
  const pressure = Math.min(80, index);
  const jitter = (hash(daySeed, index) % 401) - 200;
  const flightMs =
    index < 2
      ? 3000
      : kind === "heavy"
      ? Math.max(1800, 3450 - pressure * 18 + jitter)
      : kind === "fast"
      ? Math.max(1050, 1950 - pressure * 14 + jitter / 2)
      : Math.max(1350, 3000 - pressure * 22 + jitter);
  const scale = difficultyScale(index);
  const durationMs =
    Math.round(scale * flightMs * (phase === "surge" ? 0.9 : 1)) +
    Math.round(
      scale * (phase === "breaker" ? 400 : phase === "respite" ? 650 : 0)
    );
  return {
    sector: hash(daySeed + 7919, index) % 6,
    kind,
    durationMs,
    chargeStartMs: Math.round(
      durationMs * (0.28 + (hash(daySeed + 97, index) % 11) / 100)
    ),
    burnMs: Math.round(
      scale *
        (phase === "breaker"
          ? 1200
          : kind === "heavy"
          ? 900
          : kind === "fast"
          ? 380
          : 620)
    ),
    recoveryMs:
      phase === "respite"
        ? 1200
        : phase === "surge"
        ? 120 + (hash(daySeed + 157, index) % 180)
        : (kind === "heavy" ? 460 : 180) +
          (hash(daySeed + 157, index) % Math.max(150, 500 - pressure * 4)),
  };
}

export function difficultyScale(index: number): number {
  return index < 2 ? 1 : 1 / (1 + Math.log1p(index / 60) * 0.2);
}

export function volleySpecs(daySeed: number, index: number): MeteorSpec[] {
  const phase = stormPhase(index);
  const count =
    index < 4
      ? 1
      : index < 10
      ? phase === "surge" || phase === "breaker"
        ? 2
        : 1
      : index < 30
      ? phase === "respite"
        ? 1
        : 2
      : index < 50
      ? phase === "surge"
        ? 3
        : phase === "respite"
        ? 1
        : 2
      : phase === "respite"
      ? 2
      : 3;
  const first = meteorSpec(daySeed, index);
  const result = [first];
  const scale = difficultyScale(index);
  for (let i = 1; i < count; i++) {
    const previous = result[i - 1]!;
    const kind = hash(daySeed + i * 53, index) % 3 === 0 ? "fast" : "normal";
    const burnMs = Math.round((kind === "fast" ? 380 : 620) * scale);
    const chargeStartMs = Math.ceil(
      previous.chargeStartMs + previous.burnMs / 1.25 + 180 * scale
    );
    result.push({
      ...first,
      kind,
      burnMs,
      sector: (first.sector + i * 2) % 6,
      chargeStartMs,
      durationMs: Math.ceil(
        Math.max(
          previous.durationMs + 220 * scale,
          chargeStartMs + burnMs + 400 * scale
        )
      ),
    });
  }
  return result;
}

/** Drawing and damage use this exact geometry. Smaller residual cores travel
 * farther before contact instead of disappearing at an invisible deadline. */
export function meteorGeometry(
  spec: MeteorSpec,
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
    METEOR_SPAWN_RADIUS - Math.max(0, elapsedMs) * speed
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

export function judgeTiming(offsetMs: number): TimingGrade {
  if (offsetMs < -PERFECT_WINDOW_MS) return "early";
  if (offsetMs <= PERFECT_WINDOW_MS) return "perfect";
  return offsetMs <= 450 ? "good" : "late";
}

export function debrisDamage(mass: number): number {
  return mass <= 0
    ? 0
    : Math.max(1, Math.ceil(34 * Math.pow(Math.min(100, mass) / 100, 1.2)));
}

export class DefenseRun {
  readonly daySeed: number;
  elapsedMs = 0;
  waveIndex = 0;
  meteors: Meteor[];
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
  mistakes: Mistakes = { unarmed: 0, untouched: 0, released: 0, late: 0 };
  finished = false;
  reason: "destroyed" | null = null;
  private waveStartedMs = 0;
  private nextWaveAt = Infinity;
  private wasHolding = false;
  private selectedId: number | null = null;
  private needsRelease = false;
  private recoveryMs = 0;

  constructor(daySeed: number) {
    this.daySeed = daySeed;
    this.meteors = this.newVolley(false);
  }

  get waveElapsedMs(): number {
    return this.elapsedMs - this.waveStartedMs;
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
    const specs = volleySpecs(this.daySeed, this.waveIndex);
    this.recoveryMs = Math.round(
      Math.max(...specs.map((m) => m.recoveryMs)) *
        difficultyScale(this.waveIndex)
    );
    this.needsRelease = holding;
    this.selectedId = null;
    return specs.map((spec, i) => ({
      ...spec,
      id: this.waveIndex * 3 + i,
      mass: 100,
      grade: null,
      pressedGrade: "early",
      requireRelease: holding,
      firing: false,
      overdrive: false,
      boosted: false,
      releasedEarly: false,
    }));
  }

  // Input is sampled at the step boundary; independent 10ms slices resolve each core.
  step(deltaMs: number, holding: boolean): RunEvent[] {
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
      this.selectedId = null;
    } else if (!this.wasHolding && !this.needsRelease) {
      const target = this.meteor;
      if (target) {
        this.selectedId = target.id;
        if (target.grade === null)
          target.pressedGrade = judgeTiming(
            this.waveElapsedMs - target.chargeStartMs
          );
      } else this.needsRelease = true;
    }
    this.wasHolding = holding;
    let remaining = deltaMs;
    while (remaining > 0 && !this.finished) {
      if (!this.meteors.length && this.elapsedMs >= this.nextWaveAt) {
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
        if (untilReady > 0) dt = Math.min(dt, untilReady);
        else {
          const fan = beam.grade === null ? this.energy === 3 : beam.overdrive;
          for (const m of this.meteors) {
            if (m !== beam && !fan) continue;
            const grade = m.grade ?? (m === beam ? m.pressedGrade : "good");
            const boost = (grade === "perfect" ? 1.25 : 1) * (fan ? 2 : 1);
            // End a shot exactly at its clear boundary, so fan residue does not
            // depend on whether a screen delivered a 10ms or 16ms frame.
            dt = Math.min(dt, (m.mass * m.burnMs) / (100 * boost));
          }
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
        owner.overdrive = this.energy === 3;
        if (owner.overdrive) this.energy = 0;
      }
      for (const m of [...this.meteors]) {
        const direct = m === owner;
        m.firing = burnTime > 0 && (direct || !!owner?.overdrive);
        if (m.firing) {
          if (!direct) {
            m.grade ??= "good";
            m.boosted = true;
          }
          const boost =
            (m.grade === "perfect" ? 1.25 : 1) * (owner?.overdrive ? 2 : 1);
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
    const overdrive = m.overdrive || m.boosted;
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
    const points =
      Math.round(base * (m.kind === "heavy" ? 1.5 : 1)) +
      Math.min(100, (this.combo - 1) * 10) +
      (overdrive ? 200 : 0);
    this.score += points;
    const point = meteorGeometry(m, this.waveElapsedMs, m.mass);
    this.remove(m, holding);
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
    this.combo = 0;
    this.energy = Math.max(0, this.energy - 1);
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
    events.push({ type: "impact", damage, sector: m.sector, point });
  }

  private finish(events: RunEvent[]): void {
    this.finished = true;
    this.reason = "destroyed";
    this.meteors = [];
    this.selectedId = null;
    events.push({ type: "finish" });
  }
}
