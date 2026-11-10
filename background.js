// FreezeFix Chrome Extension Service Worker

// Open the side panel when the user clicks the extension action icon
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error('FreezeFix SidePanel config error:', error));

chrome.runtime.onInstalled.addListener(() => {
  // Right-click on selected text → "Unfreeze this"
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'freezefix-unfreeze',
      title: 'Unfreeze this',
      contexts: ['selection']
    });
  });
  console.log('FreezeFix ADHD Extension installed successfully.');
});

// ── "Unfreeze this" hand-off to the side panel ──────────────
// Held in memory only (never stored), picked up by the panel when it loads.
const UNFREEZE_MAX_CHARS = 12000;
let pendingUnfreeze = null;

function deliverUnfreeze(payload) {
  pendingUnfreeze = payload;
  // If the panel is already open it picks this up immediately; otherwise it asks on load.
  chrome.runtime.sendMessage({ action: 'unfreeze_text', ...payload }).catch(() => {});
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== 'freezefix-unfreeze') return;

  // sidePanel.open must run synchronously inside the user gesture
  if (tab && typeof tab.windowId === 'number') {
    chrome.sidePanel.open({ windowId: tab.windowId }).catch((err) => console.warn('sidePanel.open failed:', err));
  }

  const fallbackText = String(info.selectionText || '').slice(0, UNFREEZE_MAX_CHARS);
  const base = { ts: Date.now(), source: 'selection', title: (tab && tab.title) || '' };

  // Prefer the real selection (keeps line breaks & bullets); selectionText collapses whitespace.
  if (tab && typeof tab.id === 'number' && chrome.scripting) {
    chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: false },
      func: () => String(window.getSelection ? window.getSelection().toString() : '')
    }).then((results) => {
      const sel = results && results[0] && results[0].result;
      const text = sel && sel.trim().length >= fallbackText.trim().length * 0.6 ? sel : fallbackText;
      deliverUnfreeze({ ...base, text: String(text).slice(0, UNFREEZE_MAX_CHARS) });
    }).catch(() => deliverUnfreeze({ ...base, text: fallbackText }));
  } else {
    deliverUnfreeze({ ...base, text: fallbackText });
  }
});

// Bridge tab capture requests from side panel
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'get_pending_unfreeze') {
    const p = pendingUnfreeze && (Date.now() - pendingUnfreeze.ts < 120000) ? pendingUnfreeze : null;
    pendingUnfreeze = null;
    sendResponse({ pending: p });
    return false;
  }
  if (message.action === 'clear_pending_unfreeze') {
    pendingUnfreeze = null;
    return false;
  }
  if (message.action === 'capture_active_tab') {
    // 1. Query the currently active tab in the last focused window
    chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
      const activeTab = tabs && tabs[0];
      const winId = activeTab ? activeTab.windowId : null;

      // Check if the tab is an internal or restricted browser URL
      if (activeTab && activeTab.url) {
        const u = activeTab.url.toLowerCase();
        if (
          u.startsWith('chrome://') ||
          u.startsWith('chrome-extension://') ||
          u.startsWith('edge://') ||
          u.startsWith('about:') ||
          u.startsWith('view-source:') ||
          u.startsWith('devtools://') ||
          u.includes('chromewebstore.google.com') ||
          u.includes('chrome.google.com/webstore')
        ) {
          sendResponse({
            success: false,
            error: 'RESTRICTED_BROWSER_PAGE',
            isInternalPage: true,
            url: activeTab.url,
            title: activeTab.title || 'Internal Browser Page'
          });
          return;
        }
      }

      // 2. Capture visible tab with windowId
      chrome.tabs.captureVisibleTab(winId, { format: 'jpeg', quality: 50 }, (dataUrl) => {
        if (!chrome.runtime.lastError && dataUrl) {
          sendResponse({ success: true, dataUrl });
          return;
        }

        // Fallback: try capturing without explicit windowId
        chrome.tabs.captureVisibleTab(null, { format: 'jpeg', quality: 50 }, (dataUrl2) => {
          if (chrome.runtime.lastError || !dataUrl2) {
            const errMsg = chrome.runtime.lastError ? chrome.runtime.lastError.message : 'Failed to capture tab';
            sendResponse({
              success: false,
              error: errMsg
            });
          } else {
            sendResponse({
              success: true,
              dataUrl: dataUrl2
            });
          }
        });
      });
    });
    return true; // Keep message channel open for async sendResponse
  }
});
