let receivedPosts = [];
let activePostingTabId = null; // Store which tab is set for auto-posting

// Initialize extension state in storage
chrome.storage.local.set({ isActive: false }, function () {
  console.log("Initial extension state set");
});

// Handle extension icon click
chrome.browserAction.onClicked.addListener((tab) => {
  // Toggle posting state only for the clicked tab
  activePostingTabId = activePostingTabId === tab.id ? null : tab.id;

  // Send status update to all tabs
  chrome.tabs.query({}, function (tabs) {
    tabs.forEach(function (currentTab) {
      chrome.tabs.sendMessage(currentTab.id, {
        action: "toggleStatus",
        isActive: currentTab.id === activePostingTabId,
        isPostingTab: currentTab.id === activePostingTabId,
      });
    });
  });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "checkStatus") {
    sendResponse({
      isActive: sender.tab.id === activePostingTabId,
      isPostingTab: sender.tab.id === activePostingTabId,
    });
    return true;
  } else if (request.action === "sendToExtensionB") {
    // Only send posts to the active posting tab
    if (activePostingTabId) {
      receivedPosts.push(request.data);
      injectAndPost(activePostingTabId, request.data);

      // Update modal only in the posting tab
      chrome.tabs.sendMessage(activePostingTabId, {
        action: "newPost",
        post: request.data,
      });

      sendResponse({ success: true });
    } else {
      sendResponse({
        success: false,
        message:
          "No active posting tab. Please activate the extension in the tab where you want posts to appear.",
      });
    }
    return true;
  }
});

function injectAndPost(tabId, post) {
  chrome.tabs.executeScript(
    tabId,
    {
      code: `window.post = ${JSON.stringify(post)};`,
    },
    () => {
      chrome.tabs.executeScript(tabId, { file: "post_to_facebook.js" });
    }
  );
}
