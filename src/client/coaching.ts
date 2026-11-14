import type { Mistakes, StormPhase } from "../shared/game-logic.ts";

export const PHASE_LABELS: Record<StormPhase, string> = {
  approach: "前線推進",
  surge: "密集來襲",
  breaker: "重型突破",
  respite: "短暫平靜",
};
export const CITY_MESSAGES = [
  "城市的燈火，因你而亮。",
  "又一場風暴，被擋在城外。",
  "護盾之下，生活仍在繼續。",
];

export function energyCopy(
  energy: number,
  active: boolean
): { title: string; help: string } {
  return active
    ? { title: "超載掃射中", help: "雙倍光束威力，同時融解所有隕石。" }
    : energy === 3
    ? { title: "超載已就緒", help: "下次按住自動啟動：雙倍威力＋全域掃射。" }
    : {
        title: `超載蓄能 ${energy}／3`,
        help: "完美擊破 +1；集滿後，下次光束雙倍並掃射全場。",
      };
}

export function milestone(cleared: number): {
  target: number;
  progress: number;
} {
  return {
    target: (Math.floor(cleared / 10) + 1) * 10,
    progress: cleared % 10,
  };
}

export function retryAdvice(run: {
  mistakes: Mistakes;
  early: number;
  late: number;
}): string {
  const causes = ["unarmed", "released", "late", "untouched"] as const;
  const dominant = causes.reduce((best, cause) =>
    run.mistakes[cause] > run.mistakes[best] ? cause : best
  );
  if (run.mistakes[dominant] > 0) {
    return {
      unarmed: "擊碎一顆後先放開，再按住攻擊下一顆；一直按住不會自動換目標。",
      released: "按住直到核心爆裂再放開；縮小的隕石仍會撞傷護盾。",
      late: "試著早一點，在圓環重合時按住；完美光束融解更快，還能替超載集氣。",
      untouched: "鎖定圓環亮起時，按住發射。系統會替你鎖定最危險的隕石。",
    }[dominant];
  }
  return run.early > run.late
    ? "試著晚一點，在圓環剛好重合時按住，就能完美擊破並替超載集氣。"
    : run.late > 0
    ? "提早一點跟上圓環，讓完美光束替你多爭取時間。"
    : "累積三次完美擊破，下次光束就會自動雙倍加強，並同時掃射所有隕石。";
}
