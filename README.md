# AEGIS: Last Shield

A one-button daily meteor-defense game in the original **Neo Babylon** universe.

## v0.4 shield survival

- Watch incoming meteors and their targeting rings. **Press and hold anywhere**, or hold Space, when the targeting ring lights up. Release after the core bursts, then make a fresh hold for the next meteor. No aiming or fragment tapping.
- **Survive until the shield breaks.** There is no countdown, time limit or wave cap. The main HUD shows shield health. A run keeps its starting UTC date, including across midnight.
- First effective holds within **±120 ms** of ring alignment earn PERFECT. Holds through +450 ms earn GOOD. Earlier/later holds can still save the city, with fewer points. Repeated tapping cannot upgrade the grade after melting starts.
- The first two waves teach normal meteors. Later waves mix normal, fast and heavy cores with seeded, variable approach speeds and recovery intervals. Pressure increases through wave 80, then remains at the fastest tier. The next wave follows the previous clear or impact; there are no fixed slots.
- Three PERFECT clears charge **OVERDRIVE**: the next successful clear earns an additional burst and 200 points. A missed core resets the combo and removes one charge. A full impact removes 34 shield integrity; partial melting reduces damage. There is no overheat lock.
- The shield visibly encloses the city. The same shared trajectory/radius function drives meteor drawing and edge-to-shield contact. Partially melted cores shrink and travel farther before contact. Damage is never triggered by an unrelated visual deadline. Each hit leaves branching cracks and glass fragments, dims the city, and adds fracture audio. At zero health the dome collapses for 1.25 seconds before results.
- Scores include timing quality, a heavy-core bonus, capped combo bonuses and overdrive. There is no fixed-round maximum score.
- The daily best is saved **on the current device/browser only**, scoped to the UTC day and rule version. Results show survival time, wave reached, perfect clears, longest combo, cores broken and a retry hint. Old fixed-round records are excluded by the survival-1 rules namespace. Storage denial does not prevent play.
- **Copy Challenge** prepares player-initiated challenge text. Clipboard denial falls back to selectable text. The Reddit build links back to its public post; the standalone links to its page.
- Sound activates after Start and can be muted. All timing cues also have visual equivalents. Escape or the pause button pauses play; losing focus or hiding the page pauses and releases controls. Reduced-motion preferences disable shaking, moving burst particles and dome-collapse movement.

## Development

Reddit Devvit Web + Phaser 4 + TypeScript + Vite + Hono. Node.js **24.18.0 or newer**.

```sh
npm ci
npm run check
npm test
npm run build:standalone
npm run build
```

Local development: `npx vite --config vite.standalone.config.ts`.
Built standalone preview: `npx vite preview --config vite.standalone.config.ts --host 127.0.0.1 --port 4173`.
Reddit playtest: connect the developer app in `devvit.json`, then `npm run login` and `npm run dev`.

- `src/shared/game-logic.ts`: deterministic run simulator, contact geometry, variable wave scheduling, timing, scoring and damage; no Phaser or Reddit dependency.
- `src/client/game.ts`: scene, input, pause, rendering, results and challenge sharing.
- `src/client/game-ui.ts` / `game.css`: semantic HTML controls and responsive overlay.
- `src/client/audio.ts`: synthesized audio, independent of Phaser's audio manager.
- `src/client/records.ts`: validated, failure-tolerant local best records.
- `src/server/index.ts`: existing moderator-created Reddit post endpoint; unchanged by this MVP.

## Release and current boundaries

The existing Vercel project is `last-shield`, connected to GitHub `main`; its standalone production alias is [last-shield.vercel.app](https://last-shield.vercel.app). Source changes build the standalone client using `vercel.json`. Its ignored-build command compares production-impacting paths against the previous deployment SHA (falling back to the previous commit); docs-only updates skip builds. No cron or GitHub Actions are configured.

See [survival verification](docs/survival-verification-2026-11-14.md) for the current release/readback state. The [v0.3 verification](docs/mvp-verification-2026-11-14.md) is historical. A successful Devvit build is not evidence of a Reddit launch. This MVP introduces **no backend schema or API changes** and does not deploy a new Reddit backend.

Not implemented: Reddit account persistence, global leaderboard, server-validated scores, shared city contributions, automatic daily posts or telemetry. Device-local scores are not authoritative competitive scores. Real iOS/Android hardware playtesting and human audio review remain necessary; browser touch emulation is not hardware testing. Audio is synthesized, and vibration support varies by device. The art is procedural rather than canonical Neo Babylon illustration.

## IP

**Neo Babylon**, its fictional setting, characters, original art and audiovisual assets are reserved to their respective creator(s). No rights to reuse those assets are granted. A source-code license has not yet been selected.

Developed for the Reddit Game of the Day 2026 challenge.
