let observer;
let keywords = [];

// Set element selectors
const SELECTORS = {
    post: 'div:has(> div#fie-impression-container)',
    content: 'div.feed-shared-update-v2__description-wrapper',
    header: 'div.relative'
};

// Check if post meets removal criteria
function checkPost(post) {
    const contentWrapper = post.querySelector(SELECTORS.content);
    const header = post.querySelector(SELECTORS.header);
    // Detect promoted posts
    if (header && header.textContent.includes("Promoted")) {
        console.log("inFilter: Promoted post removed");
        return true;
    }
    // Detect posts with blocked keywords
    if (contentWrapper && keywords.some(keyword => contentWrapper.textContent.toLowerCase().includes(keyword.toLowerCase()))) {
        console.log("inFilter: Blocked post removed");
        return true;
    }
  
    return false;
}

// Dynamically remove all posts returning true checkPost()
function removePosts() {
    chrome.storage.sync.get(['keywords'], function(data) {
        keywords = data.keywords || [];

        // Remove already loaded posts
        const posts = document.querySelectorAll(SELECTORS.post);
        posts.forEach(post => {
            if (checkPost(post)) {
            post.remove();
            }
        });

        // Create observer for new posts if not exists
        if (observer) {
            return;
        }
        observer = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE && node.matches(SELECTORS.post)) {
                        if (checkPost(node, keywords)) {
                            node.remove();
                        }
                    }
                });
            });
        });
        
        // Start observer
        const config = { childList: true, subtree: true };
        observer.observe(document.body, config);
    });
}
   
// Remove posts with new keywords when user changes keywords
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === "removePosts") {
        removePosts();
    }
  });


// Run main post removal script
removePosts();