/** Practice slows observation without changing the rules used by ranked runs. */
import type { RecordStorage } from './records.ts';
const PRACTICE_KEY='last-shield:practice-reviewed';
export function hasPracticed(storage:RecordStorage|null):boolean {
  try{return storage?.getItem(PRACTICE_KEY)==='1';}catch{return false;}
}
export function markPracticed(storage:RecordStorage|null):void {
  try{storage?.setItem(PRACTICE_KEY,'1');}catch{ /* Practice and direct play remain available. */ }
}
export function practiceDelta(
  dt: number, elapsed: number, goldAt: number, holding: boolean, engaged: boolean
): number {
  const slow = dt * 0.5;
  return !holding && !engaged ? Math.min(slow, Math.max(0, goldAt - elapsed)) : slow;
}

export class PracticeReview {
  private remainingMs = 1800;
  advance(dt: number): void { this.remainingMs = Math.max(0, this.remainingMs - Math.max(0, dt)); }
  canContinue(holding: boolean): boolean { return this.remainingMs === 0 && !holding; }
}
