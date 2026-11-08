// FreezeFix Chrome Extension Service Worker

// Open the side panel when the user clicks the extension action icon
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error('FreezeFix SidePanel config error:', error));

chrome.runtime.onInstalled.addListener(() => {
  console.log('FreezeFix ADHD Extension installed successfully.');
});

// Bridge tab capture requests from side panel
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
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
