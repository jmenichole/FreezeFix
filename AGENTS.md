# AGENTS.md

## Cursor Cloud specific instructions

### What this project is
ADHD Flow Widget — an Electron desktop productivity widget. `main.js` is the Electron
main process; it loads `index.html` (UI in `style.css` + `js/*.js`) as a frameless,
transparent, desktop-level window and also spawns an optional Python sidecar
(`tracker.py`, a local HTTP server on port 8999 for screen capture / GitHub activity).

There is no backend service, database, lint config, or test suite in this repo. The only
runnable "service" is the Electron app itself.

### Running the app (dev)
- Dev run command: `npm start` (defined in `package.json`, runs `electron .`). Use this,
  not `npm run build`.
- `npm run build` runs `electron-builder --win nsis`, which produces a Windows installer;
  it is not a usable dev/run path on this Linux VM. Ignore it for development.
- A display is available on the cloud VM (`DISPLAY=:1`), so the Electron window renders
  without extra setup. The following log lines are harmless noise in this container and do
  NOT indicate failure: `dbus/bus.cc ... Failed to connect to the bus`,
  `atom_cache.cc ... _NET_WM_WINDOW_TYPE_DESKTOP`, `GpuControl.CreateCommandBuffer`,
  and vaapi/dri3/gbm GPU warnings.
- The window is `type: 'desktop'` (pinned at desktop level, transparent, frameless), so it
  appears as the right ~45% of the screen behind normal windows — expect it to look like
  part of the wallpaper rather than a floating app window.

### Non-obvious gotchas
- `main.js` spawns the literal command `python` (not `python3`). On a bare Ubuntu 24.04 VM
  only `python3` exists, so the app throws a fatal `Error: spawn python ENOENT` dialog on
  startup (the spawn error has no `.on('error')` handler, so it surfaces as an uncaught
  exception). The environment provides `python` via the `python-is-python3` package so the
  app starts cleanly. If you ever see that dialog, ensure `python` resolves on PATH.
- `tracker.py` currently fails to start: line 12 contains a C-style comment with an em-dash
  (`/* ... — ... */`), which is invalid Python. The Electron app logs `[Tracker Error] ...
  SyntaxError` and continues normally — the tracker is an optional sidecar (screen-capture
  helper), so this does not block the app. Treat it as a known pre-existing code bug.
- IMPORTANT (branch state): the `main` branch is missing the `js/` directory that
  `index.html` loads (`js/app.js`, `js/tasks.js`, `js/scheduler.js`, `js/history.js`,
  `js/ics.js`, `js/breakdown.js`, `js/ai.js`). On `main` the UI renders statically but is
  NOT interactive (clock stuck, buttons/inputs do nothing). Those source files exist on the
  `master` branch, where `index.html` + `js/` form the coherent, fully-interactive app. If
  you need to exercise real functionality (add/complete tasks, timer, etc.), you need the
  matching `js/` from `master` alongside `master`'s `index.html`; mixing `main`'s
  `index.html` with `master`'s `js/` is not fully compatible.

### App data
- Electron user data (localStorage, etc.) lives in `~/.config/adhd-flow-widget`. Delete that
  directory to reset the app to an empty/fresh state.
