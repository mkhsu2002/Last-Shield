> 歷史版本註記（2026-11-15）：本文保留 v0.47／0.47.1 原始投稿與當時查核結果；後續 v0.48 社群功能及發布狀態見 [發布紀錄](community-release-2026-11-15.md)。未重新修改 Devpost 已投稿欄位。

# Last Shield

Last Shield is a daily timing-and-survival game played directly in a Reddit post. Catch gold, hold the beam until the meteor shatters, release, and commit to the next threat. A perfect lock stops one target while the others keep approaching; banked Overdrive gives you a deliberate emergency choice.

[Play the current daily challenge on Reddit](https://www.reddit.com/r/last_shield_dev/comments/1xwkbkk/last_shield_daily_meteor_defense/).

## Inspiration

We wanted a daily game that feels immediate: one city, one shield, and a falling sky. A single press-and-hold action should be easy to learn while leaving room for timing, recovery, and difficult decisions. Neo Babylon gives that compact challenge a place worth defending.

Reddit provides a natural home for a shared daily challenge. Players face the same day's meteor sequence, then bring their scores and survival strategies back to the post's comments.

## What it does

Last Shield runs inside a Reddit interactive post. Open the post, select **Start defending**, and play without visiting an external game website.

- **Press on gold, then keep holding.** A perfect start creates a 3× beam and arrests the selected meteor while you destroy it. Other meteors keep approaching.
- **Release and chain the next clear.** Each perfect clear opens a short gold relay, allowing a quick follow-up against another target.
- **Recover from a missed timing.** Gold returns every second, and damage already dealt stays. Release and retry instead of losing the target's entire progress.
- **Save your emergency move.** Three perfect clears charge Overdrive. It stays banked until you choose to clear the whole sky.
- **Survive an escalating storm.** Waves grow from single meteors to overlapping volleys of up to six. You can select a specific meteor, and partial destruction reduces impact damage.
- **Return for a new daily sequence.** A UTC-day seed gives everyone the same challenge for that day. Replay to improve your local best and compare choices with friends.
- **Learn before competing.** An interactive timing practice introduces the perfect lock. English is the default, with Traditional Chinese available from the language control.

Daily best scores stay on the current device. Result sharing is a deliberate copy action chosen by the player.

## How we built it

We built Last Shield with Devvit Web, TypeScript, Phaser, Vite, Hono, and Web Audio. A Reddit-hosted inline splash opens the expanded game through the Devvit client SDK. A moderator menu creates playable game posts through the Reddit API.

The gameplay state is separated from rendering and interface text. Daily seeded patterns, collision geometry, timing grades, beam damage, target selection, relay windows, and manually activated Overdrive are implemented in a shared rules module. The interface provides touch and keyboard controls, bilingual feedback, reduced-motion support, and recoverable local-storage and clipboard failures.

## Challenges we ran into

The hardest problem was making timing readable while several threats arrived together. Early iterations made it unclear whether to keep holding or press again. We separated the initial timing decision from the destruction phase: once a perfect beam locks, the timing bar becomes a progress bar, and the game explicitly asks the player to keep holding until the target shatters.

Multiple large meteors also needed a fair recovery path. Perfect arrest stops only the current target, while a short relay lets players release and catch the next one without waiting through another full timing cycle. We also made Overdrive a banked, manual decision so it remains an emergency tool rather than an automatic attack.

## Accomplishments we're proud of

Last Shield combines a small control vocabulary with real target-priority decisions. The game is running as a Reddit-native interactive post, supports English and Traditional Chinese, and provides a playable tutorial rather than relying only on instructions.

The current rules have 47 automated tests covering timing recovery, multi-target interactions, charge banking, collision damage, daily patterns, localization, and recoverable storage failures. We also tested the public Reddit post while logged out, completed the timing practice, and destroyed a meteor in a live run.

## What we learned

A timing mechanic needs to communicate both when to begin and when to stop. Adding more simultaneous threats creates useful pressure only when players can understand the available responses. Clear feedback, retained progress, and a deliberate release-and-press rhythm made the challenge easier to read without removing its decisions.

## What's next for Last Shield

We want to deepen the shared daily experience with community challenges, server-validated score comparisons, and rotating storm modifiers. These are future directions. We will continue balancing the core timing and survival loop with player feedback before adding more complexity.
