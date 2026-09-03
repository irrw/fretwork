---
name: run-fretwork
description: Build, run, and drive fretwork (the mobile-first scale/fingering visualizer). Use when asked to start fretwork, run its dev server, take a screenshot of its UI, or verify a UI change actually renders.
---

Fretwork is a Vite + React single-page app with no test suite — verification means starting the dev server and driving a real headless Chromium against it. This environment has no `chromium-cli` installed, so the driver is a small custom Playwright REPL: `.claude/skills/run-fretwork/driver.mjs`.

All paths below are relative to the repo root (`~/projects/fretwork`).

## Prerequisites

None beyond Node (already required by the project) and the `playwright` npm package's bundled Chromium. No extra `apt-get` packages were needed for headless Chromium to run on this WSL/Ubuntu box.

## Setup

```bash
npm install                      # installs playwright as a devDependency
npx playwright install chromium  # downloads the browser binary (~300MB, one-time; cached in ~/.cache/ms-playwright)
```

Do **not** pass `--with-deps` — it shells out to `sudo apt-get`, which fails here (no password/TTY for sudo). The plain `chromium` install works fine without it.

## Build

No separate build step needed to run the app locally — `npm run dev` serves it directly. (`npm run build` exists for the production/Pages bundle, unrelated to local verification.)

## Run (agent path)

The user keeps this dev server running persistently in their own terminal to watch HMR updates live as edits land — treat it as a long-lived process you attach to, not one you own the lifecycle of.

1. **Check whether it's already up before starting one.** A previous session's server (or the user's own) is very likely still running on the pinned port (5180, set in `vite.config.js` via `server.port` + `strictPort: true`):

```bash
curl -sf --max-time 2 http://localhost:5180/fretwork/ >/dev/null 2>&1 && echo "already running" || echo "not running"
```

If it's already running, skip straight to driving it — do **not** start a second one (it would just fail on the pinned port anyway, since `strictPort: true` refuses to fall back to another port).

Only if it's not running, start it in the background and poll (don't `sleep`) until it responds:

```bash
npm run dev > /tmp/fretwork-dev.log 2>&1 &
disown
timeout 30 bash -c 'until curl -sf --max-time 2 http://localhost:5180/fretwork/ >/dev/null 2>&1; do sleep 1; done'
```

Note the trailing slash and `/fretwork/` path — the app is served under that base path (`vite.config.js` `base: '/fretwork/'`), not at the bare root.

2. Drive it with the REPL driver, piping commands via a heredoc:

```bash
node .claude/skills/run-fretwork/driver.mjs <<'EOF'
viewport 1600 1200
nav http://localhost:5180/fretwork/
wait-for text=Major
screenshot desktop.png
scroll-bounds [data-testid=fretboard-scroll]
scroll [data-testid=fretboard-scroll] 2000
scroll-bounds [data-testid=fretboard-scroll]
screenshot desktop-scrolled.png
viewport 375 667
nav http://localhost:5180/fretwork/
wait-for text=Major
screenshot mobile.png
scroll [data-testid=fretboard-scroll] 2000
screenshot mobile-scrolled.png
scroll [data-testid=fretboard-scroll] -3000
console --errors
quit
EOF
```

Screenshots land in `.claude/skills/run-fretwork/screenshots/`. **Always look at the screenshot file** — a page can render its dark background with nothing else on it and still "succeed."

**Always include the scroll step**, not just a resting-state screenshot — the fretboard is the app's one scrollable surface, and a layout change there has already shipped a real bug that only showed up once we scrolled (see Gotchas: the stretch/transform overflow bug). Scroll both directions (down then back up) and check `scroll-bounds` — `scrollHeight` noticeably larger than `clientHeight` with visibly empty space in a scrolled screenshot is the signature of that class of bug recurring.

Driver commands:

| command | what it does |
|---|---|
| `nav <url>` | navigate |
| `viewport <w> <h>` | resize the browser viewport (test both a short mobile height and a tall desktop height — this app's fretboard scales differently at each) |
| `wait-for text=<substring>` | wait for text anywhere on the page |
| `wait-for <css-selector>` | wait for a selector |
| `screenshot [name.png]` | full-page screenshot, saved under `screenshots/` |
| `click <selector>` | click first match |
| `fill <selector> <text>` | fill an input (goes through Playwright's input pipeline, so React's `onChange` fires) |
| `press <key>` | e.g. `press Enter` |
| `scroll <selector> <px>` | `scrollBy` on an element; negative px scrolls up. The fretboard's scroll container is `[data-testid=fretboard-scroll]`. |
| `scroll-bounds <selector>` | prints `{scrollTop, scrollHeight, clientHeight, atTop, atBottom}` for an element — use before/after `scroll` to confirm it actually moved and where the real boundary is |
| `sleep <ms>` | wait — use after clicking something that triggers a CSS transition (e.g. the theme toggle) before screenshotting, see Gotchas |
| `console --errors` | print collected `console.error` / uncaught page errors since launch |
| `quit` | close the browser |

3. **Leave the dev server running when done.** Don't kill it — the user relies on it staying up to watch HMR updates live in their own browser as you make edits. Only stop it if the user explicitly asks, or if it needs a hard restart to recover from a crashed/wedged state (check `/tmp/fretwork-dev.log` first to confirm that's actually needed):

```bash
lsof -ti:5180 -sTCP:LISTEN | xargs -r kill
```

Avoid `pkill -f vite` or similar broad patterns — this machine may have other unrelated Vite dev servers running (e.g. other projects on other ports), and a broad pattern match kills those too.

## Run (human path)

```bash
npm run dev   # opens on http://localhost:5180/fretwork/, Ctrl-C to stop
```

## Test

No automated test suite exists for this project. `npm run build` is the closest thing to a correctness check (fails on JSX/import errors); run it after larger changes:

```bash
npm run build
```

---

## Gotchas

- **The app's base path is `/fretwork/`, not `/`.** Because `vite.config.js` sets `base: '/fretwork/'` (for GitHub Pages deployment), both `npm run dev` and `npm run build` serve/reference that path. Hitting `http://localhost:5180/` bare returns a 404 — always include the trailing `/fretwork/`.
- **The fretboard's vertical scale is viewport-height-dependent by design** (a `ResizeObserver`-driven CSS transform fills tall viewports, floored at 1x so short/mobile viewports are unaffected). If you're screenshotting to verify a layout change, use two contrasting viewport heights (e.g. `375x667` and `1600x1200`) — testing only one size can hide a regression in the other.
- **A naive readline `pause()`/`resume()` REPL loop doesn't serialize a heredoc's buffered lines** — Node's readline can emit several already-buffered `line` events before an async handler's `pause()` call takes effect, causing commands to run out of order (and a `resume()`-after-`close()` crash on the final command). The driver instead collects all lines up front, then `await`s them one at a time in a plain `for` loop.
- **`npx playwright install --with-deps` fails here** — it shells out to `sudo apt-get`, and there's no password/TTY for sudo in this environment. Skip `--with-deps`; the plain browser download runs fine without extra system packages.
- **A screenshot taken immediately after clicking something with a CSS transition (e.g. the theme toggle, which does `transition: background 0.2s ease`) can capture a stale paint** — the fretboard area rendered fully black in one such screenshot even though computed styles and every other panel had already updated correctly to the light theme; a `sleep 300`-`500` before the follow-up screenshot fixed it. This looks exactly like a real rendering bug and cost real time to rule out — always `sleep` after a themed/transitioned action, not just after `nav`.
- **`display: flex` + no `alignItems` + a scaling `transform` child = a phantom scroll region.** The fretboard's scroll container is a flex container with no `alignItems` set, so it defaulted to `stretch`: its single child (the fretboard wrapper, which carries the desktop `fitScale` `transform: scale(...)`) was stretched to fill the container's full height *before* being scaled, then that already-inflated box got scaled again on top — producing a scrollable area far taller than the actual content, with a large empty region below it that a swipe/scroll-down would reveal. Caught only by actually scrolling (`scroll-bounds` showed `scrollHeight` far exceeding `clientHeight`) — a resting-state screenshot looked completely correct. Fixed with `alignItems: "flex-start"` on the scroll container. If this container's styles change again, re-run the scroll check above before calling it done.

- **A bare `curl -sf` against a closed port can hang instead of failing fast** in this environment — a refused connection should error out instantly, but it was observed to stall for the full default timeout with no response. Always pass `--max-time 2` (or similar) on the liveness-check `curl`, not just `-sf`, or a "not running" check can eat minutes before you notice.

## Troubleshooting

- **`Error: net::ERR_CONNECTION_REFUSED` on `nav`**: the dev server isn't up yet or died. Check `/tmp/fretwork-dev.log` and re-run the `curl` poll from step 1 before driving.
- **`npm run dev` exits immediately with `Port 5180 is in use`**: expected and fine if the `curl` check in step 1 already found it running — that's the persistent server you should just drive, not restart. Only treat this as a real conflict (something holding the port that *isn't* fretwork) if the `curl` check to `/fretwork/` failed first; in that case `lsof -ti:5180 -sTCP:LISTEN` to identify it before deciding whether to kill it.
