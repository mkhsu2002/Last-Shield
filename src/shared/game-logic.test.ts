import assert from "node:assert/strict";
import { test } from "node:test";
import * as rules from "./game-logic.ts";
import { simulateDefense } from "../../scripts/balance-sim.ts";

function atWave(wave: number, day = 20261114) {
  const run = new rules.DefenseRun(day);
  run.waveIndex = wave;
  run.meteors = rules.volleySpecs(day, wave).map((spec, i) => ({
    ...spec,
    id: wave * 6 + i,
    mass: 100,
    grade: null,
    pressedGrade: "early" as const,
    requireRelease: false,
    firing: false,
    overdrive: false,
    releasedEarly: false,
  }));
  return run;
}
function clearTarget(run: rules.DefenseRun) {
  while (!run.meteor) run.step(10, false);
  const m = run.meteor!;
  run.step(Math.max(0, m.chargeStartMs - run.waveElapsedMs), false);
  for (let i = 0; run.meteors.includes(m); i++) {
    assert.ok(i < 1000);
    run.step(5, true);
  }
  run.step(0, false);
}

test("precision has explicit inclusive boundaries and combat power", () => {
  assert.equal(rules.judgeTiming(-121), "early");
  assert.equal(rules.judgeTiming(-120), "perfect");
  assert.equal(rules.judgeTiming(120), "perfect");
  assert.equal(rules.judgeTiming(121), "good");
  assert.equal(rules.judgeTiming(451), "late");
  assert.equal(rules.beamPower("perfect"), 3);
  assert.equal(rules.beamPower("good"), 1);
  assert.ok(rules.beamPower("perfect") > 4 * rules.beamPower("early"));
});
test("first hold reports its exact timing immediately before melting", () => {
  const run = new rules.DefenseRun(20261114);
  run.step(run.meteor!.chargeStartMs - 60, false);
  assert.deepEqual(run.step(0, true), [
    { type: "engage", grade: "perfect", offsetMs: -60 },
  ]);
  assert.equal(run.perfect, 0);
  assert.equal(run.energy, 0);
});
test("three perfect clears bank energy and ordinary attacks never auto-spend it", () => {
  const run = new rules.DefenseRun(20261114);
  for (let i = 0; i < 3; i++) clearTarget(run);
  assert.equal(run.energy, 3);
  while (!run.meteor) run.step(10, false);
  run.step(run.meteor!.chargeStartMs, false);
  run.step(100, true);
  assert.equal(run.energy, 3);
  assert.equal(run.meteor!.overdrive, false);
});
test("earned energy survives an impact until explicitly spent", () => {
  for (const energy of [1, 2, 3]) {
    const run = new rules.DefenseRun(20261114);
    run.energy = energy;
    run.step(run.meteor!.durationMs, false);
    assert.equal(run.energy, energy);
    assert.equal(run.integrity, 66);
  }
});
test("manual blast clears all six targets, costs once and awards no perfect charge", () => {
  const run = atWave(41);
  run.energy = 3;
  const events = run.activateOverdrive(false);
  assert.equal(events.filter((e) => e.type === "clear").length, 6);
  assert.deepEqual(events.at(-1), { type: "overdrive", cleared: 6 });
  assert.equal(run.meteors.length, 0);
  assert.equal(run.energy, 0);
  assert.equal(run.perfect, 0);
  assert.equal(run.overdriveUses, 1);
  assert.equal(run.overdriveCleared, 6);
  assert.deepEqual(run.activateOverdrive(false), []);
});
test("empty, insufficient and finished runs cannot waste a manual charge", () => {
  const run = new rules.DefenseRun(20261114);
  run.energy = 2;
  assert.deepEqual(run.activateOverdrive(false), []);
  assert.equal(run.energy, 2);
  run.meteors = [];
  run.energy = 3;
  assert.deepEqual(run.activateOverdrive(false), []);
  assert.equal(run.energy, 3);
  run.finished = true;
  assert.deepEqual(run.activateOverdrive(false), []);
});
test("manual blast can interrupt a held beam but cannot auto-fire into a later wave", () => {
  const run = atWave(3);
  run.energy = 3;
  run.step(run.meteor!.chargeStartMs, false);
  run.step(100, true);
  run.activateOverdrive(true);
  run.step(1500, true);
  assert.ok(run.meteor);
  assert.equal(run.meteor!.mass, 100);
  assert.equal(run.meteor!.requireRelease, true);
});
test("perfect timing really melts faster than early holding", () => {
  const early = new rules.DefenseRun(20261114),
    perfect = new rules.DefenseRun(20261114);
  early.step(early.meteor!.chargeStartMs + 200, true);
  perfect.step(perfect.meteor!.chargeStartMs, false);
  perfect.step(200, true);
  assert.ok(perfect.meteor!.mass < early.meteor!.mass - 40);
  assert.equal(early.energy, 0);
});
test("repeated holds cannot upgrade an already effective early shot", () => {
  const run = new rules.DefenseRun(20261114);
  run.step(run.meteor!.chargeStartMs + 20, true);
  run.step(0, false);
  run.step(30, true);
  assert.equal(run.meteor!.grade, "early");
  assert.equal(run.perfect, 0);
});
test("holding one button continuously cannot defend an entire field", () => {
  const run = new rules.DefenseRun(20261114);
  run.step(20000, true);
  assert.equal(run.cleared, 1);
  assert.equal(run.perfect, 0);
  assert.ok(run.integrity < 100);
});
test("a normal beam locks one core and requires release before switching", () => {
  const run = atWave(3),
    target = run.meteor!,
    other = run.meteors.find((m) => m !== target)!;
  run.step(target.chargeStartMs, false);
  run.step(100, true);
  assert.equal(run.meteor, target);
  assert.equal(other.mass, 100);
  run.step(300, true);
  assert.ok(!run.meteors.includes(target));
  assert.equal(other.mass, 100);
  assert.equal(run.meteor!.requireRelease, true);
  run.step(0, false);
  run.step(50, true);
  assert.ok(other.mass < 100);
});
test("an explicit target can override auto-aim for the next fresh hold", () => {
  const run = atWave(3),
    other = run.meteors.find((m) => m !== run.meteor)!;
  run.step(0, true, other.id);
  assert.equal(run.meteor, other);
});
test("choosing an earlier golden target can earn more energy than default priority", () => {
  const play = (choose: boolean) => {
    const run = atWave(3);
    for (let i = 0; i < 2; i++) {
      const target = choose
        ? [...run.meteors].sort((a, b) => a.chargeStartMs - b.chargeStartMs)[0]!
        : run.meteor!;
      run.step(Math.max(0, target.chargeStartMs - run.waveElapsedMs), false);
      run.step(0, true, target.id);
      while (run.meteors.includes(target)) run.step(5, true);
      run.step(0, false);
    }
    return run.energy;
  };
  assert.equal(play(true), 2);
  assert.equal(play(false), 1);
});
test("target identities stay unique as six-core volleys advance", () => {
  const run = new rules.DefenseRun(20261114),
    seen = new Set<number>();
  for (let wave = 0; wave < 20; wave++) {
    while (!run.meteor) run.step(10, false);
    for (const m of run.meteors) {
      assert.ok(!seen.has(m.id));
      seen.add(m.id);
    }
    run.energy = 3;
    run.activateOverdrive(false);
  }
});
test("first real storm is four cores, later storms reach five and six", () => {
  assert.equal(rules.volleySpecs(20261114, 3).length, 2);
  assert.equal(rules.volleySpecs(20261114, 4).length, 3);
  assert.equal(rules.volleySpecs(20261114, 5).length, 4);
  assert.equal(rules.volleySpecs(20261114, 23).length, 5);
  assert.equal(rules.volleySpecs(20261114, 41).length, 6);
});
test("daily volleys are seeded, spatially distinct and have genuinely conflicting deadlines", () => {
  for (let day = 20261101; day <= 20261130; day++)
    for (let wave = 0; wave < 60; wave++) {
      const specs = rules.volleySpecs(day, wave);
      assert.deepEqual(specs, rules.volleySpecs(day, wave));
      assert.equal(new Set(specs.map((m) => m.sector)).size, specs.length);
      for (const m of specs)
        assert.ok(m.chargeStartMs + m.burnMs / 3 < m.durationMs);
      if (wave % 6 === 5) {
        assert.ok(
          Math.max(...specs.map((m) => m.durationMs)) -
            Math.min(...specs.map((m) => m.durationMs)) <
            500
        );
        assert.ok(
          Math.max(...specs.map((m) => m.chargeStartMs)) -
            Math.min(...specs.map((m) => m.chargeStartMs)) <
            300
        );
      }
    }
});
test("geometry touches the shield only at real full-core contact", () => {
  for (let i = 0; i < 50; i++) {
    const m = rules.meteorSpec(20261114, i);
    assert.ok(rules.meteorGeometry(m, m.durationMs - 1, 100).clearance > 0);
    assert.ok(
      Math.abs(rules.meteorGeometry(m, m.durationMs, 100).clearance) < 0.00001
    );
  }
  const run = new rules.DefenseRun(20261114),
    deadline = run.meteor!.durationMs;
  run.step(deadline - 1, false);
  assert.equal(run.integrity, 100);
  run.step(1, false);
  assert.equal(run.integrity, 66);
});
test("partial melting buys visible clearance and reduces collision damage", () => {
  const run = new rules.DefenseRun(20261114),
    m = run.meteor!;
  run.step(m.chargeStartMs, false);
  run.step(100, true);
  run.step(0, false);
  run.step(m.durationMs - run.waveElapsedMs, false);
  assert.equal(run.integrity, 100);
  assert.ok(rules.meteorGeometry(m, run.waveElapsedMs, m.mass).clearance > 0);
  run.step(1000, false);
  assert.ok(run.integrity > 66 && run.integrity < 100);
});
test("simultaneous impacts are logged separately, and fatal damage freezes state", () => {
  const run = atWave(3);
  run.integrity = 50;
  for (const m of run.meteors) m.durationMs = 2000;
  const events = run.step(4000, false);
  assert.equal(events.filter((e) => e.type === "impact").length, 2);
  assert.equal(events.filter((e) => e.type === "finish").length, 1);
  assert.equal(run.integrity, 0);
  const time = run.elapsedMs;
  assert.deepEqual(run.step(1000, true), []);
  assert.equal(run.elapsedMs, time);
});
test("independent target failure does not interrupt a locked beam", () => {
  const run = atWave(3),
    target = run.meteor!,
    other = run.meteors.find((m) => m !== target)!;
  run.step(target.chargeStartMs, false);
  run.step(100, true);
  other.durationMs = run.waveElapsedMs + 40;
  const mass = target.mass;
  run.step(50, true);
  assert.equal(run.integrity, 66);
  assert.equal(run.meteor, target);
  assert.ok(target.mass < mass);
  assert.equal(target.requireRelease, false);
});
test("beam results do not depend on frame partitioning", () => {
  const simulate = (slice: number) => {
    const run = new rules.DefenseRun(20261114);
    run.energy = 3;
    run.step(run.meteor!.chargeStartMs, false);
    for (let left = 400; left > 0; left -= Math.min(left, slice))
      run.step(Math.min(left, slice), true);
    return {
      score: run.score,
      energy: run.energy,
      masses: run.meteors.map((m) => Math.round(m.mass * 10000)),
    };
  };
  assert.deepEqual(simulate(400), simulate(16));
  assert.deepEqual(simulate(10), simulate(16));
});
test("pressure grows without making burn time shrink alongside flight time", () => {
  assert.ok(rules.difficultyScale(300) < rules.difficultyScale(90));
  assert.ok(rules.difficultyScale(1000) < rules.difficultyScale(300));
  for (const wave of [6, 60, 300])
    assert.equal(rules.meteorSpec(20261114, wave).burnMs, 900);
});
test("the same crisis rewards planning across thirty dates, with context-dependent early spending", () => {
  const earlyLosses: number[] = [];
  for (let day = 20261101; day <= 20261130; day++) {
    const bank = simulateDefense(day, "bank"),
      early = simulateDefense(day, "early"),
      never = simulateDefense(day, "never"),
      coast = simulateDefense(day, "hold-early");
    assert.ok(bank.firstStormAtMs! < 15000);
    assert.equal(bank.firstStormAfter, bank.firstStormBefore);
    assert.ok(bank.firstStormAfter! > never.firstStormAfter! + 60);
    assert.ok(coast.finished && coast.wave <= 6);
    assert.ok(never.finished);
    assert.ok(bank.uses > 0);
    earlyLosses.push(early.firstStormBefore! - early.firstStormAfter!);
    if (day === 20261114) {
      assert.equal(bank.firstStormAfter, 100);
      assert.equal(early.firstStormAfter, 20);
      assert.equal(never.firstStormAfter, 20);
    }
  }
  assert.ok(
    earlyLosses.some((loss) => loss === 0),
    "early spending can recover on some patterns"
  );
  assert.ok(
    earlyLosses.some((loss) => loss >= 70),
    "early spending has a real cost on other patterns"
  );
});
