import { context } from "@devvit/web/client";
import { localizedAttribute, localizedText } from "./i18n";
import * as Phaser from "phaser";
import {
  DefenseRun,
  comboMultiplier,
  volleySpecs,
  stormPhase,
  RULES_VERSION,
  utcDaySeed,
  contactInMs,
  PERFECT_WINDOW_MS,
  RETRY_INTERVAL_MS,
  SHIELD_RADIUS,
} from "../shared/game-logic";
import type { RunEvent } from "../shared/game-logic";
import { SynthAudio } from "./audio";
import { element, mountGameUI, show, text } from "./game-ui";
import { readBest, readPreviousBest, storeBest } from "./records";
import type { BestRecord, RecordStorage } from "./records";
import {
  CITY_MESSAGES,
  milestone,
  PHASE_LABELS,
  comboProgress,
  runLearningGoal,
  energyCopy,
} from "./coaching";
import { GAME_VERSION } from "./version";
import { HallController } from "./hall";
import { Community } from "./community";
import { drawBattlefield, FIELD, viewMeteorGeometry } from "./battlefield";
import { SceneArt, preloadSceneArt } from "./scene-art";
import type { BattleEffect } from "./battlefield";
import { PracticeReview, practiceStepDelta, practiceLessonInfo, practiceLessonPassed, practiceDangerReady, hasPracticed, markPracticed, type PracticeLesson } from "./practice";
import { dailyStorm, nextChallengeDay } from "../shared/daily-storm";

import { scopedFocusStorage, readFocusRecord, storeFocusRecord } from "./focus-records";
import { dailyStrategyQuestion } from "./daily-strategy";
import { dailyFocus, focusProgress, nextResetMinutes } from "../shared/daily-focus";
import { focusUnit, focusResultCopy, focusRecordCopy, focusRunRecordCopy } from "./daily-focus-copy";

import { CLASSIC_VIEW, SKY_TOP, refreshBattlefieldViewport } from "./view-mode";
import "./adaptive-view.css";
import "./mobile-combat.css";
import "./mobile-menus.css";
import { compactHudScore } from "./combat-layout";
import { projectBattlePoint } from "./battlefield-view";

type Phase =
  | "intro"
  | "playing"
  | "paused"
  | "breaking"
  | "results"
  | "practice-review"
  | "trained";
const KIND_NAMES = { normal: "普通核心", fast: "快速核心", heavy: "重型核心" };
mountGameUI();
if (!CLASSIC_VIEW) {
  document.documentElement.classList.add('adaptive-view');
}
// Supersample rendering without changing the FIELD coordinate system used by input/physics.
const RENDER_SCALE = Math.min(2, Math.max(1, window.devicePixelRatio || 1));

class ShieldScene extends Phaser.Scene {
  private art!: SceneArt;
  private graphics!: Phaser.GameObjects.Graphics;
  private community!: Community;
  private starting = false;
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
  private practiceLesson: PracticeLesson = 'timing';
  private practicePassed = false;
  private practiceBlastNearDanger = false;
  private practiceReview: PracticeReview | null = null;
  private feedbackMs = 0;
  private breakMs = 0;
  private previousTarget = -1;
  private previousReady = false;
  private passedBest = false;
  private cityMilestone = 0;
  private introMinute = -1;
  private lastResolution: "clear" | "impact" = "clear";

  constructor() {
    super("shield");
  }

  preload(): void { preloadSceneArt(this); }

  create(): void {
    this.art = new SceneArt(this, RENDER_SCALE);
    this.graphics = this.add.graphics().setScale(RENDER_SCALE);
    const hall = new HallController();
    this.community = new Community(() => { void this.startRun(); }, hall, result => {
      const focusSaved = !this.community.isDemonstration && storeFocusRecord(this.focusStorage, result, "verified");
      text("result-milestone", this.community.isDemonstration ? focusResultCopy(result.day, result) : focusRunRecordCopy(result.day, result, readFocusRecord(this.focusStorage, result.day), "verified"));
      text("result-goal-status", this.community.isDemonstration ? "示範目標進度，不記入個人每日成就。" : focusSaved ? "本局目標進度已驗分。" : "本局已驗分，但本機無法保留每日進度。");
    });
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
      this.startRun(true, this.practiceLesson)
    );
    element("practice-next").addEventListener('click', () => {
      const next = practiceLessonInfo(this.practiceLesson).next;
      if (this.practicePassed && next) void this.startRun(true, next);
    });
    element("practice-start").addEventListener("click", () => this.startRun());
    element("practice-continue").addEventListener("click", () => {
      if (this.phase !== "practice-review" || !this.practiceReview?.canContinue(this.inputs.size > 0)) return;
      this.releaseAll();
      markPracticed(this.storage);
      this.setPhase("trained");
      element(this.practicePassed && practiceLessonInfo(this.practiceLesson).next ? "practice-next" : "practice-again").focus({ preventScroll: true });
    });
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
    element("sound").addEventListener("click", () => {
      this.audio.unlock();
      this.audio.muted = !this.audio.muted;
      if (!this.audio.muted) this.audio.tone(440, 880);
      text("sound", this.audio.muted ? "音效關" : "音效開");
      localizedAttribute(element("sound"),
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
        const point = viewMeteorGeometry(m, this.run.waveElapsedMs, m.mass);
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
      const target = event.target as HTMLElement;
      if (document.querySelector("dialog[open]") || target?.isContentEditable) return;
      if (event.code === "Escape" && !event.repeat) {
        if (this.phase === "playing") this.pauseRun();
        else if (this.phase === "paused") this.resumeRun();
      }
      if (
        event.code === "KeyE" &&
        !event.repeat &&
        !target?.matches("textarea,input,select,option")
      ) {
        event.preventDefault();
        this.activateOverdrive();
        return;
      }
      if (
        event.code !== "Space" ||
        (target?.matches("button,input,textarea,select,option,summary,a[href],[contenteditable]") && target.id !== "fire")
      )
        return;
      event.preventDefault();
      if (!event.repeat) this.press("keyboard");
    };
    const keyup = (event: KeyboardEvent) => {
      if (event.code === "Space") this.release("keyboard");
    };
    const blur = () => {
      if (this.phase === "practice-review") this.releaseAll();
      else this.pauseRun();
    };
    const visibility = () => {
      if (document.hidden) blur();
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

  private get focusStorage(): RecordStorage | null {
    return scopedFocusStorage(this.storage, context?.postId, context?.userId);
  }

  private loadDay(): void {
    const guideFirst=!hasPracticed(this.storage);
    element('practice').classList.toggle('primary',guideFirst);
    element('practice').classList.toggle('secondary',!guideFirst);
    element('start').classList.toggle('primary',!guideFirst);
    element('start').classList.toggle('secondary',guideFirst);
    element('launch-controls').prepend(element(guideFirst?'practice':'start'));
    const stamp = String(this.run.daySeed);
    text(
      "day",
      `${stamp.slice(0, 4)}.${stamp.slice(4, 6)}.${stamp.slice(6)} UTC`
    );
    const profile = this.run.storm;
    text("daily-title", profile.title);
    text("daily-description", profile.description);
    text("daily-tomorrow", ["明日風暴：", dailyStorm(nextChallengeDay(this.run.daySeed)).title]);
    text("daily-focus", focusRecordCopy(this.run.daySeed, readFocusRecord(this.focusStorage, this.run.daySeed)));
    text("daily-guidance", dailyFocus(this.run.daySeed).guidance);
    const minutes = nextResetMinutes(new Date());
    text("daily-reset", `換日倒數 ${Math.floor(minutes / 60)} 小時 ${minutes % 60} 分`);
    const previous = readPreviousBest(this.storage, this.run.daySeed);
    text("daily-return", previous ? [`上次本機守城：${previous.day} · ${previous.score.toLocaleString("zh-TW")} 分`, " · 上次風暴：", dailyStorm(previous.day).title] : "");
    show("daily-return", !!previous);
    this.best = readBest(this.storage, this.run.daySeed);
    text(
      "intro-best",
      this.best
        ? `本機今日最佳 ${this.best.score.toLocaleString("zh-TW")} 分 · 第 ${
            this.best.waveReached
          } 波`
        : "按住畫面或空白鍵 · 結算後可選擇參加社群榜"
    );
  }

  private setPhase(phase: Phase): void {
    this.phase = phase;
    document.querySelector<HTMLElement>(".interface")!.dataset.state = phase;
    const live =
      phase === "playing" || phase === "paused" || phase === "breaking" || phase === "practice-review";
    document.querySelector<HTMLElement>(".interface")!.dataset.combat = String(live);
    for (const [id, visible] of [
      ["intro", phase === "intro"],
      ["results", phase === "results"],
      ["paused", phase === "paused"],
      ["trained", phase === "trained"],
      ["practice-review", phase === "practice-review"],
      ["run-hud", live],
      ["action", live],
      ["pause", phase === "playing"],
    ] as const)
      show(id, visible);
    // Keep pointer capture alive until the practice player's original press is released.
    element<HTMLButtonElement>("fire").disabled = phase !== "playing" && phase !== "practice-review";
    element<HTMLButtonElement>("overdrive").disabled =
      phase !== "playing" ||
      (this.practiceMode && this.practiceLesson !== "overdrive") ||
      this.run.energy < 3 ||
      this.run.meteors.length === 0;
  }

  private async startRun(practice = false, lesson: PracticeLesson = "timing"): Promise<void> {
    if (this.starting) return;
    this.starting = true;
    const launchButtons = ["start", "retry", "practice", "practice-again", "practice-start", "practice-next"].map(id => element<HTMLButtonElement>(id));
    launchButtons.forEach(button => { button.disabled = true; });
    const day = await this.community.begin(practice);
    this.starting = false;
    launchButtons.forEach(button => { button.disabled = false; });
    this.releaseAll();
    this.audio.stopAll();
    this.audio.unlock();
    this.run = new DefenseRun(day, {practice, lesson});
    this.loadDay();
    this.breakMs = 0;
    this.previousTarget = -1;
    this.previousReady = false;
    this.effects = [];
    this.overdriveFlash = 0;
    this.practiceMode = practice;
    this.practiceLesson = lesson;
    this.practicePassed = false;
    this.practiceBlastNearDanger = false;
    this.practiceReview = null;
    this.feedbackMs = 0;
    this.passedBest = false;
    this.cityMilestone = 0;
    this.lastResolution = "clear";
    localizedAttribute(element("fire"), "aria-label", "按住發射光束");
    text("feedback", "");
    text("city-message", "城市正等你守護。");
    this.setPhase("playing");
    element("game-container").focus({ preventScroll: true });
    this.renderHUD();
  }

  private stepRun(delta: number, holding: boolean, target?: number): RunEvent[] {
    if (!this.practiceMode) this.community.record([delta, holding, target]);
    return this.run.step(delta, holding, target);
  }

  private activateOverdrive(): void {
    if (this.phase !== "playing" || (this.practiceMode && this.practiceLesson !== 'overdrive')) return;
    if (this.practiceMode) this.practiceBlastNearDanger = practiceDangerReady(Math.min(
      ...this.run.meteors.map(core => contactInMs(core, this.run.waveElapsedMs, core.mass))));
    else this.community.record([-1, this.inputs.size > 0]);
    for (const event of this.run.activateOverdrive(this.inputs.size > 0))
      this.handleEvent(event);
    this.renderHUD();
  }

  private press(source: string, targetId?: number): void {
    if (this.phase !== "playing" || this.inputs.has(source)) return;
    this.inputs.add(source);
    this.audio.unlock();
    this.audio.tone(180, 250, 0.06, 0.025, "triangle");
    for (const event of this.stepRun(0, true, targetId))
      this.handleEvent(event);
  }
  private release(source: string): void {
    const released = this.inputs.delete(source);
    if (!this.inputs.size) {
      this.audio.stop();
      if (this.phase === "playing") {
        const unfinished = this.run.meteors.some(core => core.firing && core.mass > 0);
        this.stepRun(0, false);
        if (released && unfinished && this.practiceMode && this.practiceLesson !== "overdrive" && this.run.meteor) {
          this.reviewPractice("放開得太早了。", "金色時按下只是起手。保持按住，直到核心爆裂，再放開迎擊下一顆。");
        }
      }
    }
  }
  private releaseAll(): void {
    this.inputs.clear();
    this.audio.stop();
    this.stepRun(0, false);
  }
  private pauseRun(): void {
    if (this.phase !== "playing") return;
    this.releaseAll();
    this.audio.stopAll();
    const run=this.run, growth=comboProgress(run.combo,this.practiceMode);
    text("pause-score",run.score.toLocaleString("zh-TW"));
    text("pause-wave",this.practiceMode?practiceLessonInfo(this.practiceLesson).title:`第 ${run.waveIndex+1} 波`);
    text("pause-combo",`連擊 ${run.combo} · ${comboMultiplier(run.combo,this.practiceMode)} 倍`);
    text("pause-perfect",`完美擊破 ${run.perfect}`);
    text("pause-growth",growth.nextCombo===null?"維持連擊 · 最高 50 倍":`再接 ${growth.remaining} 顆 → ${growth.nextMultiplier} 倍`);
    text("pause-focus",focusResultCopy(run.daySeed,run));
    text("pause-storm",[run.storm.title,' · ',PHASE_LABELS[stormPhase(run.waveIndex)]]);
    text("pause-rival",this.practiceMode?"":this.community.rivalCopy(run.score));
    localizedText(element("pause-leader"),this.community.leaderCopy());
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

  private reviewPractice(title: string, explanation: string, passed = false): void {
    this.practicePassed = passed;
    this.audio.stop();
    this.stepRun(0, false);
    this.practiceReview = new PracticeReview();
    this.renderHUD();
    this.setPhase("practice-review");
    const next = practiceLessonInfo(this.practiceLesson).next;
    show('practice-next', passed && next !== null);
    if (next) text('practice-next', `下一課：${practiceLessonInfo(next).title}`);
    text("practice-title", title);
    text("practice-explanation", explanation);
    text("practice-review-title", title);
    text("practice-review-explanation", explanation);
    text("fire-label", "練習已結束，請放開");
    localizedAttribute(element("fire"), "aria-label", "練習已結束，請放開");
    text("fire-detail", "看完回饋，再按繼續");
    element<HTMLButtonElement>("practice-continue").disabled = true;
  }

  private handleEvent(event: RunEvent): void {
    if (this.practiceMode && this.phase === "practice-review") return;
    if (event.type === "clear" || event.type === "impact") {
      const impact = event.type === "impact";
      const point = CLASSIC_VIEW ? event.point : projectBattlePoint(event.point, SKY_TOP);
      this.effects.push({
        x: FIELD.x + point.x,
        y: FIELD.y + point.y,
        life: 1,
        impact,
        overdrive: event.type === "clear" && event.overdrive,
        perfect: event.type === "clear" && event.grade === "perfect",
      });
    }
    if (event.type === "engage") {
      const offset = Math.abs(event.offsetMs / 1000).toFixed(2);
      const label =
        event.retained
          ? "接續光束 · 保留較佳判定"
          : event.grade === "perfect"
          ? "完美鎖定！持續按住"
          : event.offsetMs < 0
          ? `早了 ${offset} 秒 · 等金色再按會更強`
          : `慢了 ${offset} 秒 · 可等下一輪金色，放開重按補救`;
      if (event.grade !== "perfect") this.feedback(label);
      else { text("feedback", ""); this.feedbackMs = 0; }
      if (event.grade === "perfect") this.audio.tone(990, 1480, 0.12, 0.06);
    } else if (event.type === "overdrive") {
      this.audio.overdrive();
      this.overdriveFlash = 1;
      this.feedback(`超載震爆！清除 ${event.cleared} 顆隕石`, "perfect");
      if (!this.reducedMotion) this.cameras.main.shake(280, 0.008);
      if (this.practiceMode && this.practiceLesson === 'overdrive') {
        const passed = practiceLessonPassed('overdrive', this.run.cleared, this.run.perfect, this.run.overdriveCleared, this.practiceBlastNearDanger);
        this.reviewPractice(passed ? '危機接近時，你清場了。' : '超載放得太早了。',
          passed ? '你保留了滿氣，並在威脅接近時手動釋放。也可以直接開始正式守城。' :
            '能量滿了不必立刻使用；等隕石接近，再按「超載震爆」。', passed);
      }
    } else if (event.type === "clear") {
      this.lastResolution = "clear";
      const perfect = event.grade === "perfect";
      if (!event.overdrive) this.audio.clear(perfect, false, Math.max(-0.9, Math.min(0.9, event.point.x / SHIELD_RADIUS * 0.9)));
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
      if (this.practiceMode && !event.overdrive) {
        const info = practiceLessonInfo(this.practiceLesson);
        if (this.practiceLesson === 'overdrive') {
          if (this.run.cleared >= info.requiredClears) this.reviewPractice('這課要練習手動超載。',
            '先保留滿氣，等威脅接近後按「超載震爆」；只用光束擊碎，不會完成這課。');
        } else if (this.run.cleared >= info.requiredClears) {
          const passed = practiceLessonPassed(this.practiceLesson, this.run.cleared, this.run.perfect, 0, false);
          this.reviewPractice(
            passed ? this.practiceLesson === 'relay' ? '兩顆接力完成。' : '這就是完美起手。' : '再試著抓住金色。',
            passed ? this.practiceLesson === 'relay' ? '你擊碎第一顆後放開，再按住第二顆完成接力。' :
              '你抓住了金色，並持續按住直到擊碎。可以繼續練接力，或直接正式守城。' :
              '等圓環變金色再按住，直到核心擊碎。', passed);
        } else this.feedback('第一顆已擊碎；先放開，再按住第二顆。', 'perfect');
      }
    } else if (event.type === "impact") {
      this.lastResolution = "impact";
      this.audio.impact(event.damage, Math.max(-0.9, Math.min(0.9, event.point.x / SHIELD_RADIUS * 0.9)));
      if (this.practiceMode) {
        this.reviewPractice(
          this.practiceLesson === 'overdrive' ? '這次沒有及時清場。' : this.run.mistakes.released > 0 ? "放開得太早了。" : "這次沒有擋下核心。",
          this.practiceLesson === 'overdrive' ? '先保留滿氣；威脅接近時，再按「超載震爆」。' :
            "金色時按下只是起手。保持按住，直到核心爆裂，再放開迎擊下一顆。"
        );
      }
      this.feedback(event.brokenCombo > 0 ? `護盾 −${event.damage}% · 中斷 ${event.brokenCombo} 連擊` : `護盾遭撞擊　−${event.damage}%`, "impact");
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
    const saved = !this.community.isDemonstration && storeBest(this.storage, {
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
      this.community.isDemonstration ? "AI 示範，不儲存個人紀錄" : saved
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
    const learning = runLearningGoal({ ...this.run, brokenCombo: this.run.longestBrokenCombo, breakWave: this.run.brokenComboWave });
    const focusSaved = !this.community.isDemonstration && storeFocusRecord(this.focusStorage, { ...this.run, version: RULES_VERSION, day: this.run.daySeed }, "local");
    text("result-milestone", this.community.isDemonstration ? focusResultCopy(this.run.daySeed, this.run) : focusRunRecordCopy(this.run.daySeed, this.run, readFocusRecord(this.focusStorage, this.run.daySeed), "local"));
    text("result-goal-status", this.community.isDemonstration ? "示範目標進度，不記入個人每日成就。" : !focusSaved ? "本局進度仍可查看，但本機無法保留。" : this.community.hasSession ? "本局戰績尚未提交驗分。" : "本機目標進度。");
    text("result-overdrive", learning.summary);
    text("retry-hint", learning.action);
    text("result-storm", this.run.storm.title);
    text("result-rival", this.community.rivalCopy(this.run.score));
    this.community.finish(this.shareMessage());
    this.setPhase("results");
    element("results").querySelector<HTMLButtonElement>("button.primary")?.focus({ preventScroll: true });
  }

  private shareMessage(): string[] {
    const day = String(this.run.daySeed);
    const result = `最後防線 ${GAME_VERSION} · ${day.slice(0, 4)}-${day.slice(
      4,
      6
    )}-${day.slice(6)} UTC\n${this.run.score.toLocaleString(
      "zh-TW"
    )} 分 · 完美擊破 ${this.run.perfect} 次 · 擊碎 ${
      this.run.cleared
    } 顆隕石\n守到第 ${this.run.waveIndex + 1} 波 · 最高連擊 ${
      this.run.bestCombo
    }。同一片天空，換你守守看！`;
    const rival = this.community.rivalCopy(this.run.score);
    return [result, "\n", this.run.storm.title, "\n", ...focusResultCopy(this.run.daySeed, this.run), "\n", dailyStrategyQuestion(this.run.daySeed, this.run), ...(rival ? ["\n", rival] : [])];
  }

  update(time: number, delta: number): void {
    refreshBattlefieldViewport(()=>this.scale.refresh());
    const dt = Math.max(0, Math.min(100, delta));
    if (this.phase === "intro") {
      const now = new Date(), minute = Math.floor(now.getTime()/60000);
      if (minute !== this.introMinute) {
        this.introMinute = minute;
        if (this.run.daySeed !== utcDaySeed(now)) this.run = new DefenseRun(utcDaySeed(now));
        this.loadDay();
      }
    }
    if (this.phase !== "paused") {
      for (const fx of this.effects)
        fx.life = Math.max(0, fx.life - dt / (fx.overdrive ? 1000 : fx.impact ? 1000 : 600));
      this.effects = this.effects.filter((fx) => fx.life > 0);
      this.overdriveFlash = Math.max(0, this.overdriveFlash - dt / 1000);
    }
    if (this.phase === "practice-review" && this.practiceReview) {
      this.practiceReview.advance(dt);
      const holding = this.inputs.size > 0;
      element<HTMLButtonElement>("practice-continue").disabled = !this.practiceReview.canContinue(holding);
      if (!holding) {
        element<HTMLButtonElement>("fire").disabled = true;
        text("fire-label", "本次練習已完成");
        localizedAttribute(element("fire"), "aria-label", "本次練習已完成");
      }
    }
    if (this.phase === "breaking") {
      this.breakMs -= dt;
      if (this.breakMs <= 0) this.finishRun();
    }
    if (this.phase === "playing") {
      this.feedbackMs = Math.max(0, this.feedbackMs - dt);
      if (!this.feedbackMs) text("feedback", "");
      const target = this.run.meteor;
      const goldAt = target ? this.run.chainRemainingMs > 0 ? this.run.waveElapsedMs :
        target.chargeStartMs + Math.max(0, Math.ceil((this.run.waveElapsedMs - target.chargeStartMs) / RETRY_INTERVAL_MS)) * RETRY_INTERVAL_MS : 0;
      const stepMs = this.practiceMode && target
        ? practiceStepDelta(this.practiceLesson, dt, this.run.waveElapsedMs, goldAt, this.inputs.size > 0, target.grade !== null)
        : dt;
      for (const event of this.stepRun(stepMs, this.inputs.size > 0))
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
      if (this.phase === "playing" || this.phase === "breaking") this.renderHUD();
    }
    const frame = {
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
      hasCity: this.art.hasCity,
      texturedMeteors: this.art.texturedMeteors,
    };
    this.art.draw(frame);
    drawBattlefield(this.graphics, frame);
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
    element("score-short").textContent=compactHudScore(run.score);
    element("overdrive-charge").textContent=`${run.energy}/3`;
    text("rival-goal", this.practiceMode ? "" : this.community.rivalCopy(run.score));
    text("clock", `${run.integrity}%`);
    element("clock").style.color =
      run.integrity <= 34 ||
      (this.lastResolution === "impact" && this.feedbackMs > 0)
        ? "#ffad8e"
        : "#edf5ff";
    text("combo", `連擊 ${run.combo} · ${comboMultiplier(run.combo, this.practiceMode)} 倍`);
    text("perfect-count", `完美擊破 ${run.perfect}`);
    const growth = comboProgress(run.combo, this.practiceMode), focus = dailyFocus(run.daySeed), progress = focusProgress(focus, run);
    show("growth-strip", !this.practiceMode);
    text("combo-next", growth.nextCombo === null ? "維持連擊 · 最高 50 倍" : `再接 ${growth.remaining} 顆 → ${growth.nextMultiplier} 倍`);
    text("focus-progress", progress.stretchCompleted ? "進階目標達成" : progress.completed ? `基本已達成 · 進階 ${progress.current}／${focus.stretch}` : `本局 ${progress.current}／${focus.target} ${focusUnit(focus.metric)}`);
    text(
      "wave",
      this.practiceMode ? practiceLessonInfo(this.practiceLesson).title : `第 ${run.waveIndex + 1} 波`
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
        ? practiceLessonInfo(this.practiceLesson).goal
        : energy.help
    );
    element("energy").setAttribute("aria-valuenow", String(run.energy));
    localizedAttribute(element("energy"),
      "aria-valuetext",
      `${run.energy}／3，滿氣後手動釋放`
    );
    element("energy")
      .querySelectorAll("i")
      .forEach((el, i) => el.classList.toggle("lit", i < run.energy));
    element<HTMLButtonElement>("overdrive").disabled =
      this.phase !== "playing" ||
      (this.practiceMode && this.practiceLesson !== "overdrive") ||
      run.energy < 3 ||
      !run.meteors.length;
    if (
      this.best &&
      !this.practiceMode &&
      !this.community.isDemonstration &&
      run.score > this.best.score &&
      !this.passedBest
    ) {
      this.passedBest = true;
      text("city-message", "刷新本機今日最佳，繼續守城。");
    }
    text(
      "target",
      this.practiceMode
        ? this.practiceLesson === 'overdrive'
          ? practiceDangerReady(nearest) ? '現在按「超載震爆」，清除接近的威脅。' : '先保留滿氣，等隕石接近。'
          : practiceLessonInfo(this.practiceLesson).goal
        : `下波 ${volleySpecs(run.daySeed, run.waveIndex + 1).length} 顆 · 第 ${
            Math.floor((run.waveIndex + 1) / 6) * 6 + 6
          } 波碎星潮`
    );
    text(
      "storm",
      this.practiceMode
        ? "練習不計分、不儲存"
        : [run.storm.title, ' · ', PHASE_LABELS[stormPhase(run.waveIndex)]]
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
    element("approach-compact").textContent=run.meteors.length?`${Math.max(0,nearest/1000).toFixed(1)}s`:"—";
    const goal = milestone(run.cleared);
    text("milestone", `擊碎 ${run.cleared}／${goal.target} 顆`);
    element("milestone-fill").style.width = `${goal.progress * 10}%`;
    const locked = !!m && (
      m.grade === "perfect" ||
      (this.inputs.size > 0 && !m.requireRelease && m.pressedGrade === "perfect")
    );
    const chain = run.chainRemainingMs > 0;
    const offset = m ? run.timingOffset(m) : -600;
    ui.dataset.aim = locked ? "locked" : chain ? "chain" : "timing";
    element("beam-progress").style.width = `${locked && m ? 100 - m.mass : 0}%`;
    text("timing-left", locked ? "命中鎖定" : chain ? "完美接力" : "等待");
    text("timing-caption", locked
      ? "持續按住・擊破才放開"
      : chain ? "放開 → 再按下一顆" : "金色時按下");
    text("timing-right", locked && m
      ? `${Math.round(100 - m.mass)}%`
      : chain ? `${(run.chainRemainingMs / 1000).toFixed(1)} 秒` : "下一輪");
    const perfect = !!m && Math.abs(offset) <= PERFECT_WINDOW_MS;
    ui.dataset.timing = locked || perfect
      ? "perfect"
      : offset > PERFECT_WINDOW_MS
      ? "late"
      : "waiting";
    element("timing-marker").style.left = `${Math.max(
      0,
      Math.min(100, (locked ? 0 : offset + 600) / 12)
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
      text("cue-help", chain ? "完美接力已就緒！放開後再按，下一顆也能用完美光束。" : "放開後，可按住指定隕石切換目標。");
      text("fire-label", "放開換目標");
      text("fire-detail", `還有 ${run.meteors.length} 顆`);
    } else if (locked) {
      text("cue", this.inputs.size ? `完美鎖定 · 擊破 ${Math.round(100 - m.mass)}%` : "完美已保留，按住接續");
      text("cue-help", this.inputs.size ? "持續按住，不用重按；光束會定住這顆隕石，擊碎後才放開。" : "按住即可恢復 3 倍光束，不用再等金色。");
      text("fire-label", this.inputs.size ? "持續按住" : "按住接續");
      text("fire-detail", "擊碎後，放開再按下一顆");
    } else if (m.firing) {
      text(
        "cue",
        `${
          m.grade === "early"
            ? "偏早光束 ×0.85"
            : m.grade === "late"
            ? "遲發光束 ×1"
            : "普通光束 ×1.15"
        } ${Math.round(100 - m.mass)}%`
      );
      text(
        "cue-help",
        perfect
          ? "補救時機！放開再按，融解進度保留。"
          : "可在下一輪金色放開重按，改善光束；進度保留。"
      );
      text(
        "fire-label",
        perfect ? "放開再按補救" : "保持按住"
      );
      text("fire-detail", "擊碎後再放開");
    } else if (perfect) {
      text("cue", chain ? "完美接力，現在按住！" : "完美時機，現在按住！");
      text("cue-help", chain ? "接力窗口內按住下一顆，即可完美鎖定。" : "現在按住，鎖定後持續發射，擊碎才放開。");
      text("fire-label", "現在按住！");
      text("fire-detail", "金色時機：光束 3 倍");
    } else if (offset < -PERFECT_WINDOW_MS) {
      text("cue", this.inputs.size ? "出手偏早，等待鎖定" : "等金色，再按下");
      text("cue-help", `目前目標：${KIND_NAMES[m.kind]} · 可按住別顆換目標。`);
      text("fire-label", "按住發射");
      text("fire-detail", "提早按住是弱光束");
    } else {
      text("cue", "這輪錯過了，還能補救");
      text(
        "cue-help",
        run.energy === 3 && run.meteors.length >= 3
          ? "多顆同步逼近，可手動超載救急。"
          : "金色每秒再來一次；可先融解，再放開重按補救。"
      );
      text("fire-label", "按住攔截");
      text("fire-detail", "普通攻擊不消耗超載");
    }
  }
}

new Phaser.Game({
  type: Phaser.CANVAS,
  parent: "canvas-host",
  backgroundColor: "#070f20",
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: Math.round(FIELD.width * RENDER_SCALE),
    height: Math.round(FIELD.height * RENDER_SCALE),
  },
  scene: [ShieldScene],
  render: { antialias: true },
  audio: { noAudio: true },
});
