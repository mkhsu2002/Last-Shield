# Daily Defense MVP Implementation Plan

> Archived 2026-11-14: v0.3 fixed-duration gameplay was superseded by v0.4 shield survival after player feedback. These are historical checks/design decisions, not the current gameplay contract. See `docs/survival-verification-2026-11-14.md`.
**Goal:** Ship the approved single-player daily-defense MVP on top of `20e94cd`.

**Architecture:** Shared deterministic simulator owns run rules and events. Phaser owns audiovisual feedback; a DOM overlay owns accessible controls and local records. Existing Reddit server remains unchanged.

**Tech Stack:** TypeScript, Phaser 4, Vite, Devvit Web.

- [x] Add behavior tests to `src/shared/game-logic.test.ts` for timing grades, fixed wave slots, hold recovery, fresh input, overdrive and completion. Run `npm test` and verify new assertions fail before implementing.
- [x] Implement rules and simulator in `src/shared/game-logic.ts`; rerun tests until green. Keep the upstream countdown synchronized with the new shorter cue window.
- [x] Add `src/client/records.ts` and its behavior tests for validated daily bests, stale versions and unavailable storage. Keep records local and never represent them as Reddit ranks.
- [x] Implement the playable scene, DOM overlay, audio, motion preferences, pause and share fallback. Update both HTML entrypoints and Reddit splash copy.
- [x] Run type checks, unit tests and both builds; play the built standalone in the canonical Neo Babylon browser lane. Exercise perfect/early/late/miss, replay, pause, storage, keyboard and small viewport behavior.
- [x] Update README and release evidence, review public strings and diff, commit, merge and push after checks. Verify the remote head and any available standalone deployment; do not claim a Reddit launch.

Execution: inline in the existing clean checkout. User already authorized implementation and shipping; no additional approval handoff is required.

Completed 2026-11-14. Standalone production verified at source `4eed634`; authenticated Reddit launch remains outside this MVP. See `docs/mvp-verification-2026-11-14.md`.
