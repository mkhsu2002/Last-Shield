import assert from "node:assert/strict";
import { test } from "node:test";
import * as rules from "./game-logic.ts";
import { simulateDefense } from "../../scripts/balance-sim.ts";

test("a missed first timing window returns as a real second opportunity", () => {
  const run = new rules.DefenseRun(20261114), m = run.meteor!;
  run.step(m.chargeStartMs + 1000, false);
  assert.deepEqual(run.step(0, true), [
    { type: "engage", grade: "perfect", offsetMs: 0 },
  ]);
});

test("a corrective re-press improves the same damaged core without resetting progress", () => {
  const run = new rules.DefenseRun(20261114), m = run.meteor!;
  run.step(m.chargeStartMs + 100, true);
  assert.equal(m.grade, "early");
  const mass = m.mass;
  run.step(0, false);
  assert.equal(run.meteor, m);
  run.step(900, false);
  const events = run.step(0, true);
  assert.equal(m.mass, mass);
  assert.equal(m.grade, "perfect");
  assert.ok(events.some(e => e.type === "engage" && e.grade === "perfect"));
  run.step(30, true);
  assert.ok(m.mass < mass);
  assert.equal(run.energy, 0);
});

test("retrying never downgrades an earned perfect or grants energy before a clear", () => {
  const run = new rules.DefenseRun(20261114), m = run.meteor!;
  run.step(m.chargeStartMs, false);
  run.step(50, true);
  run.step(0, false);
  run.step(350, false);
  const events = run.step(0, true);
  assert.equal(m.grade, "perfect");
  assert.ok(events.some(e => e.type === "engage" && e.retained));
  assert.equal(run.energy, 0);
  run.step(1000, true);
  assert.equal(run.perfect, 1);
  assert.equal(run.energy, 1);
});

test("a gold-caught heavy core is held away from contact until the beam finishes", () => {
  const run = atWave(41);
  const m = run.meteors.find(m => m.kind === "heavy")!;
  run.meteors = [m];
  // A later recurring gold opportunity, just before this core's contact.
  m.chargeStartMs = m.durationMs - 1000 - 60;
  run.step(m.durationMs - 60, false);
  run.step(0, true, m.id);
  const distance = rules.meteorGeometry(m, run.waveElapsedMs, m.mass).distance;
  run.step(100, true);
  assert.equal(m.grade, "perfect");
  assert.equal(rules.meteorGeometry(m, run.waveElapsedMs, m.mass).distance, distance);
  run.step(250, true);
  assert.ok(!run.meteors.includes(m), "even a heavy perfect core clears within 350ms");
  assert.equal(run.perfect, 1);
});

test("perfect arrest affects only the selected core and ends on release", () => {
  const run = atWave(3), m = run.meteor!;
  const other = run.meteors.find(x => x !== m)!;
  run.step(m.chargeStartMs, false);
  const origin = rules.meteorGeometry(m, run.waveElapsedMs, m.mass).distance;
  const otherOrigin = rules.meteorGeometry(other, run.waveElapsedMs, other.mass).distance;
  run.step(100, true);
  assert.equal(rules.meteorGeometry(m, run.waveElapsedMs, m.mass).distance, origin);
  assert.ok(rules.meteorGeometry(other, run.waveElapsedMs, other.mass).distance < otherOrigin);
  run.step(0, false);
  run.step(100, false);
  assert.ok(rules.meteorGeometry(m, run.waveElapsedMs, m.mass).distance < origin);
});

test("three large cores can be chained with a realistic release and re-press delay", () => {
  const run = atWave(5);
  for (const m of run.meteors) { m.kind = "heavy"; m.burnMs = 1050; }
  run.step(run.meteor!.chargeStartMs + 100, false);
  for (let i = 0; i < 3; i++) {
    const target = run.meteor!;
    const events = run.step(0, true);
    assert.ok(events.some(e => e.type === "engage" && e.grade === "perfect"));
    while (run.meteors.includes(target) && !run.finished) run.step(5, true);
    run.step(180, false);
  }
  assert.equal(run.integrity, 100);
  assert.equal(run.perfect, 3);
  assert.equal(run.energy, 3);
});

test("relay expires, requires a new press and never grants free energy", () => {
  const run = atWave(3);
  const first = run.meteor!;
  run.step(first.chargeStartMs, false);
  while (run.meteors.includes(first)) run.step(5, true);
  assert.ok(run.chainRemainingMs > 0);
  assert.equal(run.energy, 1);
  const next = run.meteor!;
  run.step(100, true);
  assert.equal(next.mass, 100);
  run.step(rules.CHAIN_WINDOW_MS + 1, false);
  assert.equal(run.chainRemainingMs, 0);
  next.chargeStartMs = run.waveElapsedMs - 350;
  assert.ok(run.step(0, true).some(e => e.type === "engage" && e.grade === "good"));
  assert.equal(run.energy, 1);
});

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
  assert.equal(rules.judgeTiming(-181), "early");
  assert.equal(rules.judgeTiming(-180), "perfect");
  assert.equal(rules.judgeTiming(180), "perfect");
  assert.equal(rules.judgeTiming(181), "good");
  assert.equal(rules.judgeTiming(401), "late");
  assert.equal(rules.beamPower("perfect"), 3);
  assert.equal(rules.beamPower("good"), 1.15);
  assert.ok(rules.beamPower("perfect") > 3 * rules.beamPower("early"));
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
test("continuous holding does not upgrade, but a fresh gold re-press does", () => {
  const run = new rules.DefenseRun(20261114);
  run.step(run.meteor!.chargeStartMs + 20, true);
  assert.equal(run.meteor!.grade, "early");
  run.step(0, false);
  run.step(30, true);
  assert.equal(run.meteor!.grade, "perfect");
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
test("release retains an explicitly selected damaged core even when another is more urgent", () => {
  const run = atWave(3);
  const chosen = run.meteors.find(m => m !== run.meteor)!;
  run.step(chosen.chargeStartMs + 350, false);
  run.step(100, true, chosen.id);
  const mass = chosen.mass;
  run.step(0, false);
  assert.equal(run.meteor, chosen);
  run.step(550, false);
  run.step(0, true);
  assert.equal(run.meteor, chosen);
  assert.equal(chosen.mass, mass);
  assert.equal(chosen.grade, "perfect");
});

test("perfect relay makes both valid target orders recoverable", () => {
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
  assert.equal(play(false), 2);
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
test("first storm starts with three cores, then grows through four, five and six", () => {
  assert.equal(rules.volleySpecs(20261114, 3).length, 2);
  assert.equal(rules.volleySpecs(20261114, 4).length, 2);
  assert.equal(rules.volleySpecs(20261114, 5).length, 3);
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
test("early forgiveness and later manual-blast pressure hold across thirty dates", () => {
  for (let day = 20261101; day <= 20261130; day++) {
    const bank = simulateDefense(day, "bank"),
      never = simulateDefense(day, "never"),
      coast = simulateDefense(day, "hold-early");
    assert.ok(bank.firstStormAtMs! < 16000);
    assert.equal(bank.firstStormAfter, bank.firstStormBefore);
    assert.ok(never.firstStormAfter! >= 60, "first storm is survivable without spending");
    assert.ok(coast.wave > 6, "non-perfect beginner survives first storm");
    assert.ok(bank.wave > never.wave && bank.uses > 0);
    const human = simulateDefense(day, "human");
    assert.equal(human.firstStormAfter, human.firstStormBefore,
      "early relay allows 120ms reactions plus a 160ms release interval");
    const run = new rules.DefenseRun(day), m = run.meteor!;
    run.step(m.chargeStartMs + 350, false);
    run.step(100, true);
    const mass = m.mass;
    run.step(0, false); run.step(550, false); run.step(0, true);
    assert.equal(m.mass, mass); assert.equal(m.grade, "perfect");
    run.step(400, true);
    assert.equal(run.integrity, 100); assert.equal(run.energy, 1);
  }
});


test("combo multiplier exposes every inclusive daily tier", () => {
  assert.equal(typeof rules.comboMultiplier, "function");
  for (const [combo, multiplier] of [[0, 1], [1, 1], [9, 1], [10, 2], [24, 2], [25, 5], [49, 5], [50, 10], [74, 10], [75, 25], [99, 25], [100, 50], [1000, 50]]) {
    assert.equal(rules.comboMultiplier(combo), multiplier, `combo ${combo}`);
    assert.equal(rules.comboMultiplier(combo, true), 1, `practice combo ${combo}`);
  }
});

test("a perfect clear earns its new tier after incrementing combo", () => {
  const run = new rules.DefenseRun(20261114);
  run.combo = 9;
  clearTarget(run);
  assert.equal(run.combo, 10);
  assert.equal(run.score, (200 + 90) * 2);
  assert.equal(run.energy, 1);
  assert.equal(run.integrity, 100);
});

test("each Overdrive clear crosses combo tiers sequentially including heavy points", () => {
  for (const boundary of [10, 25, 50, 75, 100]) {
    const run = atWave(41);
    run.combo = boundary - 2;
    run.energy = 3;
    const kinds = run.meteors.map(m => m.kind);
    const events = run.activateOverdrive(false).filter(e => e.type === "clear");
    assert.equal(events.length, kinds.length);
    const expected = kinds.map((kind, i) => {
      const combo = boundary - 1 + i;
      const multiplier = combo >= 100 ? 50 : combo >= 75 ? 25 : combo >= 50 ? 10 : combo >= 25 ? 5 : combo >= 10 ? 2 : 1;
      return (Math.round(100 * (kind === "heavy" ? run.storm.heavyScoreMultiplier : 1)) + Math.min(100, (combo - 1) * 10) + 200) * multiplier;
    });
    assert.deepEqual(events.map(e => e.points), expected);
    assert.equal(run.score, expected.reduce((sum, points) => sum + points, 0));
    assert.equal(run.energy, 0);
    assert.equal(run.perfect, 0);
  }
});

test("impact resets earned multiplier before the next clear", () => {
  const run = new rules.DefenseRun(20261114);
  run.combo = 100;
  run.step(run.meteor!.durationMs, false);
  assert.equal(run.combo, 0);
  clearTarget(run);
  assert.equal(run.score, 200);
  assert.equal(run.combo, 1);
});

test("practice keeps original clear points at a high combo", () => {
  const run = new rules.DefenseRun(20261114, {practice: true});
  run.combo = 99;
  clearTarget(run);
  assert.equal(run.score, 300);
  assert.equal(run.combo, 100);
});

test("high-tier scoring remains deterministic across frame partitions", () => {
  const replay = (slice: number) => {
    const run = new rules.DefenseRun(20261114);
    run.combo = 99;
    run.step(run.meteor!.chargeStartMs, false);
    const events: rules.RunEvent[] = [];
    for (let left = 400; left > 0; left -= Math.min(left, slice))
      events.push(...run.step(Math.min(left, slice), true));
    return { score: run.score, combo: run.combo, energy: run.energy,
      events: events.map(event => event.type === "clear" ? {type: event.type, grade: event.grade, points: event.points, overdrive: event.overdrive, sector: event.sector} : event) };
  };
  assert.equal(replay(400).score, 15000);
  assert.deepEqual(replay(400), replay(16));
  assert.deepEqual(replay(10), replay(16));
});

test("balance simulation reports the actual stop and unreached million threshold", () => {
  const result = simulateDefense(20261114, "never", 10, 240);
  assert.equal(result.stoppedBy, "time-limit");
  assert.equal(result.millionAtMs, null);
  assert.equal(result.millionAtWave, null);
  assert.equal(result.bestCombo, 0);
  const capped = simulateDefense(20261114, "bank", 600000, 1);
  assert.equal(capped.stoppedBy, "wave-limit");
  const lost = simulateDefense(20261114, "human");
  assert.equal(lost.stoppedBy, "destroyed");
  assert.ok(lost.bestCombo > 0);
});

test("extended balance horizon measures a real million-point run beyond wave 48", () => {
  const result = simulateDefense(20261101, "bank");
  assert.ok(result.score >= 1_000_000);
  assert.ok(result.millionAtWave! > 48);
  assert.ok(result.millionAtMs! > 0 && result.millionAtMs! <= result.elapsedMs);
  assert.equal(result.stoppedBy, "destroyed");
  assert.deepEqual(simulateDefense(20261101, "bank"), result);
});

test("balance results label ideal bots and reaction-delay simulations without claiming human proof", () => {
  for (const strategy of ["human", "human-blast"] as const) {
    const result = simulateDefense(20261114, strategy, 10);
    assert.equal(result.model, "reaction-delay-simulation");
    assert.equal(result.reactionDelayMs, 120);
    assert.equal(result.releaseDelayMs, 160);
    assert.equal(result.interpretation, "Simulation only; not evidence of human performance or native-UI play.");
  }
  const ideal = simulateDefense(20261114, "bank", 10);
  assert.equal(ideal.model, "ideal-bot");
  assert.equal(ideal.reactionDelayMs, null);
  assert.equal(ideal.releaseDelayMs, null);
  assert.equal(ideal.interpretation, "Simulation only; not evidence of human performance or native-UI play.");
});
