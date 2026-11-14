# Daily defense MVP verification

Verified locally on 2026-11-14. Starting remote commit: `20e94cd` (upstream synchronized countdown/ring cues retained). Version: `0.3.0`; local record namespace: `daily-1`.

## Completed evidence

- Shared rules and local-record suite: 16 passing tests. Covers timing boundaries, deterministic pattern, shorter synchronized countdown, early holds, fresh input per wave, partial damage, overdrive consumption/loss, 75-second completion, fatal damage, anti-regrading and render-frame partitioning; malformed/stale/denied storage.
- Built standalone exercised in the dedicated `codex-neo-babylon` browser lane, desktop 1440×692 and mobile-sized 390×844.
- A complete browser run using Playwright's controlled clock faced all 25 waves in 75 seconds, earned 25 PERFECTs / 25 combo / 8,950 points, and displayed the completion result. Reload recovered the device-local best; a weaker run did not overwrite it.
- Four full misses produced Shield down. The interim impact cue reads SHIELD HIT rather than CORE BROKEN.
- Pause held the timer unchanged, released sustained input, and resumed through the explicit button. Keyboard hold and Chrome CDP touch emulation both produced successful clears. Touch support was enabled before page load for the touch test.
- Clipboard denial exposed selectable challenge text; the mobile result panel scrolled without clipping the fallback. The standalone local test omitted the localhost URL.
- Denied localStorage displayed a record-not-saved result while retry remained playable. Reduced-motion emulation remained playable.
- Audio defaults ON. A real browser Start gesture left the Web Audio context running and produced oscillator starts during countdown, beam and clear. This is activation evidence, not human listening approval.
- Code review found and fixed the incorrect impact idle cue, embedded-share URL and result overflow. Reddit sharing now uses the Devvit SDK's post context for a public Reddit URL; this path has not been tested in an authenticated Reddit playtest.
- Public text reviewed across standalone HTML, Reddit splash, overlay, results, errors, share output and accessible labels. No global ranks/shared contribution claims are shown.

## Release status

- Type check, 16 final tests and both final builds: passed with Node.js 24.20.0. The standalone bundle retains the Phaser size advisory (about 368 kB gzip); no build errors.
- GitHub main integration/push: MVP `e96418c` merged and pushed.
- First Vercel attempt (`e96418c`) was rejected before build because inline ignoreCommand exceeded 256 characters. The command was moved into `scripts/ignore-build.sh`; replacement deployment/readback pending. Previous READY production deployment: `20e94cd`.
- Reddit upload/authenticated playtest/publication: not performed. Existing server endpoint and backend contract are unchanged.
- Real touch hardware and human listening: not performed.

## Operating boundaries

No schedules, outbound messages, provider credentials, migrations, account leaderboard or community-contribution writes were introduced. Future competitive features must add server-side replay validation and idempotent score/contribution storage before claiming trusted ranks. This record describes the MVP; it does not mark those later phases complete.
