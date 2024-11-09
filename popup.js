function displayPosts(posts) {
  const postList = document.getElementById('postList');
  postList.innerHTML = '';
  posts.forEach((post, index) => {
    const postElement = document.createElement('div');
    postElement.className = 'post-item';
    postElement.innerHTML = `
      <p>Image: ${post.imageUrl.substring(0, 30)}...</p>
      <p>Caption: ${post.caption.substring(0, 30)}...</p>
      <button class="postBtn" data-index="${index}">Post to Facebook</button>
    `;
    postList.appendChild(postElement);
  });

  // Add event listeners to post buttons
  document.querySelectorAll('.postBtn').forEach(btn => {
    btn.addEventListener('click', function() {
      const index = this.getAttribute('data-index');
      postToFacebook(posts[index]);
    });
  });
}

function postToFacebook(post) {
  // Find the active Facebook tab or create one if it doesn't exist
  chrome.tabs.query({url: "*://*.facebook.com/*"}, (tabs) => {
    if (tabs.length > 0) {
      injectAndPost(tabs[0].id, post);
    } else {
      chrome.tabs.create({url: "https://www.facebook.com"}, (tab) => {
        // Wait for the tab to finish loading
        chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
          if (tabId === tab.id && info.status === 'complete') {
            chrome.tabs.onUpdated.removeListener(listener);
            injectAndPost(tab.id, post);
          }
        });
      });
    }
  });
}

function injectAndPost(tabId, post) {
  chrome.tabs.executeScript(tabId, {
    code: `
      window.post = ${JSON.stringify(post)};
    `
  }, () => {
    chrome.tabs.executeScript(tabId, {file: 'post_to_facebook.js'});
  });
}
document.getElementById('clearBtn').addEventListener('click', () => {
  chrome.runtime.sendMessage({action: "clearPosts"}, response => {
    if (response.success) {
      displayPosts([]);
    }
  });
});

// Initial load of posts
chrome.runtime.sendMessage({action: "getPosts"}, response => {
  displayPosts(response.posts);
});

// Listen for new posts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "newPost") {
    chrome.runtime.sendMessage({action: "getPosts"}, response => {
      displayPosts(response.posts);
    });
  }
});