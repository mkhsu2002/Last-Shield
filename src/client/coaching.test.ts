import assert from "node:assert/strict";
import { test } from "node:test";
import { retryAdvice, milestone, energyCopy } from "./coaching.ts";

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
