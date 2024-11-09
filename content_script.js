console.log('FB Post Sender content script loaded');

function injectPostButtons() {
  // console.log('Attempting to inject buttons');
  const images = document.querySelectorAll('img[src^="https://scontent"]');
  console.log(`Found ${images.length} relevant images`);

  images.forEach((img, index) => {
    const parent = img.parentElement;
    if (parent && !parent.querySelector('.repost-button')) {
      const button = document.createElement('button');
      button.textContent = 'Post on Page';
      button.className = 'repost-button';
      button.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
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
  print ('text ArrayXXX',textArray)
  // Filter out unwanted phrases and words
  textArray = textArray.filter(text => 
    !text.toLowerCase().includes('post on page') &&
    !text.toLowerCase().includes('facebook') &&
    !text.toLowerCase().includes('tahir') &&
    !text.toLowerCase().includes('reaction') &&
    !text.toLowerCase().includes('shared') &&
    !text.toLowerCase().includes('uploads')&&
    !text.toLowerCase().includes('groups')
  );

  // Join the array elements into a single string
  return textArray.join(' ');
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
          alert("Post captured successfully!");
        } else {
          alert("Failed to capture post. Please try again.");
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
// Run the injection when the page loads and periodically
injectPostButtons();
setInterval(injectPostButtons, 3000);  // Check for new posts every 5 seconds

