import { dailyFocus, type FocusStats } from '../shared/daily-focus.ts';
import { RULES_VERSION } from '../shared/game-logic.ts';
import type { RecordStorage } from './records.ts';

export type FocusSource = 'local' | 'verified';
export type FocusRun = FocusStats & { version: string; day: number };
export type FocusRecord = {
  version: string;
  day: number;
  metric: keyof FocusStats;
  local: number | null;
  verified: number | null;
};
const KEY = `last-shield:daily-focus:${RULES_VERSION}`;
const count = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) >= 0;
function validDay(day: number): boolean {
  try { dailyFocus(day); return true; } catch { return false; }
}
function validRun(value: FocusRun): boolean {
  return value.version === RULES_VERSION && validDay(value.day) &&
    [value.bestCombo, value.perfect, value.cleared].every(count) && value.bestCombo <= value.cleared && value.perfect <= value.cleared;
}
function validRecord(value: unknown): value is FocusRecord {
  if (!value || typeof value !== 'object') return false;
  const row = value as FocusRecord;
  return row.version === RULES_VERSION && validDay(row.day) && row.metric === dailyFocus(row.day).metric &&
    (row.local === null || count(row.local)) && (row.verified === null || count(row.verified)) &&
    (row.local !== null || row.verified !== null);
}
const max = (a: number | null, b: number | null): number | null => a === null ? b : b === null ? a : Math.max(a, b);
function readRecent(storage: RecordStorage | null): FocusRecord[] {
  const raw = storage?.getItem(KEY) ?? 'null';
  try {
    if (raw.length > 20_000) return [];
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    const byDay = new Map<number, FocusRecord>();
    for (const item of value) {
      if (!validRecord(item)) continue;
      const previous = byDay.get(item.day);
      byDay.set(item.day, previous ? { ...item, local: max(previous.local, item.local), verified: max(previous.verified, item.verified) } : item);
    }
    return [...byDay.values()].sort((a,b) => b.day - a.day).slice(0,7);
  } catch { return []; }
}
export function readFocusRecord(storage: RecordStorage | null, day: number): FocusRecord | null {
  if (!validDay(day)) return null;
  try { return readRecent(storage).find(record => record.day === day) ?? null; } catch { return null; }
}
/** Call with 'verified' only from the accepted server result, never from the local end-of-run summary. */
export function storeFocusRecord(storage: RecordStorage | null, run: FocusRun, source: FocusSource): boolean {
  if (!storage || !run || !validRun(run) || (source !== 'local' && source !== 'verified')) return false;
  try {
    const recent = readRecent(storage), previous = recent.find(row => row.day === run.day);
    const metric = dailyFocus(run.day).metric, current = run[metric];
    if (previous && previous[source] !== null && previous[source]! >= current) return true;
    const next: FocusRecord = { version: RULES_VERSION, day: run.day, metric,
      local: previous?.local ?? null, verified: previous?.verified ?? null, [source]: current };
    const retained = [next, ...recent.filter(row => row.day !== run.day)].sort((a,b) => b.day - a.day).slice(0,7);
    if (!retained.some(row => row.day === run.day)) return false;
    storage.setItem(KEY, JSON.stringify(retained));
    return true;
  } catch { return false; }
}

/** Recreate this adapter after any post/account change; unscoped records are intentionally not migrated. */
export function scopedFocusStorage(
  storage: RecordStorage | null, postId: string | undefined, userId: string | undefined
): RecordStorage | null {
  if (!storage) return null;
  const validScope = (id: string | undefined): boolean => id === undefined ||
    (typeof id === 'string' && id.length > 0 && id.length <= 128 && !/[\s\p{Cc}\p{Cf}]/u.test(id));
  if (!validScope(postId) || !validScope(userId)) return null;
  try {
    const post = postId === undefined ? 'standalone' : `post=${encodeURIComponent(postId)}`;
    const user = userId === undefined ? 'guest' : `user=${encodeURIComponent(userId)}`;
    const suffix = `:scope:${post}:${user}`;
    return {
      getItem: (key: string) => storage.getItem(key + suffix),
      setItem: (key: string, value: string) => storage.setItem(key + suffix, value),
    };
  } catch { return null; }
}
