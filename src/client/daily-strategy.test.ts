import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dailyStrategyQuestion } from './daily-strategy.ts';
import { translate } from './i18n.ts';
const stats={perfect:12,bestCombo:24,longestBrokenCombo:20,brokenComboWave:8,overdriveUses:3,overdriveCleared:9};
test('discussion follows the actual daily strategy and never invents a missing combo break',()=>{
 const questions=[20261119,20261120,20261121].map(day=>dailyStrategyQuestion(day,stats));
 assert.equal(new Set(questions).size,3);
 for(const q of questions)assert.doesNotMatch(translate(q,'en'),/[\p{Script=Han}]/u);
 assert.match(questions[0]!,/完美擊破 12/);
 assert.match(questions[1]!,/用了 3 次.*清除 9 顆/);
 assert.match(questions[2]!,/第 8 波.*20 連擊/);
 assert.doesNotMatch(dailyStrategyQuestion(20261121,{...stats,longestBrokenCombo:0,brokenComboWave:0}),/第 0 波|中斷/);
});
