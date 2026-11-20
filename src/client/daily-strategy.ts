import { dailyFocus } from '../shared/daily-focus.ts';
type StrategyStats={perfect:number;bestCombo:number;longestBrokenCombo:number;brokenComboWave:number;overdriveUses:number;overdriveCleared:number};
export function dailyStrategyQuestion(day:number,run:StrategyStats):string {
 const focus=dailyFocus(day);
 if(focus.metric==='bestCombo')return run.longestBrokenCombo>0&&run.brokenComboWave>0
  ? `第 ${run.brokenComboWave} 波中斷了 ${run.longestBrokenCombo} 連擊；你會改變接力順序嗎？`
  : `這局最高 ${run.bestCombo} 連擊；你如何安排放開與再按的接力？`;
 if(focus.metric==='perfect')return `這局完美擊破 ${run.perfect} 次；快速核心來襲時，你會先鎖定哪一顆？`;
 return `這局超載用了 ${run.overdriveUses} 次，清除 ${run.overdriveCleared} 顆；你會把第一次超載留到哪一波？`;
}
