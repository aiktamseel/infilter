document.addEventListener('DOMContentLoaded', function() {
    const keywordsTextarea = document.getElementById('keywords');
    const autoSortCheckbox = document.getElementById('autoSort');
    const minimalThemeCheckbox = document.getElementById('minimalTheme');
    const removeRecommendedCheckbox = document.getElementById('removeRecommended');
    const removeSuggestedCheckbox = document.getElementById('removeSuggested');
    const saveButton = document.getElementById('saveKeywords');
    const statusDiv = document.getElementById('status');
    const postCountSpan = document.getElementById('postCount');
  
    // Load saved settings
    chrome.storage.sync.get(['keywords', 'autoSort', 'minimalTheme', 'removeRecommended', 'removeSuggested', 'totalPostsRemoved'], function(data) {
        keywordsTextarea.value = (data.keywords || []).join('\n');
        autoSortCheckbox.checked = data.autoSort !== undefined ? data.autoSort : true;
        minimalThemeCheckbox.checked = data.minimalTheme !== undefined ? data.minimalTheme : true;
        removeRecommendedCheckbox.checked = data.removeRecommended !== undefined ? data.removeRecommended : true;
        removeSuggestedCheckbox.checked = data.removeSuggested !== undefined ? data.removeSuggested : true;
        postCountSpan.textContent = data.totalPostsRemoved || 0;
    });
  
    // Save settings
    saveButton.addEventListener('click', function() {
        let settings = {
            keywords: keywordsTextarea.value.split('\n').filter(k => k.trim() !== ''),
            autoSort: autoSortCheckbox.checked,
            minimalTheme: minimalThemeCheckbox.checked,
            removeRecommended: removeRecommendedCheckbox.checked,
            removeSuggested: removeSuggestedCheckbox.checked
          };
        chrome.storage.sync.set(settings, function() {
            statusDiv.textContent = 'Changes saved!';
            setTimeout(() => { statusDiv.textContent = ''; }, 2000);

        // Send reload infilter message
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
            var activeTab = tabs[0];
            if (activeTab && activeTab.url && activeTab.url.includes('linkedin.com/')) {
              chrome.tabs.sendMessage(activeTab.id, { action: "inFilter" });
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

    // Share button functionality
    document.getElementById('sharebtn').addEventListener('click', function() {
      navigator.share({
        title: 'inFilter - Chrome Extension for Cleaner Linkedin',
        url: 'https://chromewebstore.google.com/detail/infilter/lmlhegmkjkkeigpmgfgbdfdgpcocapeg'
      });
    });
  });
