import { DefenseRun, RULES_VERSION } from './game-logic.ts';
import { dailyStorm, type StormId } from './daily-storm.ts';

export const COMMUNITY_CONTRACT = 'community-3';
export const MAX_TRACE_STEPS = 180000;
export const RUN_LIFETIME_MS = 2 * 60 * 60 * 1000;
export type TraceStep = [delta: number, holding: boolean, target?: number];
export type RunResult = {
  version: string; day: number; storm: StormId; score: number; perfect: number;
  cleared: number; bestCombo: number; waveReached: number; elapsedMs: number;
};
export type BoardEntry = { username: string; score: number; rank: number; isYou: boolean };
export type Board = {
  contract: string; rules: string; day: number; storm: StormId; total: number; leaderTies:number;
  top: BoardEntry[]; nearby: BoardEntry[]; me: BoardEntry | null; gap: number | null;
};
export function replayRun(day: number, input: unknown, wallMs: number): RunResult {
  if (!Array.isArray(input) || !input.length || input.length > MAX_TRACE_STEPS)
    throw new Error('invalid-trace');
  const run = new DefenseRun(day);
  let elapsed = 0;
  for (const item of input) {
    if (!Array.isArray(item) || item.length < 2 || item.length > 3 ||
      typeof item[0] !== 'number' || !Number.isFinite(item[0]) ||
      typeof item[1] !== 'boolean' ||
      (item[2] != null && (!Number.isSafeInteger(item[2]) || item[2] < 0)))
      throw new Error('invalid-trace');
    const [dt, holding, target] = item;
    if (dt === -1) {
      if (item.length !== 2) throw new Error('invalid-trace');
      run.activateOverdrive(holding);
    } else {
      if (dt < 0 || dt > 100) throw new Error('invalid-trace');
      elapsed += dt;
      if (elapsed > RUN_LIFETIME_MS || elapsed > wallMs + 2000)
        throw new Error('invalid-duration');
      run.step(dt, holding, target ?? undefined);
    }
  }
  if (!run.finished) throw new Error('unfinished-run');
  return { version: RULES_VERSION, day, storm: dailyStorm(day).id, score: run.score, perfect: run.perfect,
    cleared: run.cleared, bestCombo: run.bestCombo, waveReached: run.waveIndex + 1,
    elapsedMs: run.elapsedMs };
}
