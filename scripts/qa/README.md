# Repeatable browser QA

Use Node >=24.18.0 and run `npm run qa:prepare` first. These modules receive an already authorized Playwright `page`; they never start or select a browser, read credentials, or post scores. Use the canonical lane and MCP namespace required by the owner's browser rules.

1. Preview the production build with `npm run preview:local` (port4173).
2. For isolated source fixtures and offline audio, serve Vite with `npx --no-install vite --config vite.standalone.config.ts --host 127.0.0.1 --port 4177 --strictPort`.
3. For the production splash, run `python3 -m http.server 4178 --bind 127.0.0.1 --directory dist/client`.
4. Read a module below through the shell tool, replace its `export async function` declaration with `async function`, and send `async(page)=>{ MODULE_SOURCE; return FUNCTION(page); }` to the authorized lane's `browser_run_code_unsafe`. This avoids the MCP VM's unsupported Node dynamic imports. Browser-side source imports remain local Vite imports.

| Module | Function | Coverage |
| --- | --- | --- |
| layout.mjs | runLayoutQA | 54 viewport/language/text cases × intro/combat/pause; width, clipping, controls, long-score display fixture and resume |
| splash.mjs | runSplashQA | 60 post-card viewport/language/text cases |
| interactions.mjs | runInteractionQA | Trusted emulated touch, capture release, keyboard, sound, pause/resize, Overdrive, results, clipboard denial and visible English |
| hall-fixture.mjs | runHallFixture | Explicitly isolated controller fixture: enrollment response immediately updates state, blank callsign is sent, follow-up read outage cannot disable withdrawal |
| soak.mjs | runSoakChunk | Bounded native-keyboard local demonstration driven by visible cues; automatically pauses between chunks; never submits scores |
| audio.mjs | runAudioQA | Actual production impact/Overdrive scheduling, stereo and clipping checks via OfflineAudioContext |

A function throws if an assertion fails. Record the returned result and source SHA in local ignored evidence, then inspect representative screenshots. No function claims physical Android/iOS, listening quality, independent players or retention. Hall fixture data and emulated input must always retain those labels. Local QA success does not establish a Reddit-host/API pass.

Before release, separately test the existing private Reddit post, confirm source/client/server version alignment, and check the original public post without submitting test scores. Review all visible copy in both languages. Do not run fixtures against Reddit or export fixture data as achievements. The production build excludes this harness and these modules.
