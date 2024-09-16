document.addEventListener('DOMContentLoaded', function() {
    const keywordsTextarea = document.getElementById('keywords');
    const removeSuggestedCheckbox = document.getElementById('removeSuggested');
    const saveButton = document.getElementById('saveKeywords');
    const statusDiv = document.getElementById('status');
  
    // Load saved settings
    chrome.storage.sync.get(['keywords', 'removeSuggested'], function(data) {
        keywordsTextarea.value = (data.keywords || []).join('\n');
        removeSuggestedCheckbox.checked = data.removeSuggested || false;
    });
  
    // Save settings
    saveButton.addEventListener('click', function() {
        let settings = {
            keywords: keywordsTextarea.value.split('\n').filter(k => k.trim() !== ''),
            removeSuggested: removeSuggestedCheckbox.checked
          };
        chrome.storage.sync.set(settings, function() {
            statusDiv.textContent = 'Changes saved!';
            setTimeout(() => { statusDiv.textContent = ''; }, 2000);

        // Send removePosts message
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
            var activeTab = tabs[0];
            if (activeTab && activeTab.url && activeTab.url.includes('linkedin.com/feed')) {
              chrome.tabs.sendMessage(activeTab.id, { action: "removePosts" });
            }
        });
      });
    });

    // Open links
    document.querySelectorAll('a').forEach(function(link) {
      link.addEventListener('click', function(e) {
        e.preventDefault(); // Prevent default action
        chrome.tabs.create({ url: this.href }); // Open link in new tab
      });
    });  
  });

