import * as Phaser from 'phaser';
import {
  advanceBeam, applyShieldDamage, initialBeam, meteorSpec, utcDaySeed,
} from '../shared/game-logic';
import type { BeamState, MeteorSpec } from '../shared/game-logic';

type Phase = 'intro' | 'playing' | 'gameover';
type FallingMeteor = MeteorSpec & {
  elapsed: number;
  beam: BeamState;
  readyCuePlayed: boolean;
};
const W = 540;
const H = 900;
const CX = W / 2;
const CY = 435;
const SHIELD_R = 200;
const TAU = Math.PI * 2;

class SynthAudio {
  private ctx: AudioContext | null = null;
  private beamOsc: OscillatorNode | null = null;
  private beamGain: GainNode | null = null;

  unlock(): void {
    try {
      if (!this.ctx) this.ctx = new AudioContext();
      if (this.ctx.state === 'suspended') void this.ctx.resume().catch(() => {});
    } catch {
      // Some embedded browsers have no Web Audio; visuals remain fully playable.
    }
  }

  private tone(
    startHz: number, endHz: number, duration: number,
    volume: number, type: OscillatorType = 'sine',
  ): void {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(20, startHz), now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, endHz), now + duration);
    gain.gain.setValueAtTime(Math.max(.0001, volume), now);
    gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + .03);
  }

  approaching(): void { this.tone(360, 520, .18, .035); }
  ready(): void {
    this.tone(690, 880, .12, .10);
    this.tone(1000, 1260, .18, .06);
  }
  pressed(): void { this.tone(190, 310, .09, .05, 'triangle'); }
  overheat(): void {
    this.stopBeam();
    this.tone(440, 90, .55, .19, 'sawtooth');
  }
  clear(): void {
    this.stopBeam();
    this.tone(540, 980, .28, .17, 'triangle');
    this.tone(880, 1320, .42, .10);
  }
  impact(): void {
    this.stopBeam();
    this.tone(120, 38, .54, .29, 'sawtooth');
    this.tone(76, 30, .7, .25, 'triangle');
  }
  beam(active: boolean): void {
    const ctx = this.ctx;
    if (!active || !ctx || ctx.state !== 'running') {
      this.stopBeam();
      return;
    }
    if (this.beamOsc) return;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = 'sawtooth';
    oscillator.frequency.value = 120;
    gain.gain.value = .0001;
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    gain.gain.setTargetAtTime(.065, ctx.currentTime, .06);
    this.beamOsc = oscillator;
    this.beamGain = gain;
  }
  stopBeam(): void {
    const osc = this.beamOsc;
    const gain = this.beamGain;
    const ctx = this.ctx;
    if (!osc || !gain || !ctx) return;
    gain.gain.setTargetAtTime(.0001, ctx.currentTime, .025);
    try { osc.stop(ctx.currentTime + .12); } catch { /* already stopped */ }
    this.beamOsc = null;
    this.beamGain = null;
  }
}

class ShieldScene extends Phaser.Scene {
  private graphics!: Phaser.GameObjects.Graphics;
  private hud!: Phaser.GameObjects.Text;
  private integrityLabel!: Phaser.GameObjects.Text;
  private heatLabel!: Phaser.GameObjects.Text;
  private cue!: Phaser.GameObjects.Text;
  private status!: Phaser.GameObjects.Text;
  private help!: Phaser.GameObjects.Text;
  private footer!: Phaser.GameObjects.Text;
  private audio = new SynthAudio();
  private phase: Phase = 'intro';
  private meteor: FallingMeteor | null = null;
  private held = false;
  private nextSpawnMs = 0;
  private sectors = [0, 0, 0, 0, 0, 0];
  private shieldIntegrity = 100;
  private daySeed = utcDaySeed(new Date());
  private index = 0;
  private score = 0;
  private combo = 0;
  private cleared = 0;
  private pulse = 0;
  private blast = 0;
  private blastMass = 0;
  private blastSector = 0;
  private blastClock = 0;
  private message = '';
  private messageTimer = 0;

  constructor() { super('shield'); }

  create(): void {
    this.cameras.main.setBackgroundColor(0x061120);
    this.graphics = this.add.graphics();
    this.add.text(CX, 37, 'NEO BABYLON  /  AEGIS SYSTEM', {
      fontFamily: 'Arial', fontSize: '13px', color: '#7eb2ce',
    }).setOrigin(.5);
    this.add.text(CX, 78, 'LAST SHIELD', {
      fontFamily: 'Arial Black, Arial', fontSize: '36px', color: '#e9fbff',
    }).setOrigin(.5);
    this.hud = this.add.text(CX, 118, '', {
      fontFamily: 'Arial', fontSize: '18px', color: '#c5e9f7',
    }).setOrigin(.5);
    this.integrityLabel = this.add.text(CX, 164, '', {
      fontFamily: 'Arial Black, Arial', fontSize: '17px', color: '#a8eff4',
    }).setOrigin(.5);
    this.heatLabel = this.add.text(CX, 212, '', {
      fontFamily: 'Arial', fontSize: '15px', color: '#9abdd1',
    }).setOrigin(.5);
    this.cue = this.add.text(CX, 664, '', {
      fontFamily: 'Arial Black, Arial', fontSize: '32px',
      color: '#a3effa', align: 'center',
      stroke: '#041322', strokeThickness: 5,
    }).setOrigin(.5);
    this.status = this.add.text(CX, 731, '', {
      fontFamily: 'Arial Black, Arial', fontSize: '23px',
      color: '#ccf4ff', align: 'center',
    }).setOrigin(.5);
    this.help = this.add.text(CX, 791, '', {
      fontFamily: 'Arial', fontSize: '18px', color: '#b7d7e6',
      align: 'center', wordWrap: { width: 472 },
    }).setOrigin(.5);
    this.footer = this.add.text(CX, 861, 'CLICK / TOUCH / SPACE  ·  NO AIMING', {
      fontFamily: 'Arial', fontSize: '12px', color: '#7694ac',
    }).setOrigin(.5);

    this.input.on('pointerdown', () => this.press());
    this.input.on('pointerup', () => this.release());
    this.input.on('pointerupoutside', () => this.release());
    this.input.keyboard?.on('keydown-SPACE', (event: KeyboardEvent) => {
      event.preventDefault();
      if (!event.repeat) this.press();
    });
    this.input.keyboard?.on('keyup-SPACE', (event: KeyboardEvent) => {
      event.preventDefault();
      this.release();
    });
    window.addEventListener('blur', () => this.release());
    this.refreshLabels();
  }

  private rumble(ms: number): void {
    try {
      if (typeof navigator.vibrate === 'function') navigator.vibrate(ms);
    } catch { /* Vibration API unavailable on most iOS browsers. */ }
  }

  private press(): void {
    this.audio.unlock();
    if (this.phase !== 'playing') {
      this.reset();
      return;
    }
    if (!this.meteor || this.held) return;
    this.held = true;
    this.audio.pressed();
    this.cameras.main.shake(95, .004);
    this.rumble(12);
  }

  private release(): void {
    this.held = false;
    this.audio.stopBeam();
  }

  private reset(): void {
    this.release();
    this.phase = 'playing';
    this.daySeed = utcDaySeed(new Date());
    this.meteor = null;
    this.sectors = [0, 0, 0, 0, 0, 0];
    this.shieldIntegrity = 100;
    this.nextSpawnMs = 750;
    this.index = 0;
    this.score = 0;
    this.combo = 0;
    this.cleared = 0;
    this.pulse = 0;
    this.blast = 0;
    this.message = 'FIRST METEOR INCOMING';
    this.messageTimer = 900;
    this.refreshLabels();
  }

  private spawn(): void {
    this.release();
    const spec = meteorSpec(this.daySeed, this.index);
    this.meteor = { ...spec, elapsed: 0, beam: initialBeam(), readyCuePlayed: false };
    this.index++;
    this.message = 'WAIT FOR THE CYAN SIGNAL';
    this.messageTimer = 1000;
    this.audio.approaching();
  }

  private setResult(message: string, duration = 1100): void {
    this.message = message;
    this.messageTimer = duration;
    this.refreshLabels();
  }

  private clearMeteor(): void {
    this.audio.clear();
    this.release();
    this.cameras.main.shake(220, .014);
    this.cameras.main.flash(165, 120, 245, 255);
    this.rumble(35);
    this.pulse = 1;
    this.combo++;
    this.cleared++;
    const points = 100 + Math.min(200, Math.floor((this.combo - 1) / 5) * 25);
    this.score += points;
    this.setResult('VAPORIZED  +' + points, 1450);
    this.meteor = null;
    this.nextSpawnMs = 1150;
  }

  private impact(m: FallingMeteor): void {
    const result = applyShieldDamage(this.shieldIntegrity, m.beam.mass);
    this.shieldIntegrity = result.integrity;
    this.sectors[m.sector] += result.damage;
    this.combo = 0;
    this.blast = 1;
    this.blastMass = m.beam.mass;
    this.blastSector = m.sector;
    this.blastClock = 0;
    this.release();
    this.audio.impact();
    this.cameras.main.shake(490, .034);
    this.cameras.main.flash(340, 240, 55, 50);
    this.rumble(120);
    this.setResult('DEBRIS HIT  -' + result.damage + '% SHIELD', 1700);
    this.meteor = null;
    if (result.destroyed) {
      this.phase = 'gameover';
      this.refreshLabels();
    } else {
      this.nextSpawnMs = 1400;
    }
  }

  private refreshLabels(): void {
    if (!this.hud) return;
    this.hud.setText('SCORE ' + this.score + '     COMBO ' + this.combo + '     CLEAR ' + this.cleared);
    this.integrityLabel.setText('SHIELD INTEGRITY  ' + this.shieldIntegrity + '%');
    this.integrityLabel.setColor(this.shieldIntegrity <= 30 ? '#ff9585' : '#a8eff4');
    if (this.phase === 'intro') {
      this.cue.setText('ONE BUTTON. HOLD TO DEFEND.');
      this.cue.setFontSize(25);
      this.status.setText('TAP ANYWHERE TO START');
      this.status.setColor('#a9f5ff');
      this.help.setText('Wait for HOLD NOW, then keep pressing until the meteor disappears. No aiming. No fragment tapping.');
    } else if (this.phase === 'gameover') {
      this.cue.setText('SHIELD DESTROYED');
      this.cue.setFontSize(31);
      this.status.setText('FINAL SCORE: ' + this.score);
      this.status.setColor('#ff9b8a');
      this.help.setText('TAP ANYWHERE TO TRY AGAIN');
    } else {
      this.cue.setFontSize(31);
      this.status.setText(this.message);
      this.status.setColor(this.message.includes('HIT') || this.message.includes('OVERHEAT') ? '#ff9b8a' : '#d5faff');
      this.help.setText('HOLD ANYWHERE · LET GO TO COOL\nDEBRIS DAMAGES SHIELD AUTOMATICALLY');
    }
  }

  update(_time: number, delta: number): void {
    const dt = Math.max(0, Math.min(70, delta));
    this.pulse = Math.max(0, this.pulse - dt / 700);
    this.blast = Math.max(0, this.blast - dt / 780);
    this.blastClock += dt;
    this.messageTimer = Math.max(0, this.messageTimer - dt);
    if (this.phase === 'playing') {
      if (!this.meteor) {
        this.nextSpawnMs -= dt;
        if (this.nextSpawnMs <= 0) this.spawn();
      } else {
        const m = this.meteor;
        m.elapsed += dt;
        const ready = m.elapsed >= m.chargeStartMs;
        if (ready && !m.readyCuePlayed) {
          m.readyCuePlayed = true;
          this.audio.ready();
          this.pulse = .38;
          this.setResult('HOLD THE BEAM!', 1350);
        }
        const oldOverheated = m.beam.overheated;
        m.beam = advanceBeam(m.beam, dt, this.held, ready);
        if (m.beam.overheated && !oldOverheated) {
          this.audio.overheat();
          this.cameras.main.shake(270, .022);
          this.rumble(65);
          this.setResult('OVERHEAT! RELEASE TO COOL', 1100);
        }
        this.audio.beam(m.beam.firing);
        if (m.beam.mass <= 0) this.clearMeteor();
        else if (m.elapsed >= m.durationMs) this.impact(m);
      }
    }
    this.draw();
    this.updateLiveText();
  }

  private updateLiveText(): void {
    const m = this.meteor;
    if (this.phase !== 'playing') return;
    if (!m) {
      this.cue.setText('STAND BY');
      this.heatLabel.setText('EMITTER HEAT  0%');
      return;
    }
    const heat = Math.round(m.beam.heat);
    this.heatLabel.setText('EMITTER HEAT  ' + heat + '%');
    this.heatLabel.setColor(m.beam.overheated || heat > 75 ? '#ff8a78' : '#9abdd1');
    if (m.beam.overheated) this.cue.setText('RELEASE · OVERHEAT');
    else if (m.elapsed < m.chargeStartMs) this.cue.setText(this.held ? 'TOO EARLY · RELEASE' : 'WAIT FOR SIGNAL');
    else if (m.beam.firing) this.cue.setText('KEEP HOLDING  ' + Math.round(100 - m.beam.mass) + '%');
    else this.cue.setText('HOLD NOW!');
    if (this.messageTimer <= 0) {
      this.status.setText(m.beam.overheated ? 'RELEASE TO RESET THE EMITTER' :
        m.beam.firing ? 'VAPORIZING METEOR' :
        m.elapsed < m.chargeStartMs ? 'METEOR APPROACHING' : 'PRESS ANYWHERE');
      this.status.setColor(m.beam.overheated ? '#ff9b8a' : '#d5faff');
    }
  }

  private draw(): void {
    const g = this.graphics;
    g.clear();
    const m = this.meteor;
    const p = m ? Math.min(1, m.elapsed / m.durationMs) : 0;
    // Deep-space perspective streaks follow the approaching meteor.
    for (let i = 0; i < 110; i++) {
      const a = ((i * 137.507) % 360) * Math.PI / 180;
      const r = 30 + ((i * 43) % 290);
      const sx = CX + Math.cos(a) * r;
      const sy = CY + Math.sin(a) * r * 1.12;
      const len = 2 + p * 11 + (i % 5);
      g.lineStyle(i % 9 === 0 ? 2 : 1, i % 9 === 0 ? 0xa7dcf8 : 0x497792, .17 + p * .2);
      g.lineBetween(sx, sy, sx + Math.cos(a) * len, sy + Math.sin(a) * len);
    }
    // Shield ring: it is not a target; timing is independent of pointer position.
    g.fillStyle(0x092f50, .36);
    g.fillCircle(CX, CY, SHIELD_R + 36);
    g.lineStyle(3, 0x286690, .6);
    g.strokeCircle(CX, CY, SHIELD_R + 30);
    g.lineStyle(5, 0x65c6e6, .66);
    g.strokeCircle(CX, CY, SHIELD_R);
    g.fillStyle(0x063451, .14);
    g.fillCircle(CX, CY, SHIELD_R);
    for (let i = 0; i < 6; i++) {
      const a = -Math.PI / 2 + i * TAU / 6;
      g.lineStyle(1, 0x4397c3, .19);
      g.lineBetween(CX, CY, CX + SHIELD_R * Math.cos(a), CY + SHIELD_R * Math.sin(a));
      if (this.sectors[i] > 0) {
        const x = CX + SHIELD_R * .80 * Math.cos(a + TAU / 12);
        const y = CY + SHIELD_R * .80 * Math.sin(a + TAU / 12);
        const thickness = 2 + Math.min(4, this.sectors[i] / 16);
        g.lineStyle(thickness, 0xff8276, .84);
        g.lineBetween(x - 16, y - 20, x + 9, y + 2);
        g.lineBetween(x + 9, y + 2, x - 7, y + 23);
        g.lineBetween(x + 9, y + 2, x + 25, y - 7);
      }
    }
    // Core with subtle pulse; the entire screen is the input surface.
    g.fillStyle(0x77cce9, .13);
    g.fillCircle(CX, CY, 30);
    g.lineStyle(2, 0x76d5f6, .42);
    g.strokeCircle(CX, CY, 33);
    if (m) this.drawMeteor(g, m);
    if (this.pulse > 0) {
      g.lineStyle(10 * this.pulse + 2, 0x9ef4fa, this.pulse);
      g.strokeCircle(CX, CY, SHIELD_R * (1.10 + .3 * (1 - this.pulse)));
    }
    if (this.blast > 0) this.drawBlast(g);

    // Shield integrity and emitter heat are legible without audio.
    g.fillStyle(0x112c43, .90);
    g.fillRoundedRect(80, 185, 380, 14, 7);
    g.fillStyle(this.shieldIntegrity <= 30 ? 0xff715d : this.shieldIntegrity <= 60 ? 0xffb65d : 0x6fdfd6, .98);
    if (this.shieldIntegrity > 0) g.fillRoundedRect(80, 185, 380 * this.shieldIntegrity / 100, 14, 7);

    g.fillStyle(0x1a3349, .95);
    g.fillRoundedRect(80, 232, 380, 8, 4);
    if (m && m.beam.heat > 0) {
      g.fillStyle(m.beam.heat > 75 ? 0xff765e : 0xffc975, .96);
      g.fillRoundedRect(80, 232, 380 * m.beam.heat / 100, 8, 4);
    }
    // Remaining meteor mass displayed separately; residual fragments never need clicking.
    if (m) {
      g.fillStyle(0x1d384d, .85);
      g.fillRoundedRect(115, 630, 310, 9, 5);
      if (m.beam.mass > 0) {
        g.fillStyle(0xf5b36f, .95);
        g.fillRoundedRect(115, 630, 310 * m.beam.mass / 100, 9, 5);
      }
      const ready = m.elapsed >= m.chargeStartMs;
      if (ready && !m.beam.overheated) {
        const blink = .55 + .35 * Math.sin(m.elapsed / 145);
        g.lineStyle(5, 0x82f4ff, blink);
        g.strokeCircle(CX, CY, 119);
      }
    }
    if (this.phase === 'intro') {
      g.fillStyle(0x061b2c, .55);
      g.fillRoundedRect(75, 342, 390, 169, 22);
      g.lineStyle(2, 0x6cd2e4, .7);
      g.strokeRoundedRect(75, 342, 390, 169, 22);
    }
  }

  private drawMeteor(g: Phaser.GameObjects.Graphics, m: FallingMeteor): void {
    const p = Math.min(1, m.elapsed / m.durationMs);
    const x = CX + Math.sin((m.sector + 1) * 1.4) * p * 28;
    const y = CY - 32 + Math.cos((m.sector + 1) * 1.4) * p * 16;
    const massRatio = Math.max(0, m.beam.mass) / 100;
    const radius = (7 + 101 * Math.pow(p, 2)) * Math.sqrt(massRatio);
    if (radius > .5) {
      g.fillStyle(0xff7e3a, .10 + .22 * p);
      g.fillCircle(x, y, radius * 1.72);
      for (let i = 0; i < 5; i++) {
        const a = i * TAU / 5 + p;
        g.lineStyle(2 + p * 5, 0xff6931, (.22 + p * .45) * massRatio);
        g.lineBetween(
          x + Math.cos(a) * radius * .6, y + Math.sin(a) * radius * .6,
          x + Math.cos(a) * radius * (1.7 + p), y + Math.sin(a) * radius * (1.7 + p),
        );
      }
      g.fillStyle(0xdb5933, 1);
      g.fillCircle(x, y, radius);
      g.fillStyle(0xffd29c, .95);
      g.fillCircle(x - radius * .2, y - radius * .22, Math.max(2, radius * .48));
    }
    if (m.beam.firing) {
      // Visible sustained beam from the ship; one key can vaporize the whole meteor.
      g.lineStyle(27, 0x3cc1e9, .23);
      g.lineBetween(CX, 879, x, y);
      g.lineStyle(10, 0x7df2f7, .86);
      g.lineBetween(CX, 879, x, y);
      g.lineStyle(3, 0xf3ffff, .95);
      g.lineBetween(CX, 879, x, y);
      g.fillStyle(0xf4ffff, .85);
      g.fillCircle(x, y, 18 + Math.sin(m.elapsed / 50) * 4);
      for (let i = 0; i < 6; i++) {
        const a = i * TAU / 6 + m.elapsed / 120;
        g.fillStyle(0xffe2ac, .8);
        g.fillCircle(x + Math.cos(a) * (radius + 15), y + Math.sin(a) * (radius + 15), 3);
      }
    }
    if (m.beam.overheated) {
      g.lineStyle(7, 0xff6958, .85);
      g.strokeCircle(CX, CY, 122);
    }
  }

  private drawBlast(g: Phaser.GameObjects.Graphics): void {
    const t = 1 - this.blast;
    const a = -Math.PI / 2 + (this.blastSector + .5) * TAU / 6;
    const x = CX + Math.cos(a) * SHIELD_R * .66;
    const y = CY + Math.sin(a) * SHIELD_R * .66;
    g.fillStyle(0xff513c, .43 * this.blast);
    g.fillCircle(x, y, 20 + t * 175);
    g.lineStyle(8 * this.blast + 2, 0xffb06b, this.blast);
    g.strokeCircle(x, y, 18 + t * 120);
    const count = 4 + Math.floor(this.blastMass / 12);
    for (let i = 0; i < count; i++) {
      const angle = i * TAU / count + this.blastClock / 950;
      const dist = (18 + t * 110) * (0.7 + (i % 3) * .18);
      g.fillStyle(i % 2 ? 0xff8b5b : 0xffde9e, this.blast);
      g.fillCircle(x + Math.cos(angle) * dist, y + Math.sin(angle) * dist, 3 + this.blast * 5);
    }
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game-container',
  backgroundColor: '#061120',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: W, height: H },
  scene: [ShieldScene],
  render: { antialias: true },
});
