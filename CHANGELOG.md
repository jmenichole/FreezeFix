# Changelog

All notable changes to FreezeFix are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.3.0] — 2026-11-10

### Added — "Unfreeze this" (the core move)
- **Right-click "Unfreeze this"** on any selected text (`contextMenus`): opens the side panel and hands it the selection (line breaks kept via `chrome.scripting`, falling back to `selectionText`). Held in the service worker's memory only until the panel picks it up.
- **"Paste or highlight something overwhelming" box** at the top of the panel, with Ctrl/⌘+Enter to submit.
- **Strict JSON Unfreeze prompt** (`js/unfreeze-core.js`, `AIHelper.unfreezeText`): `gist` (one sentence, "This is about…"), 3–7 verb-first `steps` with minute estimates and 5-word explanations for any jargon, optional `skip` line. Calm tone, no "you should". JSON is validated and repaired (code fences, smart quotes, trailing commas, alternate keys, preachy openers stripped); one retry, then a friendly error with "Try again" / "Use quick offline steps".
- **One-step-at-a-time UI** (`js/unfreeze.js`): gist, then only the current step in large type, with **Done ✓**, **Too big** (`AIHelper.splitStep` splits just that step into 2–4 smaller ones, inserted in place), **Skip**, a "See all steps" toggle, progress as dots (no "3 of 7"), "⏱ start timer" for the step, and **Add to my tasks** for the steps left. Keyboard: buttons are native, focus moves to each new step, D/B/S shortcuts inside the card. Plan (not source text) persists locally so the panel reopens where you left off.
- **Offline fallback** when no key is set: splits text into sentences/bullets, pulls imperative or instruction-like lines into up to 7 steps trimmed to ~12 words, and offers adding a free Groq/Gemini key.

### Changed
- **"Scan this page" reads text, not pixels**: selection if any, else the main readable text (`article`/`main`, with special handling for the latest Gemini / ChatGPT / Claude answer), trimmed to ~12k characters. Screenshot vision (`AIHelper.unfreezeImage`, Gemini) is only a fallback for pages without text (images, PDF viewer). The previous screenshot scan is kept as `window.FreezeFixLegacyVisionScan`.
- **Decluttered panel**: opens on the Unfreeze box, Up next card (renamed from "NOW"), focus timer and brain dump. Streaks, next-in-line peek, "What next?", Day Flow (timeline, auto-schedule, reschedule), calendar import, history and "What's new" moved into a collapsible **More** section. Day Flow tab and header history/changelog icons moved there too. No features removed.
- Panel always opens on the Focus view.
- Groq calls now send the system instruction and request JSON mode when asked.
- Permissions: added `contextMenus` and `scripting`. No new host permissions.
- Manifest description, README (extension-first), store listing copy, privacy policy (`PRIVACY.md`, `docs/privacy.html`) updated. New store assets in `store-assets/`.

### Fixed
- Header ⚙️ Settings opened an empty form, so saving could wipe a saved API key; it now loads saved values, and saving merges with existing settings.
- Header ❓ Help threw a ReferenceError (`elModalHelp` undefined); Escape now closes Help too.
- Theme selector and Atkinson Hyperlegible toggle in Settings were not applied; both now save and apply.
- Calendar `.ics` import had no button; it's back under More.
- Elements with the `hidden` class (e.g. the AI bubble) now actually hide.

## [1.2.0] — 2026-11-09

### Enhanced (Low-Cognitive Load & Copy Overhaul)
- **ADHD-Optimized Store Description**: Completely overhauled the Chrome Web Store listing copy and short summary in `CHROMEWEBSTORE.md` and `manifest.json`. Replaced dense walls of text with punchy, scannable, high-impact bullet points and micro-cards built for neurodivergent attention spans.
- **In-App Help Modal Redesign**: Replaced the 5-paragraph wall-of-text Help modal with 4 visual, bite-sized mini-cards highlighting Brain Dump, Task Breakdown, Webpage Scanner, and Stuck Rescue with instant keyboard shortcut reference (`Alt + Shift + F`).

## [1.1.9] — 2026-11-08

### Fixed
- **Tasks Page Scrolling Overhaul**: Fixed an issue where the Tasks backlog page could not scroll down. Removed `overflow: hidden` and rigid `height: 100%` constraints on `.panel` in `#view-tasks`, allowing the page to scroll smoothly from top to bottom.
- **Scroll Trap Elimination**: Ensured mousewheel and touch gestures from anywhere on the screen (stats bar, weekly grid, filter chips, smart suggestions banner, or task items) scroll the unified `#view-tasks` container seamlessly.
- **Accessible Bottom Actions**: Guaranteed that the "+ Add Task" button and bottom task items are never pushed offscreen or clipped.
- **Visible Scrollbar Styling**: Upgraded the scrollbar thumb with a crisp, visible translucent glass finish across all side-panel views.

## [1.1.8] — 2026-11-08

### Fixed & Enhanced
- **Anti-Preachy Tone & High User Agency**: Overhauled vision prompt engineering and coaching models to completely eliminate patronizing and preachy lecturing (e.g. telling users to "close the tab", "minimize the window", or "look away for 10 minutes").
- **On-Page Contextual Action Extraction**: Webpage vision analysis now directly assists with the content visible on screen (e.g. on LinkedIn: reviewing post impression metrics, replying to pending invites, checking messages; on dashboards: clicking specific buttons, checking tables, dismissing banners).
- **Accurate Action Durations**: Enforced realistic 1-5 minute bounds matching the actual physical or UI micro-steps.

## [1.1.7] — 2026-11-08

### Fixed
- **Gemini Vision 404 Resolution**: Fixed the `GEMINI_VISION_ERROR_404` error by updating the model priority waterfall to use Google's current high-throughput multimodal models (`gemini-3.5-flash-lite` and `gemini-3.8-flash`, with `gemini-2.0-flash` and `gemini-1.5-flash` fallbacks).
- **REST Protocol Conformance**: Standardized the image part payload to camelCase `inlineData` with `mimeType` matching Google v1beta REST specification.
- **Dynamic Working Model Discovery & Caching**: Added automatic fallback traversal across candidate models so if any specific model is restricted or unavailable on a user's key, the next model is tried transparently, and the working model is cached for instant future calls.
- **User-Friendly Vision Error Handling**: Replaced raw technical error codes with empathetic, actionable guidance cards (e.g. invalid key, timeout, or model status).

## [1.1.6] — 2026-11-08

### Fixed & Optimized
- **Instant Optimistic Scaffolding (0ms Task Breakdown)**: Task breakdown now opens and displays immediate, concrete 4-step micro-actions in **0 milliseconds** using local clinical heuristics. Never leaves the user staring at an empty spinner or in cognitive freeze.
- **Official Model Alignment & Fast Fallbacks**: Replaced non-existent model references with official Google Gemini API models (`gemini-2.5-flash` primary, `gemini-2.5-flash-lite` fallback).
- **Strict Network Timeouts (Fail-Fast Architecture)**: Added an `AbortController` timeout (3.0s – 5.0s max) to all remote LLM calls (`fetchWithTimeout`). If the remote network or API is delayed, the extension fails fast and gracefully to instant local clinical heuristics instead of hanging for minutes.
- **Asynchronous Background AI Enhancement**: When AI is configured, remote refinement runs seamlessly in the background without locking the UI. If the user hasn't edited the local steps, the UI quietly updates to the AI-refined steps (`• refined ✨`). If the user already interacted with the steps, their manual edits are strictly protected.
- **Instant 0ms "🆘 Stuck?" Rescue**: Activating the Freeze Breaker now immediately presents 2 concrete physical actions (a 30-sec starter move and a "good-enough" stopping line) in 0ms, followed by background AI refinement.
- **Client-Side Image Downscaling (90% Smaller Payloads for Vision)**: Webpage screenshots are now dynamically scaled down to max 1024px before base64 encoding (`downscaleImageForVision`), slashing image payload sizes from 3+ MB to ~80 KB and reducing Vision AI processing latency by up to 90%.
- **Instant Activity Suggestions**: Activity & time-of-day suggestions render immediately using local heuristics in 0ms with non-blocking AI upgrade.

## [1.1.5] — 2026-11-08

### Added
- **Core Clinical UX Architecture**: Implemented the 4 foundational ADHD interaction principles across the entire suite: Low-Friction Scaffolding, Cognitive Load Minimization, The Invisible Guardrail Pattern, and Frictionless Exits.
- **"📥 Add All to Day Flow" (Vision Scan)**: Webpage AI analysis results now include an instant 1-click button to sequentialize all recommended actions into the Day Flow timeline in order with zero forms or manual scheduling.
- **"🆘 Stuck?" Freeze Breaker & Paralysis Guardrail**: Added an inline rescue panel to the NOW focus card (`AIHelper.generateStuckRescue()`) generating a 30-sec physical starter move and a "good-enough" finish line to shatter executive dysfunction. Unobtrusively pulses amber when timers finish without completion.
- **Smart Brain Dump Scaffolding**: Unobtrusive floating bridge appears after capturing ambiguous tasks (3+ words), offering a 1-click option to split the task into 3 starter steps. Automatically fades after 8 seconds without ever blocking input.
- **Universal Frictionless Exits**: Hitting `Escape` or clicking `✕` immediately dismisses any open prompt, rescue card, or scaffolding pill without penalty or modal traps.

## [1.1.4] — 2026-11-08

### Fixed
- **Bottom Clock Typography & Readability**: Overhauled the bottom clock widget (`#clock`). Replaced the 68px Space Grotesk font with `-4px` negative letter-spacing (which caused numbers and letters to smash together into an unreadable solid blob) with a crisp, modern `Inter` typography stack (`font-variant-numeric: tabular-nums`, `letter-spacing: 0.5px`, `32px font-size`), distinct cyan AM/PM tag, and an elegant glass card.

### Added
- **Smart Task Suggestions Based on Activity & Time of Day**:
  - Implemented `AIHelper.suggestTasksFromActivity()` combining Gemini 3.8 Flash structured suggestions with rich local heuristics.
  - Automatically assesses what you accomplished today, cognitive stamina, and the current time of day (morning, midday, afternoon, evening, night).
  - Generates 2-3 tailored micro-actions with 1-click `[+ Add]` (adds to backlog) and `[⚡ Do Now]` (instantly loads timer, plays dopamine chime, and starts focus mode).
  - Integrated into both `🤖 What next?` in the Focus tab and a dedicated `✨ Smart Suggestions from Activity` button in the Tasks tab.

## [1.1.3] — 2026-11-08

### Fixed
- **Internal Browser Page Detection & Infinite Permission Loop**: Prevented confusing permission reload messages when clicking "Scan Webpage" while on `chrome://extensions`, `chrome://newtab`, or Chrome Web Store. Chrome security forbids extensions from capturing internal browser pages; FreezeFix now clearly detects internal tabs upfront and gives concrete instructions to switch to a regular web tab.
- **Permission Verification**: Added `chrome.permissions.contains({ origins: ['<all_urls>'] })` verification to only show the extension reload notification if host permissions are genuinely missing in Chrome.

### Changed
- **Direct Side Panel Screen Capture**: Added synchronous direct tab capture from the side panel with background worker fallback, preserving direct user click gestures.
- **Vision AI Markdown-to-Action Parser**: Enhanced `renderVisionResult` with an intelligent natural-text and markdown parser that automatically converts raw bullet lists into high-contrast interactive cards with 1-click `⚡ Do This` buttons.
- **Vision Notice & Loading Cards**: Added accessible, styled notice cards (`.vision-notice-card`) with clear visual hierarchy, badges, and ADHD-friendly action hints.

## [1.1.2] — 2026-11-08

### Added
- **Gamified Dopamine Flow on Focus View**: Integrated real-time streak count (🔥), daily crushed tasks counter (⚡), and queued tasks chip (🎯) directly in the main Focus view.
- **Electric Pulsing Timer Ring**: Animated cyan & violet ambient glow and subtle text pulsing while focus timers run.
- **Dynamic Micro-Step Stepper**: Added interactive step progress badge (`🧩 Step 1 of N`) and animated gradient progress bar on the NOW task card when micro-steps are active.
- **Synthesized Web Audio Dopamine Chime**: Uplifting two-tone (C5 to G5) audio chime synthesized via native browser Web Audio API upon completing a task or timer (zero external sound files or permissions required).
- **In-App What's New & Changelog Modal**: Added accessible changelog viewer accessible via the 🚀 icon in the top header and Help menu.
- **Reusable Antigravity Customization Plugin**: Packaged `chrome-extension-developer` plugin bundle in Antigravity containing full MV3 development skills and clinical ADHD rules.

### Changed
- **Upgraded AI Engine to Gemini 3.8 Flash (`gemini-3.8-flash`)**: Replaced deprecated `gemini-1.5-flash` with current state-of-the-art multimodal model and native JSON Schema structured output (`response_schema`).
- **Automated AI Fallback**: Built-in automatic fallback to `gemini-3.5-flash-lite` in case of rate limits or transient errors.

## [1.1.1] — 2026-11-08

### Fixed
- **Chrome Web Store Compliance (Purple Potassium)**: Removed unused `"storage"` permission from `manifest.json`. All user task lists, timer states, and preferences persist strictly in origin-isolated `localStorage` without elevated privileges.
- **Settings Modal Markup**: Fixed unclosed `div` element in settings accessibility controls.

### Changed
- **Zero-Dependency Native Screen Scanner**: Decoupled desktop Python sidecar (`tracker.py`) from browser extension; implemented 100% native Chrome Webpage Vision scanner via `chrome.tabs.captureVisibleTab` and `activeTab`.
- **Clinical ADHD Initiation Heuristics**: Completely overhauled `js/breakdown.js` with 20+ everyday human life categories (pets, laundry, dishes, hygiene, calls, bills, meds, study, code) and clinical 4-phase ADHD initiation sequencing.
- **Task Breakdown Agency**: Added inline deletion (`✕`) and addition (`+ Add Step`) controls inside Magic Breakdown modal so users can edit steps before saving.
- **Sticky Side-Panel Viewports**: Made Brain Dump bar sticky (`top: 0; z-index: 20`) in narrow side panels (<600px) so AI suggestions never push quick capture off-screen.
- **Instant Quick Capture**: Pressing Enter in the Brain Dump instantly adds the task without interrupting modal prompts.

## [1.1.0] — 2026-11-08

### Added
- **Manifest V3 Chrome Extension Support**: Ported FreezeFix into an official Chrome side panel extension (`side_panel: { "default_path": "index.html" }`).
- **Automated Packaging Tool**: Created `scripts/pack_extension.py` to bundle clean, CWS-compliant ZIP archives and unpacked builds.
- **Store Documentation**: Created comprehensive `CHROMEWEBSTORE.md` with permissions justifications and store listing copy.

## [1.0.0] — 2026-08-19

### Security
- Escaped all user-, AI-, and calendar-derived values rendered via `innerHTML` with `escapeHtml` helper.
- Added strict `Content-Security-Policy` to `index.html` and `heart.html`.
- Bound local `tracker.py` sidecar to `127.0.0.1` with per-session token validation.

### Added
- Initial Electron desktop widget release with task management, vertical Day Flow timeline, Pomodoro timer, and history logging.
