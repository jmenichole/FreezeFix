# FreezeFix & ADHD Widget Repository Instructions

## What this project is
- Dual-distribution ADHD productivity companion:
  1. **Chrome Extension (FreezeFix)**: Manifest V3 side panel extension published on the Chrome Web Store.
  2. **Electron Desktop App**: Desktop floating widget with optional local Python tracker.
- Built with pure vanilla HTML5, CSS3, and JavaScript (zero build step / zero framework).
- Features micro-task breakdown, focus timer, Day Flow scheduler, and native vision page scanner.

## How to run it
- Install dependencies: `npm install`
- Start app in development: `npm start`
- Build Windows installer: `npm run build`
- Package Chrome Extension: `python scripts/pack_extension.py` (generates `dist/FreezeFix-v*-ChromeExtension.zip` and unpacked folder)

## Key files and architecture
- `main.js` — Electron main process. Creates the desktop `BrowserWindow`, loads `index.html`, and spawns `tracker.py`.
- `manifest.json` — Chrome Extension Manifest V3 configuration (side panel, permissions: `["sidePanel", "activeTab"]`).
- `service-worker.js` — Extension background worker handling side panel activation on action click and tab capture.
- `index.html` — UI entrypoint. Loads `style.css` and app modules in this order:
  1. `js/tasks.js`
  2. `js/scheduler.js`
  3. `js/history.js`
  4. `js/ics.js`
  5. `js/breakdown.js`
  6. `js/ai.js`
  7. `js/app.js`
- `style.css` — visual theme, floating desktop panel styling, and responsive layout.
- `js/breakdown.js` — specialized real-world ADHD initiation heuristics (20+ categories) + fallback initiator.
- `scripts/pack_extension.py` — clean packaging script creating Chrome Web Store compliant ZIP.

## Important conventions
- This repo uses vanilla DOM scripting, not a UI framework.
- Preserve existing DOM `id` values and modal structure when changing UI wiring.
- In Chrome Extension mode, the app must remain 100% self-contained with ZERO external Python/terminal requirements.
- Never request unused permissions in `manifest.json` (avoids Chrome Web Store Purple Potassium rejection).

## ADHD Cognitive Ergonomics & UX Standards (MANDATORY)
When designing or modifying features for FreezeFix, adhere to these clinical executive function principles:
1. **Anti-Corporate Concrete Physical Actions**:
   - ❌ Never generate abstract corporate filler: *"Prepare materials and open tools"*, *"Execute core phase"*, *"Review and finalize"*.
   - ✅ Always generate tangible physical body actions: *"Crack the door open and call them"*, *"Put 3 dishes in the sink"*, *"Open VS Code and write one comment"*.
2. **4-Stage Initiation Sequencing**:
   - Step 1: Frictionless Starting Line (30 sec – 2 min) — trivial physical movement to break freeze.
   - Step 2: Tiny Starter Action (3 – 5 min) — minimum viable initiation.
   - Step 3: Core Momentum Step (8 – 12 min) — the central action once friction is broken.
   - Step 4: "Good Enough" Finish Line (2 – 5 min) — clear stopping point to avoid perfectionism trap.
3. **Sticky Side-Panel Viewports**:
   - In narrow viewports (<600px width), Quick Capture bars (Brain Dump) MUST be `position: sticky; top: 0; z-index: 20`.
   - Expanding content or AI suggestions must never push the primary capture mechanism off-screen.
4. **Zero-Friction Quick Capture**:
   - Pressing Enter in the Brain Dump must instantly add the task to the queue. Never intercept quick capture with multi-field blocking modals.
5. **High User Agency in Breakdowns**:
   - Users in an ADHD freeze state need rapid control: provide inline deletion (`✕`) and immediate addition (`+ Add Step`) so they can reshape steps without restarting.
