import * as Phaser from 'phaser';
import { context } from '@devvit/web/client';
import { chargeCue, DefenseRun, RULES_VERSION, RUN_DURATION_MS, utcDaySeed, WAVE_COUNT, WAVE_SLOT_MS } from '../shared/game-logic';
import type { RunEvent } from '../shared/game-logic';
import { SynthAudio } from './audio';
import { element, mountGameUI, show, text } from './game-ui';
import { readBest, storeBest } from './records';
import type { BestRecord, RecordStorage } from './records';

const W = 540, H = 900, CX = 270, CY = 410, TAU = Math.PI * 2;
const MINT = 0xa1f4d1, GOLD = 0xffd58b, CORAL = 0xff9777;
type Phase = 'intro' | 'playing' | 'paused' | 'results';

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
  private previousCount = -1;
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
    text('intro-best', this.best ? `TODAY'S BEST ON THIS DEVICE · ${this.best.score.toLocaleString('en-US')}` : '25 WAVES · SAME DAILY PATTERN · BEST SAVED ON THIS DEVICE');
  }

  private setPhase(phase: Phase): void {
    this.phase = phase;
    document.querySelector<HTMLElement>('.interface')!.dataset.state = phase;
    for (const [id, visible] of [
      ['intro', phase === 'intro'], ['results', phase === 'results'], ['paused', phase === 'paused'],
      ['run-hud', phase === 'playing' || phase === 'paused'], ['action', phase === 'playing' || phase === 'paused'],
      ['pause', phase === 'playing'], ['footer', phase === 'intro'],
    ] as const) show(id, visible);
  }

  private startRun(): void {
    this.releaseAll();
    this.audio.unlock();
    this.run = new DefenseRun(utcDaySeed(new Date()));
    this.loadDay();
    this.previousCount = -1; this.previousWave = -1; this.previousReady = false;
    this.fx = 0; this.feedbackMs = 0; this.lastScore = 0; this.passedBest = false;
    text('feedback', ''); text('share-status', ''); show('share-box', false);
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
      this.audio.clear(this.fxPerfect, event.overdrive);
      const label = event.overdrive ? 'OVERDRIVE' : event.grade === 'perfect' ? 'PERFECT' : event.grade === 'good' ? 'CORE BROKEN' : event.grade === 'early' ? 'EARLY · SAVED' : 'LATE · SAVED';
      this.feedback(`${label}  +${event.points}`, this.fxPerfect || event.overdrive ? 'perfect' : 'normal');
      if (!this.reducedMotion) {
        this.cameras.main.shake(event.overdrive ? 180 : 100, event.overdrive ? .009 : this.fxPerfect ? .004 : .002);
        try { navigator.vibrate?.(event.overdrive ? 35 : 15); } catch { /* Optional. */ }
      }
    } else if (event.type === 'impact') {
      this.fx = 1; this.fxImpact = true; this.fxOverdrive = false; this.fxSector = event.sector;
      this.audio.impact(); this.feedback(`DEBRIS HIT  −${event.damage}% SHIELD`, 'impact');
      if (!this.reducedMotion) this.cameras.main.shake(180, .008);
    } else if (event.type === 'finish') this.finishRun();
  }

  private finishRun(): void {
    this.releaseAll();
    this.newBest = this.run.score > (this.best?.score ?? 0);
    const saved = storeBest(this.storage, {
      version: RULES_VERSION, day: this.run.daySeed, score: this.run.score,
      perfect: this.run.perfect, cleared: this.run.cleared, bestCombo: this.run.bestCombo,
    });
    text('result-kicker', this.run.reason === 'complete' ? 'ALL 25 WAVES FACED' : 'THE CITY NEEDS YOU AGAIN');
    text('result-title', this.run.reason === 'complete' ? 'City defended.' : 'Shield down.');
    text('result-score', this.run.score.toLocaleString('en-US'));
    text('record-note', saved ? this.newBest ? 'NEW DAILY BEST · ON THIS DEVICE' : `DAILY BEST ON THIS DEVICE · ${Math.max(this.best?.score ?? 0, this.run.score).toLocaleString('en-US')}` : 'THIS RUN ONLY · RECORD COULD NOT BE SAVED');
    text('result-perfect', String(this.run.perfect));
    text('result-combo', String(this.run.bestCombo));
    text('result-cleared', `${this.run.cleared}/${WAVE_COUNT}`);
    const next = this.best && this.run.score < this.best.score ? `${this.best.score - this.run.score + 1} more points to beat your daily best. ` : '';
    const hint = this.run.firstMiss ? `Wave ${String(this.run.firstMiss).padStart(2, '0')} broke through. Hold until the core bursts.` :
      this.run.early > this.run.late ? 'Try pressing a little later, just as the rings meet.' :
      this.run.late > 0 ? 'Meet the rings a little sooner for more PERFECTs.' :
      this.run.perfect < WAVE_COUNT ? 'Meet the rings more precisely to charge OVERDRIVE.' : 'Flawless defense. Share the daily challenge.';
    text('retry-hint', next + hint);
    this.setPhase('results');
    element('retry').focus({ preventScroll: true });
  }

  private async share(): Promise<void> {
    if (this.sharing) return;
    this.sharing = true;
    const day = String(this.run.daySeed);
    const message = `LAST SHIELD · ${day.slice(0, 4)}-${day.slice(4, 6)}-${day.slice(6)} UTC\n${this.run.score.toLocaleString('en-US')} pts · ${this.run.perfect} PERFECT · ${this.run.cleared}/25 cores\nBest combo: ${this.run.bestCombo}. Same sky. Can you beat my defense?`;
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
    this.fx = Math.max(0, this.fx - dt / 650);
    if (this.phase === 'playing') {
      this.feedbackMs = Math.max(0, this.feedbackMs - dt);
      if (!this.feedbackMs) text('feedback', '');
      for (const event of this.run.step(dt, this.inputs.size > 0)) this.handleEvent(event);
      const m = this.run.meteor;
      if (m && this.phase === 'playing') {
        if (this.previousWave !== this.run.waveIndex) {
          this.previousWave = this.run.waveIndex; this.previousCount = -1; this.previousReady = false;
        }
        const cue = chargeCue(this.run.waveElapsedMs, m.chargeStartMs);
        if (cue.phase === 'countdown' && cue.count !== this.previousCount) {
          this.previousCount = cue.count; this.audio.tone(360 + (3 - cue.count) * 120, 650, .07, .025);
        }
        if (cue.phase === 'ready' && !this.previousReady) { this.previousReady = true; this.audio.tone(760, 1080, .1, .05); }
        this.audio.beam(m.firing ? 1 - m.mass / 100 : null, this.run.energy === 3);
      } else this.audio.stop();
      this.renderHUD();
    }
    this.draw();
  }

  private renderHUD(): void {
    const run = this.run;
    text('score', run.score.toLocaleString('en-US'));
    text('clock', `${Math.ceil((RUN_DURATION_MS - run.elapsedMs) / 1000)}s`);
    text('combo', `${run.combo} COMBO`);
    text('perfect-count', `${run.perfect} PERFECT`);
    text('wave', `WAVE ${String(run.waveIndex + 1).padStart(2, '0')} / ${WAVE_COUNT}`);
    text('shield', `${run.integrity}%`);
    element('run-progress').style.width = `${run.elapsedMs / RUN_DURATION_MS * 100}%`;
    element('shield-fill').style.width = `${run.integrity}%`;
    element('shield-fill').style.background = run.integrity <= 30 ? '#ff9777' : '#a1f4d1';
    element('energy').querySelectorAll('i').forEach((el, i) => el.classList.toggle('lit', i < run.energy));
    text('energy-label', run.energy === 3 ? 'OVERDRIVE READY' : 'OVERDRIVE');
    if (this.best && run.score > this.best.score && this.lastScore <= this.best.score && !this.passedBest) {
      this.passedBest = true;
      this.feedback('DAILY BEST PASSED', 'perfect');
    }
    this.lastScore = run.score;
    text('target', this.best ? run.score > this.best.score ? 'NEW TERRITORY · KEEP THE CITY STANDING' : `${this.best.score - run.score + 1} TO BEAT YOUR DAILY BEST` : 'SET YOUR FIRST DAILY BEST · ON THIS DEVICE');
    const m = run.meteor;
    if (!m) {
      text('cue', this.fxImpact ? 'SHIELD HIT · REARM' : 'CORE BROKEN · RELEASE');
      text('cue-help', this.fxImpact ? 'You can recover. Meet the next rings.' : 'Breathe. The next wave is coming.');
      return;
    }
    const cue = chargeCue(run.waveElapsedMs, m.chargeStartMs);
    if (m.requireRelease) {
      text('cue', 'RELEASE TO REARM'); text('cue-help', 'A fresh hold for every meteor.');
    } else if (m.firing) {
      text('cue', `MELTING  ${Math.round(100 - m.mass)}%`);
      text('cue-help', m.kind === 'heavy' ? 'HEAVY CORE · Keep holding.' : 'Keep holding until the core breaks.');
    } else if (cue.phase === 'countdown') {
      text('cue', this.inputs.size ? 'HOLD · WAIT FOR ALIGNMENT' : `GET READY  ${cue.count}`);
      text('cue-help', m.kind === 'fast' ? 'FAST CORE · Meet the rings.' : m.kind === 'heavy' ? 'HEAVY CORE · A longer hold.' : 'Meet the rings for a PERFECT.');
    } else {
      text('cue', 'HOLD NOW'); text('cue-help', 'Press anywhere. Hold until it breaks.');
    }
  }

  private draw(): void {
    const g = this.graphics; g.clear();
    g.fillStyle(0x071216); g.fillRect(0, 0, W, H);
    const live = this.phase === 'playing' || this.phase === 'paused';
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
    for (let i = 0; i < 6; i++) {
      const a = -Math.PI / 2 + i * TAU / 6;
      const hurt = live && this.run.sectors[i] > 0;
      g.lineStyle(hurt ? 3 : 1, hurt ? CORAL : 0x507e6a, hurt ? .45 : .28);
      g.beginPath(); g.arc(CX, CY, 185, a + .025, a + TAU / 6 - .025); g.strokePath();
      const x = CX + Math.cos(a + TAU / 12) * 180, y = CY + Math.sin(a + TAU / 12) * 180;
      if (hurt) { g.lineBetween(x - 8, y - 5, x + 3, y + 4); g.lineBetween(x + 3, y + 4, x - 4, y + 12); }
    }
    if (live && this.run.meteor) this.drawMeteor(g);
    else if (!live) {
      g.lineStyle(1, MINT, .15); g.strokeCircle(CX, CY, 100); g.strokeCircle(CX, CY, 110);
    }
    if (this.fx > 0) this.drawBurst(g);
  }

  private drawCity(g: Phaser.GameObjects.Graphics, live: boolean): void {
    for (let i = 0; i < 23; i++) {
      const x = 24 + i * 22;
      const height = 20 + (i * 47 % 60) + (i === 11 ? 48 : 0);
      const sector = Math.min(5, Math.floor(i / 4));
      const damage = live ? this.run.sectors[sector] : 0;
      g.fillStyle(0x0b2525, .9); g.fillRect(x, 630 - height, 17, height);
      g.lineStyle(1, damage > 0 ? CORAL : MINT, damage > 0 ? .25 : .25);
      g.strokeRect(x, 630 - height, 17, height);
      for (let row = 0; row < Math.floor(height / 10) - 1; row++) {
        for (let col = 0; col < 2; col++) {
          const lit = (i + row + col) % 7 >= Math.min(6, Math.ceil(damage / 8));
          g.fillStyle(lit ? MINT : 0x21362e, lit ? .4 : .5);
          g.fillRect(x + 4 + col * 6, 637 - height + row * 10, 2, 3);
        }
      }
    }
    g.lineStyle(1, MINT, .3); g.lineBetween(20, 632, 520, 632);
  }

  private drawMeteor(g: Phaser.GameObjects.Graphics): void {
    const m = this.run.meteor!;
    const elapsed = this.run.waveElapsedMs;
    const ready = elapsed >= m.chargeStartMs;
    const progress = Math.min(1, elapsed / m.chargeStartMs);
    const color = this.run.energy === 3 ? GOLD : MINT;
    const radius = (m.kind === 'heavy' ? 58 : m.kind === 'fast' ? 32 : 44) * (.65 + .35 * Math.min(1, elapsed / m.durationMs)) * Math.sqrt(m.mass / 100);
    const targetR = 99;
    // Exact same target time drives rings, countdown, tone and timing grade.
    g.lineStyle(2, color, .4); g.strokeCircle(CX, CY, targetR);
    const ringR = ready ? targetR : targetR + 76 * (1 - progress);
    g.lineStyle(ready ? 5 : 3, ready ? color : 0x86a99c, ready ? .9 : .65);
    g.strokeCircle(CX, CY, ringR);
    for (let i = 0; i < 4; i++) {
      const a = i * TAU / 4;
      g.lineStyle(2, color, .65);
      g.lineBetween(CX + Math.cos(a) * (targetR - 6), CY + Math.sin(a) * (targetR - 6), CX + Math.cos(a) * (targetR + 6), CY + Math.sin(a) * (targetR + 6));
    }
    if (ready) {
      g.fillStyle(color, m.firing ? .055 : .025); g.fillCircle(CX, CY, targetR);
    }
    // Faceted shell shrinks while bright fractures expose the core.
    const points: Phaser.Math.Vector2[] = [];
    for (let i = 0; i < 9; i++) {
      const a = i * TAU / 9 + (this.reducedMotion ? .3 : elapsed / 4000);
      const r = radius * (i % 2 ? .85 : 1.05);
      points.push(new Phaser.Math.Vector2(CX + Math.cos(a) * r, CY + Math.sin(a) * r));
    }
    g.fillStyle(0x82523d); g.fillPoints(points, true);
    g.lineStyle(2, 0xe6af7c, .85); g.strokePoints(points, true);
    g.fillStyle(m.firing ? GOLD : 0xc88855, m.firing ? .85 : .5); g.fillCircle(CX, CY, Math.max(2, radius * .24));
    for (let i = 0; i < 5; i++) {
      const a = i * TAU / 5 + .5;
      g.lineStyle(m.firing ? 3 : 1, m.firing ? GOLD : 0xffc38b, m.firing ? .9 : .4);
      g.lineBetween(CX + Math.cos(a) * radius * .2, CY + Math.sin(a) * radius * .2, CX + Math.cos(a + .2) * radius * .82, CY + Math.sin(a + .2) * radius * .82);
    }
    if (m.kind === 'heavy') {
      g.lineStyle(3, 0xd79c76, .45); g.strokeCircle(CX, CY, radius + 7);
    } else if (m.kind === 'fast') {
      g.lineStyle(2, 0xffd58b, .7);
      g.lineBetween(CX - 10, CY - radius - 24, CX, CY - radius - 12);
      g.lineBetween(CX, CY - radius - 12, CX + 10, CY - radius - 24);
    }
    if (m.firing) {
      const width = this.run.energy === 3 ? 18 : 10;
      g.lineStyle(width + 18, color, .12); g.lineBetween(CX, 646, CX, CY);
      g.lineStyle(width, color, .7); g.lineBetween(CX, 646, CX, CY);
      g.lineStyle(3, 0xf0fff2, .95); g.lineBetween(CX, 646, CX, CY);
      for (let i = 0; i < 10; i++) {
        const a = i * TAU / 10 + (this.reducedMotion ? 0 : elapsed / 170);
        const distance = radius + 10 + i % 3 * 7;
        g.fillStyle(GOLD, .7); g.fillCircle(CX + Math.cos(a) * distance, CY + Math.sin(a) * distance, 2);
      }
      // A ring of remaining shell gives continuous feedback without another text bar.
      g.lineStyle(5, GOLD, .9); g.beginPath(); g.arc(CX, CY, 74, -Math.PI / 2, -Math.PI / 2 + TAU * m.mass / 100); g.strokePath();
    }
  }

  private drawBurst(g: Phaser.GameObjects.Graphics): void {
    const t = 1 - this.fx;
    const color = this.fxImpact ? CORAL : this.fxOverdrive || this.fxPerfect ? GOLD : MINT;
    const a = (this.fxSector + .5) * TAU / 6 - Math.PI / 2;
    const x = this.fxImpact ? CX + Math.cos(a) * 130 : CX;
    const y = this.fxImpact ? CY + Math.sin(a) * 130 : CY;
    if (this.reducedMotion) {
      g.lineStyle(3, color, this.fx * .6); g.strokeCircle(x, y, 100); return;
    }
    g.fillStyle(color, this.fx * .07); g.fillCircle(x, y, 25 + t * 170);
    g.lineStyle(1 + this.fx * 4, color, this.fx * .8); g.strokeCircle(x, y, 25 + t * (this.fxOverdrive ? 240 : 155));
    const count = this.fxOverdrive ? 26 : this.fxPerfect ? 18 : 12;
    for (let i = 0; i < count; i++) {
      const angle = i * TAU / count + .2;
      const distance = 20 + t * (75 + i % 4 * 30);
      const px = x + Math.cos(angle) * distance, py = y + Math.sin(angle) * distance;
      g.fillStyle(color, this.fx); g.fillRect(px, py, 2 + this.fx * 3, 2 + this.fx * 3);
      g.lineStyle(1, color, this.fx * .4); g.lineBetween(px, py, px - Math.cos(angle) * 15, py - Math.sin(angle) * 15);
    }
  }
}

new Phaser.Game({
  type: Phaser.AUTO, parent: 'canvas-host', backgroundColor: '#071216',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: W, height: H },
  scene: [ShieldScene], render: { antialias: true }, audio: { noAudio: true },
});
