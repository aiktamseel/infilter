// Send message when URL changes and is Linkedin homepage
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url && tab.url.includes("linkedin.com/feed")) {
        chrome.tabs.sendMessage(tabId, {action: "removePosts"});
    }
});