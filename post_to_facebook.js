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
      const textbox = await waitForElement('div[aria-label^="What\'s on your mind"][contenteditable="true"][role="textbox"]');
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
          //const postButton = await waitForElement('div[aria-label="Next"][role="button"][tabindex="0"]');
          //if (postButton) {
          //    postButton.click();
             // console.log('Clicked Post button');
             // await new Promise(resolve => setTimeout(resolve, 3000));
              //await selectPage();
              //await new Promise(resolve => setTimeout(resolve, 3000));
              //await findAndClickPostButton2();
              const postButton = await waitForElement('div[aria-label="Post"][role="button"][tabindex="0"]');
                if (postButton) {
                    postButton.click();
                    console.log('Clicked Post button');
                    console.log('POST MADE Hurray!');
                } else {
                    console.log('Could not find Post button');
                }
              break;
         // } else {
          //    console.log('Could not find Post button');
          //    await new Promise(resolve => setTimeout(resolve, 3000));
          //}
      }
  }

//   async function selectPage() {
//       const profileCheck = await waitForElement('div[aria-checked="true"][role="checkbox"][tabindex="0"]');
//       const pageCheck = await waitForElement('div[aria-checked="false"][role="checkbox"][tabindex="0"]');
//       if (profileCheck && pageCheck) {
//           profileCheck.click();
//           await new Promise(resolve => setTimeout(resolve, 1000));
//           pageCheck.click();
//           console.log('Checked and unchecked');
//       } else {
//           console.log('Could not check and uncheck');
//       }
//   }

//   async function findAndClickPostButton2() {
//       const postButton = await waitForElement('div[aria-label="Post"][role="button"][tabindex="0"]');
//       if (postButton) {
//           postButton.click();
//           console.log('Clicked Post button');
//           console.log('POST MADE Hurray!');
//       } else {
//           console.log('Could not find Post button');
//       }
//   }

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
      const dropArea = await waitForElement('div[aria-label^="What\'s on your mind"][contenteditable="true"][role="textbox"]');
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