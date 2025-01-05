// Send message when URL changes and is Linkedin homepage
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.url && changeInfo.url.includes("linkedin.com/feed")) {
        chrome.tabs.sendMessage(tabId, {action: "removePosts"});
    }
    else if (changeInfo.url && changeInfo.url.includes("linkedin.com/messaging")) {
        chrome.tabs.sendMessage(tabId, {action: "tidyChat"});
    }
});