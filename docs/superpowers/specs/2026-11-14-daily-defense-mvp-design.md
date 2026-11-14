# Daily defense MVP — approved scope

> Archived 2026-11-14: v0.3 fixed-duration gameplay was superseded by v0.4 shield survival after player feedback. These are historical checks/design decisions, not the current gameplay contract. See `docs/survival-verification-2026-11-14.md`.
Status: implemented and standalone-verified, 2026-11-14; see the release verification record for deployment state. Based on remote main `20e94cd` and the user's approval to implement the proposed MVP. This is a product design, not evidence of a Reddit launch.

Keep the single hold action and the synchronized 3–2–1 / converging rings added upstream. A run has 25 fixed three-second slots (75 seconds), or ends when integrity reaches zero. A clear cannot accelerate the schedule. The first three waves teach the normal meteor; later slots mix normal, fast and heavy meteors deterministically from the UTC date.

The first effective hold earns PERFECT within ±120 ms of ring alignment, GOOD through +450 ms, otherwise EARLY/LATE. Pressing early remains playable without a heat lock. A continuous hold cannot automatically defend the following wave. Partial damage persists after releasing. Three perfect clears charge an overdrive bonus on the next clear; a miss drops one charge and resets combo. All qualities can clear a meteor.

Use a pure TypeScript run simulator for timing, damage, scoring and events. Phaser renders rings, meteor shell/core, beam, fragments, shockwaves and a city that reflects sector damage. A semantic HTML overlay provides controls, countdown, records, results, copyable challenge text and pause/audio controls. Honor reduced motion. Pause releases input and excludes hidden time. Each run keeps its starting UTC date.

Records are browser-local, versioned and scoped by UTC day; storage failure must not prevent play. Results show score, perfect clears, longest combo and an actionable retry hint. Challenge copying is user initiated, with selectable text when clipboard access fails. Do not claim global ranks, validated scores or community progress. No new backend/API contract, scheduler or publishing automation is introduced.

Acceptance: fixed 75-second schedule regardless of clear speed; graded timing boundaries; early recovery; fresh press per wave; overdrive consumption; partial damage; loss/end-of-round behavior; daily record validation and storage failure; keyboard/pointer/blur/pause; responsive desktop/mobile layouts; all public copy matches actual mechanics. Verify both standalone and Devvit builds. Reddit authentication and launch are separate from the standalone MVP.
