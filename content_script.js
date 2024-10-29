console.log('FB Post Sender and Poster content script loaded');

function injectPostButtons() {
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

    console.log('Captured post:', { imageUrl, caption });

    chrome.runtime.sendMessage({
      action: 'sendPost',
      data: { imageUrl, caption }
    }, response => {
      if (response && response.success) {
        alert('Post sent successfully!');
      } else {
        alert('Failed to send post. Please try again.');
      }
    });
  } catch (error) {
    console.error('Error capturing post:', error);
    alert('An error occurred while capturing the post. Please try again.');
  }
}

injectPostButtons();
setInterval(injectPostButtons, 3000);

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "postToFacebook") {
    window.post = request.post;
    const script = document.createElement('script');
    script.textContent = `(${postToFacebookFunction.toString()})();`;
    document.body.appendChild(script);
  }
});

function postToFacebookFunction() {
    (async function() {
        const post = window.post; // This is set by the injecting script
      
        async function waitForElement(selector, maxTries = 10, interval = 1000) {
            for (let tries = 0; tries < maxTries; tries++) {
                const element = document.querySelector(selector);
                if (element) return element;
                await new Promise(resolve => setTimeout(resolve, interval));
            }
            console.log(`Element ${selector} not found after ${maxTries} tries`);
            return null;
        }
      
        async function clickCreatePost() {
            const createPostButton = await waitForElement('div[aria-label="Create a post"]');
            if (createPostButton) {
                const buttonToClick = createPostButton.firstElementChild.children[2];
                if (buttonToClick && buttonToClick.getAttribute('role') === 'button') {
                    buttonToClick.click();
                    console.log('Clicked Create Post button');
                    await waitForPostDialog();
                } else {
                    console.log('Could not find the correct button to click');
                }
            } else {
                console.log('Create Post button not found');
            }
        }
      
        async function waitForPostDialog() {
            const textbox = await waitForElement('div[aria-label="What\'s on your mind, Tahir?"][contenteditable="true"][role="textbox"]');
            if (textbox) await clickAndTypeContent(textbox);
        }
      
        async function clickAndTypeContent(textbox) {
            textbox.click();
            console.log('Clicked on textbox');
            await simulateTyping(textbox, post.caption);
        }
      
        async function simulateTyping(element, text) {
            for (let i = 0; i < text.length; i++) {
                const event = new InputEvent('input', {
                    inputType: 'insertText',
                    data: text[i],
                    bubbles: true,
                    cancelable: true
                });
                element.dispatchEvent(event);
                element.textContent += text[i];
                await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));
            }
            console.log('Finished typing caption');
            await handleImageInsertion();
            await new Promise(resolve => setTimeout(resolve, 2000));
            await findAndClickPostButton();
        }
      
        async function findAndClickPostButton() {
            for (let i = 0; i < 3; i++) {
                const postButton = await waitForElement('div[aria-label="Next"][role="button"][tabindex="0"]');
                if (postButton) {
                    postButton.click();
                    console.log('Clicked Post button');
                    await new Promise(resolve => setTimeout(resolve, 3000));
                    await selectPage();
                    await new Promise(resolve => setTimeout(resolve, 3000));
                    await findAndClickPostButton2();
                    break;
                } else {
                    console.log('Could not find Post button');
                    await new Promise(resolve => setTimeout(resolve, 3000));
                }
            }
        }
      
        async function selectPage() {
            const profileCheck = await waitForElement('div[aria-checked="true"][role="checkbox"][tabindex="0"]');
            const pageCheck = await waitForElement('div[aria-checked="false"][role="checkbox"][tabindex="0"]');
            if (profileCheck && pageCheck) {
                profileCheck.click();
                await new Promise(resolve => setTimeout(resolve, 1000));
                pageCheck.click();
                console.log('Checked and unchecked');
            } else {
                console.log('Could not check and uncheck');
            }
        }
      
        async function findAndClickPostButton2() {
            const postButton = await waitForElement('div[aria-label="Post"][role="button"][tabindex="0"]');
            if (postButton) {
                postButton.click();
                console.log('Clicked Post button');
                console.log('POST MADE Hurray!');
            } else {
                console.log('Could not find Post button');
            }
        }
      
        async function downloadAndDropImage(imageUrl) {
            try {
                const response = await fetch(imageUrl);
                const blob = await response.blob();
                const fileName = 'image.jpg';
                const file = new File([blob], fileName, { type: blob.type });
                await simulateFileDrop(file);
            } catch (error) {
                console.error('Error downloading image:', error);
            }
        }
      
        async function simulateFileDrop(file) {
            const dropArea = await waitForElement('div[aria-label="What\'s on your mind, Tahir?"][contenteditable="true"][role="textbox"]');
            if (!dropArea) {
                console.log('Could not find post box to drop image');
                return;
            }
      
            const dt = new DataTransfer();
            dt.items.add(file);
      
            const dropEvent = new DragEvent('drop', {
                bubbles: true,
                cancelable: true,
                dataTransfer: dt
            });
      
            dropArea.dispatchEvent(dropEvent);
            console.log('File drop event dispatched');
        }
      
        async function handleImageInsertion() {
            if (post.imageUrl) {
                await downloadAndDropImage(post.imageUrl);
            } else {
                console.log('No image URL provided');
            }
        }
      
        // Start the posting process
        await clickCreatePost();
      })();
}