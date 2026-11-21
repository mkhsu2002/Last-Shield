Last Shield v1.06 is a daily survival game inside a Reddit post. Defend Neo Babylon, build a combo, and give your community a score to chase. A new shared storm arrives each UTC day; the Hall remembers the defenders who held the line.

[Play today’s defense](https://www.reddit.com/r/last_shield_dev/comments/1xwkbkk/last_shield_daily_meteor_defense/).

## Inspiration

I wanted the score screen to be the start of a conversation: which core did you attack first, where did your combo break, and when should you have used Overdrive? A shared daily storm gives Reddit players the same problem to solve. Neo Babylon gives them a city to defend.

## What it does

Catch the gold and hold until the meteor shatters. Release, choose the next threat, and keep the relay alive. A perfect beam stops one target while the others fall. Three perfect clears charge Overdrive; you decide when to spend it.

**Return for a new defense.** Three rotating storm profiles change the pressure. Daily basic and stretch goals give beginners a reachable target and experienced players another reason to replay. The opening screen shows tomorrow’s storm and the reset countdown, while daily focus progress survives a weaker attempt on the same device.

**Build a record worth keeping.** Clears earn rising score multipliers as combos reach 10, 25, 50, 75 and 100. The daily community board shows nearby rivals and the points needed to pass them. Daily champions, separate score and combo Top 100 collections, and the Million-Point Heroes gallery give different skills a place in the Hall.

**Bring a friend into the challenge.** Submit a score, copy a challenge code and the Reddit link, and invite someone to beat it. The receiving player checks the current public best and takes that target into their next run. A shared result can carry a strategy question based on the actual storm and run, making it easier to discuss more than a number.

**Earn Neo Babylon citizenship.** A verified finished run above 1,000,000 points qualifies for a Citizen card. Players can choose to leave their Reddit name and callsign in the Hall, share the card, and let others check its verification ID.

The battlefield fills the available phone width, with status and controls in separate rows. Desktop screens place those panels beside a taller sky. Menus scroll below a steady header, keeping the next action within reach.

Three optional practice lessons teach timing, relay and emergency Overdrive. Each lesson leaves its feedback on screen until the player continues. Touch and keyboard controls, English and Traditional Chinese, stereo effects, pause and reduced-motion support keep the short-session game accessible. Playing does not require a login.

## How I built it

I used Devvit Web, TypeScript, Phaser, Vite, Hono, Web Audio and Reddit Redis. The game opens from an interactive Reddit post, and moderators can create a playable post from their community menu.

The client and server run the same deterministic rules. On submission, the server replays the inputs and calculates the result before updating community records. Friend codes resolve an accepted run to its current public daily best; the code itself is not proof of a score. Retries do not duplicate entries, and removed records cannot be challenged while unavailable.

## Challenges I ran into

The first press and the holding phase needed distinct feedback. A gold timing cue becomes a destruction-progress bar once a perfect beam locks. Releasing after the clear opens the next tactical decision; recurring gold windows give a missed press a recovery path.

Daily play also needed continuity. A weaker retry should not erase a completed goal. I separated local and server-confirmed progress, preserved each day’s best single-run value, and kept a run tied to its starting UTC date.

Longer-lived records raised a different question: what happens when someone withdraws? Hall enrollment is separate from the daily board, and withdrawal removes the display and invalidates its certificate. Public sharing remains a player action.

## Accomplishments I’m proud of

A short solo defense now leads into a community loop: learn today’s pattern, set a record, invite a rival, and return for a new storm. The scoring system makes long clean runs rewarding, while separate combo records and daily goals give players more than one way to improve.

I tested the game inside Reddit, including completed runs, server score verification, friend challenge acceptance and removal, retained daily goals, and Citizen card sharing. The automated suite covers gameplay, replay validation, ranking, privacy, date boundaries, localization and recoverable failures.

## What I learned

A useful rivalry needs a clear next step. Showing a nearby score is a start; letting a friend accept that target completes the loop. Daily content also needs memory: reaching a goal should still matter after the next attempt ends early.

## What’s next

I’ll use player feedback to tune the basic and stretch targets and watch how strategies change across the storm cycle. Further variations should add a tactical choice before adding more interface.

## Credits and demonstration notes

Last Shield is set in my original Neo Babylon world. The gameplay video is an AI-controlled demonstration at 3× speed with stereo game audio. Demonstration runs are labeled and kept out of competitive rankings and personal daily achievements. I used AI assistance during implementation and testing.

Submitting a score publishes the Reddit name and score on that community’s board. Joining the Hall is optional and separate. Players can remove their display and revoke a Citizen card; exported image copies may remain after sharing. The card is an in-game achievement.
