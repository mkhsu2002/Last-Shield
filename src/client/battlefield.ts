import * as Phaser from "phaser";
import {
  meteorGeometry,
  SHIELD_RADIUS,
  PERFECT_WINDOW_MS,
  contactInMs,
} from "../shared/game-logic";
import type { DefenseRun, Meteor } from "../shared/game-logic";

export const FIELD = { width: 540, height: 1080, x: 270, y: 560 };
const CYAN = 0x78e5f2,
  OVERDRIVE_BLUE = 0x55bfff,
  GOLD = 0xffc46b,
  CORAL = 0xff8b6a,
  TAU = Math.PI * 2;
export type BattleEffect = {
  x: number;
  y: number;
  life: number;
  impact: boolean;
  overdrive: boolean;
  perfect: boolean;
};
export type BattlefieldState = {
  run: DefenseRun;
  live: boolean;
  reducedMotion: boolean;
  effects: BattleEffect[];
  collapse: number;
  overdriveFlash: number;
  time: number;
  hasCity?: boolean;
  texturedMeteors?: boolean;
};
type State = BattlefieldState;
type Graphics = Phaser.GameObjects.Graphics;

function glow(
  g: Graphics,
  x: number,
  y: number,
  radius: number,
  color: number,
  alpha: number
): void {
  for (let i = 4; i >= 1; i--) {
    g.fillStyle(color, alpha / (i * 2));
    g.fillCircle(x, y, (radius * i) / 2);
  }
}

function sky(g: Graphics): void {
  // Vertical atmospheric color bands are geometry, so no external textures are needed.
  for (let i = 0; i < 54; i++) {
    const t = i / 53;
    const r = Math.round(6 + t * 7),
      green = Math.round(13 + t * 18),
      b = Math.round(29 + t * 27);
    g.fillStyle((r << 16) | (green << 8) | b);
    g.fillRect(0, i * 20, FIELD.width, 21);
  }
  glow(g, 270, 455, 210, 0x246b98, 0.035);
  glow(g, 440, 240, 80, 0x95b6d9, 0.025);
  g.fillStyle(0x718da9, 0.12);
  g.fillCircle(438, 257, 52);
  g.fillStyle(0x091326, 0.96);
  g.fillCircle(419, 242, 51);
  for (let i = 0; i < 85; i++) {
    const x = (i * 173 + 41) % 540,
      y = (i * 97 + 19) % 730;
    g.fillStyle(i % 9 === 0 ? 0xbce6ff : 0x9fb8d2, i % 9 === 0 ? 0.65 : 0.23);
    g.fillCircle(x, y, i % 9 === 0 ? 1.25 : 0.65);
  }
  // Layered terrain and atmospheric horizon.
  for (let layer = 0; layer < 3; layer++) {
    const base = 650 + layer * 28;
    const ridge = [
      new Phaser.Math.Vector2(0, 1080),
      new Phaser.Math.Vector2(0, base),
    ];
    for (let i = 0; i <= 14; i++)
      ridge.push(
        new Phaser.Math.Vector2(i * 42, base - ((i * 47 + layer * 31) % 91))
      );
    ridge.push(new Phaser.Math.Vector2(540, 1080));
    g.fillStyle([0x142c44, 0x10253b, 0x0a1a2e][layer]!, 0.8);
    g.fillPoints(ridge, true);
  }
  glow(g, 270, 595, 150, 0x64d6e6, 0.035);
  g.lineStyle(1, 0x6b9cb8, 0.12);
  g.strokeEllipse(270, 617, 460, 58);
}

function city(g: Graphics, state: State): void {
  const { run, live } = state;
  for (let layer = 0; layer < 3; layer++) {
    const count = layer === 0 ? 22 : 17;
    const step = layer === 0 ? 20 : 15;
    const start = 270 - (count * step) / 2;
    const base = FIELD.y + 102 - layer * 9;
    for (let i = 0; i < count; i++) {
      const x = start + i * step;
      const height = 26 + ((i * 37 + layer * 23) % (layer === 0 ? 43 : 82));
      const width = step - 3;
      const sector = Math.min(5, Math.floor(i / (count / 6)));
      const damage = live ? run.sectors[sector]! : 0;
      g.fillStyle([0x142d43, 0x14334c, 0x0d253c][layer]!, 0.98);
      g.fillRect(x, base - height, width, height);
      if (layer > 0) {
        g.lineStyle(1, 0x4c7b99, 0.55);
        g.lineBetween(x, base - height, x + width, base - height);
        g.lineBetween(x + width, base - height, x + width, base);
        g.fillStyle(0x223f56);
        g.fillRect(x + 2, base - height + 3, width - 4, 3);
        for (let row = 0; row < Math.floor(height / 9) - 1; row++) {
          const lit = (i + row * 3) % 9 >= Math.min(8, Math.ceil(damage / 5));
          g.fillStyle(
            lit ? (i % 4 === 0 ? GOLD : 0x89d6e4) : 0x223448,
            lit ? 0.7 : 0.5
          );
          for (let col = 0; col < 2; col++)
            g.fillRect(x + 3 + col * 6, base - height + 11 + row * 9, 2, 3);
        }
        if (i % 4 === 0) {
          g.lineStyle(1, 0x7db5c7, 0.5);
          g.lineBetween(
            x + width / 2,
            base - height,
            x + width / 2,
            base - height - 10
          );
          g.fillStyle(GOLD, 0.6);
          g.fillCircle(x + width / 2, base - height - 10, 1.3);
        }
      }
    }
  }
  // A lit central spire anchors the city silhouette and the beam origin.
  g.fillStyle(0x183c56);
  g.fillTriangle(251, FIELD.y + 80, 270, FIELD.y - 33, 289, FIELD.y + 80);
  g.fillStyle(0x214b66);
  g.fillTriangle(270, FIELD.y - 33, 270, FIELD.y + 80, 289, FIELD.y + 80);
  g.lineStyle(1.5, CYAN, 0.65);
  g.lineBetween(270, FIELD.y - 33, 270, FIELD.y + 76);
  g.fillStyle(CYAN, 0.7);
  g.fillRect(261, FIELD.y + 29, 18, 2);
  g.fillRect(258, FIELD.y + 47, 24, 2);
  g.lineStyle(1, 0x609caf, 0.45);
  g.strokeEllipse(270, FIELD.y + 100, 260, 32);
  glow(g, 270, FIELD.y + 75, 16, CYAN, 0.2);
}

function litCity(g: Graphics, state: State): void {
  // This is a local lighting layer, not a substitute for the painted environment.
  const y = FIELD.y + 75;
  const humidity = state.reducedMotion ? 0.85 : 0.79 + 0.045 * Math.sin(state.time / 1800);
  for (let n = 7; n > 0; n--) {
    g.fillStyle(0x3fdefa, (8 - n) * 0.006 * humidity);
    g.fillEllipse(FIELD.x, y + 10, 42 + n * 32, 7 + n * 9);
  }
  g.fillStyle(0xdcffff, 0.94);
  g.fillCircle(FIELD.x, y, 2.6);
  g.lineStyle(1, 0x83f8ff, 0.38);
  g.lineBetween(FIELD.x - 11, y, FIELD.x + 11, y);
  for (let sector = 0; sector < 6; sector++) {
    const damage = state.live ? state.run.sectors[sector]! : 0;
    const start = 123 + sector * 49;
    for (let window = 0; window < 8; window++) {
      const on = window >= Math.min(8, Math.ceil(damage / 5));
      const x = start + (window % 4) * 8;
      const yy = FIELD.y + 109 + Math.floor(window / 4) * 5;
      g.fillStyle(on ? 0x9cecf3 : 0x2e2330, on ? 0.73 : 0.75);
      g.fillRect(x, yy, 2.3, 2);
    }
    if (damage > 0) {
      g.fillStyle(0x19051a, Math.min(0.5, damage / 88));
      g.fillEllipse(start + 16, FIELD.y + 103, 48, 30);
      g.fillStyle(0xff855f, Math.min(0.23, damage / 123));
      g.fillEllipse(start + 16, FIELD.y + 110, 24, 9);
    }
  }
}

function shield(g: Graphics, state: State): void {
  const { run, live, collapse, reducedMotion } = state;
  const broken = live && run.integrity === 0;
  const alpha = broken ? 1 - collapse : 1;
  glow(g, FIELD.x, FIELD.y, SHIELD_RADIUS, CYAN, 0.025 * alpha);
  g.fillStyle(0x65d6ee, 0.035 * alpha);
  g.fillCircle(FIELD.x, FIELD.y, SHIELD_RADIUS);
  if (!broken && state.hasCity) {
    // Projected surface lines taper toward the rim; no shader or frame readback.
    for (let band = 2; band <= 7; band++) {
      const a = band / 9;
      g.lineStyle(0.85, 0x88ebfc, (0.05 + a * 0.105) * alpha);
      g.beginPath();
      g.arc(FIELD.x, FIELD.y, SHIELD_RADIUS * a, -Math.PI, 0);
      g.strokePath();
    }
    for (let cell = 1; cell < 12; cell++) {
      const a = -Math.PI + cell * Math.PI / 12;
      g.lineBetween(FIELD.x + Math.cos(a) * 17, FIELD.y + Math.sin(a) * 17,
        FIELD.x + Math.cos(a) * SHIELD_RADIUS, FIELD.y + Math.sin(a) * SHIELD_RADIUS);
    }
  }
  if (!broken) {
    g.lineStyle(1, CYAN, 0.13);
    g.strokeEllipse(FIELD.x, FIELD.y, SHIELD_RADIUS * 2, SHIELD_RADIUS * 0.7);
    g.strokeEllipse(FIELD.x, FIELD.y, SHIELD_RADIUS * 0.75, SHIELD_RADIUS * 2);
    g.strokeEllipse(FIELD.x, FIELD.y, SHIELD_RADIUS * 1.5, SHIELD_RADIUS * 2);
    g.lineStyle(12, CYAN, 0.025);
    g.strokeCircle(FIELD.x, FIELD.y, SHIELD_RADIUS);
    g.lineStyle(6, CYAN, 0.06);
    g.strokeCircle(FIELD.x, FIELD.y, SHIELD_RADIUS);
    g.lineStyle(1.5, CYAN, 0.45);
    g.strokeCircle(FIELD.x, FIELD.y, SHIELD_RADIUS);
  }
  for (let sector = 0; sector < 6; sector++) {
    const a = -Math.PI + (sector * Math.PI) / 6,
      center = a + Math.PI / 12;
    const damage = live ? run.sectors[sector]! : 0;
    const displacement = broken && !reducedMotion ? collapse * 80 : 0;
    const x = FIELD.x + Math.cos(center) * displacement,
      y =
        FIELD.y +
        Math.sin(center) * displacement +
        (reducedMotion ? 0 : collapse * collapse * 120);
    g.lineStyle(damage > 0 ? 3 : 2.5, damage > 0 ? CORAL : CYAN, 0.9 * alpha);
    g.beginPath();
    g.arc(x, y, SHIELD_RADIUS, a + 0.015, a + Math.PI / 6 - 0.015);
    g.strokePath();
    g.lineStyle(1, 0xe0fbff, 0.35 * alpha);
    g.beginPath();
    g.arc(x, y, SHIELD_RADIUS - 2, a + 0.04, a + Math.PI / 6 - 0.04);
    g.strokePath();
    if (damage > 0 || broken) {
      for (
        let branch = 0;
        branch < Math.min(5, 1 + Math.floor(damage / 12));
        branch++
      ) {
        const angle = center + (branch - 1) * 0.13;
        const px = x + Math.cos(angle) * (SHIELD_RADIUS - 2),
          py = y + Math.sin(angle) * (SHIELD_RADIUS - 2);
        const qx = x + Math.cos(angle + 0.08) * 99,
          qy = y + Math.sin(angle + 0.08) * 99;
        const rx = x + Math.cos(angle - 0.1) * 73,
          ry = y + Math.sin(angle - 0.1) * 73;
        g.lineStyle(2, CORAL, 0.85 * alpha);
        g.lineBetween(px, py, qx, qy);
        g.lineBetween(qx, qy, rx, ry);
        g.lineStyle(1, 0xffd9b5, 0.7 * alpha);
        g.lineBetween(
          qx,
          qy,
          qx + Math.cos(angle + 1.2) * 23,
          qy + Math.sin(angle + 1.2) * 23
        );
      }
    }
  }
  if (state.overdriveFlash > 0) {
    const flash = state.overdriveFlash;
    const spread = state.reducedMotion ? 0 : (1 - flash) * 150;
    g.lineStyle(5 * flash + 1, OVERDRIVE_BLUE, flash * 0.85);
    g.strokeCircle(FIELD.x, FIELD.y, SHIELD_RADIUS + spread);
    g.lineStyle(2, 0xf0fcff, flash * 0.8);
    g.strokeCircle(FIELD.x, FIELD.y, SHIELD_RADIUS - 8 + spread * 0.8);
    glow(g, FIELD.x, FIELD.y + 75, 55, OVERDRIVE_BLUE, flash * 0.16);
  }
}

function core(g: Graphics, m: Meteor, state: State): void {
  const { run, reducedMotion } = state;
  const elapsed = run.waveElapsedMs;
  const geometry = meteorGeometry(m, elapsed, m.mass);
  const x = FIELD.x + geometry.x,
    y = FIELD.y + geometry.y,
    radius = geometry.radius;
  const target = run.meteor === m;
  const offset = run.timingOffset(m);
  const ready =
    Math.abs(offset) <= PERFECT_WINDOW_MS || m.grade === "perfect";
  const angle = geometry.angle;
  const color = m.grade === "perfect" ? GOLD : target ? CYAN : CORAL;
  for (let i = 4; i >= 1; i--) {
    g.lineStyle(radius * (1 - i * 0.12), 0xff9c5a, 0.04 + (4 - i) * 0.025);
    g.lineBetween(
      x,
      y,
      x + Math.cos(angle) * (25 + i * 15),
      y + Math.sin(angle) * (25 + i * 15)
    );
  }
  glow(g, x, y, radius * 1.4, 0xffa35d, 0.09);
  if (!state.texturedMeteors) {
  const points = [];
  for (let i = 0; i < 13; i++) {
    const a = (i * TAU) / 13 + (reducedMotion ? 0.25 : elapsed / 5000);
    const r = radius * (0.86 + ((i * 7) % 5) * 0.035);
    points.push(
      new Phaser.Math.Vector2(x + Math.cos(a) * r, y + Math.sin(a) * r)
    );
  }
  g.fillStyle(0x613e35);
  g.fillPoints(points, true);
  g.lineStyle(2, 0xf59b62, 0.95);
  g.strokePoints(points, true);
  g.fillStyle(0xbb6f43, 0.7);
  g.fillCircle(x - radius * 0.18, y - radius * 0.18, radius * 0.72);
  g.fillStyle(0x5f3d36, 0.8);
  g.fillCircle(x + radius * 0.28, y + radius * 0.2, radius * 0.53);
  for (let i = 0; i < 4; i++) {
    const a = (i * TAU) / 4 + 0.3;
    g.lineStyle(m.firing ? 2 : 1, 0xffd58f, m.firing ? 0.95 : 0.7);
    g.lineBetween(
      x + Math.cos(a) * radius * 0.16,
      y + Math.sin(a) * radius * 0.16,
      x + Math.cos(a + 0.24) * radius * 0.8,
      y + Math.sin(a + 0.24) * radius * 0.8
    );
  }
  }
  if (m.kind === "heavy") {
    g.lineStyle(3, 0xffc393, 0.6);
    g.strokeCircle(x, y, radius + 4);
  }
  if (m.kind === "fast") {
    g.lineStyle(2, GOLD, 0.8);
    g.lineBetween(x - 6, y - radius - 10, x, y - radius - 4);
    g.lineBetween(x, y - radius - 4, x + 6, y - radius - 10);
  }
  const eta = contactInMs(m, elapsed, m.mass);
  if (eta < 750) {
    g.lineStyle(2, CORAL, 0.4 + (1 - eta / 750) * 0.5);
    g.strokeCircle(x, y, radius + 5);
    glow(g, x, y, radius + 8, CORAL, 0.06);
  }
  // Only the selected core carries a bright timing ring; others have quieter brackets.
  if (target) {
    const gap = m.grade === "perfect" ? 0 : 28 * Math.max(0, Math.min(1, -offset / 600));
    const timingColor = ready
      ? GOLD
      : offset > PERFECT_WINDOW_MS
      ? CORAL
      : CYAN;
    g.lineStyle(1, timingColor, 0.5);
    g.strokeCircle(x, y, radius + 11);
    g.lineStyle(ready ? 3 : 2, timingColor, 0.95);
    g.strokeCircle(x, y, radius + 11 + (ready ? 0 : gap));
    for (let i = 0; i < 4; i++) {
      const a = (i * TAU) / 4;
      g.lineStyle(2, timingColor, 0.9);
      g.beginPath();
      g.arc(x, y, radius + 17, a - 0.12, a + 0.12);
      g.strokePath();
    }
  } else {
    g.lineStyle(1, color, 0.45);
    g.strokeCircle(x, y, radius + 8);
  }
  if (m.firing) {
    const boosted = m.grade === "perfect";
    const width = boosted ? 9 : 4;
    const beamColor = boosted ? GOLD : CYAN;
    const sx = FIELD.x, sy = FIELD.y + 75;
    const perpendicular = Math.atan2(y - sy, x - sx) + Math.PI / 2;
    const bx = Math.cos(perpendicular), by = Math.sin(perpendicular);
    const cutoff = boosted ? 13 : 6;
    g.fillStyle(beamColor, 0.21);
    g.fillTriangle(sx + bx * 2, sy + by * 2, x + bx * cutoff, y + by * cutoff, x - bx * cutoff, y - by * cutoff);
    g.fillStyle(0xeaffff, 0.86);
    g.fillCircle(sx, sy, boosted ? 6 : 4);
    g.fillCircle(x, y, boosted ? 5 : 3);
    g.lineStyle(width + 17, beamColor, 0.09);
    g.lineBetween(FIELD.x, FIELD.y + 75, x, y);
    g.lineStyle(width + 6, beamColor, 0.17);
    g.lineBetween(FIELD.x, FIELD.y + 75, x, y);
    g.lineStyle(width, beamColor, 0.8);
    g.lineBetween(FIELD.x, FIELD.y + 75, x, y);
    g.lineStyle(2, 0xfffbdf, 0.95);
    g.lineBetween(FIELD.x, FIELD.y + 75, x, y);
    glow(g, x, y, radius + 5, beamColor, 0.14);
    if (!reducedMotion) {
      for (let i = 0; i < 6; i++) {
        const a = (i * TAU) / 6 + elapsed / 170;
        g.fillStyle(GOLD, 0.8);
        g.fillCircle(
          x + Math.cos(a) * (radius + 8),
          y + Math.sin(a) * (radius + 8),
          1.8
        );
      }
    }
  }
}

function burst(g: Graphics, e: BattleEffect, reduced: boolean): void {
  const color = e.impact ? CORAL : e.overdrive ? OVERDRIVE_BLUE : CYAN,
    t = 1 - e.life;
  if (e.overdrive) {
    const sx = FIELD.x, sy = FIELD.y + 75;
    const beam = e.life * e.life;
    g.lineStyle(42, OVERDRIVE_BLUE, beam * 0.1);
    g.lineBetween(sx, sy, e.x, e.y);
    g.lineStyle(20, OVERDRIVE_BLUE, beam * 0.48);
    g.lineBetween(sx, sy, e.x, e.y);
    g.lineStyle(7, 0xf0fcff, beam * 0.96);
    g.lineBetween(sx, sy, e.x, e.y);
    glow(g, e.x, e.y, 55, OVERDRIVE_BLUE, beam * 0.2);
    g.fillStyle(0xf0fcff, beam * 0.9);
    g.fillCircle(e.x, e.y, 12 * e.life);
    g.fillCircle(sx, sy, 12 * e.life);
  }
  if (reduced) {
    g.lineStyle(3, color, e.life * 0.7);
    g.strokeCircle(e.x, e.y, 35);
    return;
  }
  glow(g, e.x, e.y, 35 + t * 60, color, e.life * 0.12);
  g.lineStyle(1 + e.life * 3, color, e.life * 0.65);
  g.strokeCircle(e.x, e.y, 15 + t * (e.overdrive ? 150 : 95));
  if (e.impact) {
    const angle = Math.atan2(e.y - FIELD.y, e.x - FIELD.x);
    for (let j = 0; j < 4; j++) {
      const sweep = 0.08 + t * (0.28 + j * 0.16);
      g.lineStyle(j === 0 ? 3 : 1.6, j === 0 ? 0xffe4cb : CORAL, e.life * (0.9 - j * 0.17));
      g.beginPath();
      g.arc(FIELD.x, FIELD.y, SHIELD_RADIUS - j * 7 + 2 * t, angle - sweep, angle + sweep);
      g.strokePath();
    }
  }
  const count = e.impact ? 25 : e.overdrive ? 22 : 12;
  for (let i = 0; i < count; i++) {
    const a = (i * TAU) / count + 0.2,
      d = 15 + t * (55 + (i % 4) * 21);
    const px = e.x + Math.cos(a) * d,
      py = e.y + Math.sin(a) * d + (e.impact ? t * t * 75 : 0);
    g.fillStyle(color, e.life * 0.9);
    if (e.impact) {
      const size = 2 + e.life * ((i % 3) + 3);
      g.fillTriangle(px - size, py - size, px + size, py, px, py + size * 1.7);
    } else g.fillCircle(px, py, 1 + e.life * 1.8);
  }
}

export function drawBattlefield(g: Graphics, state: State): void {
  g.clear();
  if (state.hasCity) litCity(g, state);
  else { sky(g); city(g, state); }
  shield(g, state);
  if (state.live)
    for (const meteor of state.run.meteors) core(g, meteor, state);
  for (const effect of state.effects) burst(g, effect, state.reducedMotion);
}
