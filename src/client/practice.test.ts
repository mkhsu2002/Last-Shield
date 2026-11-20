import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PracticeReview, practiceDelta } from './practice.ts';

test('practice approaches gold slowly and waits there without consuming the window', () => {
  assert.equal(practiceDelta(100, 950, 1000, false, false), 50);
  assert.equal(practiceDelta(100, 1000, 1000, false, false), 0);
  assert.equal(practiceDelta(100, 1000, 1000, true, false), 50);
  assert.equal(practiceDelta(100, 1100, 1000, false, true), 50);
});

test('practice result cannot advance while the original mouse or key is still held', () => {
  const review = new PracticeReview();
  review.advance(5000);
  assert.equal(review.canContinue(true), false);
  assert.equal(review.canContinue(false), true);
});

test('letting go immediately still leaves time to read the result', () => {
  const review = new PracticeReview();
  assert.equal(review.canContinue(false), false);
  review.advance(1799);
  assert.equal(review.canContinue(false), false);
  review.advance(1);
  assert.equal(review.canContinue(false), true);
});
