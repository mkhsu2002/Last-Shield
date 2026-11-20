import { dailyStorm } from './daily-storm.ts';

export type ChallengeTarget = Readonly<{
  username: string; score: number; day: number; rules: string; kind: 'rival' | 'personal';
}>;
export type ChallengeCode = Readonly<{ day: number; runId: string }>;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** A public locator, never proof of identity, score or continued enrollment. */
export function buildChallengeCode(day: number, runId: string): string | null {
  if (typeof runId !== 'string' || runId.length !== 36 || !UUID.test(runId)) return null;
  try { dailyStorm(day); } catch { return null; }
  return `LS8:${day}:${runId.toLowerCase()}`;
}

export function parseChallengeCode(source: unknown): ChallengeCode | null {
  if (typeof source !== 'string' || source.length !== 49) return null;
  const match = /^LS8:(\d{8}):([0-9a-f-]{36})$/i.exec(source);
  if (!match || !source.startsWith('LS8:')) return null;
  const day = Number(match[1]), runId = match[2]!.toLowerCase();
  return buildChallengeCode(day, runId) ? { day, runId } : null;
}

export function parseRivalShareData(source: unknown): string | null {
  if (typeof source !== 'string' || source.length > 1024) return null;
  try {
    const value: unknown = JSON.parse(source);
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const keys = Object.keys(value);
    if (keys.length !== 2 || !keys.includes('kind') || !keys.includes('code')) return null;
    const payload = value as { kind: unknown; code: unknown };
    if (payload.kind !== 'rival') return null;
    const parsed = parseChallengeCode(payload.code);
    return parsed ? buildChallengeCode(parsed.day, parsed.runId) : null;
  } catch { return null; }
}
