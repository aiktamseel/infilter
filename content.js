// Set element selectors
const SELECTORS = {
    post: 'div:has(> div#fie-impression-container)',
    content: 'div.feed-shared-update-v2__description-wrapper',
    header: 'div.relative'
};

// Check if post meets removal criteria
function checkPost(post, keywords) {
    const contentWrapper = post.querySelector(SELECTORS.content);
    const header = post.querySelector(SELECTORS.header);
  
    if (contentWrapper && keywords.content.some(keyword => contentWrapper.textContent.toLowerCase().includes(keyword.toLowerCase()))) {
        return true;
    }
    if (header && keywords.header.some(keyword => header.textContent.toLowerCase().includes(keyword.toLowerCase()))) {
        return true;
    }
  
    return false;
}

// Remove all posts returning true checkPost()
function removePosts() {
    chrome.storage.sync.get(['content', 'header'], function(data) {
        const keywords = {
            content: data.content || [],
            header: data.header || []
        };
        const posts = document.querySelectorAll(SELECTORS.post);
        posts.forEach(post => {
            if (checkPost(post, keywords)) {
            post.remove();
            }
        });
    });
}
  
// Initial removal
removePosts();
  
// Set up a MutationObserver to watch for new posts
const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
        if (mutation.type === 'childList') {
            removePosts();
      }
    });
  });
  
// Start observing the document with the configured parameters
observer.observe(document.body, { childList: true, subtree: true });
  
// Remove posts when message received from the popup script
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === "removePosts") {
        removePosts();
    }
  });