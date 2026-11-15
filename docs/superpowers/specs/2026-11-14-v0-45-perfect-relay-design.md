# v0.45 完美鎖定與擊破接力

Status: implemented and locally verified; production pending, authorized by MK's request to fix perfect-shot pressure and ambiguous repeated timing, including multiple large cores. 2026-11-14. Existing authorization allows implementation and release without another approval gate.

The live v0.44 UI was played with actual keyboard input, no mocked clock: 390×844, 120ms after the gold cue, 520ms hold, 160ms release gap, no blast. First five waves stayed at 100%, first three-core storm ended at 66% despite nine perfect clears. This is a reproducible input/cue bottleneck, not a human playtest endorsement.

- On perfect engagement, replace the looping timing cursor with a stable destruction progress bar and explicit hold-until-cleared instructions. If released, retain perfect grade and prompt resuming without another timing test. Only imperfect shots retain cyclic corrective timing. Selected perfect core's ring remains locked rather than opening/closing.
- A firing perfect beam arrests only its selected core's flight. Geometry/contact/rendering share its accumulated arrested time; release resumes flight, other cores keep moving. Heavy burn workload 1400 → 1050ms (perfect 467 → 350ms), ordinary/fast unchanged.
- A perfect clear opens a 750ms gold relay window for surviving cores in that volley. A new press is still required, one beam/core at a time; no automatic targeting/clearing, free energy or carry into the next volley. Visible cue after clear: release, then press the next core. Clear-only scoring and manual banked overdrive remain.
- Early storm grace increases from 600 to 1200ms × max(0, 1-index/24), covering sequential input/reaction time in the opening. Later pressure/count progression remains; fairness does not require zero damage forever.
- RULES survival-6, package 0.45.0 / visible v0.45. No API/backend, audio synthesis, platform configuration or Reddit publication changes.

Validation: failing heavy/isolated-arrest and three-heavy-with-180ms-release tests first; then late-perfect safety, release/other-core movement, relay expiration/new-press/no-energy, frame consistency, 30 dates with realistic 120ms response/160ms release and later manual-blast comparisons. Repeat real browser mobile/desktop play, inspect locked progress versus relay cues and run all existing checks, both builds, source/hash/live verification. Archive v0.44 claims without changing historical evidence dates.
