// Send message when URL changes and is Linkedin homepage
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.url && changeInfo.url.includes("linkedin.com/")) {
        chrome.tabs.sendMessage(tabId, {action: "inFilter"});
    }
});