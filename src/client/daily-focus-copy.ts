import { dailyFocus, focusProgress, type FocusStats } from '../shared/daily-focus.ts';
import { RULES_VERSION } from '../shared/game-logic.ts';
import type { FocusRecord } from './focus-records.ts';
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

/** Home-page progress is retained per single run, with local and server-confirmed records labelled separately. */
export function focusRecordCopy(day:number,record:FocusRecord|null):string[] {
  const goal=dailyFocus(day);
  if(!record || record.day!==day || record.version!==RULES_VERSION || record.metric!==goal.metric ||
    [record.local,record.verified].some(value=>value!==null&&(!Number.isSafeInteger(value)||value<0)) ||
    (record.local===null&&record.verified===null)) return focusTargetCopy(day);
  const copy:string[]=[goal.title];
  for(const [source,current] of [['local',record.local],['verified',record.verified]] as const){
    if(current===null || (source==='local' && record.verified!==null && current<=record.verified))continue;
    const complete=current>=goal.target,stretch=current>=goal.stretch;
    copy.push(source==='local'?' · 本機單局最佳：':' · 已確認單局最佳：',
      `${current}／${stretch?goal.stretch:goal.target} ${focusUnit(goal.metric)}`,' · ',
      stretch?'進階目標達成':complete?'共同目標達成':'繼續挑戰');
    if(complete&&!stretch)copy.push(` · 進階目標 ${goal.stretch}`);
  }
  return copy;
}

/** Keep the observed run visible even when optional persistent storage is denied. */
export function focusRunRecordCopy(day:number,stats:FocusStats,record:FocusRecord|null,source:'local'|'verified'):string[] {
  const goal=dailyFocus(day), current=focusProgress(goal,stats).current;
  const same=record?.day===day && record.version===RULES_VERSION && record.metric===goal.metric ? record : null;
  return focusRecordCopy(day,{version:RULES_VERSION,day,metric:goal.metric,
    local:source==='local'?Math.max(same?.local??0,current):same?.local??null,
    verified:source==='verified'?Math.max(same?.verified??0,current):same?.verified??null});
}
