# v0.41 Storm Rhythm Implementation Plan

> Execute inline in this chat using executing-plans. MK authorized implementation and verified merge/push; no additional design approval is pending.

**Goal:** Make precision useful, storms recognizable and retries actionable while preserving single-button survival.

**Architecture:** Extend the shared deterministic simulator with beam state, ten-wave phase metadata and impact causes. Keep presentation/coaching separate from simulation and record only score-best wave metadata. Share one package-derived display version.

**Tech Stack:** TypeScript, Phaser, Vite, existing Node test runner; static Vercel deployment through GitHub main.

- [x] Add behavior tests in `src/shared/game-logic.test.ts` for boosted melting, charge use, seeded ten-wave phases, valid windows and input/impact causes; observe new tests fail.
- [x] Implement `stormPhase`, meteor preview and locked boost/cause fields in `src/shared/game-logic.ts`; retain geometry and survival invariants.
- [x] Add `src/client/coaching.ts` and its tests for actionable dominant-cause advice and ten-core milestone progress; extend `records.ts` validation/tests with score-best wave.
- [x] Update `game.ts`, `game-ui.ts`, `game.css`, splash and standalone metadata with storm/preview HUD, beam feedback, city milestone, best-wave comparison and visible package-derived v0.41. Keep failure paths and reduced motion.
- [x] Synchronize README, historical-status notes and release verification. Run `npm run check`, `npm test`, both builds, `git diff --check`; inspect public copy and run controlled browser scenarios at desktop/mobile sizes.
- [x] Review final diff, commit once as v0.41, fast-forward main, push/tag, verify deployment source and public bundle. Commit documentation-only release evidence without increasing the gameplay version.

Completed 2026-11-14. Gameplay tag `v0.41` / main `78435b2`; production deployment and live evidence are in `docs/v0-41-verification-2026-11-14.md`.
