let observer;
let keywords = [];
let headerKeywords = ['Promoted', 'ecommended for you', 'follows', 'follow ']

// Set element selectors
const SELECTORS = {
    post: 'div:has(> div#fie-impression-container)',
    content: 'div.feed-shared-update-v2__description-wrapper',
    header: 'div.relative',
    feed: 'main.scaffold-layout__main > div.relative'
};

// Check if post meets removal criteria
function checkPost(post) {
    const contentWrapper = post.querySelector(SELECTORS.content);
    const header = post.querySelector(SELECTORS.header);
    // Detect promoted/ recommended for you/ suggested posts
    if (header && headerKeywords.some(str => header.textContent.includes(str))) {
        console.log("inFilter: Promoted post removed");
        return true;
    }
    // Detect posts with blocked keywords
    if (contentWrapper && keywords.some(str => contentWrapper.textContent.toLowerCase().includes(str))) {
        console.log("inFilter: Blocked post removed");
        return true;
    }

    return false;
}

// Dynamically remove all posts returning true checkPost()
function removePosts() {
    chrome.storage.sync.get(['keywords', 'removeSuggested'], function(data) {
        keywords = (data.keywords || []).map(str => str.toLowerCase());

        // Add/Remove 'Suggested' from headerKeywords depending on settings...
        // and whether already present in array or not
        let indexSuggested = headerKeywords.indexOf('Suggested');
        if (indexSuggested == -1 && data.removeSuggested) {
            headerKeywords.push('Suggested');
        } else if (indexSuggested > -1 && !data.removeSuggested) {
            headerKeywords.splice(indexSuggested, 1);
        }

        // Remove already loaded posts
        const posts = document.querySelectorAll(SELECTORS.post);
        posts.forEach(post => {
            if (checkPost(post)) {
            post.remove();
            }
        });

        // Create observer for new posts if not exists
        if (observer) {
            observer.disconnect();
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
        observer.observe(document.querySelector(SELECTORS.feed), config);
    });
}
   
// Run main script when message received
// (message received when linkedin feed page opens or keywords saved)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "removePosts") {
        removePosts();
    }
});
