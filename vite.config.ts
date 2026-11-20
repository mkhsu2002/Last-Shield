import { defineConfig } from 'vite';
import { devvit } from '@devvit/start/vite';
import { phaserCoreAlias, phaserCoreFlags } from './scripts/phaser-core.ts';

export default defineConfig({
  resolve: { alias: [phaserCoreAlias] },
  plugins: [phaserCoreFlags(), devvit({ client: { build: { chunkSizeWarningLimit: 2000 } } })],
});
