let observer;
let keywords = [];
let headerKeywords = ['Promoted', 'ecommended for you', 'follows', 'follow ']
let removeSuggested;

// Set element selectors
const SELECTORS = {
    post: 'div:has(> div.fie-impression-container)',
    content: 'div.feed-shared-update-v2__description-wrapper',
    header: 'div.relative',
    feed: 'div.scaffold-finite-scroll__content',
    ad_iframe: 'section.ad-banner-container',
    sticky: 'div.scaffold-layout__sticky.scaffold-layout__sticky--is-active.scaffold-layout__sticky--lg',
    chatOuter: '#messaging > div > div',
    chatAside: '#messaging > div > div > aside',
    chatFilter: 'div.msg-conversations-container__title-row',
    chatColumn: 'div.scaffold-layout__detail.msg__detail',
    chatBubble: 'body > div.application-outlet > div.application-outlet__overlay-container',
    chatForm: 'form.msg-form',
    chatTopbar: '#main > div > div:nth-child(1)',
    chatRecent: 'div.msg-conversations-container__header.relative',
    chatTitle: 'div.msg-cross-pillar-inbox-top-bar-wrapper__container > div > h1'
};

// Check if post meets removal criteria
function checkPost(post) {
    const contentWrapper = post.querySelector(SELECTORS.content);
    const header = post.querySelector(SELECTORS.header);
    // Detect promoted/ recommended for you/ suggested posts
    if (header && headerKeywords.some(str => header.textContent.includes(str))) {
        console.log("inFilter: Promoted Post removed");
        return true;
    }
    // Detect suggested posts if opted for
    if (removeSuggested && header && header.textContent.includes('Suggested')) {
        console.log("inFilter: Suggested Post removed");
        return true;
    }
    // Detect posts with blocked keywords
    if (contentWrapper && keywords.some(str => contentWrapper.textContent.toLowerCase().includes(str))) {
        console.log("inFilter: Blocked-keyword Post removed");
        return true;
    }

    return false;
}

// Dynamically remove all posts returning true checkPost()
function removePosts() {
    console.log("inFilter: Check all posts")
    chrome.storage.sync.get(['keywords', 'removeSuggested'], function(data) {
        keywords = (data.keywords || []).map(str => str.toLowerCase());

        // Set removeSuggested var based on settings
        removeSuggested = data.removeSuggested;

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
    
    // Cleaner UI
    setTimeout(function() {
        //Remove Ad iframe
        document.querySelector(SELECTORS.ad_iframe)?.remove();
        // Make footer un-sticky
        document.querySelector(SELECTORS.sticky).className = "";
    }, 4000);

}

function tidyChat() {
    console.log("Tidy Run")

    Object.assign(document.querySelector(SELECTORS.chatOuter).style, {
        gridTemplateColumns : '1fr 0',
        marginTop: '0',
        maxHeight: '100vh'
      });

    document.querySelector(SELECTORS.chatAside).style.display = 'none';
    document.querySelector(SELECTORS.chatFilter).style.display = 'none';
    document.querySelector(SELECTORS.chatBubble).style.display = 'none';
    document.querySelector(SELECTORS.chatColumn).style.flex = '6';
    document.querySelector(SELECTORS.chatForm).style.height = '180px';

    const sourceElement = document.querySelector(SELECTORS.chatTopbar);
    const targetElement = document.querySelector(SELECTORS.chatRecent);
    targetElement.parentNode.insertBefore(sourceElement, targetElement);

    document.querySelector(SELECTORS.chatTitle).style.display = 'none';
   
}


// Run main post check and remove function
if (window.location.href.includes('linkedin.com/feed')) {
    removePosts()
}

// Clean chat on Messaging page
window.addEventListener('load', () => {
    if (window.location.href.includes('linkedin.com/messaging')) {
        setTimeout(tidyChat, 9000);
    }
});


// Re-run main function when message received
chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'removePosts') {
        removePosts();
    }
    else if (message.action === 'tidyChat') {
        tidyChat();
    }
});
