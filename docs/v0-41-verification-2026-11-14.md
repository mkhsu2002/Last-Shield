# v0.41 — precision and storm rhythm verification

2026-11-14. Baseline v0.40 is archived in `survival-verification-2026-11-14.md`. This release preserves single-button survival and visible core/shield contact.

## Implemented

- PERFECT melting is 1.25× normal power. OVERDRIVE multiplies beam power by 2, is consumed at first effective firing and keeps its +200 successful-clear bonus. Boost/grade lock to the core across release/pause; a failed shot cannot refund charge. New record rules namespace: `survival-2`.
- Ten-wave storms: 4 approach waves, 4 rapid-front waves (10% faster flight and 120–299 ms recovery), a heavy breaker, a slower normal respite core with 1.2-second recovery. Two opening normal cores remain. Speeds/intervals/sectors are seeded by UTC day; pressure caps at wave 80. No wave cap or timed victory.
- HUD includes storm phase/next core, ten-core milestone progress, city milestone messages and the wave in the score-best run. Replaced the duplicate bottom health meter with milestone progress; shield health stays prominent at the top. Stage/goal information is below the playfield to avoid covering incoming cores.
- Results use dominant observed impact cause (unrearmed input, early release, late engagement, no hold) for advice. A score-best record stores `waveReached`; it does not claim an independent best-survival record.
- UI, Reddit splash and challenge copies derive visible v0.41 from package 0.41.0. Subsequent gameplay release pushes increment the visible version by 0.01; documentation-only verification pushes do not.

## Evidence

- Node.js 24.20.0. New behavior tests were observed failing before implementation. Unit suite: 23 passing tests, covering actual boosted mass reduction, consumption/restart/failure, timing locks, 30 daily seeds × 100 valid wave windows/phase specs, rendering partitions, physical contact, 60-wave survival, impact causes, milestone/advice, record validation/isolation and storage failure.
- TypeScript and standalone/Devvit builds passed. Standalone retains the inherited Phaser bundle-size advisory; the build is successful.
- Canonical `codex-neo-babylon` lane was started/verified as `mksaid2025@gmail.com`. Baseline public site readback matched the v0.40 source deployment before edits.
- Desktop controlled-clock gameplay reached 12 PERFECT clears / 12 combo / 100% health / 3,750 points. Observed OVERDRIVE READY after 3 clears, OVERDRIVE ACTIVE on wave 4, rapid front on wave 5, heavy breaker on wave 9, calm front on wave 10, next storm on wave 11. Ten cores advanced goal 10 → 20 and changed the city message.
- Pause preserved wave/health through 5 seconds of controlled time. Stopping input then ended the run at wave 15; results showed one milestone, next goal 20 and no-input advice. Reload recovered the local score-best and paired wave; weaker runs did not overwrite it.
- Inspected 1440×900 desktop and 390×844 mobile-sized screenshots. The mobile layout has no horizontal overflow. Results fit and clipboard-denial fallback remains vertically scrollable. Copied challenge includes v0.41, UTC date, wave/core stats and excludes localhost URLs.
- CDP touch emulation produced PERFECT BEAM and a perfect clear; reduced-motion mode remained playable. Mute changed to SOUND OFF. Denied localStorage produced THIS RUN ONLY / RECORD COULD NOT BE SAVED while retry remained enabled. No browser JavaScript errors were reported.
- Public text review includes standalone description, overlay/intro, readiness/damage states, results, retry advice, city messages, share/fallback output, Reddit splash and ARIA labels. Gameplay explanations only; no production prompts/provider choices/internal requirements appear in public copy. Documentation searches distinguish current rules from archived survival-1 evidence.

## Release state

Local implementation verified; final build/readback, main integration, Git tag and Vercel production verification pending. Do not treat this paragraph as evidence of publication until updated with deployment results.

No backend endpoints, response formats, schema, migrations, functions, schedules or provider secrets changed. The standalone is static. Reddit remains deliberately uninitialized/unpublished; a successful Devvit build does not establish a Reddit release. Real iOS/Android hardware and human audio review remain unperformed.
