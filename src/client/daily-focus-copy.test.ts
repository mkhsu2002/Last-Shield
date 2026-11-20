import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dailyFocus } from '../shared/daily-focus.ts';
import { focusTargetCopy, focusResultCopy } from './daily-focus-copy.ts';
import { renderCopy, translate } from './i18n.ts';
import { runLearningGoal } from './coaching.ts';
test('daily goals and actual run results render completely in both languages across all profiles',()=>{
 for(let day=20261119;day<=20261127;day++){
  const goal=dailyFocus(day);
  for(const current of [0,goal.target,goal.stretch]){
   const stats={bestCombo:0,perfect:0,cleared:0,[goal.metric]:current};
   for(const copy of [focusTargetCopy(day),focusResultCopy(day,stats)]){
    assert.doesNotMatch(renderCopy(copy,'en'),/[\p{Script=Han}]/u);
    assert.match(renderCopy(copy,'zh-Hant'),/[\p{Script=Han}]/u);
   }
  }
 }
});
test('postmortem translates the observed failure and numeric goal with its action',()=>{
 for(const bestCombo of [0,9,24,99,100,150]){
  for(const energy of [0,3]){
   const lesson=runLearningGoal({bestCombo,brokenCombo:bestCombo,breakWave:20,energy,mistakes:{unarmed:0,released:0,late:0,untouched:0},early:0,late:0});
   assert.doesNotMatch(translate(lesson.summary,'en'),/[\p{Script=Han}]/u);
   assert.doesNotMatch(translate(lesson.action,'en'),/[\p{Script=Han}]/u);
  }
 }
});
test('a newly completed base goal retains its own denominator and names the stretch goal separately',()=>{
 const day=20261120,goal=dailyFocus(day),stats={bestCombo:0,perfect:0,cleared:0,[goal.metric]:goal.target};
 const copy=renderCopy(focusResultCopy(day,stats),'en');
 assert.match(copy,new RegExp(`${goal.target}/${goal.target}`));
 assert.match(copy,new RegExp(`Stretch goal ${goal.stretch}`));
});
