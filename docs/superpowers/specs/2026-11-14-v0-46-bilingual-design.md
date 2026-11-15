# v0.46 雙語介面

Status: implemented and production-verified as v0.46, 2026-11-14. MK requests English or bilingual support, default English. Existing release authorization applies.

- English on first use even with a Chinese browser locale. EN／繁中 selector available throughout game phases, persists a valid local preference when storage permits. Runtime switching updates copy without remounting/resetting gameplay; storage denial must not block session switching.
- Source-language keyed local catalog covers static text, numeric/nested dynamic cues, coaching, energy, practice, pause, result/error/status text, share/clipboard fallback, ARIA, document language/title/description and Reddit splash. No network translation or provider/API/backend changes.
- Numeric gameplay values and UTC challenge date remain intact. Select keyboard interaction must not trigger Space/E gameplay. Share fallback already open must update when language switches.
- Retain survival-6 rules and compatible best records; package 0.46.0 / UI v0.46. Preserve accepted audio and mechanics. Adapt the header and longer English copy at 320px/390px without clipped controls.
- Verify English/Chinese/reload persistence, default and denied storage, practice/live lock/relay/overdrive/pause/results, copy denial and share language, visible/ARIA copy review, both builds, source/bundle/live readback. Static standalone publication only; Reddit source builds do not imply Reddit publication.
