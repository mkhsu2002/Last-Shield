# v0.41 — precision and storm rhythm

Status: authorized by MK's request to implement the proposed experience improvements, 2026-11-14. Baseline: released v0.40 (`927e61b`). This document supersedes survival-1 mechanics where described below.

## Scope

Keep single-button, one-core-at-a-time survival and exact visible contact. PERFECT beams melt at 1.25× speed. Three perfect clears charge the next beam to 2× speed (multiplicative with precision); consume the charge on firing, retain its +200 clear bonus, and never refund it on release/pause or impact. Lock the first effective timing grade and beam boost for the whole meteor.

Use repeating ten-wave storms with four approach waves, four rapid waves with 10% faster flight and 120–299 ms recovery, one heavy breaker and one slower respite wave. Keep two opening normal tutorial cores. Seed trajectory, variations and recovery by UTC day. Ramp through wave 80 with every nominal perfect hold retaining enough time to clear. Announce the current storm phase and next core; the respite offers a visible interval for recovery without healing or changing scores.

Show a ten-core milestone with short city messages when reached, plus the player's daily score target and the wave reached in the score-best run. On failure, classify actual impacts as unrearmed input, no hold, early release, or late engagement. Prefer the dominant impact cause in one actionable retry hint; use early/late successful clears only when no impact evidence exists.

Record namespace changes to survival-2 so different rules cannot share competitive records. Save wave reached with the existing score-best record; this is not an independent longest-survival record. Storage denial remains non-blocking. No backend, API, scheduler or Reddit publication changes.

## Version and release

Treat previous v0.4 as v0.40. Display v0.41 visibly and in challenge copies; package uses 0.41.0. Each subsequent gameplay release push advances the visible version by 0.01 (v0.42, v0.43 …); documentation-only verification commits do not create a gameplay release. Centralize the display version from package.json to avoid drift.

## Verification

Test precision speed, charge consumption/loss, grade locking, phase patterns, seeded fairness across days, frame partitioning, cause-based coaching and record isolation. Run typecheck, unit tests and both builds with Node 24+. Inspect desktop/mobile in the canonical Neo Babylon lane, including overdrive, milestone, pause, damage and results. Review every public text surface. Merge/push main only after checks; verify Vercel source SHA, served bundle and live v0.41. Retain explicit untested hardware/audio boundaries.
