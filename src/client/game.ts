import * as Phaser from "phaser";
import { context } from "@devvit/web/client";
import {
  DefenseRun,
  volleySpecs,
  stormPhase,
  RULES_VERSION,
  utcDaySeed,
  meteorGeometry,
  contactInMs,
  PERFECT_WINDOW_MS,
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

type Phase =
  | "intro"
  | "playing"
  | "paused"
  | "breaking"
  | "results"
  | "trained";
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
  private practiceMode = false;
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
    element("practice").addEventListener("click", () => this.startRun(true));
    element("practice-again").addEventListener("click", () =>
      this.startRun(true)
    );
    element("practice-start").addEventListener("click", () => this.startRun());
    const special = element("overdrive");
    special.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      event.preventDefault();
      this.activateOverdrive();
    });
    // Keyboard and assistive clicks have no pointer detail. Pointer activation
    // already happened on contact, so its later click must never spend twice.
    special.addEventListener("click", (event) => {
      if (event.detail === 0) this.activateOverdrive();
    });
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
    const canvas = this.game.canvas;
    const canvasDown = (event: PointerEvent) => {
      event.preventDefault();
      canvas.setPointerCapture(event.pointerId);
      const rect = canvas.getBoundingClientRect();
      const x =
        ((event.clientX - rect.left) * FIELD.width) / rect.width - FIELD.x;
      const y =
        ((event.clientY - rect.top) * FIELD.height) / rect.height - FIELD.y;
      let targetId: number | undefined,
        nearest = Infinity;
      for (const m of this.run.meteors) {
        const point = meteorGeometry(m, this.run.waveElapsedMs, m.mass);
        const distance = Math.hypot(x - point.x, y - point.y);
        if (distance <= Math.max(point.radius + 16, 32) && distance < nearest) {
          nearest = distance;
          targetId = m.id;
        }
      }
      this.press("canvas-" + event.pointerId, targetId);
    };
    const canvasRelease = (event: PointerEvent) =>
      this.release("canvas-" + event.pointerId);
    canvas.addEventListener("pointerdown", canvasDown);
    canvas.addEventListener("pointerup", canvasRelease);
    canvas.addEventListener("pointercancel", canvasRelease);
    canvas.addEventListener("lostpointercapture", canvasRelease);
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
        event.code === "KeyE" &&
        !event.repeat &&
        !target?.matches("textarea,input")
      ) {
        event.preventDefault();
        this.activateOverdrive();
        return;
      }
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
      canvas.removeEventListener("pointerdown", canvasDown);
      canvas.removeEventListener("pointerup", canvasRelease);
      canvas.removeEventListener("pointercancel", canvasRelease);
      canvas.removeEventListener("lostpointercapture", canvasRelease);
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
      ["trained", phase === "trained"],
      ["run-hud", live],
      ["action", live],
      ["pause", phase === "playing"],
    ] as const)
      show(id, visible);
    element<HTMLButtonElement>("fire").disabled = phase !== "playing";
    element<HTMLButtonElement>("overdrive").disabled =
      phase !== "playing" ||
      this.practiceMode ||
      this.run.energy < 3 ||
      this.run.meteors.length === 0;
  }

  private startRun(practice = false): void {
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
    this.practiceMode = practice;
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

  private activateOverdrive(): void {
    if (this.phase !== "playing" || this.practiceMode) return;
    for (const event of this.run.activateOverdrive(this.inputs.size > 0))
      this.handleEvent(event);
    this.renderHUD();
  }

  private press(source: string, targetId?: number): void {
    if (this.phase !== "playing" || this.inputs.has(source)) return;
    this.inputs.add(source);
    this.audio.unlock();
    this.audio.tone(180, 250, 0.06, 0.025, "triangle");
    for (const event of this.run.step(0, true, targetId))
      this.handleEvent(event);
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
    if (event.type === "engage") {
      const offset = Math.abs(event.offsetMs / 1000).toFixed(2);
      const label =
        event.grade === "perfect"
          ? "完美起手！光束 3 倍"
          : event.offsetMs < 0
          ? `早了 ${offset} 秒 · 等金色再按會更強`
          : `慢了 ${offset} 秒 · 本次不是完美起手`;
      this.feedback(label, event.grade === "perfect" ? "perfect" : "normal");
      if (event.grade === "perfect") this.audio.tone(990, 1480, 0.12, 0.06);
    } else if (event.type === "overdrive") {
      this.audio.overdrive();
      this.overdriveFlash = 1;
      this.feedback(`超載震爆！清除 ${event.cleared} 顆隕石`, "perfect");
      if (!this.reducedMotion) this.cameras.main.shake(180, 0.006);
    } else if (event.type === "clear") {
      this.lastResolution = "clear";
      const perfect = event.grade === "perfect";
      if (!event.overdrive) this.audio.clear(perfect, false);
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
      if (this.practiceMode) {
        this.releaseAll();
        this.setPhase("trained");
        text("practice-title", perfect ? "這就是完美起手。" : "起手太早了。");
        text(
          "practice-explanation",
          perfect
            ? "你在金色重合時按下，用 3 倍光束擊碎了核心，並得到 1 格能量。正式守城的金色時機不會停留；抓準它，將超載留給真正的危機。"
            : "提早按住仍能攻擊，但光束很弱。再練一次：等圓環與下方指標變成金色，再按住直到核心擊碎。"
        );
      }
    } else if (event.type === "impact") {
      this.lastResolution = "impact";
      this.audio.impact(event.damage);
      if (this.practiceMode) {
        this.releaseAll();
        this.setPhase("trained");
        text("practice-title", "要按到核心擊碎。");
        text(
          "practice-explanation",
          "金色時按下只是起手。保持按住，直到核心爆裂，再放開迎擊下一顆。"
        );
      }
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
      this.feedback(
        stormPhase(this.run.waveIndex) === "storm"
          ? `碎星潮！${this.run.meteors.length} 顆同步逼近`
          : `${this.run.meteors.length} 顆夾擊 · 可按住隕石指定目標`
      );
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
    text(
      "result-overdrive",
      `手動超載 ${this.run.overdriveUses} 次 · 清除 ${this.run.overdriveCleared} 顆威脅`
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
      const target = this.run.meteor;
      const practiceDelta =
        this.practiceMode && target?.grade === null && this.inputs.size === 0
          ? Math.min(
              dt,
              Math.max(0, target.chargeStartMs - this.run.waveElapsedMs)
            )
          : dt;
      for (const event of this.run.step(practiceDelta, this.inputs.size > 0))
        this.handleEvent(event);
      const m = this.run.meteor;
      if (m && this.phase === "playing") {
        if (this.previousTarget !== m.id) {
          this.previousTarget = m.id;
          this.previousReady = false;
        }
        const ready =
          this.run.waveElapsedMs >= m.chargeStartMs - PERFECT_WINDOW_MS;
        if (ready && !this.previousReady) {
          this.previousReady = true;
          this.audio.tone(760, 1080, 0.1, 0.045);
        }
        this.audio.beam(m.firing ? 1 - m.mass / 100 : null, false);
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
      active = this.overdriveFlash > 0.1 && run.meteors.length === 0,
      ui = document.querySelector<HTMLElement>(".interface")!;
    const nearest = Math.min(
      ...run.meteors.map((core) =>
        contactInMs(core, run.waveElapsedMs, core.mass)
      )
    );
    text("score", run.score.toLocaleString("zh-TW"));
    text("clock", `${run.integrity}%`);
    element("clock").style.color =
      run.integrity <= 34 ||
      (this.lastResolution === "impact" && this.feedbackMs > 0)
        ? "#ffad8e"
        : "#edf5ff";
    text("combo", `連擊 ${run.combo}`);
    text("perfect-count", `完美擊破 ${run.perfect}`);
    text(
      "wave",
      this.practiceMode ? "完美起手練習" : `第 ${run.waveIndex + 1} 波`
    );
    element("run-progress").style.width = `${run.integrity}%`;
    element("run-progress").style.background =
      run.integrity <= 34 ? "#ff8b6a" : "#78e5f2";
    ui.dataset.energy = active
      ? "active"
      : run.energy === 3
      ? "ready"
      : "charging";
    ui.dataset.firing = String(!!m?.firing);
    ui.dataset.beam = m?.firing ? m.grade ?? "normal" : "none";
    ui.dataset.danger =
      run.meteors.length >= 4 || nearest < 650 ? "high" : "normal";
    const energy = energyCopy(run.energy, active);
    text("energy-label", energy.title);
    text(
      "energy-help",
      this.practiceMode
        ? "練習只教起手；正式守城可把超載留給危機。"
        : energy.help
    );
    element("energy").setAttribute("aria-valuenow", String(run.energy));
    element("energy").setAttribute(
      "aria-valuetext",
      `${run.energy}／3，滿氣後手動釋放`
    );
    element("energy")
      .querySelectorAll("i")
      .forEach((el, i) => el.classList.toggle("lit", i < run.energy));
    element<HTMLButtonElement>("overdrive").disabled =
      this.phase !== "playing" ||
      this.practiceMode ||
      run.energy < 3 ||
      !run.meteors.length;
    if (
      this.best &&
      !this.practiceMode &&
      run.score > this.best.score &&
      !this.passedBest
    ) {
      this.passedBest = true;
      text("city-message", "刷新本機今日最佳，繼續守城。");
    }
    text(
      "target",
      this.practiceMode
        ? "金色時機會停下等你。看見金色，再按住。"
        : `下波 ${volleySpecs(run.daySeed, run.waveIndex + 1).length} 顆 · 第 ${
            Math.floor((run.waveIndex + 1) / 6) * 6 + 6
          } 波碎星潮`
    );
    text(
      "storm",
      this.practiceMode
        ? "練習不計分、不儲存"
        : `風暴 ${Math.floor(run.waveIndex / 6) + 1} · ${
            PHASE_LABELS[stormPhase(run.waveIndex)]
          }`
    );
    text(
      "next-core",
      run.meteors.length
        ? `逼近 ${run.meteors.length} 顆 · ${Math.max(
            0,
            nearest / 1000
          ).toFixed(1)} 秒撞擊`
        : "暫時安全"
    );
    const goal = milestone(run.cleared);
    text("milestone", `擊碎 ${run.cleared}／${goal.target} 顆`);
    element("milestone-fill").style.width = `${goal.progress * 10}%`;
    const offset = m ? run.waveElapsedMs - m.chargeStartMs : -600;
    const perfect = !!m && Math.abs(offset) <= PERFECT_WINDOW_MS;
    ui.dataset.timing = perfect
      ? "perfect"
      : offset > PERFECT_WINDOW_MS
      ? "late"
      : "waiting";
    element("timing-marker").style.left = `${Math.max(
      0,
      Math.min(100, (offset + 600) / 12)
    )}%`;
    if (this.phase === "breaking") return;
    if (!m) {
      const hit = this.lastResolution === "impact";
      text(
        "cue",
        active
          ? "超載震爆，威脅解除"
          : hit
          ? "護盾受創，準備迎擊"
          : "核心擊碎，放開準備"
      );
      text(
        "cue-help",
        run.energy === 3
          ? "超載仍保留。下一場危機再決定要不要用。"
          : "先放開，再迎擊下一波。"
      );
      text("fire-label", "準備迎擊");
      text("fire-detail", "超載不會自動使用");
      return;
    }
    if (m.requireRelease) {
      text("cue", "先放開，再迎擊");
      text("cue-help", "放開後，可按住指定隕石切換目標。");
      text("fire-label", "放開換目標");
      text("fire-detail", `還有 ${run.meteors.length} 顆`);
    } else if (m.firing) {
      text(
        "cue",
        `${
          m.grade === "perfect"
            ? "完美光束 ×3"
            : m.grade === "early"
            ? "偏早光束 ×0.55"
            : m.grade === "late"
            ? "遲發光束 ×0.75"
            : "普通光束 ×1"
        } ${Math.round(100 - m.mass)}%`
      );
      text(
        "cue-help",
        m.grade === "perfect"
          ? "完美起手！按到擊碎，超載 +1。"
          : "本次起手不是完美。仍可融解、減少撞擊傷害。"
      );
      text("fire-label", "保持按住");
      text("fire-detail", "擊碎後再放開");
    } else if (perfect) {
      text("cue", "完美時機，現在按住！");
      text("cue-help", "現在按下＝完美起手，3 倍光束。");
      text("fire-label", "現在按住！");
      text("fire-detail", "金色時機：光束 3 倍");
    } else if (offset < -PERFECT_WINDOW_MS) {
      text("cue", this.inputs.size ? "出手偏早，等待鎖定" : "等金色，再按下");
      text("cue-help", `目前目標：${KIND_NAMES[m.kind]} · 可按住別顆換目標。`);
      text("fire-label", "按住發射");
      text("fire-detail", "提早按住是弱光束");
    } else {
      text("cue", "完美時機已過，仍可攔截");
      text(
        "cue-help",
        run.energy === 3 && run.meteors.length >= 3
          ? "多顆同步逼近，可手動超載救急。"
          : "仍可按住融解；下次等金色重合再起手。"
      );
      text("fire-label", "按住攔截");
      text("fire-detail", "普通攻擊不消耗超載");
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
