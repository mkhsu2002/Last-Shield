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

test('three perfects charge the next beam and a miss removes a charge', () => {
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

test('perfect precision and overdrive accelerate actual melting', () => {
  const early = new rules.DefenseRun(20261114);
  early.step(early.meteor!.chargeStartMs + 200, true);
  const perfect = new rules.DefenseRun(20261114);
  perfect.step(perfect.meteor!.chargeStartMs, false);
  perfect.step(200, true);
  assert.ok(perfect.meteor!.mass < early.meteor!.mass);
  const boosted = new rules.DefenseRun(20261114);
  boosted.energy = 3;
  boosted.step(boosted.meteor!.chargeStartMs, false);
  boosted.step(200, true);
  assert.ok(boosted.meteor!.mass < perfect.meteor!.mass);
  assert.equal(boosted.energy, 0, 'charge is spent when firing starts');
  assert.equal(boosted.meteor!.overdrive, true);
  const mass = boosted.meteor!.mass;
  boosted.step(100, false);
  assert.equal(boosted.meteor!.mass, mass);
  boosted.step(20, true);
  assert.equal(boosted.meteor!.overdrive, true, 'release does not reset a beam boost');
  assert.equal(boosted.energy, 0);
  const clear = boosted.step(100, true).find(e => e.type === 'clear');
  assert.equal(clear?.overdrive, true);
  assert.equal(boosted.energy, 1, 'a perfect boosted clear starts the next charge');
});

test('a failed overdrive beam cannot be refunded or retriggered', () => {
  const run = new rules.DefenseRun(20261114);
  run.energy = 3;
  run.step(run.meteor!.durationMs - 30, false);
  run.step(10, true);
  assert.equal(run.energy, 0);
  run.step(1000, false);
  assert.ok(run.integrity < 100);
  assert.equal(run.energy, 0);
  assert.equal(run.cleared, 0);
});

test('ten-wave storms have distinct seeded phases and readable breathers', () => {
  assert.equal(rules.stormPhase(0), 'approach');
  assert.equal(rules.stormPhase(4), 'surge');
  assert.equal(rules.stormPhase(8), 'breaker');
  assert.equal(rules.stormPhase(9), 'respite');
  assert.equal(rules.stormPhase(10), 'approach');
  for (let day = 20261101; day <= 20261130; day++) {
    for (let i = 0; i < 100; i++) {
      const spec = rules.meteorSpec(day, i);
      assert.deepEqual(spec, rules.meteorSpec(day, i));
      assert.ok(spec.chargeStartMs + spec.burnMs < spec.durationMs);
      if (i % 10 >= 4 && i % 10 <= 7) assert.ok(spec.recoveryMs >= 120 && spec.recoveryMs < 300);
      if (i % 10 === 8) assert.equal(spec.kind, 'heavy');
      if (i % 10 === 9) {
        assert.equal(spec.kind, 'normal');
        assert.ok(spec.recoveryMs >= 1200);
      }
    }
  }
});

test('impacts distinguish no input, early release, late hold and unrearmed control', () => {
  const untouched = new rules.DefenseRun(20261114);
  untouched.step(untouched.meteor!.durationMs, false);
  assert.equal(untouched.mistakes.untouched, 1);
  const released = new rules.DefenseRun(20261114);
  released.step(released.meteor!.chargeStartMs, false);
  released.step(100, true);
  released.step(5000, false);
  assert.equal(released.mistakes.released, 1);
  const late = new rules.DefenseRun(20261114);
  late.step(late.meteor!.durationMs - 50, false);
  late.step(500, true);
  assert.equal(late.mistakes.late, 1);
  const unarmed = new rules.DefenseRun(20261114);
  unarmed.step(15000, true);
  assert.ok(unarmed.mistakes.unarmed > 0);
});

test('beam outcomes remain stable across render frame partitions', () => {
  function simulate(slice: number) {
    const run = new rules.DefenseRun(20261114);
    run.energy = 3;
    run.step(run.meteor!.chargeStartMs, false);
    for (let left = 400; left > 0; left -= Math.min(left, slice)) run.step(Math.min(left, slice), true);
    return { score: run.score, energy: run.energy, cleared: run.cleared, integrity: run.integrity };
  }
  assert.deepEqual(simulate(400), simulate(10));
  assert.deepEqual(simulate(16), simulate(10));
});
