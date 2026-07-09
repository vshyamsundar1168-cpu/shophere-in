'use strict';
// ── Push to ShopHere.in — Service Worker ──────────────────────────────────────

// Show badge when on a page that looks like a product
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete') return;
  if (!tab.url || tab.url.startsWith('chrome://')) return;

  // Check if URL looks like a product page (has product/item/detail in path)
  const isProduct = /\/(product|item|detail|p\/|dp\/|pd\/)/.test(tab.url) ||
                    /[?&](id|sku|pid|item)=/.test(tab.url);

  try {
    await chrome.action.setBadgeText({
      text:  isProduct ? '●' : '',
      tabId,
    });
    await chrome.action.setBadgeBackgroundColor({ color: '#22c55e', tabId });
  } catch(e) {}
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'GET_STORE_CONFIG') {
    chrome.storage.sync.get(['storeUrl', 'pushToken'], data => {
      sendResponse(data);
    });
    return true;
  }
});
