import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as rules from './game-logic.ts';

test('timing rewards precision and keeps early and late defenses playable', () => {
  assert.equal(typeof rules.judgeTiming, 'function');
  assert.equal(rules.judgeTiming(-121), 'early');
  assert.equal(rules.judgeTiming(-120), 'perfect');
  assert.equal(rules.judgeTiming(120), 'perfect');
  assert.equal(rules.judgeTiming(121), 'good');
  assert.equal(rules.judgeTiming(450), 'good');
  assert.equal(rules.judgeTiming(451), 'late');
});

test('daily pattern is stable with an approachable opening and beat variety', () => {
  const seed = rules.utcDaySeed(new Date('2026-11-14T14:00:00Z'));
  assert.equal(seed, 20261114);
  const kinds = new Set();
  for (let i = 0; i < 25; i++) {
    const spec = rules.meteorSpec(seed, i);
    assert.deepEqual(spec, rules.meteorSpec(seed, i));
    assert.ok(spec.sector >= 0 && spec.sector < 6);
    assert.ok(spec.durationMs < 3000);
    assert.ok(spec.chargeStartMs + spec.burnMs < spec.durationMs);
    if (i < 3) assert.equal(spec.kind, 'normal');
    kinds.add(spec.kind);
  }
  assert.equal(kinds.size, 3);
});

test('upstream 3-2-1 cue stays aligned to the shorter target time', () => {
  assert.deepEqual(rules.chargeCue(0, 900), { phase: 'countdown', count: 3 });
  assert.deepEqual(rules.chargeCue(300, 900), { phase: 'countdown', count: 2 });
  assert.deepEqual(rules.chargeCue(600, 900), { phase: 'countdown', count: 1 });
  assert.deepEqual(rules.chargeCue(900, 900), { phase: 'ready', count: 0 });
});

test('an early uninterrupted hold can clear without a heat lock', () => {
  assert.equal(typeof rules.DefenseRun, 'function');
  const run = new rules.DefenseRun(20261114);
  run.step(2500, true);
  assert.equal(run.cleared, 1);
  assert.equal(run.score > 0, true);
  assert.equal(run.perfect, 0);
  assert.equal(run.integrity, 100);
});

test('continuous holding cannot auto-clear subsequent waves', () => {
  const run = new rules.DefenseRun(20261114);
  run.step(6000, true);
  assert.equal(run.cleared, 1);
  assert.equal(run.waveIndex, 2);
  assert.equal(run.integrity, 74);
});

test('partial melting survives release and reduces impact damage', () => {
  const run = new rules.DefenseRun(20261114);
  run.step(run.meteor!.chargeStartMs, false);
  run.step(300, true);
  run.step(2700 - run.elapsedMs, false);
  assert.ok(run.integrity > 74 && run.integrity < 100);
  assert.equal(run.combo, 0);
  assert.equal(run.firstMiss, 1);
});

function perfectWave(run: InstanceType<typeof rules.DefenseRun>): void {
  const m = run.meteor!;
  const target = run.waveIndex * 3000 + m.chargeStartMs;
  run.step(target - run.elapsedMs, false);
  run.step(m.burnMs + 50, true);
  const next = (run.waveIndex + 1) * 3000;
  if (!run.finished) run.step(next - run.elapsedMs, false);
}

test('three perfects charge a bonus consumed by the next clear', () => {
  const run = new rules.DefenseRun(20261114);
  for (let i = 0; i < 3; i++) perfectWave(run);
  assert.equal(run.energy, 3);
  const before = run.score;
  run.step(run.meteor!.chargeStartMs, false);
  const clear = run.step(run.meteor!.burnMs + 50, true).find(e => e.type === 'clear');
  assert.equal(clear?.overdrive, true);
  assert.ok(run.score - before >= 400);
  assert.equal(run.energy, 1);
});

test('fixed slots prevent fast clears gaining extra meteors and finish at 75 seconds', () => {
  const run = new rules.DefenseRun(20261114);
  for (let i = 0; i < 25; i++) perfectWave(run);
  assert.equal(run.elapsedMs, 75000);
  assert.equal(run.cleared, 25);
  assert.equal(run.finished, true);
  assert.equal(run.reason, 'complete');
  const score = run.score;
  run.step(10000, true);
  assert.equal(run.score, score);
  assert.equal(run.elapsedMs, 75000);
});

test('four full misses end the run and report the correct damaged sectors', () => {
  const run = new rules.DefenseRun(20261114);
  run.step(12000, false);
  assert.equal(run.integrity, 0);
  assert.equal(run.finished, true);
  assert.equal(run.reason, 'destroyed');
  assert.equal(run.firstMiss, 1);
  assert.equal(run.sectors.reduce((sum, n) => sum + n, 0), 104);
});

test('repeated presses cannot upgrade the grade after melting has started', () => {
  const run = new rules.DefenseRun(20261114);
  run.step(300, true);
  run.step(run.meteor!.chargeStartMs - 300 + 20, true);
  assert.equal(run.meteor!.grade, 'early');
  run.step(0, false);
  run.step(900, true);
  assert.equal(run.perfect, 0);
  assert.equal(run.early, 1);
});

test('a miss resets combo and removes only one overdrive charge', () => {
  const run = new rules.DefenseRun(20261114);
  for (let i = 0; i < 3; i++) perfectWave(run);
  run.step(2900, false);
  assert.equal(run.energy, 2);
  assert.equal(run.combo, 0);
  assert.equal(run.bestCombo, 3);
});

test('different rendering frame sizes preserve the same defense result', () => {
  const a = new rules.DefenseRun(20261114);
  const b = new rules.DefenseRun(20261114);
  const target = a.meteor!.chargeStartMs;
  a.step(target, false);
  b.step(target, false);
  a.step(1000, true);
  for (let i = 0; i < 100; i++) b.step(10, true);
  assert.equal(a.score, b.score);
  assert.equal(a.perfect, b.perfect);
  assert.equal(a.integrity, b.integrity);
  assert.equal(a.elapsedMs, b.elapsedMs);
});
