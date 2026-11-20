Last Shield is a daily timing-and-survival game inside a Reddit post. One city, one shared storm, and a community score to beat. Catch gold, hold until a meteor shatters, then release and choose your next threat. A perfect beam stops one target while the others keep falling. Bank Overdrive for the moment the sky becomes too crowded.

[Play today's defense on Reddit](https://www.reddit.com/r/last_shield_dev/comments/1xwkbkk/last_shield_daily_meteor_defense/).

## Inspiration

I wanted a daily game that gives people something specific to compare: not just a score, but a decision. Which meteor did you clear first? Did you spend Overdrive too early? Could one more perfect relay have saved the shield?

Neo Babylon gives that compact challenge a city worth defending. A shared daily meteor sequence gives its defenders a common experience to discuss on Reddit.

## What it does

- **Catch gold and hold.** A perfect start creates a 3x beam and stops the selected meteor until you release. Other threats keep approaching.
- **Release, choose, relay.** A perfect clear opens a short gold window for the next target. Prioritizing the right meteor matters as volleys grow to six simultaneous threats.
- **Recover and adapt.** Gold returns every second. Missed timing can be retried, and damage already dealt stays. Partly destroyed meteors cause less shield damage.
- **Bank your emergency move.** Three perfect clears charge Overdrive. You decide when to spend it to clear the sky.
- **Learn today's storm.** Everyone receives the same sequence for the UTC day. Replay to improve; tomorrow brings a new pattern. A run keeps its starting day across midnight.
- **Climb your community's daily board.** After a run, choose to submit your score. See the top ten, your nearby rivals, and the points needed to pass the next defender. Only your highest accepted score counts; ties share a rank.
- **Share the decision behind the score.** Preview your result, add an optional strategy note, then copy it and open the Reddit post to write your comment. Sharing is always your choice.

Open the post and select **Start defending**. Timing practice slows the action, shows whether you caught the gold or released too soon, and lets you choose when to continue before the daily challenge. Touch and keyboard controls, English and Traditional Chinese, a sound control, pause, and reduced-motion support make the experience approachable. A compact control dock keeps the fire button near the bottom and leaves the battlefield clear on smaller screens. Playing does not require a login; submitting to the community board does.

## How I built it

I used Devvit Web, TypeScript, Phaser, Vite, Hono, Web Audio, and Reddit's built-in Redis storage. The game opens directly from a Reddit interactive post. Moderators can create a playable post from their community menu.

The same gameplay rules run in the client and on the server. When a player submits, the server replays the recorded gameplay inputs and calculates the result before updating the board. Rankings belong to the subreddit where people play. Retrying a submission does not count it twice, and players can remove their visible daily entry.

## Challenges I ran into

Timing had to remain readable when several meteors arrived together. I made the initial press distinct from the holding phase: once the beam locks, the timing cue becomes a destruction-progress bar. A recurring gold window preserves a recovery path after a missed press, while a short relay rewards releasing and choosing the next target.

I refined the painted skyline, textured meteors, blue-white Overdrive beams, and stereo impact effects so that a clear, an impact, and an emergency blast each feel distinct.

The community board also needed to survive real interruptions. Runs retain their starting date across midnight, lower scores cannot overwrite a personal best, and submission retries do not create extra entries. A temporary ranking outage leaves the local game playable.

## Accomplishments I'm proud of

The daily loop now connects a tactical solo run to a shared community challenge. The Reddit game supports optional account-based ranking, nearby rivals, and player-led strategy sharing while preserving anonymous play.

I verified a submitted score in the live Reddit game and read the same entry from a separate logged-out view. The project has 59 automated tests covering gameplay, replay validation, ranking, retries, date boundaries, localization, and recoverable failures.

## What I learned

A high score becomes more interesting when players share the same challenge and can explain how they approached it. Clear feedback makes the individual run satisfying; a nearby rival and a useful strategy conversation give that run a life beyond the result screen.

## What's next for Last Shield

I want to explore collective defense goals and rotating storm modifiers, guided by player feedback. These are future additions. Today's game already includes the shared daily sequence, community rankings, and score-and-strategy sharing.
