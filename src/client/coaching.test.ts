import assert from 'node:assert/strict';
import { test } from 'node:test';
import { retryAdvice, milestone } from './coaching.ts';

test('advice follows actual impact causes ahead of successful timing grades', () => {
  const base = { mistakes: { unarmed: 0, untouched: 0, released: 0, late: 0 }, early: 20, late: 0 };
  assert.match(retryAdvice({ ...base, mistakes: { ...base.mistakes, unarmed: 2, late: 1 } }), /Release after each/);
  assert.match(retryAdvice({ ...base, mistakes: { ...base.mistakes, released: 2 } }), /until the core bursts/);
  assert.match(retryAdvice({ ...base, mistakes: { ...base.mistakes, late: 2 } }), /sooner/);
  assert.match(retryAdvice({ ...base, mistakes: { ...base.mistakes, untouched: 2 } }), /ring lights/);
  assert.match(retryAdvice(base), /later/);
});

test('ten-core milestones advance exactly at the boundary', () => {
  assert.deepEqual(milestone(0), { target: 10, progress: 0 });
  assert.deepEqual(milestone(9), { target: 10, progress: 9 });
  assert.deepEqual(milestone(10), { target: 20, progress: 0 });
  assert.deepEqual(milestone(27), { target: 30, progress: 7 });
});
