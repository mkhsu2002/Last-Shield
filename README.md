# AEGIS: Last Shield

One-button meteor interception rhythm-survival game set in the **Neo Babylon** original fiction universe.

## Gameplay (MVP v0.1)

- A meteor approaches the shield in first-person perspective.
- One tap / left click / Space key triggers a single interception attempt per meteor.
- **PERFECT** within ±105 ms gives 100 points; **GOOD** within ±250 ms gives 50 points; outside that window is a **MISS**.
- A missed meteor continues to the shield and leaves a crack in its indicated sector.
- **A second impact in any previously damaged sector ends the run.**
- A rising combo grants multipliers. All players receive the same deterministic UTC daily meteor sequence.
- Six sector markers and a visual timing flash make the game playable without sound.

## Technology

- Official Reddit **Devvit Web** layout, Hono server, Vite, TypeScript, Phaser 4.
- Game rules in `src/shared/game-logic.ts` deliberately avoid any platform dependency.
- Visuals are procedural graphics: no third-party artwork or Neo Babylon character reference images are embedded yet.

## Develop

Requirements: Node.js **24.18.0 or later**, npm and a Reddit developer account.

1. Create/connect a Devvit developer app at https://developers.reddit.com/new . If the chosen app identifier differs from `last-shield`, edit `devvit.json` to match before running playtest.
2. Clone this repository and run `npm install`.
3. Run `npm run check`, `npm test`, and `npm run build`.
4. Run `npm run login` to authorize your Reddit account and `npm run dev` to open Devvit Playtest.
5. In the test post choose **Launch App** and tap to start.

Do not run a Devvit initialization command over this populated source tree with `--force`; it may overwrite project files.

## Current status and limitations

- Repo scaffold and MVP code are committed; actual Devvit Playtest, browser visuals and production deployment still need authentication and live validation.
- Score is per run only. Redis-backed leaderboards, server-validated scores, accessibility settings, mobile tuning, audio and daily post scheduling are intentionally **not** implemented yet.
- No GitHub Actions have been configured; no automatic deploys or cost-producing schedules.
- This is a first prototype, not an approved Reddit app or a live public game.

## IP and licensing

**Neo Babylon**, its story, names, settings, character designs and art belong to their respective creator(s). No license is granted for those assets. This public repository does not yet include an open-source license for the original game code; choose and document a code-specific license separately when ready.

Developed for the 2026 Reddit Game of the Day Hackathon.
