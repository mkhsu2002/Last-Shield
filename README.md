# Last Shield

The sky is falling over Neo Babylon. Hold the city’s last shield against an escalating meteor storm.

## Play on Reddit

Open the [playable Reddit post](https://www.reddit.com/r/last_shield_dev/comments/1xwkbkk/last_shield_daily_meteor_defense/) and choose **Start defending**. The game runs inside Reddit; no external game website is required.

- [Watch the Reddit gameplay demo](https://www.youtube.com/watch?v=LVJTJTfkgRk)
- [Devvit app listing](https://developers.reddit.com/apps/last-shield)
- [Public test community](https://www.reddit.com/r/last_shield_dev/)
- [Source repository](https://github.com/mkhsu2002/Last-Shield)

## How to play

1. **Press on gold.** When the ring turns gold, press and hold to catch the meteor with a perfect 3× beam. Keep holding until it shatters.
2. **Release, then press for the next.** A perfect clear opens a short gold relay for the next meteor. The progress bar shows when to keep holding; release only after the clear.
3. **Save your Overdrive.** Three perfect clears fill your charge. Press **Overdrive** or **E** to clear all incoming meteors. A full charge stays banked until you choose to use it.

Missed the timing? Gold returns every second. Release and retry; damage already dealt stays. A perfect beam stops its target while you hold it, while other meteors keep moving. You can hold a specific meteor to choose a different target.

Your shield starts at 100%. Smaller, partly destroyed meteors deal less damage. Survive increasingly crowded waves until the shield falls, then try to beat your daily best.

## Controls and languages

- **Phone or tablet:** hold the fire button or a meteor; tap Overdrive when charged.
- **Keyboard:** hold **Space** to fire, **E** for Overdrive, and **Esc** to pause or resume.
- Use the sound control to mute or enable audio. The game respects reduced-motion preferences.
- English is the default. Switch to **繁中** in the header for Traditional Chinese; the game remembers your choice when device storage is available.

Try **Practice perfect timing** before starting the daily challenge.

## Scores and privacy

Each UTC day has a shared meteor sequence. Your best score and language choice are stored on your device when storage is available. Scores are not uploaded to a global leaderboard. The game remains playable if device storage is unavailable. Copying a score is an action you choose.

## Daily challenge and replay

The meteor sequence is seeded by the UTC day. Replays on the same day use the same sequence, so players can learn routes and compare strategies. A run keeps the day it started with, even across midnight. A new UTC day brings a new sequence.

Pressure grows from individual meteors to volleys of up to six simultaneous targets. A perfect beam stops only its selected target; the others keep approaching. Partly melting a meteor reduces its eventual impact damage. Choosing your next target and deciding when to spend Overdrive matter as the sky fills.

After a run, use the copy-results button to share your score and the game-post link in a comment or with a friend. Sharing is manual. Best scores are local to the current device; there is no shared leaderboard or verified competitive ranking in this version.

## For community moderators

After installing Last Shield, open your community menu and choose **Create a Last Shield game post** to create a playable post. Players open the post and select **Start defending** to play.

## Terms and privacy

Read the [Terms and Conditions](https://last-shield.vercel.app/terms/) and [Privacy Policy](https://last-shield.vercel.app/privacy/) for Last Shield.

## Credits

Last Shield is set in the original Neo Babylon world. Rights to the original world, characters, artwork and audiovisual assets remain with their creators.

## Development

Requires Node.js 24.18 or newer.

```sh
npm ci
npm run check
npm test
npm run build
```

`npm run dev` starts the Devvit playtest workflow for a community you moderate after Devvit CLI authentication. `npm run build:standalone` builds the optional web preview into `dist/standalone`; the Reddit client and server build is separate.

The project uses TypeScript, Devvit Web, Phaser, Vite, Hono, and Web Audio. Gameplay rules live in `src/shared/game-logic.ts`; `src/client/` contains the rendered game, controls, localization, audio, and local records; `src/server/index.ts` handles moderator-created playable posts. `devvit.json` defines the inline splash, expanded game, and moderator menu.

## Current release

Public game version **v0.47**, Devvit package **0.47.1**. The public test post is free to play, with no app purchase, invite list, or game usage limit. It will remain available for hackathon judging through **December 16, 2026 at 6:00 p.m. PST**. Reddit may apply its own security checks.
