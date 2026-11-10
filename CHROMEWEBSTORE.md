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
> Crush ADHD freeze: 2-min task breakdowns, visual focus timer, and webpage copilot in your side panel.

### Detailed Description (Formatted for Web Store — Scannable & Low Cognitive Load)
```text
Stuck in ADHD paralysis? FreezeFix lives right inside your Chrome Side Panel to help you start, unfreeze, and finish without the overwhelm.

Zero complex setups. Zero planner fatigue. Just open the side panel and take the next tiny step.

⚡ 4 WAYS FREEZEFIX UNFREEZES YOUR BRAIN:

🧩 1. Magic Task Breakdown (0ms Instant)
Big tasks feel impossible to start. Click "Break Down" on any task to instantly explode it into 3-4 physical, 2-minute micro-steps. Never stare blankly at a screen again.

📸 2. Webpage Copilot (Tab Scanner)
Lost in a sea of tabs or stuck on a page? Click "Scan Webpage". FreezeFix reads your active tab and gives you 2-3 concrete next steps right on that screen. Zero preaching, zero scolding.

🆘 3. "Stuck?" Emergency Guardrail
Frozen on your current task? Hit "🆘 Stuck?" on your focus card to get an immediate 30-second physical starter move and a "good enough" finish line to break perfectionism.

⏱️ 4. Visual Focus Timer & Day Flow
A glowing focus ring keeps you grounded in time. View your day in a vertical timeline, or dump stray thoughts into the sticky Brain Dump without losing your place.

------------------------------------------------------------
🔒 100% PRIVATE & OFFLINE-READY:
• Runs 100% inside your browser sandbox.
• Works completely offline with instant smart heuristics.
• Zero ads, zero tracking, zero data collection.
• Optional free Gemini / Groq key for background AI.

⌨️ SHORTCUT: Press Alt + Shift + F (or Option + Shift + F on Mac) to toggle the side panel anytime.
```

---

## 2. Single Purpose Statement
> "FreezeFix provides an ADHD-friendly focus workflow by breaking intimidating tasks into manageable micro-steps, visualizing daily schedules, and guiding users past executive dysfunction directly inside their browser."

---

## 3. Permissions Justification (For Google Review Team)

Copy and paste these exact justifications into the Chrome Developer Dashboard:

### API Permissions:
| Permission | Reviewer Justification |
| :--- | :--- |
| **`sidePanel`** | Required to display the FreezeFix companion interface docked alongside the user's active browsing session in Chrome's native side panel, providing continuous executive function guidance without context switching. |
| **`activeTab`** | Required solely when the user explicitly clicks the "Scan Webpage" button to capture the visible area of their active tab for AI-assisted task breakdown and distraction-free work summarization. |
| **`tabs`** | Required to identify the user's active window/tab target for screenshot capture and executive function guidance. |

### Host Permissions:
| Host Pattern | Reviewer Justification |
| :--- | :--- |
| **`<all_urls>`** | Required solely for `chrome.tabs.captureVisibleTab` when invoked from the side panel to capture the visual content of the user's active webpage for on-demand ADHD task breakdown. Does not inject remote scripts or read cookies. |

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
