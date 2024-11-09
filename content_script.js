console.log("FB Post Sender content script loaded");
let isExtensionActive = false;
let isPostingTab = false;

// Initialize modal function
function initializeModal() {
  if (!document.getElementById("extension-modal")) {
    const modal = document.createElement("div");
    modal.id = "extension-modal";
    modal.innerHTML = `
            <h3>Auto-Posting ${
              isPostingTab
                ? "Active (Receiving Posts)"
                : "Active (Sharing Mode)"
            }</h3>
            <div id="posts-list"></div>
            <div class="status-message">
                ${
                  isPostingTab
                    ? "Waiting to receive posts..."
                    : 'Click "Post on Page" buttons to share'
                }
            </div>
        `;
    document.body.appendChild(modal);
  }
}

// Update modal status
function updateModalStatus() {
  const modal = document.getElementById("extension-modal");
  if (modal) {
    const header = modal.querySelector("h3");
    const statusMessage = modal.querySelector(".status-message");
    if (header) {
      header.textContent = `Auto-Posting ${
        isPostingTab ? "Active (Receiving Posts)" : "Active (Sharing Mode)"
      }`;
    }
    if (statusMessage) {
      statusMessage.textContent = isPostingTab
        ? "Waiting to receive posts..."
        : 'Click "Post on Page" buttons to share';
    }
  }
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "toggleStatus") {
    isExtensionActive = request.isActive;
    isPostingTab = request.isPostingTab;

    if (isExtensionActive) {
      initializeModal();
    } else {
      const modal = document.getElementById("extension-modal");
      if (modal) modal.remove();
    }
    updateButtonStyles();
    updateModalStatus();
  } else if (request.action === "newPost" && isPostingTab) {
    const postsList = document.getElementById("posts-list");
    if (postsList) {
      const postElement = document.createElement("div");
      postElement.textContent = `Posted: ${request.post.caption.substring(
        0,
        30
      )}...`;
      postsList.appendChild(postElement);
    }
  }
});

// Check initial status when content script loads
chrome.runtime.sendMessage({ action: "checkStatus" }, function (response) {
  isExtensionActive = response.isActive;
  isPostingTab = response.isPostingTab;
  if (isExtensionActive) {
    initializeModal();
  }
  updateButtonStyles();
});

function updateButtonStyles() {
  const buttons = document.querySelectorAll(".repost-button");
  buttons.forEach((button) => {
    if (isExtensionActive && !isPostingTab) {
      // Only show active buttons in sharing tabs
      button.classList.add("active");
      button.style.backgroundColor = "#4CAF50";
      button.style.display = "inline-block";
    } else {
      button.classList.remove("active");
      button.style.backgroundColor = "#ccc";
      button.style.display = isPostingTab ? "none" : "inline-block"; // Hide buttons in posting tab
    }
  });
}

function getTextFromParents(element, maxDepth = 10) {
  let currentElement = element;
  let depth = 0;
  let textArray = [];

  while (currentElement && depth < maxDepth) {
    for (let node of currentElement.childNodes) {
      let trimmedText = node.textContent.trim();
      if (trimmedText) {
        textArray.push(trimmedText);
      }
    }
    currentElement = currentElement.parentElement;
    depth++;
  }

  // Remove duplicates
  textArray = [...new Set(textArray)];

  // Filter out unwanted phrases and words
  textArray = textArray.filter(
    (text) =>
      !text.toLowerCase().includes("post on page") &&
      !text.toLowerCase().includes("facebook") &&
      !text.toLowerCase().includes("tahir") &&
      !text.toLowerCase().includes("reaction") &&
      !text.toLowerCase().includes("shared") &&
      !text.toLowerCase().includes("uploads") &&
      !text.toLowerCase().includes("groups")
  );

  // Join the array elements into a single string
  return textArray.join(" ");
}

function captureAndSendPost(img) {
  try {
    const imageUrl = img.src;
    let caption = getTextFromParents(img);

    console.log("Captured post:", { imageUrl, caption });

    chrome.runtime.sendMessage(
      {
        action: "sendToExtensionB",
        data: { imageUrl, caption },
      },
      (response) => {
        if (response && response.success) {
          alert("Post captured and will be shared!");
        } else {
          alert(
            response.message || "Failed to capture post. Please try again."
          );
        }
      }
    );
  } catch (error) {
    console.error("Error capturing post:", error);
    alert(
      "An error occurred while capturing the post. Please try again." + error
    );
  }
}

function injectPostButtons() {
  const images = document.querySelectorAll('img[src^="https://scontent"]');
  console.log(`Found ${images.length} relevant images`);

  images.forEach((img, index) => {
    const parent = img.parentElement;
    if (parent && !parent.querySelector(".repost-button")) {
      const button = document.createElement("button");
      button.textContent = "Post on Page";
      button.className = "repost-button";

      button.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();

        // if (!isExtensionActive && !isPostingTab) {
        //   alert("Please activate the extension by clicking its icon first.");
        //   return;
        // }

        captureAndSendPost(img);
      });

      // Insert the button after the image
      if (img.nextSibling) {
        parent.insertBefore(button, img.nextSibling);
      } else {
        parent.appendChild(button);
      }
    }
  });

  // Update styles for all buttons
  updateButtonStyles();
}

// Run the injection when the page loads and periodically
injectPostButtons();
setInterval(injectPostButtons, 3000);

// Optional: Add mutation observer to handle dynamically loaded content
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.addedNodes.length) {
      injectPostButtons();
    }
  });
});

// Start observing the document with the configured parameters
observer.observe(document.body, {
  childList: true,
  subtree: true,
});
