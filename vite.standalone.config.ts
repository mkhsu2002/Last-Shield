import { defineConfig } from 'vite';

// Self-contained web version for browser preview on Vercel.
// The Reddit version still uses vite.config.ts and devvit.json.
export default defineConfig({
  base: '/',
  build: {
    outDir: 'dist/standalone',
    emptyOutDir: true,
    target: 'es2022',
  },
});
