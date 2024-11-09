let receivedPosts = [];

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getPosts") {
    sendResponse({ posts: receivedPosts });
  } else if (request.action === "clearPosts") {
    receivedPosts = [];
    sendResponse({ success: true });
  } else if (request.action === "sendToExtensionB") {
    // Store the post directly instead of sending to another extension
    receivedPosts.push(request.data);
    sendResponse({ success: true });
    // Notify the popup that a new post has been received
    chrome.runtime.sendMessage({ action: "newPost", post: request.data });
  }
});
