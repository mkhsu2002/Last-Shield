import * as Phaser from 'phaser';
import { context } from '@devvit/web/client';
import { DefenseRun, meteorGeometry, meteorSpec, stormPhase, RULES_VERSION, SHIELD_RADIUS, utcDaySeed } from '../shared/game-logic';
import type { RunEvent } from '../shared/game-logic';
import { SynthAudio } from './audio';
import { element, mountGameUI, show, text } from './game-ui';
import { readBest, storeBest } from './records';
import type { BestRecord, RecordStorage } from './records';
import { CITY_MESSAGES, milestone, PHASE_LABELS, retryAdvice } from './coaching';
import { GAME_VERSION } from './version';

const W = 540, H = 900, CX = 270, CY = 410, TAU = Math.PI * 2;
const MINT = 0xa1f4d1, GOLD = 0xffd58b, CORAL = 0xff9777;
type Phase = 'intro' | 'playing' | 'paused' | 'breaking' | 'results';

mountGameUI();

class ShieldScene extends Phaser.Scene {
  private graphics!: Phaser.GameObjects.Graphics;
  private phase: Phase = 'intro';
  private run = new DefenseRun(utcDaySeed(new Date()));
  private audio = new SynthAudio();
  private inputs = new Set<string>();
  private best: BestRecord | null = null;
  private storage: RecordStorage | null = null;
  private reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  private fx = 0;
  private fxPerfect = false;
  private fxOverdrive = false;
  private fxImpact = false;
  private fxSector = 0;
  private feedbackMs = 0;
  private breakMs = 0;
  private fxX = CX;
  private fxY = CY;
  private previousWave = -1;
  private previousReady = false;
  private lastScore = 0;
  private passedBest = false;
  private newBest = false;
  private sharing = false;

  constructor() { super('shield'); }

  create(): void {
    this.graphics = this.add.graphics();
    this.audio.muted = false;
    try { this.storage = window.localStorage; } catch { /* Storage is optional. */ }
    this.loadDay();
    element('start').addEventListener('click', () => this.startRun());
    element('retry').addEventListener('click', () => this.startRun());
    element('pause').addEventListener('click', () => this.pauseRun());
    element('resume').addEventListener('click', () => this.resumeRun());
    element('share').addEventListener('click', () => { void this.share(); });
    element('sound').addEventListener('click', () => {
      this.audio.unlock();
      this.audio.muted = !this.audio.muted;
      if (this.audio.muted) this.audio.stop();
      else this.audio.tone(440, 880);
      text('sound', this.audio.muted ? 'SOUND OFF' : 'SOUND ON');
      element('sound').setAttribute('aria-label', this.audio.muted ? 'Enable sound' : 'Mute sound');
      element('sound').setAttribute('aria-pressed', String(!this.audio.muted));
      element('sound').blur();
    });
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => this.press('pointer-' + pointer.id));
    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => this.release('pointer-' + pointer.id));
    this.input.on('pointerupoutside', (pointer: Phaser.Input.Pointer) => this.release('pointer-' + pointer.id));
    const keydown = (event: KeyboardEvent) => {
      if (event.code === 'Escape' && !event.repeat) {
        if (this.phase === 'playing') this.pauseRun();
        else if (this.phase === 'paused') this.resumeRun();
      }
      if (event.code !== 'Space' || (event.target as HTMLElement)?.matches('button,textarea')) return;
      event.preventDefault();
      if (!event.repeat) this.press('keyboard');
    };
    const keyup = (event: KeyboardEvent) => { if (event.code === 'Space') this.release('keyboard'); };
    const blur = () => this.pauseRun();
    const visibility = () => { if (document.hidden) this.pauseRun(); };
    window.addEventListener('keydown', keydown);
    window.addEventListener('keyup', keyup);
    window.addEventListener('blur', blur);
    document.addEventListener('visibilitychange', visibility);
    // Touch cancellation must never leave a sustained beam active.
    const cancel = () => this.releaseAll();
    window.addEventListener('pointercancel', cancel);
    this.events.once('shutdown', () => {
      window.removeEventListener('keydown', keydown); window.removeEventListener('keyup', keyup);
      window.removeEventListener('blur', blur); document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('pointercancel', cancel); this.audio.stop();
    });
    this.setPhase('intro');
    this.renderHUD();
  }

  private loadDay(): void {
    const day = this.run.daySeed;
    const stamp = String(day);
    text('day', `${stamp.slice(0, 4)}.${stamp.slice(4, 6)}.${stamp.slice(6)} UTC`);
    this.best = readBest(this.storage, day);
    text('intro-best', this.best ? `TODAY'S BEST · ${this.best.score.toLocaleString('en-US')} · WAVE ${this.best.waveReached} · ON THIS DEVICE` : 'SURVIVE UNTIL THE SHIELD BREAKS · BEST SAVED ON THIS DEVICE');
  }

  private setPhase(phase: Phase): void {
    this.phase = phase;
    document.querySelector<HTMLElement>('.interface')!.dataset.state = phase;
    for (const [id, visible] of [
      ['intro', phase === 'intro'], ['results', phase === 'results'], ['paused', phase === 'paused'],
      ['run-hud', phase === 'playing' || phase === 'paused' || phase === 'breaking'], ['action', phase === 'playing' || phase === 'paused' || phase === 'breaking'],
      ['pause', phase === 'playing'], ['footer', phase === 'intro'],
    ] as const) show(id, visible);
  }

  private startRun(): void {
    this.releaseAll();
    this.audio.unlock();
    this.run = new DefenseRun(utcDaySeed(new Date()));
    this.loadDay();
    this.breakMs = 0; this.previousWave = -1; this.previousReady = false;
    this.fx = 0; this.fxImpact = false; this.feedbackMs = 0; this.lastScore = 0; this.passedBest = false;
    text('feedback', ''); text('share-status', ''); show('share-box', false);
    text('city-message', 'The city is counting on you.');
    this.setPhase('playing');
    element('game-container').focus({ preventScroll: true });
    this.renderHUD();
  }

  private press(source: string): void {
    if (this.phase !== 'playing' || this.inputs.has(source)) return;
    this.inputs.add(source); this.audio.unlock();
    this.audio.tone(180, 250, .06, .025, 'triangle');
    // Record the input against the same clock used to draw the rings.
    this.run.step(0, true);
  }
  private release(source: string): void {
    this.inputs.delete(source);
    if (!this.inputs.size) {
      this.audio.stop();
      if (this.phase === 'playing') this.run.step(0, false);
    }
  }
  private releaseAll(): void {
    this.inputs.clear(); this.audio.stop(); this.run.step(0, false);
  }
  private pauseRun(): void {
    if (this.phase !== 'playing') return;
    this.releaseAll(); this.setPhase('paused');
  }
  private resumeRun(): void {
    if (this.phase !== 'paused') return;
    this.releaseAll(); this.setPhase('playing');
    element('game-container').focus({ preventScroll: true });
  }

  private feedback(message: string, tone = 'normal'): void {
    text('feedback', message); this.feedbackMs = 1100;
    document.querySelector<HTMLElement>('.interface')!.dataset.tone = tone;
  }

  private handleEvent(event: RunEvent): void {
    if (event.type === 'clear') {
      this.fx = 1; this.fxImpact = false; this.fxPerfect = event.grade === 'perfect';
      this.fxOverdrive = event.overdrive; this.fxSector = event.sector;
      this.fxX = CX + event.point.x; this.fxY = CY + event.point.y;
      this.audio.clear(this.fxPerfect, event.overdrive);
      const label = event.overdrive ? 'OVERDRIVE' : event.grade === 'perfect' ? 'PERFECT' : event.grade === 'good' ? 'CORE BROKEN' : event.grade === 'early' ? 'EARLY · SAVED' : 'LATE · SAVED';
      this.feedback(`${label}  +${event.points}`, this.fxPerfect || event.overdrive ? 'perfect' : 'normal');
      if (this.run.cleared % 10 === 0) {
        const chapter = this.run.cleared / 10;
        text('city-message', CITY_MESSAGES[(chapter - 1) % CITY_MESSAGES.length]!);
      }
      if (!this.reducedMotion) {
        this.cameras.main.shake(event.overdrive ? 180 : 100, event.overdrive ? .009 : this.fxPerfect ? .004 : .002);
        try { navigator.vibrate?.(event.overdrive ? 35 : 15); } catch { /* Optional. */ }
      }
    } else if (event.type === 'impact') {
      this.fx = 1; this.fxImpact = true; this.fxOverdrive = false; this.fxSector = event.sector;
      this.fxX = CX + Math.cos((event.sector + .5) * TAU / 6 - Math.PI / 2) * SHIELD_RADIUS;
      this.fxY = CY + Math.sin((event.sector + .5) * TAU / 6 - Math.PI / 2) * SHIELD_RADIUS;
      this.audio.impact(); this.audio.shatter();
      this.feedback(`SHIELD FRACTURED  −${event.damage}%`, 'impact');
      if (!this.reducedMotion) this.cameras.main.shake(280, .016);
    } else if (event.type === 'finish') {
      this.releaseAll(); this.breakMs = 1250; this.fx = 1;
      this.audio.shatter(true); this.setPhase('breaking');
      text('cue', 'SHIELD SHATTERED'); text('cue-help', 'The last barrier is gone.');
    }
  }

  private finishRun(): void {
    this.releaseAll();
    this.newBest = this.run.score > (this.best?.score ?? 0);
    const saved = storeBest(this.storage, {
      version: RULES_VERSION, day: this.run.daySeed, score: this.run.score,
      perfect: this.run.perfect, cleared: this.run.cleared, bestCombo: this.run.bestCombo,
      waveReached: this.run.waveIndex + 1,
    });
    text('result-kicker', `SURVIVED ${Math.floor(this.run.elapsedMs / 60000)}:${String(Math.floor(this.run.elapsedMs / 1000) % 60).padStart(2, '0')} · WAVE ${this.run.waveIndex + 1}`);
    text('result-title', 'Shield shattered.');
    text('result-score', this.run.score.toLocaleString('en-US'));
    text('record-note', saved ? this.newBest ? 'NEW DAILY BEST · ON THIS DEVICE' : `DAILY BEST ON THIS DEVICE · ${Math.max(this.best?.score ?? 0, this.run.score).toLocaleString('en-US')}` : 'THIS RUN ONLY · RECORD COULD NOT BE SAVED');
    text('result-perfect', String(this.run.perfect));
    text('result-combo', String(this.run.bestCombo));
    text('result-cleared', String(this.run.cleared));
    const next = this.best && this.run.score < this.best.score ? `${this.best.score - this.run.score + 1} more points to beat your daily best. ` : '';
    const goal = milestone(this.run.cleared);
    text('result-milestone', `CITY MILESTONES: ${Math.floor(this.run.cleared / 10)} · NEXT GOAL: ${goal.target} CORES`);
    text('retry-hint', next + retryAdvice(this.run));
    this.setPhase('results');
    element('retry').focus({ preventScroll: true });
  }

  private async share(): Promise<void> {
    if (this.sharing) return;
    this.sharing = true;
    const day = String(this.run.daySeed);
    const message = `LAST SHIELD ${GAME_VERSION} · ${day.slice(0, 4)}-${day.slice(4, 6)}-${day.slice(6)} UTC\n${this.run.score.toLocaleString('en-US')} pts · ${this.run.perfect} PERFECT · ${this.run.cleared} cores\nWave ${this.run.waveIndex + 1} · Best combo: ${this.run.bestCombo}. Same sky. Can you beat my defense?`;
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
    const postId = context?.postId;
    const url = postId ? `https://www.reddit.com/comments/${postId.replace(/^t3_/, '')}` : local ? '' : `${location.origin}${location.pathname}`;
    const challenge = message + (url ? `\n${url}` : '');
    try {
      await navigator.clipboard.writeText(challenge);
      text('share-status', 'Challenge copied. Paste it into your post or comment.');
    } catch {
      element<HTMLTextAreaElement>('share-text').value = challenge;
      show('share-box', true);
      element<HTMLTextAreaElement>('share-text').focus(); element<HTMLTextAreaElement>('share-text').select();
      text('share-status', 'Select the challenge above and copy it.');
    } finally { this.sharing = false; }
  }

  update(_time: number, delta: number): void {
    const dt = Math.max(0, Math.min(100, delta));
    this.fx = Math.max(0, this.fx - dt / (this.fxImpact ? 1250 : 650));
    if (this.phase === 'breaking') {
      this.breakMs -= dt;
      if (this.breakMs <= 0) this.finishRun();
    }
    if (this.phase === 'playing') {
      this.feedbackMs = Math.max(0, this.feedbackMs - dt);
      if (!this.feedbackMs) text('feedback', '');
      for (const event of this.run.step(dt, this.inputs.size > 0)) this.handleEvent(event);
      const m = this.run.meteor;
      if (m && this.phase === 'playing') {
        if (this.previousWave !== this.run.waveIndex) {
          this.previousWave = this.run.waveIndex; this.previousReady = false;
        }
        const ready = this.run.waveElapsedMs >= m.chargeStartMs;
        if (ready && !this.previousReady) { this.previousReady = true; this.audio.tone(760, 1080, .1, .05); }
        this.audio.beam(m.firing ? 1 - m.mass / 100 : null, m.overdrive);
      } else this.audio.stop();
      this.renderHUD();
    }
    this.draw();
  }

  private renderHUD(): void {
    const run = this.run;
    text('score', run.score.toLocaleString('en-US'));
    text('clock', `${run.integrity}%`);
    element('clock').style.color = run.integrity <= 34 || (this.fxImpact && this.fx > .2) ? '#ff9777' : '#cae0d9';
    text('combo', `${run.combo} COMBO`);
    text('perfect-count', `${run.perfect} PERFECT`);
    text('wave', `WAVE ${String(run.waveIndex + 1).padStart(2, '0')}`);
    element('run-progress').style.width = `${run.integrity}%`;
    element('run-progress').style.background = run.integrity <= 34 ? '#ff9777' : '#a1f4d1';
    element('energy').querySelectorAll('i').forEach((el, i) => el.classList.toggle('lit', i < run.energy));
    text('energy-label', run.meteor?.firing && run.meteor.overdrive ? 'OVERDRIVE ACTIVE' : run.energy === 3 ? 'OVERDRIVE READY' : 'OVERDRIVE');
    if (this.best && run.score > this.best.score && this.lastScore <= this.best.score && !this.passedBest) {
      this.passedBest = true;
      this.feedback('DAILY BEST PASSED', 'perfect');
    }
    this.lastScore = run.score;
    text('target', this.best ? run.score > this.best.score ? `DAILY BEST PASSED · BEST RUN: WAVE ${this.best.waveReached}` : `DAILY BEST: +${this.best.score - run.score + 1} PTS · BEST RUN: WAVE ${this.best.waveReached}` : 'SET YOUR FIRST DAILY BEST · ON THIS DEVICE');
    const storm = Math.floor(run.waveIndex / 10) + 1;
    text('storm', `STORM ${String(storm).padStart(2, '0')} · ${PHASE_LABELS[stormPhase(run.waveIndex)]}`);
    const nextCore = meteorSpec(run.daySeed, run.waveIndex + 1);
    text('next-core', `NEXT: ${stormPhase(run.waveIndex + 1) === 'breaker' ? 'BREAKER' : nextCore.kind.toUpperCase()}`);
    const goal = milestone(run.cleared);
    text('milestone', `${run.cleared} / ${goal.target} CORES`);
    element('milestone-fill').style.width = `${goal.progress * 10}%`;
    if (this.phase === 'breaking') return;
    const m = run.meteor;
    if (!m) {
      text('cue', this.fxImpact ? 'SHIELD HIT · REARM' : 'CORE BROKEN · RELEASE');
      text('cue-help', this.fxImpact ? 'You can recover. Meet the next rings.' : stormPhase(run.waveIndex) === 'respite' ? 'A moment of calm. The city is still standing.' : 'Breathe. The next wave is coming.');
      return;
    }
    const ready = run.waveElapsedMs >= m.chargeStartMs;
    if (m.requireRelease) {
      text('cue', 'RELEASE TO REARM'); text('cue-help', 'A fresh hold for every meteor.');
    } else if (m.firing) {
      text('cue', `${m.overdrive ? 'OVERDRIVE' : m.grade === 'perfect' ? 'PERFECT BEAM' : 'MELTING'}  ${Math.round(100 - m.mass)}%`);
      text('cue-help', m.overdrive ? 'DOUBLE POWER · Hold until the core breaks.' : m.grade === 'perfect' ? 'PRECISION BOOST · Keep holding.' : m.kind === 'heavy' ? 'HEAVY CORE · Keep holding.' : 'Keep holding until the core breaks.');
    } else if (!ready) {
      text('cue', this.inputs.size ? 'HOLD · LOCKING ON' : 'INCOMING · TRACK THE RING');
      text('cue-help', m.kind === 'fast' ? 'FAST CORE · Meet the rings.' : m.kind === 'heavy' ? 'HEAVY CORE · A longer hold.' : 'When the ring lights up, press & hold.');
    } else {
      text('cue', 'HOLD NOW'); text('cue-help', 'Press anywhere. Hold until it breaks.');
    }
  }

  private draw(): void {
    const g = this.graphics; g.clear();
    g.fillStyle(0x071216); g.fillRect(0, 0, W, H);
    const live = this.phase === 'playing' || this.phase === 'paused' || this.phase === 'breaking' || (this.phase === 'results' && this.run.finished);
    // A restrained radar grid leads the eye to the ring alignment.
    for (let i = 0; i < 65; i++) {
      const x = (i * 173 + 41) % W, y = (i * 97 + 19) % 670;
      g.fillStyle(i % 7 === 0 ? MINT : 0x7a9d94, i % 7 === 0 ? .4 : .16);
      g.fillCircle(x, y, i % 7 === 0 ? 1.2 : .7);
    }
    g.lineStyle(1, 0x31574e, .17);
    for (let i = -3; i <= 3; i++) {
      g.lineBetween(CX + i * 55, 570, CX + i * 160, 690);
      g.lineBetween(0, 580 + i * 24, W, 580 + i * 24);
    }
    this.drawCity(g, live);
    this.drawShield(g, live);
    if (live && this.run.meteor) this.drawMeteor(g);
    else if (!live) {
      g.lineStyle(1, MINT, .15); g.strokeCircle(CX, CY, SHIELD_RADIUS);
    }
    if (this.fx > 0) this.drawBurst(g);
  }

  private drawCity(g: Phaser.GameObjects.Graphics, live: boolean): void {
    for (let i = 0; i < 13; i++) {
      const x = 166 + i * 16;
      const height = 16 + (i * 19 % 40) + (i === 6 ? 22 : 0);
      const sector = Math.min(5, Math.floor(i / 2.2));
      const damage = live ? this.run.sectors[sector] : 0;
      g.fillStyle(0x102e2b, .95); g.fillRect(x, 480 - height, 12, height);
      g.lineStyle(1, damage > 0 ? CORAL : MINT, .5); g.strokeRect(x, 480 - height, 12, height);
      for (let row = 0; row < Math.floor(height / 9) - 1; row++) {
        const lit = (i + row) % 7 >= Math.min(6, Math.ceil(damage / 8));
        g.fillStyle(lit ? MINT : 0x21362e, lit ? .65 : .5);
        g.fillRect(x + 3, 486 - height + row * 9, 2, 3);
        g.fillRect(x + 8, 486 - height + row * 9, 2, 3);
      }
    }
    g.lineStyle(1, MINT, .35); g.lineBetween(165, 482, 374, 482);
  }

  private drawShield(g: Phaser.GameObjects.Graphics, live: boolean): void {
    const shattered = live && this.run.integrity === 0;
    const collapse = shattered ? 1 - this.fx : 0;
    g.fillStyle(MINT, shattered ? .015 : .035); g.fillCircle(CX, CY, SHIELD_RADIUS);
    for (let i = 0; i < 6; i++) {
      const a = -Math.PI / 2 + i * TAU / 6;
      const center = a + TAU / 12;
      const damage = live ? this.run.sectors[i] : 0;
      const displaced = shattered && !this.reducedMotion ? collapse * 100 : 0;
      const x = CX + Math.cos(center) * displaced, y = CY + Math.sin(center) * displaced + (this.reducedMotion ? 0 : collapse * collapse * 130);
      g.lineStyle(damage > 0 ? 4 : 3, damage > 0 ? CORAL : MINT, shattered ? this.fx : .8);
      g.beginPath(); g.arc(x, y, SHIELD_RADIUS, a + .025, a + TAU / 6 - .025); g.strokePath();
      if (damage > 0 || shattered) {
        const lines = Math.min(4, 1 + Math.floor(damage / 15));
        for (let branch = 0; branch < lines; branch++) {
          const angle = center + (branch - (lines - 1) / 2) * .13;
          const px = x + Math.cos(angle) * (SHIELD_RADIUS - 2), py = y + Math.sin(angle) * (SHIELD_RADIUS - 2);
          const qx = x + Math.cos(angle + .08) * 92, qy = y + Math.sin(angle + .08) * 92;
          const rx = x + Math.cos(angle - .12) * 62, ry = y + Math.sin(angle - .12) * 62;
          g.lineStyle(2.5, 0xffc5aa, shattered ? this.fx : .85);
          g.lineBetween(px, py, qx, qy); g.lineBetween(qx, qy, rx, ry);
          g.lineStyle(1.5, CORAL, shattered ? this.fx : .7);
          g.lineBetween(qx, qy, qx + Math.cos(angle + 1.2) * 25, qy + Math.sin(angle + 1.2) * 25);
        }
      }
    }
  }

  private drawMeteor(g: Phaser.GameObjects.Graphics): void {
    const m = this.run.meteor!;
    const elapsed = this.run.waveElapsedMs;
    const geometry = meteorGeometry(m, elapsed, m.mass);
    const x = CX + geometry.x, y = CY + geometry.y, radius = geometry.radius;
    const ready = elapsed >= m.chargeStartMs;
    const progress = Math.min(1, elapsed / m.chargeStartMs);
    const color = m.overdrive || m.grade === 'perfect' || this.run.energy === 3 ? GOLD : MINT;
    // The trail, core and impact all use the simulator's shared trajectory.
    g.lineStyle(2, CORAL, .2);
    g.lineBetween(x, y, x + Math.cos(geometry.angle) * 35, y + Math.sin(geometry.angle) * 35);
    g.lineStyle(1, MINT, .2);
    g.lineBetween(x, y, CX + Math.cos(geometry.angle) * SHIELD_RADIUS, CY + Math.sin(geometry.angle) * SHIELD_RADIUS);
    const targetR = radius + 12;
    g.lineStyle(1, color, .45); g.strokeCircle(x, y, targetR);
    g.lineStyle(ready ? 3 : 2, ready ? color : 0x86a99c, .85);
    g.strokeCircle(x, y, targetR + (ready ? 0 : 30 * (1 - progress)));
    const points: Phaser.Math.Vector2[] = [];
    for (let i = 0; i < 9; i++) {
      const a = i * TAU / 9 + (this.reducedMotion ? .3 : elapsed / 3000);
      const r = radius * (i % 2 ? .88 : 1);
      points.push(new Phaser.Math.Vector2(x + Math.cos(a) * r, y + Math.sin(a) * r));
    }
    g.fillStyle(0x82523d); g.fillPoints(points, true);
    g.lineStyle(2, 0xffc38b, .95); g.strokePoints(points, true);
    g.lineStyle(1.5, 0xffc38b, .75); g.strokeCircle(x, y, radius);
    g.fillStyle(m.firing ? GOLD : 0xc88855, .9); g.fillCircle(x, y, Math.max(2, radius * .28));
    for (let i = 0; i < 4; i++) {
      const a = i * TAU / 4 + .5;
      g.lineStyle(m.firing ? 2 : 1, GOLD, m.firing ? .95 : .4);
      g.lineBetween(x + Math.cos(a) * radius * .2, y + Math.sin(a) * radius * .2, x + Math.cos(a + .2) * radius * .85, y + Math.sin(a + .2) * radius * .85);
    }
    if (m.kind === 'heavy') { g.lineStyle(3, 0xd79c76, .7); g.strokeCircle(x, y, radius + 5); }
    if (m.kind === 'fast') {
      g.lineStyle(2, GOLD, .8);
      g.lineBetween(x + 5, y - radius - 7, x, y - radius - 2);
      g.lineBetween(x, y - radius - 2, x - 5, y - radius - 7);
    }
    if (m.firing) {
      const width = m.overdrive ? 14 : m.grade === 'perfect' ? 9 : 7;
      g.lineStyle(width + 14, color, .14); g.lineBetween(CX, 470, x, y);
      g.lineStyle(width, color, .75); g.lineBetween(CX, 470, x, y);
      g.lineStyle(2, 0xf0fff2, .95); g.lineBetween(CX, 470, x, y);
      for (let i = 0; i < 8; i++) {
        const a = i * TAU / 8 + (this.reducedMotion ? 0 : elapsed / 170);
        g.fillStyle(GOLD, .8); g.fillCircle(x + Math.cos(a) * (radius + 8), y + Math.sin(a) * (radius + 8), 2);
      }
    }
  }

  private drawBurst(g: Phaser.GameObjects.Graphics): void {
    const t = 1 - this.fx;
    const color = this.fxImpact ? CORAL : this.fxOverdrive || this.fxPerfect ? GOLD : MINT;
    const x = this.fxX;
    const y = this.fxY;
    if (this.reducedMotion) {
      g.lineStyle(3, color, this.fx * .6); g.strokeCircle(x, y, 100); return;
    }
    g.fillStyle(color, this.fx * .07); g.fillCircle(x, y, 25 + t * 170);
    g.lineStyle(1 + this.fx * 4, color, this.fx * .8); g.strokeCircle(x, y, 25 + t * (this.fxOverdrive ? 240 : 155));
    const fatal = this.fxImpact && this.run.integrity === 0;
    if (this.fxImpact) { g.fillStyle(CORAL, this.fx * .04); g.fillRect(0, 0, W, H); }
    const count = this.fxImpact ? (this.run.integrity === 0 ? 42 : 24) : this.fxOverdrive ? 26 : this.fxPerfect ? 18 : 12;
    for (let i = 0; i < count; i++) {
      const angle = i * TAU / count + .2;
      const distance = 20 + t * (75 + i % 4 * 30);
      const px = (fatal ? CX : x) + Math.cos(angle) * (distance + (fatal ? 60 : 0));
      const py = (fatal ? CY : y) + Math.sin(angle) * (distance + (fatal ? 60 : 0)) + (this.fxImpact ? t * t * 150 : 0);
      g.fillStyle(color, this.fx);
      if (this.fxImpact) {
        const shard = 4 + this.fx * (i % 4 + 3);
        const points = [new Phaser.Math.Vector2(px - shard, py - shard), new Phaser.Math.Vector2(px + shard * .6, py - shard * .3), new Phaser.Math.Vector2(px + shard, py + shard)];
        g.fillPoints(points, true); g.lineStyle(1, 0xffdec3, this.fx); g.strokePoints(points, true);
      } else g.fillRect(px, py, 2 + this.fx * 3, 2 + this.fx * 3);
      g.lineStyle(1, color, this.fx * .4); g.lineBetween(px, py, px - Math.cos(angle) * 15, py - Math.sin(angle) * 15);
    }
  }
}

new Phaser.Game({
  type: Phaser.AUTO, parent: 'canvas-host', backgroundColor: '#071216',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: W, height: H },
  scene: [ShieldScene], render: { antialias: true }, audio: { noAudio: true },
});
