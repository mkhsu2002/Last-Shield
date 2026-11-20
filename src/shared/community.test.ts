import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DefenseRun, RULES_VERSION } from './game-logic.ts';
import { replayRun, type TraceStep } from './community.ts';

function finishedTrace(): TraceStep[] {
  const run = new DefenseRun(20261115);
  const trace: TraceStep[] = [];
  while (!run.finished) {
    trace.push([50, true]);
    run.step(50, true);
  }
  assert.ok(run.score > 0);
  return trace;
}
test('replay derives score from gameplay rather than a supplied score', () => {
  const trace = finishedTrace();
  const result = replayRun(20261115, trace, 120000);
  assert.ok(result.score > 0);
  assert.ok(result.cleared > 0);
  assert.equal(result.day, 20261115);
  assert.equal(result.version, RULES_VERSION);
  assert.deepEqual(result, replayRun(20261115, JSON.parse(JSON.stringify(trace)), 120000));
});
test('reject unfinished, malformed, expensive, or faster-than-wall-clock runs', () => {
  for (const trace of [[], [[0, true]], [[101, true]], [[-2, true]], [[1, 'yes']], [[1, false, -1]], [[NaN, true]]])
    assert.throws(() => replayRun(20261115, trace, 120000));
  assert.throws(() => replayRun(20261115, finishedTrace(), 1));
  assert.throws(() => replayRun(20261115, new Array(180001).fill([0, true]), 120000));
});
test('records target changes, releases and Overdrive without changing core rules', () => {
  const run = new DefenseRun(20261115);
  const trace: TraceStep[] = [];
  while (!run.finished) {
    const step: TraceStep = [50, run.elapsedMs % 1000 < 700, run.meteor?.id];
    trace.push(step);
    run.step(step[0], step[1], step[2]);
    if (run.energy === 3) {
      trace.push([-1, step[1]]);
      run.activateOverdrive(step[1]);
    }
  }
  const result = replayRun(20261115, trace, 120000);
  assert.equal(result.score, run.score);
  assert.equal(result.perfect, run.perfect);
  assert.equal(result.bestCombo, run.bestCombo);
});
