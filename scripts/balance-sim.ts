import {
  DefenseRun,
  contactInMs,
  stormPhase,
} from "../src/shared/game-logic.ts";

export type Strategy =
  | "bank" | "early" | "never" | "hold-early" | "retry"
  | "human" | "human-blast";
export function simulateDefense(
  day: number,
  strategy: Strategy,
  maxMs = 600000,
  maxWaves = 240,
  options: {practice?: boolean} = {}
) {
  const run = new DefenseRun(day, options);
  const reactionDelayModel = strategy === "human" || strategy === "human-blast";
  const reactionDelayMs = 120, releaseDelayMs = 160;
  const provenance = {
    model: reactionDelayModel ? "reaction-delay-simulation" : "ideal-bot",
    reactionDelayMs: reactionDelayModel ? reactionDelayMs : null,
    releaseDelayMs: reactionDelayModel ? releaseDelayMs : null,
    interpretation: "Simulation only; not evidence of human performance or native-UI play.",
  };
  let millionAtMs: number | null = null, millionAtWave: number | null = null;
  const observeMillion = () => {
    if (millionAtMs === null && run.score > 1_000_000) {
      millionAtMs = Math.round(run.elapsedMs);
      millionAtWave = run.waveIndex + 1;
    }
  };
  let held = false;
  let releaseAt = 0, nextPressAt = 0, goldSeenAt: number | null = null;
  let firstStormBefore: number | null = null,
    firstStormAfter: number | null = null;
  let firstStormAtMs: number | null = null;
  for (
    let ticks = 0;
    ticks < maxMs / 10 && !run.finished && run.waveIndex < maxWaves;
    ticks++
  ) {
    observeMillion();
    if (run.waveIndex === 5 && firstStormBefore === null) {
      firstStormBefore = run.integrity;
      firstStormAtMs = run.elapsedMs;
    }
    if (run.waveIndex > 5 && firstStormAfter === null)
      firstStormAfter = run.integrity;
    const target = run.meteor;
    if (strategy === "human" || strategy === "human-blast") {
      if (held && (!target || target.requireRelease))
        releaseAt = Math.min(releaseAt, run.elapsedMs + reactionDelayMs);
      if (held && run.elapsedMs >= releaseAt) {
        run.step(0, false);
        held = false;
        nextPressAt = run.elapsedMs + releaseDelayMs;
        goldSeenAt = null;
      }
      const imminent = Math.min(
        ...run.meteors.map(m => contactInMs(m, run.waveElapsedMs, m.mass))
      );
      if (strategy === "human-blast" && run.energy === 3 && imminent < 400) {
        run.activateOverdrive(held);
      } else if (!held && target && run.elapsedMs >= nextPressAt) {
        if (Math.abs(run.timingOffset(target)) <= 180) {
          goldSeenAt ??= run.elapsedMs;
          if (run.elapsedMs - goldSeenAt >= reactionDelayMs) {
            run.step(0, true);
            held = true;
            releaseAt = Infinity;
          }
        } else goldSeenAt = null;
      }
      run.step(10, held);
      continue;
    }
    if (!target || target.requireRelease) {
      run.step(0, false);
      held = false;
    }
    const nearest = Math.min(
      ...run.meteors.map((m) => contactInMs(m, run.waveElapsedMs, m.mass))
    );
    const emergency =
      (strategy === "bank" || strategy === "retry") &&
      stormPhase(run.waveIndex) === "storm" &&
      nearest <= 350;
    const spendEarly = strategy === "early" && run.waveIndex >= 3;
    if (run.energy === 3 && (emergency || spendEarly) && run.meteors.length) {
      run.activateOverdrive(held);
      run.step(0, false);
      held = false;
    } else if (target && held && strategy === "retry" && target.grade !== "perfect" && Math.abs(run.timingOffset(target)) <= 80) {
      run.step(0, false);
      run.step(0, true);
    } else if (target && !held && !target.requireRelease) {
      const saveForStorm =
        (strategy === "bank" || strategy === "retry") &&
        stormPhase(run.waveIndex) === "storm" &&
        run.energy === 3;
      if (
        !saveForStorm &&
        (strategy === "hold-early" || run.waveElapsedMs >= target.chargeStartMs + (strategy === "retry" ? 350 : 0))
      ) {
        run.step(0, true);
        held = true;
      }
    }
    run.step(10, held);
  }
  observeMillion();
  if (firstStormAfter === null && firstStormBefore !== null)
    firstStormAfter = run.integrity;
  return {
    day,
    strategy,
    ...provenance,
    storm: options.practice ? "neutral" : run.storm.id,
    score: run.score,
    bestCombo: run.bestCombo,
    millionAtMs,
    millionAtWave,
    stoppedBy: run.finished ? "destroyed" : run.waveIndex >= maxWaves ? "wave-limit" : "time-limit",
    health: run.integrity,
    wave: run.waveIndex + 1,
    elapsedMs: Math.round(run.elapsedMs),
    perfect: run.perfect,
    cleared: run.cleared,
    uses: run.overdriveUses,
    blastClears: run.overdriveCleared,
    firstStormAtMs: firstStormAtMs === null ? null : Math.round(firstStormAtMs),
    firstStormBefore,
    firstStormAfter,
    finished: run.finished,
  };
}

if (process.argv[1]?.endsWith("balance-sim.ts")) {
  // Thirty real November dates cover every daily storm profile. The larger cap
  // avoids treating the old 48-wave simulation cutoff as a gameplay ceiling.
  const days = Array.from({length: 30}, (_, i) => 20261101 + i);
  const strategies: Strategy[] = ["bank", "early", "never", "hold-early", "retry", "human", "human-blast"];
  const runs = days.flatMap(day => strategies.map(strategy => simulateDefense(day, strategy)));
  const summary = strategies.map(strategy => {
    const samples = runs.filter(run => run.strategy === strategy);
    return {
      strategy,
      model: samples[0]!.model,
      reactionDelayMs: samples[0]!.reactionDelayMs,
      releaseDelayMs: samples[0]!.releaseDelayMs,
      interpretation: samples[0]!.interpretation,
      days: samples.length,
      minScore: Math.min(...samples.map(run => run.score)),
      maxScore: Math.max(...samples.map(run => run.score)),
      millionRuns: samples.filter(run => run.millionAtMs !== null).length,
      minWave: Math.min(...samples.map(run => run.wave)),
      maxWave: Math.max(...samples.map(run => run.wave)),
      maxCombo: Math.max(...samples.map(run => run.bestCombo)),
      destroyed: samples.filter(run => run.finished).length,
      capped: samples.filter(run => !run.finished).length,
    };
  });
  console.log(JSON.stringify({limits: {maxMs: 600000, maxWaves: 240}, summary, runs}, null, 2));
}
