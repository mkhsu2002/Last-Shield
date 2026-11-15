import {
  DefenseRun,
  contactInMs,
  stormPhase,
  timingOffset,
} from "../src/shared/game-logic.ts";

export type Strategy = "bank" | "early" | "never" | "hold-early" | "retry";
export function simulateDefense(
  day: number,
  strategy: Strategy,
  maxMs = 90000
) {
  const run = new DefenseRun(day);
  let held = false;
  let firstStormBefore: number | null = null,
    firstStormAfter: number | null = null;
  let firstStormAtMs: number | null = null;
  for (
    let ticks = 0;
    ticks < maxMs / 10 && !run.finished && run.waveIndex < 24;
    ticks++
  ) {
    if (run.waveIndex === 5 && firstStormBefore === null) {
      firstStormBefore = run.integrity;
      firstStormAtMs = run.elapsedMs;
    }
    if (run.waveIndex > 5 && firstStormAfter === null)
      firstStormAfter = run.integrity;
    const target = run.meteor;
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
    } else if (target && held && strategy === "retry" && target.grade !== "perfect" && Math.abs(timingOffset(target, run.waveElapsedMs)) <= 80) {
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
  if (firstStormAfter === null && firstStormBefore !== null)
    firstStormAfter = run.integrity;
  return {
    day,
    strategy,
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
  const days = [20261114, 20261115, 20261116, 20261117, 20261118];
  console.log(
    JSON.stringify(
      days.flatMap((day) =>
        (["bank", "early", "never", "hold-early", "retry"] as Strategy[]).map(
          (strategy) => simulateDefense(day, strategy)
        )
      ),
      null,
      2
    )
  );
}
