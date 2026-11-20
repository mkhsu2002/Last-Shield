import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fire, GOLD_AT, IMPACT_AT, peek, rockPosition } from './inline-sampler.ts';

test('an early tap cannot clear the shield sampler rock; only the visible gold cue can', () => {
  assert.equal(peek(0), 'incoming');
  assert.equal(fire(GOLD_AT - 1), 'early');
  assert.equal(peek(GOLD_AT), 'gold');
  assert.equal(fire(GOLD_AT), 'clear');
  assert.equal(fire(IMPACT_AT - 1), 'clear');
  assert.equal(peek(IMPACT_AT), 'impact');
  assert.equal(fire(IMPACT_AT), 'impact');
});

test('sampler rock remains in frame, and non-clear outcomes end at the shield', () => {
  for (const elapsed of [0, 100, GOLD_AT, IMPACT_AT, IMPACT_AT + 500]) {
    const {x,y} = rockPosition(elapsed);
    assert.ok(x >= 60 && x <= 80);
    assert.ok(y >= 10 && y < 60);
  }
  assert.deepEqual(rockPosition(100, 'early'), rockPosition(IMPACT_AT));
  assert.deepEqual(rockPosition(GOLD_AT, 'clear'), rockPosition(GOLD_AT));
});
