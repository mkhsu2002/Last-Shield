# Inline playtest candidate (unreleased)

The existing Reddit default post entry now displays an optional short, unranked
tap practice directly in the post. Try one meteor → tap on gold. Early, clean
and missed attempts have distinct visual and textual feedback and can be retried
without opening a modal. The timer stops when the page is hidden or less than
half the card is visible. It sends no practice scores or achievement writes.
Only **Open full game** sends a synchronous user-triggered request to Reddit for
the existing `game` entry.

The dedicated game preserves the real hold/release, targeting, Overdrive,
timings, rules, scoring, ranking and practice lessons. On widths below 640 CSS
px, its active HUD, arena and controls occupy separate rows; the arena uses a
uniformly scaled canvas with extra decorative sky and lower city cropped before
any target, shield edge or lit city sector. Larger landscape and classic views
preserve the prior layout.

Reddit's [View Modes & Entry Points](https://developers.reddit.com/docs/capabilities/server/launch_screen_and_entry_points/view_modes_entry_points)
limits post-card interactions to taps/clicks. Inline practice does not use
pointer capture, cancel native gestures, set touch restrictions, or depend on
the ranked engine. Do not switch just because the player taps Practice.

## QA before any release

- Build and run tests: `npm run check`, `npm test`, `npm run build`, `npm run build:standalone`.
- Reddit Android, iOS and desktop: verify a normal feed swipe/scroll beginning
  anywhere within the card, on feed and permalink. Try early, on gold and
  timeout, then leave/reenter the viewport; it must not advance while hidden.
- Verify 288×320 and 344×512 post surfaces in English and Traditional Chinese,
  including larger system text. Both actions must be fully visible. Practice
  must not open Reddit's expanded view; Open full game must open it and
  closing it must not leave an active sampler behind.
- In the expanded game at 320×480, 360×560 and 390×600, check separation of
  HUD / visible meteor travel / shield and city / controls. Verify a perfect
  held clear and a deliberate miss, release/cancel, pause/resume, and manual
  Overdrive. On desktop confirm canvas targeting, sound, language and pause
  remain operable. Check no practice result appears on the ranked board.
- Local builds do not verify Reddit's native host behavior. Verify the above on a
  separate test installation before considering migration of the judging post.
