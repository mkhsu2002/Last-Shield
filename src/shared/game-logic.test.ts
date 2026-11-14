import assert from 'node:assert/strict';
import { test } from 'node:test';
import { applyImpact, judgeTiming, meteorSpec, utcDaySeed } from './game-logic.ts';

test('timing windows have predictable boundaries', () => {
  assert.equal(judgeTiming(105), 'perfect');
  assert.equal(judgeTiming(-250), 'good');
  assert.equal(judgeTiming(251), 'miss');
});

test('daily meteor sequence is deterministic and valid', () => {
  const seed = utcDaySeed(new Date('2026-11-14T14:00:00Z'));
  assert.equal(seed, 20261114);
  for (let i = 0; i < 120; i++) {
    const a = meteorSpec(seed, i);
    assert.deepEqual(a, meteorSpec(seed, i));
    assert.ok(a.sector >= 0 && a.sector < 6);
    assert.ok(a.durationMs >= 970);
    assert.ok(a.targetMs < a.durationMs);
  }
});

test('two hits in the same sector destroy the shield', () => {
  const first = applyImpact([0, 0, 0, 0, 0, 0], 2);
  assert.equal(first.fatal, false);
  assert.equal(applyImpact(first.damage, 2).fatal, true);
  assert.equal(applyImpact(first.damage, 4).fatal, false);
});
