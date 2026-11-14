import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as rules from './game-logic.ts';

test('precision grades have inclusive boundaries', () => {
  assert.equal(rules.judgeTiming(-121), 'early');
  assert.equal(rules.judgeTiming(-120), 'perfect');
  assert.equal(rules.judgeTiming(120), 'perfect');
  assert.equal(rules.judgeTiming(121), 'good');
  assert.equal(rules.judgeTiming(451), 'late');
});

test('incoming meteor touches the visible shield at impact, never before', () => {
  assert.equal(typeof rules.meteorGeometry, 'function');
  for (let i = 0; i < 40; i++) {
    const spec = rules.meteorSpec(20261114, i);
    const before = rules.meteorGeometry(spec, spec.durationMs - 1, 100);
    const contact = rules.meteorGeometry(spec, spec.durationMs, 100);
    assert.ok(before.clearance > 0);
    assert.ok(Math.abs(contact.clearance) < .00001);
    assert.ok(contact.distance < before.distance);
  }
});

test('full meteor cannot damage the shield before visual contact', () => {
  const run = new rules.DefenseRun(20261114);
  const deadline = run.meteor!.durationMs;
  run.step(deadline - 1, false);
  assert.equal(run.integrity, 100);
  const event = run.step(1, false).find(e => e.type === 'impact');
  assert.ok(event);
  assert.ok(run.integrity < 100);
  assert.ok(event.point);
});

test('pace and intervals vary by meteor and increase through survival', () => {
  const early = Array.from({length:20}, (_,i)=>rules.meteorSpec(20261114,i));
  assert.deepEqual(early[4], rules.meteorSpec(20261114,4));
  assert.ok(new Set(early.map(m=>m.durationMs)).size > 8);
  assert.ok(new Set(early.map(m=>m.recoveryMs)).size > 8);
  assert.equal(new Set(early.map(m=>m.kind)).size, 3);
  const later = Array.from({length:20}, (_,i)=>rules.meteorSpec(20261114,i+70));
  assert.ok(later.reduce((s,m)=>s+m.durationMs,0) < early.reduce((s,m)=>s+m.durationMs,0));
  for(const m of [...early,...later]) assert.ok(m.chargeStartMs + m.burnMs < m.durationMs);
});

function perfectWave(run: InstanceType<typeof rules.DefenseRun>): void {
  for(let guard=0;!run.meteor;guard++){assert.ok(guard<1000 && !run.finished);run.step(10,false);}
  const m=run.meteor;
  run.step(m.chargeStartMs-run.waveElapsedMs,false);
  run.step(m.burnMs+10,true);
  run.step(0,false);
}

test('survival continues beyond 75 seconds and 25 waves while shield is intact', () => {
  const run = new rules.DefenseRun(20261114);
  for(let i=0;i<60;i++) perfectWave(run);
  assert.ok(run.elapsedMs > 75000);
  assert.equal(run.cleared,60);
  assert.equal(run.finished,false);
  assert.equal(run.integrity,100);
});

test('full misses fracture the shield and only zero health ends the run', () => {
  const run = new rules.DefenseRun(20261114);
  run.step(run.meteor!.durationMs,false);
  assert.equal(run.integrity,66);
  assert.equal(run.finished,false);
  assert.equal(run.sectors.reduce((s,n)=>s+n,0),34);
  run.step(20000,false);
  assert.equal(run.finished,true);
  assert.equal(run.reason,'destroyed');
  assert.equal(run.integrity,0);
  assert.equal(run.firstMiss,1);
  const score=run.score, time=run.elapsedMs;
  run.step(10000,true);
  assert.equal(run.score,score);
  assert.equal(run.elapsedMs,time);
});

test('partially melted meteors stay visible until their smaller core reaches the shield', () => {
  const run=new rules.DefenseRun(20261114);
  const spec=run.meteor!;
  run.step(spec.chargeStartMs,false);
  run.step(200,true);
  run.step(0,false);
  run.step(spec.durationMs-run.waveElapsedMs,false);
  assert.equal(run.integrity,100);
  assert.ok(run.meteor);
  assert.ok(rules.meteorGeometry(run.meteor,run.waveElapsedMs,run.meteor.mass).clearance>0);
  run.step(1000,false);
  assert.ok(run.integrity>66 && run.integrity<100);
});

test('holding continuously cannot automatically defend subsequent meteors', () => {
  const run=new rules.DefenseRun(20261114);
  run.step(15000,true);
  assert.equal(run.cleared,1);
  assert.equal(run.perfect,0);
  assert.ok(run.integrity<100);
});

test('three perfects charge the next successful clear and a miss removes a charge', () => {
  const run=new rules.DefenseRun(20261114);
  for(let i=0;i<3;i++)perfectWave(run);
  assert.equal(run.energy,3);
  for(let guard=0;!run.meteor;guard++){assert.ok(guard<1000 && !run.finished);run.step(10,false);}
  const m=run.meteor;
  run.step(m.chargeStartMs-run.waveElapsedMs,false);
  const events=run.step(m.burnMs+10,true);
  assert.equal(events.find(e=>e.type==='clear')?.overdrive,true);
  assert.equal(run.energy,1);
  for(let guard=0;!run.meteor;guard++){assert.ok(guard<1000 && !run.finished);run.step(10,false);}
  run.step(run.meteor.durationMs,false);
  assert.equal(run.combo,0);
  assert.equal(run.energy,0);
});

test('repeated presses cannot improve an already committed early grade', () => {
  const run=new rules.DefenseRun(20261114);
  run.step(run.meteor!.chargeStartMs+10,true);
  run.step(0,false);
  run.step(1000,true);
  assert.equal(run.early,1);
  assert.equal(run.perfect,0);
});
