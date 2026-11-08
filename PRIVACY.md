# Privacy Policy — FreezeFix

**Effective Date:** November 8, 2026  
**Last Updated:** November 8, 2026  
**Hosted URL:** https://jmenichole.github.io/FreezeFix/privacy.html  

## 1. Core Philosophy
FreezeFix does **not** collect user tracking data, run advertisements, or sell personal information. All task management and scheduling data is stored strictly locally on your machine or browser.

## 2. What Data We Store
- **Tasks & Schedules:** Stored exclusively on your device using standard local web storage (`localStorage`). No tasks or focus data ever leave your machine.
- **Settings & API Keys:** Stored locally in your browser storage. We have no external servers collecting or storing your keys.
- **Calendar Files (.ics):** Parsed locally in client memory; never sent to external servers.

## 3. Third-Party AI Services (BYOK)
FreezeFix features an optional AI companion ("Magic Breakdown" and "What next?"):
- If you provide an API key (Google Gemini or Groq), API requests travel directly from your client to the provider over HTTPS.
- If no key is provided, FreezeFix uses its built-in rule heuristics 100% offline with zero network requests.

## 4. Screen & Tab Capture Permissions (`activeTab`)
The Chrome extension uses `activeTab` exclusively on-demand when you click "📸 Scan Screen":
- Snapshots are taken only when explicitly initiated by the user.
- Images are sent directly to the vision endpoint for processing and discarded immediately. They are never logged or stored.

## 5. Contact
- **Author:** J Chapman (jmenichole)
- **Email:** j.chapman7@yahoo.com
- **Repository:** https://github.com/jmenichole/FreezeFix
