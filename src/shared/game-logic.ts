// Portable rhythm/survival rules shared by the Reddit and web versions.
export type MeteorSpec = {
  sector: number;
  durationMs: number;
  chargeStartMs: number;
};
export type BeamState = {
  mass: number;
  heat: number;
  overheated: boolean;
  firing: boolean;
};

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
  // A forgiving 5.4 s first approach; difficulty increases slowly, never below 4.0 s.
  const variance = (hash(daySeed, index) % 241) - 120;
  const durationMs = Math.max(4000, 5400 - Math.floor(index / 4) * 180) + variance;
  return {
    sector: hash(daySeed + 7919, index) % 6,
    durationMs,
    chargeStartMs: durationMs * 0.43,
  };
}

export function initialBeam(): BeamState {
  return { mass: 100, heat: 0, overheated: false, firing: false };
}

// Press and hold after the turquoise cue to gradually vaporize a meteor.
// Holding before the cue raises heat but does not burn mass. Releasing cools the emitter.
export function advanceBeam(
  state: BeamState,
  deltaMs: number,
  holding: boolean,
  ready: boolean,
): BeamState {
  const dt = Math.max(0, Math.min(100, deltaMs));
  if (!holding) {
    const heat = Math.max(0, state.heat - dt * 0.095);
    return {
      mass: state.mass,
      heat,
      overheated: state.overheated && heat > 24,
      firing: false,
    };
  }
  if (state.overheated) {
    // Overheat requires releasing the control before recovery.
    return { ...state, firing: false };
  }
  const heat = Math.min(100, state.heat + dt * (ready ? 0.025 : 0.18));
  if (heat >= 100) {
    return { mass: state.mass, heat: 100, overheated: true, firing: false };
  }
  return {
    mass: ready ? Math.max(0, state.mass - dt * 0.091) : state.mass,
    heat,
    overheated: false,
    firing: ready,
  };
}

export function debrisDamage(mass: number): number {
  if (mass <= 0) return 0;
  return Math.max(1, Math.ceil(26 * Math.pow(Math.min(100, mass) / 100, 1.2)));
}

export function applyShieldDamage(integrity: number, mass: number): {
  integrity: number;
  damage: number;
  destroyed: boolean;
} {
  const damage = debrisDamage(mass);
  const remaining = Math.max(0, integrity - damage);
  return { integrity: remaining, damage, destroyed: remaining === 0 };
}

export type ChargeCue = { phase: 'wait' | 'countdown' | 'ready'; count: 0 | 1 | 2 | 3 };

/** The final 1.5s before charging becomes available is a visible 3-2-1 countdown. */
export function chargeCue(elapsedMs: number, chargeStartMs: number): ChargeCue {
  if (elapsedMs >= chargeStartMs) return { phase: 'ready', count: 0 };
  const remaining = chargeStartMs - elapsedMs;
  if (remaining > 1500) return { phase: 'wait', count: 0 };
  const count = Math.max(1, Math.min(3, Math.ceil(remaining / 500))) as 1 | 2 | 3;
  return { phase: 'countdown', count };
}
