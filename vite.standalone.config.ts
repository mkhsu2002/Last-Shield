import { defineConfig } from 'vite';
import { phaserCoreAlias, phaserCoreFlags } from './scripts/phaser-core.ts';

// Self-contained web version for browser preview on Vercel.
// The Reddit version still uses vite.config.ts and devvit.json.
export default defineConfig({
  resolve: { alias: [phaserCoreAlias] },
  plugins: [phaserCoreFlags()],
  base: '/',
  build: {
    outDir: 'dist/standalone',
    emptyOutDir: true,
    target: 'es2022',
  },
});
