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
    chrome.tabs.captureVisibleTab(null, { format: 'jpeg', quality: 75 }, (dataUrl) => {
      if (chrome.runtime.lastError || !dataUrl) {
        sendResponse({
          success: false,
          error: chrome.runtime.lastError ? chrome.runtime.lastError.message : 'Failed to capture tab'
        });
      } else {
        sendResponse({
          success: true,
          dataUrl: dataUrl
        });
      }
    });
    return true; // Keep message channel open for async sendResponse
  }
});
