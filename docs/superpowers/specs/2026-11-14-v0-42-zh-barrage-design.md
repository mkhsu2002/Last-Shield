# v0.42 中文守城與隕石齊射

Status: implementation authorized by MK's direct request, 2026-11-14. Supersedes v0.41 presentation, solo-core scheduling and survival-2 scoring. Existing global rules/skills own release/security procedures; this file contains only this release's design.

## Design decisions

- Default and only current interface is Traditional Chinese (`zh-Hant`), including instructions, dynamic cues, ARIA labels, metadata, clipboard fallback and Reddit client splash. Title: 最後防線. Keep the inherited unpublished Reddit server untouched.
- Mobile-first cinematic night city: layered skyline, atmospheric hills, illuminated shield lattice, textured incandescent cores/trails and fan beams. Navy base, cyan defense, amber energy, coral damage; system Traditional Chinese sans fonts. Large meaningful Chinese text and >=44px controls. No essential hover interaction or remote art/font dependency.
- Explain energy persistently: `超載蓄能 0／3`, `完美擊破 +1`, and `集滿後，下次光束雙倍威力，同時掃射所有隕石`. Show numerical charge, three segments, distinct ready/active state and transient charge feedback. Three perfect clears (not necessarily consecutive) fill charge. An impact loses one unspent charge. Spend ready charge on first effective firing, never refund it on pause/release. The primary gets its precision grade; ungraded collateral cores get GOOD, never free perfect charge; already-earned grades remain locked.
- Wave = one volley. First four volleys are solo; wave 5 introduces two concurrent cores during surge/breaker. From wave 11, normally two (respite one); wave 31 introduces three in surges; from wave 51, normally three (respite two). All appear together, in distinct seeded sectors; readiness times are staggered for sequential defense. Single-button always locks nearest-to-contact core, holds that target until release/clear/impact, requires a fresh hold after clear. Existing partial melting/contact geometry remains authoritative.
- OVERDRIVE doubles the selected beam and also melts every other live core during that shot. It does not automatically target later volleys. Every boosted clear retains +200; collateral GOODs do not generate energy. Multiple impacts retain separate damage/audit events. Freeze immediately on fatal impact.
- Existing base difficulty grows to wave 80; a logarithmic multiplier continues accelerating flight/burn/recovery afterward with stable per-core feasibility. Later volleys introduce concurrent processing pressure. No time limit or victory cap.
- Impact audio gains a layered low thump, phone-audible midrange crack, filtered noise body and long rumble with master compression; muted/paused behavior remains consistent. Fatal collapse has a distinct tail. Avoid simultaneous duplicate impact/shatter mixes.
- Rule version `survival-3`; local score-best validation permits up to three cores per wave. Visible release v0.42, package 0.42.0, matching Git tag. No server/API/schema/deployment contract changes or Reddit initialization.

## Validation

Meaningful tests: first simultaneous volley; unique sectors; valid per-core windows; primary selection/lock/rearm; collateral boost and energy accounting; independent same-step impacts/fatal freeze; partition stability; continuing difficulty; localization/record boundaries. Inspect intro/play/ready/active/impact/results at mobile and desktop sizes. Instrument actual Web Audio graph and render standalone impact sample for waveform/peak checks; do not claim human listening. Review all public Chinese copy. Cross-check Vercel source SHA, served bundle hashes and live gameplay after push.
