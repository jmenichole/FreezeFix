// FreezeFix Chrome Extension Service Worker

// Open the side panel when the user clicks the extension action icon
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error('FreezeFix SidePanel config error:', error));

chrome.runtime.onInstalled.addListener(() => {
  console.log('FreezeFix ADHD Extension installed successfully.');
});
