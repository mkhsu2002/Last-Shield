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

import type { PracticeLesson } from '../shared/game-logic.ts';
export type { PracticeLesson } from '../shared/game-logic.ts';
export function practiceLessonInfo(lesson: PracticeLesson): {
  title: string;
  goal: string;
  next: PracticeLesson | null;
  requiredClears: number;
} {
  switch (lesson) {
    case 'timing': return {
      title: '完美起手',
      goal: '圓環變金色時按住，擊碎這一顆。',
      next: 'relay', requiredClears: 1,
    };
    case 'relay': return {
      title: '擊碎接力',
      goal: '擊碎第一顆後先放開，再按住第二顆。',
      next: 'overdrive', requiredClears: 2,
    };
    case 'overdrive': return {
      title: '超載保留與釋放',
      goal: '保留已滿超載，等隕石接近後再按「超載震爆」。',
      next: null, requiredClears: 3,
    };
  }
}
export function practiceStepDelta(
  lesson: PracticeLesson, dt: number, elapsed: number, goldAt: number, holding: boolean, engaged: boolean
): number {
  const clamped = Number.isFinite(dt) ? Math.max(0, Math.min(100, dt)) : 0;
  return lesson === 'overdrive' ? clamped * 0.5 : practiceDelta(clamped, elapsed, goldAt, holding, engaged);
}

export function practiceDangerReady(nearestMs: number): boolean {
  return Number.isFinite(nearestMs) && nearestMs >= 0 && nearestMs <= 1000;
}
export function practiceLessonPassed(lesson: PracticeLesson, cleared: number, perfect: number, manualOverdriveCleared: number, nearDanger: boolean): boolean {
  const required = practiceLessonInfo(lesson).requiredClears;
  return cleared >= required && (lesson === 'overdrive' ? manualOverdriveCleared > 0 && nearDanger : perfect >= required);
}
