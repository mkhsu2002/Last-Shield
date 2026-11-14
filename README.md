# AEGIS: Last Shield

A one-button hold-to-vaporize meteor rhythm-survival game in the original **Neo Babylon** universe.

## v0.2 gameplay

- Start a run with one tap, then **press and HOLD ANYWHERE** on the screen (or hold Space) when the turquoise ring says **HOLD NOW**.
- The energy beam continuously melts the meteor until it vanishes. One meteor at a time; there is **no aiming** and **no clicking the fragments**.
- Pressing before the cue heats the emitter. If it overheats, **release to cool**, then try again.
- Releasing before the meteor disappears leaves residual debris. On impact, the debris removes a **proportionate amount** of shield integrity (0–100), rather than causing immediate death on a repeated sector.
- Full vaporization saves all shield integrity, increases the combo, and earns points.
- Beginner meteors take about 5.4 seconds to approach, with 2.9+ seconds available to complete a ~1.1 second hold.
- Synthesized Web Audio cues play after the first interaction (browser gesture unlock); all cues also have visual equivalents. Impact and successful vaporization trigger strong screen feedback. Where supported, optional vibration is also used.
- UTC-date-based deterministic meteor sequence enables future daily score comparisons.

## Technology and development

- Reddit Devvit Web + Phaser 4 + TypeScript + Vite + Hono.
- Portable rules in `src/shared/game-logic.ts` with no Phaser or Reddit dependencies.
- Standalone browser preview and Devvit entrypoints share the same Phaser scene.

Node.js 24.18.0 or newer:

```sh
npm install
npm run check
npm test
npm run build:standalone
npm run build
```

For a local preview run `npx vite --config vite.standalone.config.ts`. For a Reddit test run, connect a Reddit developer app in `devvit.json`, run `npm run login` then `npm run dev`. The Reddit version has **not** been authenticated or publicly launched.

## Known limitations

- Audio is generated in real time, and mobile Safari may not support browser vibration. Screen shake and visual cues work independently.
- An actual touch-device playtest is still needed to tune difficulty and shaking intensity.
- Scores remain local to a run; Redis leaderboard, score validation, daily posting, and account persistence are not implemented.
- No background schedules or GitHub Actions are configured.
- Current drawings are procedural placeholder art, not canonical Neo Babylon illustrations.

## IP

**Neo Babylon**, its fictional setting, characters, original art and audiovisual assets are reserved to their respective creator(s). No rights to reuse those assets are granted. A source-code license has not yet been selected.

Developed for the Reddit Game of the Day 2026 challenge.
