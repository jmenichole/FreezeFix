# ADHD Widget Repository Instructions

## What this project is
- Electron desktop widget for ADHD productivity built with plain HTML/CSS/vanilla JavaScript.
- Includes a local Python sidecar (`tracker.py`) for screen capture and GitHub activity fetching.
- Designed to run offline with optional AI and calendar sync features.

## How to run it
- Install dependencies: `npm install`
- Start app in development: `npm start`
- Build Windows installer: `npm run build`

## Key files and architecture
- `main.js` — Electron main process. Creates the desktop `BrowserWindow`, loads `index.html`, and spawns `tracker.py`.
- `index.html` — UI entrypoint. Loads `style.css` and app modules in this order:
  1. `js/tasks.js`
  2. `js/scheduler.js`
  3. `js/history.js`
  4. `js/ics.js`
  5. `js/breakdown.js`
  6. `js/ai.js`
- `style.css` — visual theme, floating desktop panel styling, and responsive layout.
- `js/` — feature modules for tasks, scheduling, history, calendar import, breakdown, and AI logic.
- `tracker.py` — local HTTP server on `localhost:8999`; supports `/capture` and `/github` endpoints.

## Important conventions
- This repo uses vanilla DOM scripting, not a UI framework.
- Preserve existing DOM `id` values and modal structure when changing UI wiring.
- `main.js` uses `nodeIntegration: true` and `contextIsolation: false`; changes in renderer code can access Node APIs directly.
- Python is required on the user PATH for `tracker.py` to start; Pillow is optional for image capture.
- There is no dedicated test suite or lint config in this repo.

## What to focus on for code changes
- Keep UI behavior intuitive and consistent with the widget’s existing task/timeline layout.
- Avoid unnecessary refactors that alter script load order or essential DOM IDs.
- Link to `README.md` for feature context and usage details instead of duplicating the same user-facing guidance.

## Useful references
- `README.md` — feature overview and desktop wallpaper workflow
- `package.json` — Electron start/build scripts
- `tracker.py` — local tracker endpoint behavior

---

Suggested next customization:
- Add a file-specific instruction or hook for the Electron renderer vs main process boundaries, such as `.github/instructions/js.instructions.md`, to prevent mixing main-process and renderer-process responsibilities.
