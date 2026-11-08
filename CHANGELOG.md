# Changelog

All notable changes to FreezeFix are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
