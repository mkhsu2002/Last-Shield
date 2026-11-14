import * as Phaser from "phaser";
import { context } from "@devvit/web/client";
import {
  DefenseRun,
  volleySpecs,
  stormPhase,
  RULES_VERSION,
  utcDaySeed,
} from "../shared/game-logic";
import type { RunEvent } from "../shared/game-logic";
import { SynthAudio } from "./audio";
import { element, mountGameUI, show, text } from "./game-ui";
import { readBest, storeBest } from "./records";
import type { BestRecord, RecordStorage } from "./records";
import {
  CITY_MESSAGES,
  milestone,
  PHASE_LABELS,
  retryAdvice,
  energyCopy,
} from "./coaching";
import { GAME_VERSION } from "./version";
import { drawBattlefield, FIELD } from "./battlefield";
import type { BattleEffect } from "./battlefield";

type Phase = "intro" | "playing" | "paused" | "breaking" | "results";
const KIND_NAMES = { normal: "普通核心", fast: "快速核心", heavy: "重型核心" };
mountGameUI();

class ShieldScene extends Phaser.Scene {
  private graphics!: Phaser.GameObjects.Graphics;
  private phase: Phase = "intro";
  private run = new DefenseRun(utcDaySeed(new Date()));
  private audio = new SynthAudio();
  private inputs = new Set<string>();
  private best: BestRecord | null = null;
  private storage: RecordStorage | null = null;
  private reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)")
    .matches;
  private effects: BattleEffect[] = [];
  private overdriveFlash = 0;
  private announcedOverdrives = new Set<number>();
  private feedbackMs = 0;
  private breakMs = 0;
  private previousTarget = -1;
  private previousReady = false;
  private passedBest = false;
  private sharing = false;
  private cityMilestone = 0;
  private lastResolution: "clear" | "impact" = "clear";

  constructor() {
    super("shield");
  }

  create(): void {
    this.graphics = this.add.graphics();
    try {
      this.storage = window.localStorage;
    } catch {
      /* Storage is optional. */
    }
    this.loadDay();
    element("start").addEventListener("click", () => this.startRun());
    element("retry").addEventListener("click", () => this.startRun());
    element("pause").addEventListener("click", () => this.pauseRun());
    element("resume").addEventListener("click", () => this.resumeRun());
    element("share").addEventListener("click", () => {
      void this.share();
    });
    element("sound").addEventListener("click", () => {
      this.audio.unlock();
      this.audio.muted = !this.audio.muted;
      if (!this.audio.muted) this.audio.tone(440, 880);
      text("sound", this.audio.muted ? "音效關" : "音效開");
      element("sound").setAttribute(
        "aria-label",
        this.audio.muted ? "開啟音效" : "關閉音效"
      );
      element("sound").setAttribute("aria-pressed", String(!this.audio.muted));
      element("sound").blur();
    });
    this.input.on("pointerdown", (p: Phaser.Input.Pointer) =>
      this.press("pointer-" + p.id)
    );
    this.input.on("pointerup", (p: Phaser.Input.Pointer) =>
      this.release("pointer-" + p.id)
    );
    this.input.on("pointerupoutside", (p: Phaser.Input.Pointer) =>
      this.release("pointer-" + p.id)
    );
    const fire = element<HTMLButtonElement>("fire");
    fire.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      fire.setPointerCapture(event.pointerId);
      this.press("fire-" + event.pointerId);
    });
    const fireRelease = (event: PointerEvent) =>
      this.release("fire-" + event.pointerId);
    fire.addEventListener("pointerup", fireRelease);
    fire.addEventListener("pointercancel", fireRelease);
    fire.addEventListener("lostpointercapture", fireRelease);
    const keydown = (event: KeyboardEvent) => {
      if (event.code === "Escape" && !event.repeat) {
        if (this.phase === "playing") this.pauseRun();
        else if (this.phase === "paused") this.resumeRun();
      }
      const target = event.target as HTMLElement;
      if (
        event.code !== "Space" ||
        (target?.matches("button,textarea") && target.id !== "fire")
      )
        return;
      event.preventDefault();
      if (!event.repeat) this.press("keyboard");
    };
    const keyup = (event: KeyboardEvent) => {
      if (event.code === "Space") this.release("keyboard");
    };
    const blur = () => this.pauseRun();
    const visibility = () => {
      if (document.hidden) this.pauseRun();
    };
    const cancel = () => this.releaseAll();
    window.addEventListener("keydown", keydown);
    window.addEventListener("keyup", keyup);
    window.addEventListener("blur", blur);
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("pointercancel", cancel);
    this.events.once("shutdown", () => {
      window.removeEventListener("keydown", keydown);
      window.removeEventListener("keyup", keyup);
      window.removeEventListener("blur", blur);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("pointercancel", cancel);
      this.audio.stopAll();
    });
    this.setPhase("intro");
    this.renderHUD();
  }

  private loadDay(): void {
    const stamp = String(this.run.daySeed);
    text(
      "day",
      `${stamp.slice(0, 4)}.${stamp.slice(4, 6)}.${stamp.slice(6)} UTC`
    );
    this.best = readBest(this.storage, this.run.daySeed);
    text(
      "intro-best",
      this.best
        ? `本機今日最佳 ${this.best.score.toLocaleString("zh-TW")} 分 · 第 ${
            this.best.waveReached
          } 波`
        : "按住畫面或空白鍵 · 戰績只保存在這台裝置"
    );
  }

  private setPhase(phase: Phase): void {
    this.phase = phase;
    document.querySelector<HTMLElement>(".interface")!.dataset.state = phase;
    const live =
      phase === "playing" || phase === "paused" || phase === "breaking";
    for (const [id, visible] of [
      ["intro", phase === "intro"],
      ["results", phase === "results"],
      ["paused", phase === "paused"],
      ["run-hud", live],
      ["action", live],
      ["pause", phase === "playing"],
    ] as const)
      show(id, visible);
    element<HTMLButtonElement>("fire").disabled = phase !== "playing";
  }

  private startRun(): void {
    this.releaseAll();
    this.audio.stopAll();
    this.audio.unlock();
    this.run = new DefenseRun(utcDaySeed(new Date()));
    this.loadDay();
    this.breakMs = 0;
    this.previousTarget = -1;
    this.previousReady = false;
    this.effects = [];
    this.overdriveFlash = 0;
    this.announcedOverdrives.clear();
    this.feedbackMs = 0;
    this.passedBest = false;
    this.cityMilestone = 0;
    this.lastResolution = "clear";
    text("feedback", "");
    text("share-status", "");
    show("share-box", false);
    text("city-message", "城市正等你守護。");
    this.setPhase("playing");
    element("game-container").focus({ preventScroll: true });
    this.renderHUD();
  }

  private press(source: string): void {
    if (this.phase !== "playing" || this.inputs.has(source)) return;
    this.inputs.add(source);
    this.audio.unlock();
    this.audio.tone(180, 250, 0.06, 0.025, "triangle");
    this.run.step(0, true);
  }
  private release(source: string): void {
    this.inputs.delete(source);
    if (!this.inputs.size) {
      this.audio.stop();
      if (this.phase === "playing") this.run.step(0, false);
    }
  }
  private releaseAll(): void {
    this.inputs.clear();
    this.audio.stop();
    this.run.step(0, false);
  }
  private pauseRun(): void {
    if (this.phase !== "playing") return;
    this.releaseAll();
    this.audio.stopAll();
    this.setPhase("paused");
  }
  private resumeRun(): void {
    if (this.phase !== "paused") return;
    this.releaseAll();
    this.setPhase("playing");
    element("game-container").focus({ preventScroll: true });
  }
  private feedback(message: string, tone = "normal"): void {
    text("feedback", message);
    this.feedbackMs = 1200;
    document.querySelector<HTMLElement>(".interface")!.dataset.tone = tone;
  }

  private handleEvent(event: RunEvent): void {
    if (event.type === "clear" || event.type === "impact") {
      const impact = event.type === "impact";
      this.effects.push({
        x: FIELD.x + event.point.x,
        y: FIELD.y + event.point.y,
        life: 1,
        impact,
        overdrive: event.type === "clear" && event.overdrive,
        perfect: event.type === "clear" && event.grade === "perfect",
      });
    }
    if (event.type === "clear") {
      this.lastResolution = "clear";
      const perfect = event.grade === "perfect";
      this.audio.clear(perfect, event.overdrive);
      const label = event.overdrive
        ? "超載擊碎"
        : perfect
        ? "完美擊破 · 超載 +1"
        : event.grade === "good"
        ? "核心擊碎"
        : event.grade === "early"
        ? "稍早出手 · 成功攔截"
        : "驚險攔截";
      this.feedback(
        `${label}　+${event.points}`,
        perfect || event.overdrive ? "perfect" : "normal"
      );
      const chapter = Math.floor(this.run.cleared / 10);
      if (chapter > this.cityMilestone) {
        this.cityMilestone = chapter;
        text(
          "city-message",
          CITY_MESSAGES[(chapter - 1) % CITY_MESSAGES.length]!
        );
      }
      if (!this.reducedMotion && event.overdrive)
        this.cameras.main.shake(130, 0.004);
    } else if (event.type === "impact") {
      this.lastResolution = "impact";
      this.audio.impact(event.damage);
      this.feedback(`護盾遭撞擊　−${event.damage}%`, "impact");
      if (!this.reducedMotion) {
        this.cameras.main.shake(320, 0.012);
        try {
          navigator.vibrate?.([35, 30, 65]);
        } catch {
          /* Optional. */
        }
      }
    } else if (event.type === "wave" && this.run.meteors.length > 1) {
      this.feedback(`${this.run.meteors.length} 顆同時來襲 · 先處理亮環目標`);
    } else if (event.type === "finish") {
      this.releaseAll();
      this.breakMs = 1250;
      this.audio.shatter(true);
      this.setPhase("breaking");
      text("cue", "護盾崩解");
      text("cue-help", "最後一道屏障，終於落下。");
    }
  }

  private finishRun(): void {
    this.releaseAll();
    const newBest = this.run.score > (this.best?.score ?? 0);
    const saved = storeBest(this.storage, {
      version: RULES_VERSION,
      day: this.run.daySeed,
      score: this.run.score,
      perfect: this.run.perfect,
      cleared: this.run.cleared,
      bestCombo: this.run.bestCombo,
      waveReached: this.run.waveIndex + 1,
    });
    text(
      "result-kicker",
      `守住 ${Math.floor(this.run.elapsedMs / 60000)} 分 ${
        Math.floor(this.run.elapsedMs / 1000) % 60
      } 秒 · 第 ${this.run.waveIndex + 1} 波`
    );
    text("result-title", "防線終於落下。");
    text("result-score", this.run.score.toLocaleString("zh-TW"));
    text(
      "record-note",
      saved
        ? newBest
          ? "刷新本機今日最佳"
          : `本機今日最佳 ${Math.max(
              this.best?.score ?? 0,
              this.run.score
            ).toLocaleString("zh-TW")} 分`
        : "本次戰績無法儲存，仍可繼續挑戰"
    );
    text("result-perfect", String(this.run.perfect));
    text("result-combo", String(this.run.bestCombo));
    text("result-cleared", String(this.run.cleared));
    const next =
      this.best && this.run.score < this.best.score
        ? `再多 ${this.best.score - this.run.score + 1} 分就能刷新紀錄。`
        : "";
    text(
      "result-milestone",
      `達成 ${Math.floor(this.run.cleared / 10)} 次守城里程碑 · 下個目標 ${
        milestone(this.run.cleared).target
      } 顆`
    );
    text("retry-hint", next + retryAdvice(this.run));
    this.setPhase("results");
    element("retry").focus({ preventScroll: true });
  }

  private async share(): Promise<void> {
    if (this.sharing) return;
    this.sharing = true;
    const day = String(this.run.daySeed);
    const message = `最後防線 ${GAME_VERSION} · ${day.slice(0, 4)}-${day.slice(
      4,
      6
    )}-${day.slice(6)} UTC\n${this.run.score.toLocaleString(
      "zh-TW"
    )} 分 · 完美擊破 ${this.run.perfect} 次 · 擊碎 ${
      this.run.cleared
    } 顆隕石\n守到第 ${this.run.waveIndex + 1} 波 · 最高連擊 ${
      this.run.bestCombo
    }。同一片天空，換你守守看！`;
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(
        location.hostname
      ),
      postId = context?.postId;
    const url = postId
      ? `https://www.reddit.com/comments/${postId.replace(/^t3_/, "")}`
      : local
      ? ""
      : `${location.origin}${location.pathname}`;
    const challenge = message + (url ? `\n${url}` : "");
    try {
      await navigator.clipboard.writeText(challenge);
      text("share-status", "戰績已複製，貼給朋友就能邀請挑戰。");
    } catch {
      element<HTMLTextAreaElement>("share-text").value = challenge;
      show("share-box", true);
      element<HTMLTextAreaElement>("share-text").focus();
      element<HTMLTextAreaElement>("share-text").select();
      text("share-status", "請長按上方文字，選取後複製。");
    } finally {
      this.sharing = false;
    }
  }

  update(time: number, delta: number): void {
    const dt = Math.max(0, Math.min(100, delta));
    if (this.phase !== "paused") {
      for (const fx of this.effects)
        fx.life = Math.max(0, fx.life - dt / (fx.impact ? 1000 : 600));
      this.effects = this.effects.filter((fx) => fx.life > 0);
      this.overdriveFlash = Math.max(0, this.overdriveFlash - dt / 650);
    }
    if (this.phase === "breaking") {
      this.breakMs -= dt;
      if (this.breakMs <= 0) this.finishRun();
    }
    if (this.phase === "playing") {
      this.feedbackMs = Math.max(0, this.feedbackMs - dt);
      if (!this.feedbackMs) text("feedback", "");
      for (const event of this.run.step(dt, this.inputs.size > 0))
        this.handleEvent(event);
      const m = this.run.meteor;
      if (m && this.phase === "playing") {
        if (this.previousTarget !== m.id) {
          this.previousTarget = m.id;
          this.previousReady = false;
        }
        const ready = this.run.waveElapsedMs >= m.chargeStartMs;
        if (ready && !this.previousReady) {
          this.previousReady = true;
          this.audio.tone(760, 1080, 0.1, 0.045);
        }
        if (m.firing && m.overdrive && !this.announcedOverdrives.has(m.id)) {
          this.announcedOverdrives.add(m.id);
          this.overdriveFlash = 1;
          this.audio.overdrive();
          this.feedback("超載啟動 · 雙倍威力，全域掃射", "perfect");
        }
        this.audio.beam(m.firing ? 1 - m.mass / 100 : null, m.overdrive);
      } else this.audio.stop();
      this.renderHUD();
    }
    drawBattlefield(this.graphics, {
      run: this.run,
      live: this.phase !== "intro",
      reducedMotion: this.reducedMotion,
      effects: this.effects,
      collapse:
        this.run.integrity === 0
          ? Math.max(0, Math.min(1, 1 - this.breakMs / 1250))
          : 0,
      overdriveFlash: this.overdriveFlash,
      time,
    });
  }

  private renderHUD(): void {
    const run = this.run,
      m = run.meteor,
      active = !!(m?.firing && m.overdrive),
      ui = document.querySelector<HTMLElement>(".interface")!;
    text("score", run.score.toLocaleString("zh-TW"));
    text("clock", `${run.integrity}%`);
    element("clock").style.color =
      run.integrity <= 34 ||
      (this.lastResolution === "impact" && this.feedbackMs > 0)
        ? "#ffad8e"
        : "#edf5ff";
    text("combo", `連擊 ${run.combo}`);
    text("perfect-count", `完美 ${run.perfect}`);
    text("wave", `第 ${run.waveIndex + 1} 波`);
    element("run-progress").style.width = `${run.integrity}%`;
    element("run-progress").style.background =
      run.integrity <= 34 ? "#ff8b6a" : "#78e5f2";
    ui.dataset.energy = active
      ? "active"
      : run.energy === 3
      ? "ready"
      : "charging";
    ui.dataset.firing = String(!!m?.firing);
    const energy = energyCopy(run.energy, active);
    text("energy-label", energy.title);
    text("energy-help", energy.help);
    element("energy").setAttribute("aria-valuenow", String(run.energy));
    element("energy").setAttribute(
      "aria-valuetext",
      active ? "超載掃射中，能量已使用" : `${run.energy}／3，完美擊破可集氣`
    );
    element("energy")
      .querySelectorAll("i")
      .forEach((el, i) => el.classList.toggle("lit", i < run.energy || active));
    if (this.best && run.score > this.best.score && !this.passedBest) {
      this.passedBest = true;
      this.feedback("突破本機今日最佳", "perfect");
    }
    text(
      "target",
      this.best
        ? run.score > this.best.score
          ? `已刷新今日最佳 · 前次守到第 ${this.best.waveReached} 波`
          : `差 ${this.best.score - run.score + 1} 分刷新紀錄 · 前次第 ${
              this.best.waveReached
            } 波`
        : "同一天，相同來襲序列 · 創下你的守城紀錄"
    );
    text(
      "storm",
      `風暴 ${Math.floor(run.waveIndex / 10) + 1} · ${
        PHASE_LABELS[stormPhase(run.waveIndex)]
      }`
    );
    text(
      "next-core",
      `場上 ${run.meteors.length} 顆 · 下波 ${
        volleySpecs(run.daySeed, run.waveIndex + 1).length
      } 顆`
    );
    const goal = milestone(run.cleared);
    text("milestone", `擊碎 ${run.cleared}／${goal.target} 顆`);
    element("milestone-fill").style.width = `${goal.progress * 10}%`;
    if (this.phase === "breaking") return;
    if (!m) {
      const hit = this.lastResolution === "impact";
      text("cue", hit ? "護盾受創，準備迎擊" : "核心擊碎，放開準備");
      text(
        "cue-help",
        hit
          ? "下一顆仍可攔截。先放開，再抓準時機。"
          : stormPhase(run.waveIndex) === "respite"
          ? "喘口氣。下一場風暴就要來了。"
          : "先放開，再迎擊下一波。"
      );
      text("fire-label", hit ? "準備迎擊" : "放開準備");
      text("fire-detail", "等待下一波來襲");
      return;
    }
    const ready = run.waveElapsedMs >= m.chargeStartMs;
    if (m.requireRelease) {
      text("cue", "先放開，再迎擊");
      text("cue-help", "一直按住不會自動換目標。放開後再按一次。");
      text("fire-label", "放開換目標");
      text("fire-detail", `還有 ${run.meteors.length} 顆隕石`);
    } else if (m.firing) {
      text(
        "cue",
        `${
          active ? "超載掃射" : m.grade === "perfect" ? "完美光束" : "融解中"
        } ${Math.round(100 - m.mass)}%`
      );
      text(
        "cue-help",
        active ? "雙倍威力，所有來襲隕石一起融解。" : "持續按住，直到核心爆裂。"
      );
      text("fire-label", "保持按住");
      text("fire-detail", active ? "全域超載掃射中" : "核心擊碎後再放開");
    } else if (!ready) {
      text("cue", this.inputs.size ? "鎖定中，繼續按住" : "看準圓環");
      text("cue-help", `自動鎖定：${KIND_NAMES[m.kind]} · 圓環亮起時按住。`);
      text("fire-label", "按住發射");
      text(
        "fire-detail",
        run.energy === 3 ? "超載就緒，下次發射自動啟動" : "圓環重合，可完美擊破"
      );
    } else {
      text("cue", "就是現在，按住！");
      text("cue-help", "按住直到核心擊碎；完美時機可替超載集氣。");
      text("fire-label", run.energy === 3 ? "按住，啟動超載" : "按住發射");
      text(
        "fire-detail",
        run.energy === 3 ? "雙倍光束＋全域掃射" : "持續按住，不要連點"
      );
    }
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: "canvas-host",
  backgroundColor: "#070f20",
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: FIELD.width,
    height: FIELD.height,
  },
  scene: [ShieldScene],
  render: { antialias: true },
  audio: { noAudio: true },
});
