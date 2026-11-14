// Portable, deterministic game rules; no Phaser or Reddit dependencies.
export type TimingResult = 'perfect' | 'good' | 'miss';
export type MeteorSpec = { sector: number; durationMs: number; targetMs: number };

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
  const variance = hash(daySeed, index) % 161;
  const durationMs = Math.max(1050, 2300 - index * 26) + variance - 80;
  return {
    sector: hash(daySeed + 7919, index) % 6,
    durationMs,
    targetMs: durationMs * 0.78,
  };
}

export function judgeTiming(offsetMs: number): TimingResult {
  const error = Math.abs(offsetMs);
  if (error <= 105) return 'perfect';
  if (error <= 250) return 'good';
  return 'miss';
}

export function applyImpact(sectors: readonly number[], sector: number): { damage: number[]; fatal: boolean } {
  if (sector < 0 || sector >= 6 || !Number.isInteger(sector)) throw new Error('Invalid shield sector');
  const damage = Array.from(sectors);
  damage[sector] = Math.min(2, (damage[sector] ?? 0) + 1);
  return { damage, fatal: damage[sector] >= 2 };
}
