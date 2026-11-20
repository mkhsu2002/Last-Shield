import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dailyFocus } from '../shared/daily-focus.ts';
import { focusTargetCopy, focusResultCopy, focusRunRecordCopy, focusRecordCopy } from './daily-focus-copy.ts';
import { renderCopy, translate } from './i18n.ts';
import { RULES_VERSION } from '../shared/game-logic.ts';
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

test('homepage carries the best stored single run while clearly separating confirmation sources',()=>{
 const day=20261120,goal=dailyFocus(day);
 const record={version:RULES_VERSION,day,metric:goal.metric,local:goal.stretch,verified:goal.target};
 const copy=focusRecordCopy(day,record).join('');
 assert.match(copy,/本機單局最佳：/);assert.match(copy,/已確認單局最佳：/);
 assert.ok(copy.includes(`${goal.stretch}／${goal.stretch}`));assert.ok(copy.includes(`${goal.target}／${goal.target}`));
 assert.match(copy,/進階目標達成/);assert.match(copy,/共同目標達成/);
 const localOnly=focusRecordCopy(day,{...record,verified:null}).join('');
 assert.doesNotMatch(localOnly,/已確認/);
 const verifiedOnly=focusRecordCopy(day,{...record,local:null}).join('');
 assert.doesNotMatch(verifiedOnly,/本機單局最佳/);assert.match(verifiedOnly,/已確認單局最佳/);
});
test('missing, wrong-day or old-rule progress leaves the current daily target intact',()=>{
 const day=20261120,goal=dailyFocus(day),record={version:RULES_VERSION,day,metric:goal.metric,local:goal.stretch,verified:null};
 for(const value of [null,{...record,day:20261119},{...record,version:'old-rules'}]) {
  assert.deepEqual(focusRecordCopy(day,value),focusTargetCopy(day));
 }
});

test('a run achievement stays visible after denied storage without promoting a local run to verified',()=>{
 const day=20261120,stats={bestCombo:25,perfect:24,cleared:25};
 const verified=renderCopy(focusRunRecordCopy(day,stats,null,'verified'),'en');
 assert.match(verified,/Verified run best: 25\/25/);assert.match(verified,/Daily goal complete/);
 const local=renderCopy(focusRunRecordCopy(day,stats,null,'local'),'en');
 assert.match(local,/Local run best: 25\/25/);assert.doesNotMatch(local,/Verified/);
});
