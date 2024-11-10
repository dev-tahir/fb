let receivedPosts = [];
let activePostingTabId = null;

// Listen for tab updates/refreshes to maintain state
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tabId === activePostingTabId) {
    // Reinitialize the posting tab after refresh
    chrome.tabs.sendMessage(tabId, {
      action: "toggleStatus",
      isActive: true,
      isPostingTab: true,
    });
  }
});

// Listen for tab closures
chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  if (tabId === activePostingTabId) {
    activePostingTabId = null;
  }
});

// Handle extension icon click
chrome.browserAction.onClicked.addListener((tab) => {
  // Toggle posting state for the clicked tab
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
    if (activePostingTabId) {
      // Check if the posting tab is still valid
      chrome.tabs.get(activePostingTabId, function (tab) {
        const isError = chrome.runtime.lastError;
        if (isError || !tab) {
          activePostingTabId = null;
          sendResponse({
            success: false,
            message:
              "Posting tab was closed. Please activate the extension in a new tab.",
          });
          return;
        }

        // Tab exists, proceed with posting
        receivedPosts.push(request.data);
        injectAndPost(activePostingTabId, request.data);

        // Update modal in the posting tab
        chrome.tabs.sendMessage(activePostingTabId, {
          action: "newPost",
          post: request.data,
        });

        sendResponse({ success: true });
      });
    } else {
      sendResponse({
        success: false,
        message:
          "No active posting tab. Please activate the extension in the tab where you want posts to appear.",
      });
    }
    return true;
  } else if (request.action === "verifyPostingTab") {
    // Allow content script to verify if it's still the posting tab
    sendResponse({
      isPostingTab: sender.tab.id === activePostingTabId,
    });
    return true;
  }
});

function injectAndPost(tabId, post) {
  chrome.tabs.get(tabId, function (tab) {
    if (!chrome.runtime.lastError && tab) {
      chrome.tabs.executeScript(
        tabId,
        {
          code: `window.post = ${JSON.stringify(post)};`,
        },
        () => {
          if (!chrome.runtime.lastError) {
            chrome.tabs.executeScript(
              tabId,
              {
                file: "post_to_facebook.js",
              },
              () => {
                if (chrome.runtime.lastError) {
                  console.error(
                    "Error executing post_to_facebook.js:",
                    chrome.runtime.lastError
                  );
                }
              }
            );
          }
        }
      );
    }
  });
}
