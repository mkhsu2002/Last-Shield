import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  advanceBeam,
  applyShieldDamage,
  debrisDamage,
  initialBeam,
  meteorSpec,
  utcDaySeed,
} from './game-logic.ts';

test('slow daily approach remains deterministic', () => {
  const seed = utcDaySeed(new Date('2026-11-14T14:00:00Z'));
  assert.equal(seed, 20261114);
  for (let i = 0; i < 120; i++) {
    const a = meteorSpec(seed, i);
    assert.deepEqual(a, meteorSpec(seed, i));
    assert.ok(a.sector >= 0 && a.sector < 6);
    assert.ok(a.durationMs >= 3880);
    assert.ok(a.chargeStartMs > 1500);
    assert.ok(a.durationMs - a.chargeStartMs >= 2000);
  }
});

test('a well-timed long hold completely vaporizes the meteor', () => {
  let state = initialBeam();
  for (let i = 0; i < 14; i++) state = advanceBeam(state, 100, true, true);
  assert.equal(state.mass, 0);
  assert.equal(state.overheated, false);
  assert.equal(debrisDamage(state.mass), 0);
});

test('a short hold leaves partial debris and proportionate shield damage', () => {
  let state = initialBeam();
  for (let i = 0; i < 4; i++) state = advanceBeam(state, 100, true, true);
  assert.ok(state.mass > 0 && state.mass < 100);
  const hit = applyShieldDamage(100, state.mass);
  assert.ok(hit.damage > 0 && hit.damage < debrisDamage(100));
  assert.equal(hit.destroyed, false);
});

test('holding too early causes heat lock until released and cooled', () => {
  let state = initialBeam();
  for (let i = 0; i < 7; i++) state = advanceBeam(state, 100, true, false);
  assert.equal(state.overheated, true);
  assert.equal(state.mass, 100);
  const stillLocked = advanceBeam(state, 100, true, true);
  assert.equal(stillLocked.firing, false);
  assert.equal(stillLocked.mass, 100);
  for (let i = 0; i < 9; i++) state = advanceBeam(state, 100, false, true);
  assert.equal(state.overheated, false);
});

test('shield takes multiple hits before it reaches zero', () => {
  let integrity = 100;
  for (let i = 0; i < 3; i++) {
    const hit = applyShieldDamage(integrity, 100);
    assert.equal(hit.destroyed, false);
    integrity = hit.integrity;
  }
  const fourth = applyShieldDamage(integrity, 100);
  assert.equal(fourth.destroyed, true);
  assert.equal(fourth.integrity, 0);
});
