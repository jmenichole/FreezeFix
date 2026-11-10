# Privacy Policy — FreezeFix

**Effective Date:** November 8, 2026  
**Last Updated:** November 10, 2026 (v1.3.0)  
**Hosted URL:** https://jmenichole.github.io/FreezeFix/privacy.html  

## 1. Core Philosophy
FreezeFix does **not** collect user tracking data, run advertisements, or sell personal information. There is no FreezeFix server. Task and scheduling data is stored only on your device, in your browser.

## 2. What Data We Store
- **Tasks & Schedules:** Stored only on your device using standard local web storage (`localStorage`).
- **Your current "Unfreeze" plan:** The gist and steps of the plan you're working through are kept in `localStorage` so the panel reopens where you left off. The original text you selected or pasted is not saved.
- **Settings & API Keys:** Stored locally in your browser storage. We have no external servers collecting or storing your keys.
- **Calendar Files (.ics):** Parsed locally in memory; never sent anywhere.

## 3. Selected Text & Page Text ("Unfreeze this" / "Scan this page")
- FreezeFix reads text **only when you click**: the "Unfreeze this" right-click item, the "Unfreeze this" button, or "Scan this page".
- It reads your selected text, or, if nothing is selected, the main readable text of the active page (up to about 12,000 characters).
- That text is sent **only to the AI provider you chose** (Google Gemini or Groq) using **your own API key**, directly from your browser over HTTPS. It is never sent to the developer.
- **Nothing is stored remotely** by FreezeFix. The provider's own terms govern how it handles requests.
- With **no API key set**, the text is processed 100% locally with built-in rules and no network request is made.

## 4. Third-Party AI Services (Bring Your Own Key)
Optional AI features (Unfreeze steps, "Too big" splitting, Magic Breakdown, "What next?") call Google Gemini or Groq only if you add a key. Requests travel directly from your browser to the provider.

## 5. Screenshot Fallback (`activeTab`, `<all_urls>`)
- Only if a page has **no readable text** (for example an image or a PDF viewer) and you have a Gemini key, FreezeFix captures the visible tab after you click "Scan this page".
- The image is sent directly to Gemini for that one request and then discarded. It is never logged or stored.

## 6. Permissions
- `contextMenus`: one "Unfreeze this" item, shown only when text is selected.
- `scripting`: reads the selection or page text on click. Nothing runs on pages automatically.
- `sidePanel`, `activeTab`, `tabs`, `<all_urls>`: show the panel, find the active tab, and read it on click.

## 7. Contact
- **Author:** J Chapman (jmenichole)
- **Email:** j.chapman7@yahoo.com
- **Repository:** https://github.com/jmenichole/FreezeFix
