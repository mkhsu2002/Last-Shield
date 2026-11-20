import { dailyFocus, focusProgress, type FocusStats } from '../shared/daily-focus.ts';
export function focusUnit(metric:keyof FocusStats):string {
  return metric==='bestCombo'?'連擊':metric==='perfect'?'完美擊破':'擊碎隕石';
}
export function focusTargetCopy(day:number):string[] {
  const goal=dailyFocus(day);
  return [goal.title, ' · ', `${goal.target} ${focusUnit(goal.metric)} · 進階 ${goal.stretch}`];
}
export function focusResultCopy(day:number,stats:FocusStats):string[] {
  const goal=dailyFocus(day),progress=focusProgress(goal,stats);
  return [goal.title,' · ',progress.stretchCompleted?'進階目標達成':progress.completed?'共同目標達成':'繼續挑戰',
    ` · ${progress.current}／${progress.stretchCompleted?goal.stretch:goal.target} ${focusUnit(goal.metric)}`,
    ...(progress.completed&&!progress.stretchCompleted ? [` · 進階目標 ${goal.stretch}`] : [])];
}
