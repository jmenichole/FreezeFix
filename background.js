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
    // Explicitly target the last focused window so side panel capture succeeds
    chrome.windows.getLastFocused({ populate: false }, (win) => {
      const windowId = (win && typeof win.id === 'number') ? win.id : null;
      chrome.tabs.captureVisibleTab(windowId, { format: 'jpeg', quality: 75 }, (dataUrl) => {
        if (chrome.runtime.lastError || !dataUrl) {
          const errMsg = chrome.runtime.lastError ? chrome.runtime.lastError.message : 'Failed to capture tab';
          sendResponse({
            success: false,
            error: errMsg
          });
        } else {
          sendResponse({
            success: true,
            dataUrl: dataUrl
          });
        }
      });
    });
    return true; // Keep message channel open for async sendResponse
  }
});
