# AEGIS: Last Shield

A one-button daily meteor-defense game in the original **Neo Babylon** universe.

## v0.41 precision and storm rhythm

- Watch incoming meteors and their targeting rings. **Press and hold anywhere**, or hold Space, when the targeting ring lights up. Release after the core bursts, then make a fresh hold for the next meteor. No aiming or fragment tapping.
- **Survive until the shield breaks.** There is no countdown, time limit or wave cap. The main HUD shows shield health. A run keeps its starting UTC date, including across midnight.
- First effective holds within **±120 ms** of ring alignment earn PERFECT. Holds through +450 ms earn GOOD. Earlier/later holds can still save the city, with fewer points. PERFECT beams melt at 1.25× speed. Repeated tapping cannot upgrade the grade after melting starts.
- The first two waves teach normal meteors. Each ten-wave storm has four approach waves, four rapid-front waves (10% faster flight and 120–299 ms recovery), a heavy breaker and a slower respite core with a 1.2-second recovery. The HUD names the phase and previews the next core. Speeds, trajectories and intervals remain UTC-day seeded. Pressure increases through wave 80, then remains at the fastest tier. The next wave follows the previous clear or impact; there are no fixed slots.
- Three PERFECT clears charge **OVERDRIVE**: the next beam fires at 2× power, multiplying the precision boost, and earns an additional 200 points if it clears the core. The charge is spent on first firing; release, pause or impact cannot refund it. A missed core resets the combo and removes one charge. A full impact removes 34 shield integrity; partial melting reduces damage. There is no overheat lock.
- The shield visibly encloses the city. The same shared trajectory/radius function drives meteor drawing and edge-to-shield contact. Partially melted cores shrink and travel farther before contact. Damage is never triggered by an unrelated visual deadline. Each hit leaves branching cracks and glass fragments, dims the city, and adds fracture audio. At zero health the dome collapses for 1.25 seconds before results.
- Scores include timing quality, a heavy-core bonus, capped combo bonuses and overdrive. There is no fixed-round maximum score.
- The daily best is saved **on the current device/browser only**, scoped to the UTC day and rule version. Results show survival time, wave reached, perfect clears, longest combo, cores broken and a retry hint. The score-best run also records its wave reached, shown in the HUD (not an independent survival record). Both fixed-round and v0.40 records are excluded by the survival-2 rules namespace. Storage denial does not prevent play.
- Every ten cleared cores advances a personal milestone and a short city message. Results suggest the next milestone and give advice from actual impact causes: no input, unrearmed hold, early release or late engagement.
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
- `src/client/records.ts`: validated, failure-tolerant local score-best records including wave reached.
- `src/client/coaching.ts`: storm labels, milestone progress and impact-based retry advice.
- `src/client/version.ts`: visible version derived from package.json.
- `src/server/index.ts`: existing moderator-created Reddit post endpoint; unchanged by this MVP.

## Release and current boundaries

The existing Vercel project is `last-shield`, connected to GitHub `main`; its standalone production alias is [last-shield.vercel.app](https://last-shield.vercel.app). Source changes build the standalone client using `vercel.json`. Its ignored-build command compares production-impacting paths against the previous deployment SHA (falling back to the previous commit); docs-only updates skip builds. No cron or GitHub Actions are configured.

See [v0.41 verification](docs/v0-41-verification-2026-11-14.md) for the current release/readback state. The [v0.40 survival verification](docs/survival-verification-2026-11-14.md) and [v0.3 verification](docs/mvp-verification-2026-11-14.md) are historical. A successful Devvit build is not evidence of a Reddit launch. This release introduces **no backend schema or API changes** and does not deploy a new Reddit backend.

Not implemented: Reddit account persistence, global leaderboard, server-validated scores, shared city contributions, automatic daily posts or telemetry. Device-local scores are not authoritative competitive scores. Real iOS/Android hardware playtesting and human audio review remain necessary; browser touch emulation is not hardware testing. Audio is synthesized, and vibration support varies by device. The art is procedural rather than canonical Neo Babylon illustration.

## Versioning

Visible gameplay releases advance by **v0.01 per completed release push**: v0.40 → v0.41 → v0.42. `package.json` uses `0.41.0` for v0.41; the UI, Reddit splash and challenge copy read that version through `version.ts`. Create a matching Git tag after successful release checks. Documentation-only release-evidence commits do not advance the gameplay version. Change `RULES_VERSION` when scoring or mechanics change, keeping incomparable local records separate.

## IP

**Neo Babylon**, its fictional setting, characters, original art and audiovisual assets are reserved to their respective creator(s). No rights to reuse those assets are granted. A source-code license has not yet been selected.

Developed for the Reddit Game of the Day 2026 challenge.
