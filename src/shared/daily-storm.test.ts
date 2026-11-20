import assert from 'node:assert/strict';
import { test } from 'node:test';
import { dailyStorm, nextChallengeDay } from './daily-storm.ts';
import { DefenseRun, volleySpecs } from './game-logic.ts';

test('daily profiles rotate across UTC month and year boundaries', () => {
  for (const start of [20261129, 20261230, 20280228]) {
    const days = [start, nextChallengeDay(start), nextChallengeDay(nextChallengeDay(start))];
    assert.equal(new Set(days.map(d => dailyStorm(d).id)).size, 3);
    assert.deepEqual(dailyStorm(start), dailyStorm(start));
  }
  assert.equal(nextChallengeDay(20261231), 20270101);
  assert.equal(nextChallengeDay(20280228), 20280229);
  assert.equal(nextChallengeDay(20260228), 20260301);
});
test('invalid dates cannot silently select a different storm', () => {
  for (const day of [20260229, 20261301, 20261131, 2026111, NaN, 20261119.5]) {
    assert.throws(() => dailyStorm(day), /invalid-day/);
    assert.throws(() => nextChallengeDay(day), /invalid-day/);
  }
});
test('first three waves and practice keep their original teaching rhythm', () => {
  for (let day=20261101; day<=20261130; day++) {
    for (let wave=0;wave<3;wave++) assert.deepEqual(volleySpecs(day,wave),volleySpecs(day,wave,false));
    const practice = new DefenseRun(day,{practice:true});
    assert.equal(practice.practice,true);
    assert.deepEqual(practice.meteors.map(({mass,grade,pressedGrade,requireRelease,firing,overdrive,releasedEarly,id,...spec})=>spec),volleySpecs(day,0,false));
    assert.equal(practice.storm.id,dailyStorm(day).id);
  }
});
test('each daily theme changes actual later-wave strategy parameters', () => {
  const days=[20261118,20261119,20261120];
  for (const day of days) {
    const profile=dailyStorm(day), run=new DefenseRun(day);
    assert.equal(run.storm.id,profile.id);
    const modified=Array.from({length:24},(_,wave)=>volleySpecs(day,wave));
    const base=Array.from({length:24},(_,wave)=>volleySpecs(day,wave,false));
    assert.notDeepEqual(modified,base);
    for(const specs of modified) for(const m of specs) {
      assert.ok(m.chargeStartMs + m.burnMs/3 < m.durationMs);
      assert.ok(m.durationMs>0 && m.burnMs>0);
    }
    if(profile.id==='relay') assert.equal(profile.relayMs,950);
    if(profile.id==='heavy') assert.equal(profile.heavyScoreMultiplier,1.75);
  }
});
test('daily profile stays fixed for the full run and inputs remain frame-independent', () => {
  for (const day of [20261118,20261119,20261120]) {
    const outcomes=[10,50,100].map(slice=>{
      const run=new DefenseRun(day);
      while(!run.finished) run.step(slice,true);
      return {score:run.score,cleared:run.cleared,storm:run.storm.id};
    });
    assert.deepEqual(outcomes[0],outcomes[1]);assert.deepEqual(outcomes[0],outcomes[2]);
  }
});
