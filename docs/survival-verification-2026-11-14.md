# v0.4 shield survival verification

2026-11-14. Supersedes the archived v0.3 fixed-duration MVP. This revision implements MK's feedback: contact was unclear/early, fixed cadence became repetitive, misses felt inconsequential, and life loss should govern survival rather than a timer.

## Implemented and checked

- No run countdown, numerical readiness countdown, wave cap or timed victory. Shield integrity is the large primary status; only zero health ends the run. Results report time survived and wave reached.
- Shared `meteorGeometry` drives the rendered core center/radius and shield clearance. A visible shell outline uses the collision radius. Tests verify positive clearance one millisecond before full-core contact and contact at the nominal impact time across 40 specs. Partially melted cores travel farther before impact.
- First two normal waves teach the controls. Subsequent normal/fast/heavy cores vary seeded flight durations and recovery delays; pressure grows through wave 80. Successful clears start a short, variable recovery. Impacts allow at least 700 ms for the fracture to register.
- Full misses remove 34 integrity; smaller residual cores cause proportional damage. Cracks persist, city windows dim, combo resets, and one overdrive charge is lost. Fracture noise/tones and glass shards accompany the exact contact sector. Fatal damage scatters the dome and delays results for 1.25 seconds; reduced motion disables moving shards, shake and dome displacement.
- Records use `survival-1`, excluding old fixed-round scores. Long scores/wave counts are accepted. Share output has no /25 denominator.
- Unit suite: 15 tests pass, including geometry/contact, dynamic schedules, 60 successful waves beyond 75 seconds, fatal damage, partial-core contact, fresh-input requirement, overdrive, grade locking and local-record validation/failure.
- Built standalone browser QA in canonical Neo Babylon lane: before contact 100%, after full contact 66% with SHIELD FRACTURED; fatal contact passed through `breaking` before results. Screenshots inspected before impact, after first fracture and during collapse.
- Browser-controlled run reached wave 49 with 48 PERFECTs, 48 combo and 100% shield; after deliberately stopping, it ended at wave 51 with 1:27 survived and 17,150 points. Early cue intervals varied roughly 1.8–2.4 seconds and later intervals roughly 1.5–2.1 seconds; they are no longer fixed slots.
- Mobile viewport 390×844 had no horizontal overflow. Pausing at 32% preserved both health and wave through 5 seconds of controlled clock time, then resumed correctly.
- Audio activation: after an actual Start click the custom AudioContext was running, and a full impact started one noise buffer plus seven tones; mute switched to SOUND OFF. This is browser activation evidence, not human listening or real-device approval.

## Release status

- Final TypeScript, 15 unit tests, standalone build, Devvit build and diff whitespace checks: passed with Node.js 24.20.0.
- GitHub main / Vercel standalone publication: pending.
- Reddit: deliberately not initialized, authenticated, uploaded or published. MK supplied an onboarding command to retain locally; it is not tracked or repeated here. After development, guide the official deployment of this existing project instead of running a scaffold over the checkout.
- No server endpoint, API response format, schema, migration or backend deployment changed.

## Still outside this release

Real iOS/Android hardware and human listening; authoritative Reddit scores/global ranks; shared city contribution. The prior inherited CLI dependency advisories and Phaser bundle size advisory remain as documented in the archived v0.3 verification.
