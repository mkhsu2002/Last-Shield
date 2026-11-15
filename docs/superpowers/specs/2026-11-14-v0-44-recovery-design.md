# v0.44 補救窗口與前段緩坡

> Archived 2026-11-14：v0.45 已取代完美命中後仍循環的提示、重型工作量與單次擊破銜接；以下保留 v0.44 歷史證據。

Status: implemented and production-verified as v0.44. Authorized by MK's request to reduce difficulty and allow a second attempt, 2026-11-14. Retain banked manual overdrive and meaningful later crises; supersede survival-4 single opportunity/locked bad grade and early density.

- Gold opportunity repeats every 1000ms while a core remains alive; window widens ±120 → ±180ms. Input, timing marker, target ring and hints share the same cyclic timing function.
- Releasing and pressing again can improve an existing grade/power; residual mass never resets and an earned better grade never downgrades. No automatic upgrade while holding, and no energy until an actual clear; one core still awards at most one perfect charge. Keep the selected live core through release so re-pressing the main control retries that core; explicit targeting may still switch.
- Raise non-perfect viability (EARLY .85×, GOOD 1.15×, LATE 1×; PERFECT remains 3×). First 24 waves gradually shed a flight-time grace multiplier; early storms gain extra flight time. Wave 5 has two cores, first storm wave 6 has three, wave 12 four, then five/six later. Manual overdrive remains optional/banked and useful.
- Explain missed-window recovery in Chinese; show a fresh gold cue for later passes and an explicit release/repress cue when a weak beam can be corrected. Keep existing audio synthesis. RULES_VERSION survival-5; package 0.44.0 / visible v0.44.

Validation: reproduce failed second-pass/regrading tests before implementation; prove progress retention, best-grade retention, stable target on release, no passive perfect/extra energy, shared UI timing boundaries, measured early difficulty reduction without removing later pressure. Run existing checks and comparative seeded simulations, canonical mobile/desktop pointer/key recovery, overdrive and pause QA; unchanged storage/share covered by existing tests and prior release evidence and production SHA/bundle/live readback.
