# FreezeFix — Enhancement, Fixes & Windows Packaging (Design)

**Date:** 2026-08-19
**Status:** Approved (brainstorming) — pending implementation plan
**Source of truth branch:** `master`
**Working branch:** `cursor/freezefix-enhancements-6534` (branched from `origin/master`; PRs target `master`)

## Background

FreezeFix is an Electron desktop productivity widget for ADHD executive-function
support (time-blocking timeline, task list, focus timer, brain dump, AI task
breakdown, `.ics` calendar import, optional Python screen-vision sidecar, tray +
global hotkey, auto-update). The renderer is organized into clean IIFE modules:
`TaskManager` (data), `Scheduler` (time-blocking), `AIHelper` (Groq/Gemini),
`TaskBreakdown` (local heuristics), `HistoryManager` (streaks), `ICSParser`, and
`app.js` (UI controller). `main.js` is the Electron main process.

A review of `master` surfaced security, correctness, UX, and packaging gaps. This
design addresses the agreed scope (see below) without changing the module
architecture. The full `contextIsolation` rewrite, splitting `app.js`, an
automated test suite, and macOS/Linux build targets are explicitly **deferred**.

## Goals / Scope

- **P0 Security:** eliminate XSS→RCE risk via output escaping + a strict CSP, and
  lock down the `tracker.py` screenshot endpoint.
- **P1 Correctness:** fix the timeline date bug, make the "Skip" button work, make
  the orphaned stats/week-grid code render, and add a `python3` fallback in the
  renderer's tracker starter.
- **P2 UX:** replace raw `prompt()` dialogs with in-app UI.
- **P3 Packaging:** add an app icon, polish the Windows NSIS/electron-builder
  config, bump CI Node, keep Vision optional with graceful degradation.

**OS target:** Windows only (matches current NSIS setup; cross-platform deferred).
**Security approach:** output escaping + strict CSP (keep current `nodeIntegration`
model; no preload/contextIsolation rewrite).

## Non-Goals (deferred)

- Full `contextIsolation` + `preload`/`contextBridge` privilege-reduction rewrite.
- Splitting `app.js` into smaller modules.
- ESLint config and an automated test framework.
- macOS/Linux build targets and code signing beyond the existing Windows flow.

## Design

### 1. Security (P0)

**1a. XSS output escaping.**
- Add `js/util.js` exporting `escapeHtml(value)` — coerces to `String`, escapes
  `& < > " '`. Load it **before** the other module scripts in `index.html`.
- Route every dynamic value currently interpolated into `innerHTML` through
  `escapeHtml` (or switch the sink to `textContent`). Known sinks to fix:
  - `renderTimeline` — `task.name` in the block markup.
  - `renderTaskList` — `task.name` (category/priority/energy labels come from
    static maps and are safe).
  - `renderBreakdownSteps` — `step.name`.
  - `renderHistoryModal` — `h.taskName`.
  - AI output — `elAiResponse` for "What next?" and screen analysis: escape the
    text **first**, then convert `\n`→`<br>`.
  - `renderNextTaskCard` already uses `textContent` (no change needed).
- Acceptance: a task named `<img src=x onerror=alert(1)>` renders as literal text
  in the task list, timeline, next-task card, breakdown, and history — no script
  execution.

**1b. Content-Security-Policy.**
- Add a strict CSP `<meta http-equiv="Content-Security-Policy">` to `index.html`
  and `heart.html`.
- Move the inline `openHeartWidget()` script in `index.html` into a small external
  script file so `script-src 'self'` can be used (no `unsafe-inline` for scripts).
- Policy:
  `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self' http://localhost:8999 https://api.groq.com https://generativelanguage.googleapis.com`
- `style-src 'unsafe-inline'` is retained because the UI relies on many inline
  `style=""` attributes; removing those is a deferred P4-scale refactor.
- Acceptance: the runtime "Insecure Content-Security-Policy" warning disappears,
  Google Fonts still load, and AI + tracker fetches still succeed.

**1c. `tracker.py` lockdown.**
- Bind the HTTP server to `127.0.0.1` explicitly.
- Remove the `Access-Control-Allow-Origin: *` wildcard. Only reflect the Electron
  app's origin (`file://` / `null`) so arbitrary websites cannot read `/capture`.
- Add an optional shared-token check: `main.js` generates a random
  `FREEZEFIX_TRACKER_TOKEN`, passes it to the spawned tracker (env), and the
  renderer (which has Node access under `nodeIntegration`) forwards it as a request
  header. When the token env var is absent (manual `python tracker.py`), the
  server still runs but logs a warning — graceful for development.
- Acceptance: a page from an ordinary web origin cannot read the screenshot
  response; the in-app "Scan Screen" flow still works.

### 2. Correctness (P1)

- **Timeline date bug:** in `renderTimeline`, only place blocks whose
  `scheduledStart` is on the current day before computing time-of-day position, so
  future-day tasks no longer overlay today's timeline.
- **"Skip" button:** add an in-memory `skippedIds` Set in `app.js`;
  `renderNextTaskCard` excludes skipped task ids when choosing the current focus
  task, so Skip advances to the next task. The set resets on reload and when a
  task is completed.
- **Orphaned stats/week-grid:** add the missing UI to `index.html` — a compact
  stats bar (`streak-num` 🔥 / `done-today` ✅ / `tasks-left` 📋) and the 7-day
  week-dot grid (`week-grid`) — so the existing `renderStats()` / `renderWeekGrid()`
  code becomes a working feature.
- **`python3` fallback:** mirror `main.js`'s `['python','python3']` fallback in the
  renderer's `startPythonTracker`. Remove the unused `pending` variable in
  `renderAll`.

### 3. UX polish (P2)

- Replace the raw `prompt()` calls in the connector actions:
  - **Calendar** connector opens the Settings modal focused on the existing iCal
    URL field (`sf-gcal-url`) instead of a `prompt()`.
  - **Backup/Restore** becomes two explicit buttons (Backup downloads the JSON;
    Restore opens the existing hidden file picker) instead of a typed
    `BACKUP`/`RESTORE` prompt.

### 4. Windows packaging (P3)

- **App icon:** add `build/icon.ico` (multi-resolution, generated from the purple
  checklist SVG already used for the tray icon) and wire `build.win.icon` (plus the
  NSIS installer icon) in `package.json`.
- **Installer config:** keep NSIS `oneClick: false` + choose-install-dir, keep the
  GitHub `publish` target and `electron-updater`. Bump the release workflow's
  `actions/setup-node` to Node 20.
- **Vision optional:** confirm graceful degradation when the tracker isn't running
  (already try/caught) and document the Python + Pillow requirement.

## Data Flow / Architecture Impact

No architectural change. New files: `js/util.js` (escape helper, loaded first) and a
small external script for the heart-window opener. All existing modules keep their
public interfaces.

## Error Handling

- `escapeHtml` safely coerces non-string values.
- AI/network paths keep their existing try/catch fallbacks (local breakdown,
  priority-based suggestion).
- Missing tracker token / tracker process degrades gracefully with user-facing
  guidance.

## Testing Plan

**Manual, end-to-end in the running Electron app (primary):**
1. XSS: create a task named `<img src=x onerror=alert(1)>`; confirm literal text
   everywhere (list, timeline, next card, breakdown, history); no alert.
2. CSP: no "Insecure Content-Security-Policy" warning; fonts load; "What next?" and
   "Scan Screen" fetches still work.
3. Timeline: schedule a task for tomorrow; confirm it does not appear on today's
   timeline; today's tasks still position correctly.
4. Skip: with ≥2 tasks, Skip advances the "Up Next" card to the next task.
5. Stats/week-grid: complete a task; streak / done-today / tasks-left update and a
   week dot appears.
6. UX: Calendar and Backup/Restore use in-app UI (no `prompt()`).

**Packaging:**
- Validate the electron-builder config; run a local smoke build.
- **Constraint:** this build VM is Linux, so the authoritative **Windows** NSIS
  installer is produced by the existing GitHub Actions release workflow
  (windows-latest). Local verification is config validation + a Linux/smoke build
  and/or an optional (possibly flaky) Wine-based Windows build. This is the one item
  that cannot be fully demonstrated natively on this VM.

**Automated tests:** none added (deferred by scope). `escapeHtml` and the pure
scheduler functions are the natural first unit-test targets if/when a suite is added.

## Rollout

Implement on `cursor/freezefix-enhancements-6534`, PR into `master`. The release
workflow builds/publishes the Windows installer on tag push / dispatch.
