/// <reference types="vite/client" />
import type * as Phaser from "phaser";

import { FIELD, viewMeteorGeometry } from "./battlefield";
import type { BattlefieldState } from "./battlefield";

const assets = import.meta.glob<string>("./art/{city,meteor}.{webp,png}", {
  eager: true, query: "?url&inline", import: "default",
});
export function preloadSceneArt(scene: Phaser.Scene): void {
  for (const [path, url] of Object.entries(assets)) {
    const name = path.includes("/city.") ? "av-city" : "av-meteor";
    scene.load.image(name, url);
  }
}

/** Presentation only: use the same coordinates and radii as the collision layer. */
export class SceneArt {
  private readonly rocks = new Map<number, Phaser.GameObjects.Image>();
  private readonly city?: Phaser.GameObjects.Image;
  readonly texturedMeteors: boolean;

  constructor(private readonly scene: Phaser.Scene, private readonly scale: number) {
    if (scene.textures.exists("av-city")) {
      this.city = scene.add.image(0, (FIELD.y - 560 - 96) * scale, "av-city").setOrigin(0).setDepth(-20)
        .setDisplaySize(FIELD.width * scale, (FIELD.height + 96) * scale);
    }
    this.texturedMeteors = scene.textures.exists("av-meteor");
  }

  get hasCity(): boolean { return !!this.city; }

  draw(state: BattlefieldState): void {
    if (!this.texturedMeteors) return;
    const visible = new Set<number>();
    if (state.live) for (const m of state.run.meteors) {
      const pose = viewMeteorGeometry(m, state.run.waveElapsedMs, m.mass);
      let image = this.rocks.get(m.id);
      if (!image) {
        image = this.scene.add.image(0, 0, "av-meteor").setDepth(-2);
        this.rocks.set(m.id, image);
      }
      visible.add(m.id);
      const box = pose.radius * 2.22 * this.scale;
      image.setDisplaySize(box, box)
        .setPosition((FIELD.x + pose.x) * this.scale, (FIELD.y + pose.y) * this.scale)
        .setRotation(state.reducedMotion ? m.sector * 0.65 : m.sector * 0.65 + (state.run.waveElapsedMs - (m.arrestedMs ?? 0)) / 2500);
    }
    for (const [id, image] of this.rocks) {
      if (!visible.has(id)) { image.destroy(); this.rocks.delete(id); }
    }
  }
}
