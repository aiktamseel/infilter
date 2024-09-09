document.addEventListener('DOMContentLoaded', function() {
    const keywordsTextarea = document.getElementById('keywords');
    const saveButton = document.getElementById('saveKeywords');
    const statusDiv = document.getElementById('status');
  
    // Load saved settings
    chrome.storage.sync.get(['keywords'], function(data) {
        keywordsTextarea.value = (data.keywords || []).join('\n');
    });
  
    // Save settings
    saveButton.addEventListener('click', function() {
        let settings = {
            keywords: keywordsTextarea.value.split('\n').filter(k => k.trim() !== ''),
        };
        chrome.storage.sync.set(settings, function() {
            statusDiv.textContent = 'Settings saved!';
            setTimeout(() => { statusDiv.textContent = ''; }, 2000);

        // Send removePosts message
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
            var activeTab = tabs[0];
            chrome.tabs.sendMessage(activeTab.id, { action: "removePosts" });
        });
  
      });
    });
  });

  // Open links
  document.getElementById('github').addEventListener('click', function(e) {
    e.preventDefault(); // Prevent default action
    chrome.tabs.create({ url: this.href }); // Open link in new tab
  });
  