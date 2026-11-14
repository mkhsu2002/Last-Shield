import * as Phaser from 'phaser';
import { applyImpact, judgeTiming, meteorSpec, utcDaySeed } from '../shared/game-logic';
import type { MeteorSpec, TimingResult } from '../shared/game-logic';

type Phase = 'ready' | 'playing' | 'gameover';
type FallingMeteor = MeteorSpec & { index: number; elapsed: number; tapped: boolean };
const W = 540;
const H = 900;
const CX = W / 2;
const CY = 410;
const SHIELD_R = 200;
const TAU = Math.PI * 2;

class ShieldScene extends Phaser.Scene {
  private phase: Phase = 'ready';
  private graphics!: Phaser.GameObjects.Graphics;
  private hud!: Phaser.GameObjects.Text;
  private status!: Phaser.GameObjects.Text;
  private hint!: Phaser.GameObjects.Text;
  private meteor: FallingMeteor | null = null;
  private sectors: number[] = [0, 0, 0, 0, 0, 0];
  private nextSpawnMs = 0;
  private daySeed = utcDaySeed(new Date());
  private index = 0;
  private score = 0;
  private combo = 0;
  private caught = 0;
  private pulse = 0;
  private impactFlash = 0;
  private lastSector = 0;
  private message = '';

  constructor() { super('shield'); }

  create(): void {
    this.cameras.main.setBackgroundColor(0x071323);
    this.graphics = this.add.graphics();
    this.add.text(CX, 43, 'NEO BABYLON  /  DEFENSE 01', {
      fontFamily: 'Arial', fontSize: '15px', color: '#78b8d9',
    }).setOrigin(0.5);
    this.add.text(CX, 83, 'AEGIS: LAST SHIELD', {
      fontFamily: 'Arial Black, Arial', fontSize: '32px', color: '#e8f8ff',
    }).setOrigin(0.5);
    this.hud = this.add.text(CX, 132, '', {
      fontFamily: 'Arial', fontSize: '20px', color: '#d5eeff', align: 'center',
    }).setOrigin(0.5);
    this.status = this.add.text(CX, 704, '', {
      fontFamily: 'Arial Black, Arial', fontSize: '30px', color: '#98e7f4', align: 'center',
    }).setOrigin(0.5);
    this.hint = this.add.text(CX, 765, '', {
      fontFamily: 'Arial', fontSize: '17px', color: '#b4c9dc', align: 'center',
      wordWrap: { width: 466 },
    }).setOrigin(0.5);
    this.input.on('pointerdown', () => this.onTap());
    this.input.keyboard?.on('keydown-SPACE', () => this.onTap());
    this.updateLabels();
  }

  private resetRun(): void {
    this.phase = 'playing';
    this.meteor = null;
    this.sectors = [0, 0, 0, 0, 0, 0];
    this.nextSpawnMs = 300;
    this.index = 0;
    this.score = 0;
    this.combo = 0;
    this.caught = 0;
    this.pulse = 0;
    this.impactFlash = 0;
    this.message = 'GET READY';
    this.updateLabels();
  }

  private onTap(): void {
    if (this.phase !== 'playing') { this.resetRun(); return; }
    const meteor = this.meteor;
    if (!meteor || meteor.tapped) return;
    meteor.tapped = true; // Prevent unlimited-click exploits on one meteor.
    const result: TimingResult = judgeTiming(meteor.elapsed - meteor.targetMs);
    if (result === 'miss') {
      this.message = 'MISS · IMPACT INCOMING';
      this.combo = 0;
      this.updateLabels();
      return; // Residual fragment continues to the shield.
    }
    this.combo += 1;
    this.caught += 1;
    const multiplier = Math.min(5, 1 + Math.floor((this.combo - 1) / 5));
    const points = (result === 'perfect' ? 100 : 50) * multiplier;
    this.score += points;
    this.message = (result === 'perfect' ? 'PERFECT  +' : 'GOOD  +') + points;
    this.pulse = 1;
    this.lastSector = meteor.sector;
    this.meteor = null;
    this.nextSpawnMs = Math.max(90, 270 - this.index * 2);
    this.updateLabels();
  }

  private spawnMeteor(): void {
    const spec = meteorSpec(this.daySeed, this.index);
    this.meteor = { ...spec, index: this.index, elapsed: 0, tapped: false };
    this.index += 1;
    this.message = this.sectors[spec.sector] > 0 ? 'WARNING · WEAK SECTOR' : 'TIME THE FLASH';
    this.updateLabels();
  }

  private receiveImpact(sector: number): void {
    const outcome = applyImpact(this.sectors, sector);
    this.sectors = outcome.damage;
    this.combo = 0;
    this.lastSector = sector;
    this.impactFlash = 1;
    this.message = outcome.fatal ? 'SHIELD BREACHED' : 'SECTOR DAMAGED';
    if (outcome.fatal) this.phase = 'gameover';
    this.updateLabels();
  }

  private updateLabels(): void {
    if (!this.hud) return;
    this.hud.setText('SCORE  ' + this.score + '     COMBO  x' + this.combo + '     SAVED  ' + this.caught);
    if (this.phase === 'ready') {
      this.status.setText('THE LAST DEFENSE');
      this.status.setColor('#9ee8f4');
      this.hint.setText('Tap once to begin. Tap again when each meteor flashes.\nA second hit to the same sector ends the run.');
    } else if (this.phase === 'gameover') {
      this.status.setText('SHIELD BREACHED');
      this.status.setColor('#ff8a75');
      this.hint.setText('Final score: ' + this.score + '   ·   Meteors stopped: ' + this.caught + '\nTAP TO TRY AGAIN');
    } else {
      this.status.setText(this.message);
      this.status.setColor(this.message.startsWith('MISS') || this.message.startsWith('WARNING') || this.message.includes('DAMAGED') ? '#ff9d83' : '#9ee8f4');
      this.hint.setText('ONE TAP PER METEOR   ·   PERFECT ±105 ms   ·   GOOD ±250 ms');
    }
  }

  update(_time: number, delta: number): void {
    const dt = Math.min(delta, 70); // Avoid jumps after tab/app suspension.
    if (this.phase === 'playing') {
      if (this.meteor) {
        this.meteor.elapsed += dt;
        if (this.meteor.elapsed >= this.meteor.durationMs) {
          this.receiveImpact(this.meteor.sector);
          this.meteor = null;
          this.nextSpawnMs = 350;
        }
      } else {
        this.nextSpawnMs -= dt;
        if (this.nextSpawnMs <= 0) this.spawnMeteor();
      }
    }
    this.pulse = Math.max(0, this.pulse - dt / 350);
    this.impactFlash = Math.max(0, this.impactFlash - dt / 480);
    this.renderBoard();
  }

  private renderBoard(): void {
    const g = this.graphics;
    g.clear();
    // Procedural stars: no external images, requests, or copyrighted art.
    for (let i = 0; i < 76; i++) {
      const x = ((i * 1777 + 71) % 527) + 6;
      const y = ((i * 2311 + 17) % 775) + 125;
      g.fillStyle(i % 7 === 0 ? 0x8ecfee : 0x456783, i % 7 === 0 ? .72 : .33);
      g.fillCircle(x, y, i % 11 === 0 ? 2 : 1);
    }
    g.fillStyle(0x0c3152, .46);
    g.fillCircle(CX, CY, SHIELD_R + 34);
    g.lineStyle(2, 0x327eaa, .42);
    g.strokeCircle(CX, CY, SHIELD_R + 29);
    g.fillStyle(0x103d63, .35);
    g.fillCircle(CX, CY, SHIELD_R);
    g.lineStyle(4, 0x6ad2f0, .74);
    g.strokeCircle(CX, CY, SHIELD_R);
    g.lineStyle(1, 0x6dc7e8, .28);
    g.strokeCircle(CX, CY, SHIELD_R * .71);
    for (let i = 0; i < 6; i++) {
      const angle = -Math.PI / 2 + i * TAU / 6;
      const px = CX + SHIELD_R * Math.cos(angle);
      const py = CY + SHIELD_R * Math.sin(angle);
      g.lineStyle(2, 0x5ca5cc, .38);
      g.lineBetween(CX, CY, px, py);
      if (this.sectors[i] > 0) {
        const mid = angle + TAU / 12;
        const x = CX + SHIELD_R * .75 * Math.cos(mid);
        const y = CY + SHIELD_R * .75 * Math.sin(mid);
        g.lineStyle(4, 0xff7664, .96);
        g.lineBetween(x - 25, y - 17, x + 8, y + 9);
        g.lineBetween(x + 8, y + 9, x - 5, y + 33);
        g.lineBetween(x + 8, y + 9, x + 31, y + 1);
        g.fillStyle(0xff695a, .2);
        g.fillCircle(x, y, 35);
      }
    }
    if (this.pulse > 0) {
      g.lineStyle(15 * this.pulse + 2, 0x8cf6ff, this.pulse);
      g.strokeCircle(CX, CY, SHIELD_R * (1.18 - .24 * this.pulse));
    }
    if (this.impactFlash > 0) {
      const a = -Math.PI / 2 + (this.lastSector + .5) * TAU / 6;
      const x = CX + SHIELD_R * .85 * Math.cos(a);
      const y = CY + SHIELD_R * .85 * Math.sin(a);
      g.fillStyle(0xff5d44, .5 * this.impactFlash);
      g.fillCircle(x, y, 90 * this.impactFlash + 13);
    }
    if (this.meteor) this.renderMeteor(g, this.meteor);
    g.fillStyle(0x89e5f5, .85);
    g.fillCircle(CX, CY, 9);
    g.lineStyle(2, 0x5bc6de, .6);
    g.strokeCircle(CX, CY, 19);
    // Six small sector health markers at the bottom.
    for (let i = 0; i < 6; i++) {
      const x = CX - 123 + i * 49;
      g.fillStyle(this.sectors[i] > 0 ? 0xff7466 : 0x5bbbd7, this.sectors[i] > 0 ? .94 : .55);
      g.fillRoundedRect(x - 15, 818, 30, 9, 4);
    }
  }

  private renderMeteor(g: Phaser.GameObjects.Graphics, m: FallingMeteor): void {
    const p = Math.min(1, m.elapsed / m.durationMs);
    const a = -Math.PI / 2 + (m.sector + .5) * TAU / 6;
    const x = CX + Math.cos(a) * SHIELD_R * .78 * Math.pow(p, 1.3);
    const y = CY - 38 + Math.sin(a) * SHIELD_R * .78 * Math.pow(p, 1.3);
    const radius = 6 + Math.pow(p, 2.1) * 52;
    const error = Math.abs(m.elapsed - m.targetMs);
    const canHit = error <= 250 && !m.tapped;
    if (this.sectors[m.sector] > 0 && p > .35) {
      g.lineStyle(2, 0xff6f62, .38 + .4 * p);
      g.strokeCircle(x, y, radius * 1.8);
    }
    g.fillStyle(0xe35b31, .12 + .25 * p);
    g.fillCircle(x, y, radius * 1.75);
    if (m.tapped) {
      // A failed interception fractures the meteor into residual fragments.
      // They continue toward the shield and still count as one sector impact.
      for (let j = 0; j < 3; j++) {
        const a = (j * TAU / 3) + p * 5;
        const distance = radius * .7;
        const fx = x + Math.cos(a) * distance;
        const fy = y + Math.sin(a) * distance;
        g.fillStyle(0xff684d, .9);
        g.fillCircle(fx, fy, radius * .29);
        g.fillStyle(0xffd5a6, .85);
        g.fillCircle(fx - 2, fy - 2, Math.max(2, radius * .12));
      }
    } else {
      g.fillStyle(0xff823d, 1);
      g.fillCircle(x, y, radius);
      g.fillStyle(0xffdca3, .95);
      g.fillCircle(x - radius * .16, y - radius * .22, radius * .49);
    }
    if (canHit) {
      g.lineStyle(error <= 105 ? 8 : 5, error <= 105 ? 0xffffff : 0x87ecf7, .93);
      g.strokeCircle(x, y, radius + 14);
    }
    // Impact ETA indicator supports players without sound.
    const fraction = Math.max(0, Math.min(1, m.elapsed / m.targetMs));
    g.fillStyle(0x1d405c, .9);
    g.fillRoundedRect(105, 667, 330, 9, 4);
    g.fillStyle(canHit ? 0xa7f3ff : 0x438eae, .95);
    g.fillRoundedRect(105, 667, 330 * fraction, 9, 4);
    g.fillStyle(0xffffff, 1);
    g.fillRect(105 + 330 * .98, 660, 3, 23);
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game-container',
  backgroundColor: '#071323',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: W, height: H },
  scene: [ShieldScene],
  render: { antialias: true },
});
