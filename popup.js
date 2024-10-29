document.getElementById('injectBtn').addEventListener('click', () => {
  chrome.runtime.sendMessage({action: "injectPostScript"}, response => {
    if (response.success) {
      alert('Post script injected. Waiting for posts...');
    }
  });
});