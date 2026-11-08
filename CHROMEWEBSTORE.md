# Chrome Web Store Submission Guide — FreezeFix

**Extension Name:** FreezeFix — ADHD Flow & Focus Companion  
**Short Name:** FreezeFix  
**Version:** 1.1.0  
**Category:** Productivity  
**Privacy Policy URL:** https://jmenichole.github.io/FreezeFix/privacy.html  
**Support URL:** https://github.com/jmenichole/FreezeFix/issues
**Ko-fi Creator Page:** https://ko-fi.com/jmenichole7  

---

## 1. Store Listing Copy

### Summary (Short Description — Max 132 characters)
> ADHD productivity companion: micro-task breakdowns, auto-scheduling, AI suggestions, and focus streaks.

### Detailed Description (Formatted for Web Store)
```text
Overcome task paralysis, eliminate decision fatigue, and get into flow with FreezeFix — an executive function companion designed specifically for ADHD brains.

FreezeFix docks neatly on the right side of your browser as a Side Panel, keeping your tasks, timeline, and focus timer visible right alongside your work without cluttering your tabs.

🌟 KEY FEATURES BUILT FOR ADHD MINDS:

🪄 Magic Task Breakdown
Staring at a big, intimidating project? Click the magic wand icon on any task to instantly break it down into tiny, low-pressure 5-minute micro-steps. Works with free Gemini/Groq AI or 100% offline using built-in rules!

🎯 Focus "Up Next" Card
Eliminate decision paralysis. FreezeFix highlights only ONE task at a time with a prominent "Start Focus" button so you always know exactly what to do next without second-guessing.

⏱️ Ring Focus Timer with Preset Modes
Easily switch between 25-minute Pomodoro focus, 5-minute quick breaks, 15-minute resets, or 90-minute deep work blocks. Visual progress ring keeps you grounded in time.

⚡ Brain Dump Quick-Add
Got a random thought or urgent to-do while working? Type it into the Brain Dump field and hit Enter to get it out of your head immediately without breaking your concentration.

📅 Visual Flow Timeline & Auto-Rescheduler
View your day’s tasks mapped along a clean vertical timeline. Behind schedule? Click "Auto-Reschedule" to shift overdue tasks forward guilt-free.

🎨 Adaptive Themes & High-Legibility Font
• Seamlessly switches between Crisp Light Mode and Dark Neon Glass based on your browser theme.
• Includes a one-click Atkinson Hyperlegible font toggle designed to reduce visual strain for dyslexia and ADHD.

🔒 100% PRIVATE & OFFLINE-FIRST:
• All your tasks, settings, and streak data remain strictly on your computer (localStorage).
• Zero tracking, zero telemetry, and zero ads.
• Works completely offline with smart heuristic rules.

------------------------------------------------------------
⌨️ KEYBOARD SHORTCUTS:
• Toggle Side Panel: Alt + Shift + F (Windows) or Option + Shift + F (Mac)
```

---

## 2. Single Purpose Statement
> "FreezeFix provides an ADHD-friendly focus workflow by breaking intimidating tasks into manageable micro-steps, visualizing daily schedules, and guiding users past executive dysfunction directly inside their browser."

---

## 3. Permissions Justification (For Google Review Team)

Copy and paste these exact justifications into the Chrome Developer Dashboard:

| Permission | Reviewer Justification |
| :--- | :--- |
| **`sidePanel`** | Required to display the FreezeFix companion interface docked alongside the user's active browsing session in Chrome's native side panel, providing continuous executive function guidance without context switching. |
| **`activeTab`** | Required solely when the user explicitly clicks the "Scan Webpage" / "Scan Screen" button to capture the visible area of their active tab for AI-assisted task breakdown and distraction-free work summarization. |

---

## 4. Chrome Web Store Data Privacy Form

When filling out the **Privacy** tab in the Developer Dashboard:

1. **Single Purpose:** Check *Yes* — confirm the extension serves a single purpose.
2. **Permission Justification:** Paste the table above.
3. **Data Usage Disclosures:**
   - **User Data Collected?** Select **NO**. FreezeFix does not collect, transmit, or store personally identifiable information on developer servers.
   - **Certifications:** Check all standard compliance checkboxes (not selling user data, not using data for unrelated purposes, not using data for creditworthiness or lending).

---

## 5. Visual Assets Checklist

- [x] **Store Icon**: `icons/icon128.png` (128×128 PNG)
- [x] **Toolbar Icons**: 16×16, 32×32, 48×48 PNGs in `icons/`
- [ ] **Store Screenshot**: At least one 1280×800 (or 640×400) PNG screenshot of the FreezeFix side panel open next to a webpage.
- [ ] **Small Promo Tile (Optional)**: 440×280 PNG.

---

## 6. Version History & Review Notes

### v1.1.1 (November 8, 2026) — Reviewer Rectification (Purple Potassium)
- **Resolved Excessive Permissions Flag:** Removed `"storage"` permission from `manifest.json`. All user task lists, timer state, and user preferences are persisted exclusively via standard origin-isolated `localStorage` without requiring elevated Chrome storage permissions.
- **Audited Remaining Permissions:** The extension now requests only **2 minimal permissions**:
  1. `sidePanel`: Required for Chrome's native side panel UI (`index.html`).
  2. `activeTab`: Invoked on-demand only when the user clicks "Scan Webpage" to capture their active tab.
- **Enhanced Clinical UX:** Fixed Brain Dump sticky positioning and one-click micro-task capture based on clinical ADHD executive dysfunction research (PMC12289795 & OT4ADHD).
