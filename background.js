let receivedPosts = [];
let isWaitingForPost = false;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "sendPost") {
    receivedPosts.push(request.data);
    sendResponse({success: true});
    
    if (isWaitingForPost) {
      isWaitingForPost = false;
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {action: "postToFacebook", post: receivedPosts[0]});
      });
    }
  } else if (request.action === "getPosts") {
    sendResponse({posts: receivedPosts});
  } else if (request.action === "clearPosts") {
    receivedPosts = [];
    sendResponse({success: true});
  } else if (request.action === "injectPostScript") {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.executeScript(tabs[0].id, {file: 'post_to_facebook.js'});
      isWaitingForPost = true;
      sendResponse({success: true});
    });
    return true;
  }
});