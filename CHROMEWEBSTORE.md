# Chrome Web Store Submission Guide — FreezeFix

**Extension Name:** FreezeFix — ADHD Productivity & Flow  
**Short Name:** FreezeFix  
**Version:** 1.3.0  
**Category:** Productivity  
**Privacy Policy URL:** https://jmenichole.github.io/FreezeFix/privacy.html  
**Support URL:** https://github.com/jmenichole/FreezeFix/issues  
**Ko-fi Creator Page:** https://ko-fi.com/jmenichole7  

---

## 1. Store Listing Copy

### Summary (Short Description — max 132 characters, currently 110)
> Highlight anything overwhelming → one clear step at a time. ADHD side panel with a focus timer and brain dump.

### Detailed Description
```text
Highlight anything overwhelming → one clear step at a time.

That long AI answer. The 40-line setup guide. The email with six asks buried in it. FreezeFix turns a wall of text into a one-line gist and a few small steps, then shows you only the step you're on.

HOW IT WORKS
1. Highlight text on any page, right-click, choose "Unfreeze this". (Or paste it, or press "Scan this page".)
2. Read the gist: one plain sentence, "This is about…"
3. Do just the step in front of you. Big text, a rough time, nothing else.

ONE STEP AT A TIME
• Done ✓ moves you to the next step.
• Too big splits just that step into 2–4 smaller ones, right where it was.
• Skip sets it aside for later.
• Progress shows as dots, not "3 of 7".
• "Safe to ignore for now" names what can wait.
• Add the steps that are left to your task list in one click.

A CALM HOME BASE
The side panel opens on four things: the Unfreeze box, Up next, a visual focus timer and a brain dump. The Day Flow timeline, auto-schedule, calendar import, streaks and history are tucked into "More" for when you want them.

WORKS WITH OR WITHOUT AI
• Free offline mode pulls the instructions out of the text for you. No account needed.
• Add your own free Google Gemini or Groq key for much smarter steps.
• Pages with no text (images, PDFs) can be read from a screenshot with a Gemini key.

PRIVATE BY DESIGN
• Text is read only when you click, and sent only to the AI provider whose key you added.
• Nothing is stored on a FreezeFix server. There isn't one.
• Tasks and settings stay in your browser. No ads, no tracking.

Light and dark themes, plus a high-legibility Atkinson Hyperlegible font option.
Shortcut: Alt + Shift + F opens the side panel.
```

---

## 2. Single Purpose Statement
> "FreezeFix helps people with ADHD get unstuck by turning overwhelming text they select into one clear, doable step at a time, alongside a simple focus timer and task list in Chrome's side panel."

---

## 3. Permissions Justification (for the Google review team)

### API permissions
| Permission | Reviewer justification |
| :--- | :--- |
| **`sidePanel`** | Displays the FreezeFix interface in Chrome's native side panel next to the page the user is reading. |
| **`contextMenus`** | Adds a single "Unfreeze this" item to the right-click menu, shown only when the user has selected text. Clicking it sends that selection to the side panel. |
| **`scripting`** | Used only after a user action ("Unfreeze this" or "Scan this page") to read the selected text or the page's main readable text from the active tab. No scripts are injected otherwise and nothing runs in the background on pages. |
| **`activeTab`** | Grants temporary access to the current tab when the user invokes the extension, so the selection/page text can be read and, as a fallback for pages without text, a screenshot taken. |
| **`tabs`** | Identifies the active tab and window to read from, and detects restricted pages (chrome://, Web Store) so the user gets a clear message instead of an error. |

### Host permissions
| Host pattern | Reviewer justification |
| :--- | :--- |
| **`<all_urls>`** | Lets "Scan this page" keep working after the user switches tabs while the side panel stays open (activeTab alone is lost on tab switch). Used only on click to read the page's text or, when a page has no text, to call `chrome.tabs.captureVisibleTab`. FreezeFix does not read cookies, inject remote code, or run content scripts automatically. |

---

## 4. Chrome Web Store Data Privacy Form

1. **Single Purpose:** Yes.
2. **Permission justification:** paste the tables above.
3. **Data usage disclosures:**
   - **Website content:** the text the user selects (or the page text when they press "Scan this page") is sent, on click only, directly to the AI provider whose API key the user added (Google Gemini or Groq). It is not sent to the developer and is not stored remotely. With no key, processing is 100% local.
   - **User data collected by the developer:** None. No analytics, no accounts, no developer servers.
   - **Certifications:** not sold, not used for unrelated purposes, not used for creditworthiness or lending.

---

## 5. Visual Assets Checklist

- [x] **Store icon:** `icons/icon128.png` (128×128)
- [x] **Toolbar icons:** 16, 32, 48 PNGs in `icons/`
- [x] **Screenshots (1280×800):**
  - `store-assets/screenshot-1-before-after.png` — a Gemini wall of text → step 1 in the side panel
  - `store-assets/screenshot-2-one-step.png` — one step with Done / Too big / Skip, dots for progress
  - `store-assets/screenshot-3-calm-home.png` — the decluttered home with Unfreeze box, Up next and focus timer
- [x] **Small promo tile (440×280):** `store-assets/promo-440x280.png`

---

## 6. Version History & Review Notes

### v1.3.0 (November 10, 2026) — "Unfreeze this"
- New core feature: highlight text → right-click "Unfreeze this" → gist + one step at a time in the side panel.
- "Scan this page" now reads page **text** (selection first, else the main readable text, trimmed to ~12k characters). Screenshot vision is only a fallback for pages with no text.
- New permissions: `contextMenus` (one selection-only menu item) and `scripting` (on-click text reading). No new host permissions.
- Panel decluttered: secondary tools moved into a collapsible "More" section; nothing removed.

### v1.1.1 (November 8, 2026) — Reviewer Rectification (Purple Potassium)
- Removed `"storage"` permission. All tasks, timer state and preferences use origin-isolated `localStorage`.
- Brain Dump sticky positioning and one-click micro-task capture fixes.
