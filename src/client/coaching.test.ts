import assert from "node:assert/strict";
import { test } from "node:test";
import { retryAdvice, milestone, energyCopy, comboProgress, runLearningGoal } from "./coaching.ts";

test("advice follows actual impact causes ahead of successful timing grades", () => {
  const base = {
    mistakes: { unarmed: 0, untouched: 0, released: 0, late: 0 },
    early: 20,
    late: 0,
  };
  assert.match(
    retryAdvice({
      ...base,
      mistakes: { ...base.mistakes, unarmed: 2, late: 1 },
    }),
    /先放開/
  );
  assert.match(
    retryAdvice({ ...base, mistakes: { ...base.mistakes, released: 2 } }),
    /核心爆裂/
  );
  assert.match(
    retryAdvice({ ...base, mistakes: { ...base.mistakes, late: 2 } }),
    /下一輪重按補救/
  );
  assert.match(
    retryAdvice({ ...base, mistakes: { ...base.mistakes, untouched: 2 } }),
    /圓環變金色/
  );
  assert.match(retryAdvice(base), /晚一點/);
});

test("energy explains numeric charge, its source, activation and manual emergency effect in Chinese", () => {
  assert.match(energyCopy(1, false).title, /1／3/);
  assert.match(energyCopy(1, false).help, /擊碎 \+1/);
  assert.match(energyCopy(3, false).help, /按「超載震爆」才會使用/);
  assert.match(energyCopy(0, true).help, /全場威脅已清除/);
});

test("ten-core milestones advance exactly at the boundary", () => {
  assert.deepEqual(milestone(0), { target: 10, progress: 0 });
  assert.deepEqual(milestone(9), { target: 10, progress: 9 });
  assert.deepEqual(milestone(10), { target: 20, progress: 0 });
  assert.deepEqual(milestone(27), { target: 30, progress: 7 });
});

test("a loss with a banked full charge teaches the missed rescue decision", () => {
  assert.match(
    retryAdvice({
      mistakes: { unarmed: 0, untouched: 2, released: 0, late: 0 },
      early: 0,
      late: 0,
      energy: 3,
    }),
    /超載仍是滿的/
  );
});

const learningRun = {
  bestCombo: 24, brokenCombo: 20, breakWave: 12, energy: 0,
  mistakes: { unarmed: 0, untouched: 0, released: 0, late: 0 }, early: 0, late: 0,
};
test("combo progress follows every scoring threshold and reports the exact remaining clears", () => {
  const tiers = [[0,1,10,2,10], [9,1,10,2,1], [10,2,25,5,15], [24,2,25,5,1],
    [25,5,50,10,25], [49,5,50,10,1], [50,10,75,25,25], [74,10,75,25,1],
    [75,25,100,50,25], [99,25,100,50,1]];
  for (const [combo,multiplier,nextCombo,nextMultiplier,remaining] of tiers) {
    assert.deepEqual(comboProgress(combo!), { multiplier, nextCombo, nextMultiplier, remaining });
  }
  for (const combo of [100,101,900]) assert.deepEqual(comboProgress(combo), { multiplier:50,nextCombo:null,nextMultiplier:null,remaining:0 });
  assert.deepEqual(comboProgress(99,true), { multiplier:1,nextCombo:null,nextMultiplier:null,remaining:0 });
});
test("learning summary reports observed largest broken chain and wave without inventing a cause", () => {
  const result = runLearningGoal(learningRun);
  assert.match(result.summary, /最高 24 連擊/);
  assert.match(result.summary, /最長斷鏈.*20 連擊.*第 12 波/);
  assert.doesNotMatch(result.summary, /放開|太早|太晚|超載/);
  assert.match(result.action, /25 連擊.*5 倍.*再多 1 連擊/);
  const intact = runLearningGoal({ ...learningRun, brokenCombo:0, breakWave:99 });
  assert.match(intact.summary, /沒有連擊中斷紀錄/);
  assert.doesNotMatch(intact.summary, /第 99 波|因為|失誤/);
});
test("full unused energy and actual impact causes take priority over timing grades", () => {
  const full = runLearningGoal({ ...learningRun, energy:3, mistakes:{...learningRun.mistakes, unarmed:3}, early:40 });
  assert.match(full.action, /超載仍是滿的/);
  assert.doesNotMatch(full.action, /先放開|提前保留/);
  const impact = runLearningGoal({ ...learningRun, mistakes:{...learningRun.mistakes, released:2}, early:40 });
  assert.match(impact.action, /核心爆裂/);
  assert.doesNotMatch(impact.action, /晚一點|提前保留/);
});
test("top-tier learning aims to sustain fiftyfold and uses the actual break wave for preparation", () => {
  const result = runLearningGoal({ ...learningRun, bestCombo:120, brokenCombo:110, breakWave:61 });
  assert.match(result.action, /維持 100 連擊以上.*50 倍/);
  assert.match(result.action, /第 61 波前.*保留超載/);
  assert.doesNotMatch(result.action, /再多|必勝|第一名|保證/);
  const intact = runLearningGoal({ ...learningRun, bestCombo:100, brokenCombo:0, breakWave:0 });
  assert.doesNotMatch(intact.action, /第 0 波|提前保留/);
  assert.match(intact.action, /按住發射/);
});

test("learning copy stays within two short sentences per field and never invents a missing wave", () => {
  for (const run of [learningRun, { ...learningRun, energy:3 }, { ...learningRun, breakWave:0 },
    { ...learningRun, mistakes:{ ...learningRun.mistakes, late:2 } }]) {
    const result = runLearningGoal(run);
    for (const copy of [result.summary, result.action]) assert.ok(copy.split('。').filter(Boolean).length <= 2);
  }
  const unknownWave = runLearningGoal({ ...learningRun, breakWave:0 });
  assert.match(unknownWave.summary, /最長斷鏈為 20 連擊/);
  assert.doesNotMatch(unknownWave.summary + unknownWave.action, /第 0 波/);
});
