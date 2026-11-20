import { dailyStorm } from "../shared/daily-storm.ts";
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
  try { dailyStorm(day); } catch { return false; }
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
function readRecent(storage: RecordStorage | null): BestRecord[] {
  try {
    const raw = storage?.getItem(KEY) ?? 'null';
    if (raw.length > 20_000) return [];
    const value: unknown = JSON.parse(raw);
    const input = Array.isArray(value) ? value : [value];
    const byDay = new Map<number, BestRecord>();
    for (const item of input) {
      if (!item || typeof item !== 'object' || !valid(item, (item as BestRecord).day)) continue;
      const record = item as BestRecord, previous = byDay.get(record.day);
      if (!previous || record.score > previous.score) byDay.set(record.day, record);
    }
    return [...byDay.values()].sort((a,b)=>b.day-a.day).slice(0,7);
  } catch { return []; }
}
export function readBest(storage: RecordStorage | null, day: number): BestRecord | null {
  return readRecent(storage).find(record=>record.day===day) ?? null;
}
export function readPreviousBest(storage: RecordStorage | null, day: number): BestRecord | null {
  try { dailyStorm(day); } catch { return null; }
  return readRecent(storage).find(record=>record.day<day) ?? null;
}
export function storeBest(storage: RecordStorage | null, record: BestRecord): boolean {
  if (!storage || !valid(record, record.day)) return false;
  try {
    const recent = readRecent(storage), previous = recent.find(item=>item.day===record.day);
    if (previous && previous.score >= record.score) return true;
    const next = [record,...recent.filter(item=>item.day!==record.day)];
    const retained = next.sort((a,b)=>b.day-a.day).slice(0,7);
    storage.setItem(KEY, JSON.stringify(retained));
    return retained.some(item=>item.day===record.day);
  } catch { return false; }
}
