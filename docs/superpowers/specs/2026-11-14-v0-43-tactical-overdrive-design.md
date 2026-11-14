# v0.43 — 主動超載與真正的碎星危機

Status: implemented and production-verified as v0.43, 2026-11-14; authorized by MK's gameplay feedback. Replaces v0.42 survival-3 scheduling, passive overdrive and precision presentation. Sound and established Chinese visual direction are accepted and retained.

## Cause and design

v0.42 deliberately delayed each secondary readiness until after the previous core's perfect burn. It scaled burn time with flight time, left most play at two cores, and spent a charged special on the next normal shot. These guarantees prevented deadline conflicts and removed resource decisions. Reaching wave 35 with full health was not a gameplay acceptance criterion.

- Bank energy across normal shots and impacts; spend it only through the dedicated >=44px 超載震爆 button or E. A full bar plus no live targets cannot waste the charge. One activation instantly clears the live volley, grants no perfect energy and cannot retrigger. Track uses/clears for the result summary. Freeze/pause/blur do not activate it.
- Keep auto-aim as the default, but allow holding a specific core to set the fresh shot target. This permits choosing an earlier gold window instead of following deadline priority; native canvas hit testing maps client coordinates to the exact drawn geometry.
- Define precision at the START of a fresh hold: gold timing window ±120ms around alignment, instant feedback with early/late offset, gold window disappears afterward. Perfect beam power 3×; GOOD 1×, EARLY .55×, LATE .75×. A perfect START must still finish a core to gain one charge. Changing holds after effective melting cannot upgrade its committed grade. Partial melting/contact geometry stays authoritative.
- Add optional guided practice: one safe core, time stops at the golden alignment until the player holds; show the resulting grade and explanation, then retry practice or start the real run. Practice never writes a record or advances daily scores.
- Introduce actual conflicting deadlines: first three waves solo, wave 4 two, wave 5 three, wave 6 a four-core storm. Subsequent six-wave cycles mix respite/assault/heavy/pincer/storm; storms grow to five/six cores. Distinct sky sectors, seeded types and overlapping readiness/deadlines. No per-core completion padding. Flight pressure grows while raw burn times no longer shrink with flight times.
- Show count, nearest actual impact countdown, named storm warning and immediate timing feedback. Keep the normal fire control independent from the special. A charge can be spent early to score or saved to avoid later damage; no passive charge loss.
- Rules `survival-4`; record bounds allow six cores per wave; package 0.43.0 / visible v0.43. Static standalone release only; no server/schema/API or Reddit publication changes.

## Acceptance evidence

Test the same deterministic crisis with normal defense, no defense, early spending and banked manual rescue; record actual health and survivors, not only successful animation. Verify crisis appears early, ordinary play cannot coast indefinitely, manual rescue preserves health in a demonstrable case, precision meaningfully changes burn time, and both input methods can hold a charge. Retain geometry, rearm, grade locking, storage/share failure, pause, touch and reduced-motion checks. Inspect Chinese copy and all layouts. Verify deployed source SHA/bundle/live behavior before marking released; subjective fun remains for MK's hands-on review.
