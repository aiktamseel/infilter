document.addEventListener('DOMContentLoaded', function() {
    const contentTextarea = document.getElementById('content');
    const interactorTextarea = document.getElementById('interactor');
    const saveButton = document.getElementById('saveKeywords');
    const statusDiv = document.getElementById('status');
  
    // Load saved settings
    chrome.storage.sync.get(['content', 'interactor'], function(data) {
        contentTextarea.value = (data.content || []).join('\n');
        interactorTextarea.value = (data.interactor || []).join('\n');
    });
  
    // Save settings
    saveButton.addEventListener('click', function() {
        let settings = {
            content: contentTextarea.value.split('\n').filter(k => k.trim() !== ''),
            interactor: interactorTextarea.value.split('\n').filter(k => k.trim() !== ''),
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