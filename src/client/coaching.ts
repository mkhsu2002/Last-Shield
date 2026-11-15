import type { Mistakes, StormPhase } from "../shared/game-logic.ts";

export const PHASE_LABELS: Record<StormPhase, string> = {
  approach: "前線推進",
  surge: "密集來襲",
  breaker: "重型突破",
  respite: "短暫平靜",
  storm: "碎星潮",
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
    ? { title: "超載震爆", help: "全場威脅已清除。重新累積完美擊破。" }
    : energy === 3
    ? {
        title: "超載已就緒",
        help: "按「超載震爆」才會使用，立即清除場上所有隕石。",
      }
    : {
        title: `超載蓄能 ${energy}／3`,
        help: "完美起手並擊碎 +1；集滿後，可手動震爆全場。",
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
  energy?: number;
}): string {
  if (run.energy === 3)
    return "這次結束時，超載仍是滿的。多顆快要撞上時，按「超載震爆」能立即清場；普通攻擊不會替你使用。";
  const causes = ["unarmed", "released", "late", "untouched"] as const;
  const dominant = causes.reduce((best, cause) =>
    run.mistakes[cause] > run.mistakes[best] ? cause : best
  );
  if (run.mistakes[dominant] > 0) {
    return {
      unarmed: "擊碎一顆後先放開，再按住攻擊下一顆；一直按住不會自動換目標。",
      released: "融解進度會保留；金色循環時可放開重按補救，再按到核心爆裂。",
      late: "金色每秒循環；錯過可等下一輪重按補救。完美光束 3 倍，擊碎後超載 +1。",
      untouched: "鎖定圓環變金色時，按住發射。系統會替你鎖定最危險的隕石。",
    }[dominant];
  }
  return run.early > run.late
    ? "試著晚一點，在圓環變金色時按下，取得 3 倍光束，擊碎後替超載集氣。"
    : run.late > 0
    ? "提早一點跟上圓環，讓完美光束替你多爭取時間。"
    : "超載可以保留。多顆快要撞上時，再按「超載震爆」清場。";
}
