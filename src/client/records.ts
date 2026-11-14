import { RULES_VERSION } from "../shared/game-logic.ts";
export type BestRecord = {
  version: string;
  day: number;
  score: number;
  perfect: number;
  cleared: number;
  bestCombo: number;
  waveReached: number;
};
export type RecordStorage = Pick<Storage, "getItem" | "setItem">;
const KEY = "last-shield:daily-best";
function valid(value: unknown, day: number): value is BestRecord {
  if (!value || typeof value !== "object") return false;
  const r = value as BestRecord;
  return (
    r.version === RULES_VERSION &&
    r.day === day &&
    [r.score, r.perfect, r.cleared, r.bestCombo, r.waveReached].every(
      (n) => Number.isSafeInteger(n) && n >= 0
    ) &&
    r.waveReached >= 1 &&
    r.cleared <= r.waveReached * 6 &&
    r.perfect <= r.cleared &&
    r.bestCombo <= r.cleared
  );
}
export function readBest(
  storage: RecordStorage | null,
  day: number
): BestRecord | null {
  try {
    const value: unknown = JSON.parse(storage?.getItem(KEY) ?? "null");
    return valid(value, day) ? value : null;
  } catch {
    return null;
  }
}
export function storeBest(
  storage: RecordStorage | null,
  record: BestRecord
): boolean {
  if (!storage || !valid(record, record.day)) return false;
  try {
    const previous = readBest(storage, record.day);
    if (!previous || record.score > previous.score)
      storage.setItem(KEY, JSON.stringify(record));
    return true;
  } catch {
    return false;
  }
}
