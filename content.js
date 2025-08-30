const SELECTORS = {
    post: 'div:has(> div.fie-impression-container)',
    content: 'div.feed-shared-update-v2__description',
    header: 'div.relative',
    feed: 'div.scaffold-finite-scroll__content',
    dropdownbtn: 'div:has(> [aria-label="Sort order dropdown button"])',
    dropdownoptions: '.artdeco-dropdown__item',
    rightpanel: 'aside.scaffold-layout__aside',
    leftpanel: 'aside.scaffold-layout__sidebar',
    logo: '.global-nav__branding-logo',
    forbusiness: 'div.global-nav__app-launcher-menu',
    premium: 'div.premium-upsell-link',
    premium2: 'a.global-nav__secondary-premium-anchor',
    premium3: '.launchpad-v2',
    profilebutton: 'button.global-nav__primary-link-me-menu-trigger',
    profileMenu: '.global-nav__me-content',
    profileList: 'div.global-nav__me-content > div > ul > li:nth-child(2) > ul',
    chatOuter: '#messaging > div > div',
    chatAside: '#messaging > div > div > aside',
    chatFilter: 'div.msg-conversations-container__title-row',
    chatColumn: 'div.scaffold-layout__detail.msg__detail',
    chatBubble: 'div.application-outlet__overlay-container',
    chatForm: 'form.msg-form',
    chatTopbar: '#main > div > div:nth-child(1)',
    chatRecent: 'div.msg-conversations-container__header.relative',
    chatTitle: 'div.msg-cross-pillar-inbox-top-bar-wrapper__container > div > h1'
};

const HEADER_KEYWORDS = ['Promoted', 'ecommended for you', 'follows', 'follow ', 'course'];
const DELAY = 30;
const LOG_PREFIX = 'inFilter:';

let observer;
let keywords = [];
let removeSuggested;

function log(message) {
    console.log(`${LOG_PREFIX} ${message}`);
}

function incrementPostCount() {
    chrome.storage.sync.get(['totalPostsRemoved'], (data) => {
        chrome.storage.sync.set({ totalPostsRemoved: (data.totalPostsRemoved || 0) + 1 });
    });
}

function checkPost(post) {
    const contentWrapper = post.querySelector(SELECTORS.content);
    const header = post.querySelector(SELECTORS.header);
    
    if (header && HEADER_KEYWORDS.some(str => header.textContent.includes(str))) {
        log("Promoted Post removed");
        return true;
    }
    
    if (removeSuggested && header?.textContent.includes('Suggested')) {
        log("Suggested Post removed");
        return true;
    }
    
    if (contentWrapper && keywords.some(str => contentWrapper.textContent.toLowerCase().includes(str))) {
        log("Blocked-keyword Post removed");
        return true;
    }

    return false;
}

function removePosts() {
    log("Check all posts");
    
    chrome.storage.sync.get(['keywords', 'removeSuggested'], (data) => {
        keywords = (data.keywords || []).map(str => str.toLowerCase());
        removeSuggested = data.removeSuggested;

        document.querySelectorAll(SELECTORS.post).forEach(post => {
            if (checkPost(post)) {
                post.remove();
                incrementPostCount();
            }
        });

        if (observer) observer.disconnect();
        
        observer = new MutationObserver((mutations) => {
            mutations.forEach(({ addedNodes }) => {
                addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE && node.matches(SELECTORS.post) && checkPost(node)) {
                        node.remove();
                        incrementPostCount();
                    }
                });
            });
        });
        
        observer.observe(document.querySelector(SELECTORS.feed), { childList: true, subtree: true });
    });
}

function waitForElement(selector, callback, maxAttempts = 50) {
    let attempts = 0;
    
    function check() {
        const element = document.querySelector(selector);
        if (element) {
            callback(element);
        } else if (attempts < maxAttempts) {
            attempts++;
            setTimeout(check, DELAY);
        }
    }
    
    check();
}

function switchToRecent() {
    log("Switch to Recent called");
    
    waitForElement(SELECTORS.dropdownbtn, (sortButton) => {
        if (!sortButton.textContent.includes('Recent')) {
            log("Switching")

            sortButton.click();
            
            waitForElement(SELECTORS.dropdownoptions, (dropdown) => {
                document.querySelectorAll(SELECTORS.dropdownoptions)[1].click();
            });
        }
    });
}

function createStyles() {
    const hiddenSelectors = ['rightpanel', 'leftpanel', 'premium2', 'premium3', 'chatAside', 'chatFilter', 'chatTitle']
        .map(key => SELECTORS[key]).join(', ');
    
    const invisibleSelectors = ['logo', 'forbusiness', 'premium']
        .map(key => SELECTORS[key]).join(', ');
    
    return `
        ${hiddenSelectors} { display: none; }
        ${invisibleSelectors} { visibility: hidden; }
        ${SELECTORS.chatOuter} { grid-template-columns: 1fr 0; margin-top: 0; max-height: 100vh; }
        ${SELECTORS.chatColumn} { flex: 6; }
        ${SELECTORS.chatForm} { height: 180px; }
    `;
}

function addProfileMenuItems() {
    // Check if items have already been added
    waitForElement(SELECTORS.profileList, (profileList) => {
        if (profileList.hasAttribute('data-profile-items-added')) {
            return; // Items already added, skip
        }

        const profileItems = [
            { text: 'Saved items', href: 'https://www.linkedin.com/my-items/' },
            { text: 'Groups', href: 'https://www.linkedin.com/groups' },
            { text: 'Newsletter', href: 'https://www.linkedin.com/mynetwork/network-manager/newsletters' },
            { text: 'Events', href: 'https://www.linkedin.com/events' }
        ];

        profileItems.reverse().forEach(item => {
            const li = document.createElement('li');
            const a = document.createElement('a');
            a.textContent = item.text;
            a.href = item.href;
            a.className = 'global-nav__secondary-link';
            li.appendChild(a);
            profileList.insertBefore(li, profileList.firstChild);
        });

        // Mark that items have been added
        profileList.setAttribute('data-profile-items-added', 'true');
    });
}

function cleanUI() {
    log("UI clean start");
    
    if (!document.getElementById('inFilter-styles')) {
        const style = document.createElement('style');
        style.id = 'inFilter-styles';
        style.textContent = createStyles();
        document.head.appendChild(style);
    }

    const profileButton = document.querySelector(SELECTORS.profilebutton);
    if (profileButton && !profileButton.hasAttribute('data-menu-handler')) {
        profileButton.setAttribute('data-menu-handler', 'true');
        profileButton.addEventListener('click', () => setTimeout(addProfileMenuItems, 50));
    }

    const chatBubble = document.querySelector(SELECTORS.chatBubble);

    //Page Specific UI
    if (window.location.href.includes('linkedin.com/messaging')) {

        log("Message Page UI Clean");
        const sourceElement = document.querySelector(SELECTORS.chatTopbar);
        const targetElement = document.querySelector(SELECTORS.chatRecent);
        if (sourceElement && targetElement) {
            targetElement.parentNode.insertBefore(sourceElement, targetElement);
        }
        chatBubble.style.display = 'none';
    } else {
        if (chatBubble) chatBubble.style.display = 'block';
    }

    if (window.location.href.includes('linkedin.com/jobs')) {
        log("Jobs Page UI Clean");
        document.querySelector(SELECTORS.leftpanel).style.display = 'block';
    }
}


function main() {

    cleanUI();
    if (window.location.href.includes('linkedin.com/feed')) {
        switchToRecent();
        removePosts();
    }
}



// Main execution
main();

// Reload
chrome.runtime.onMessage.addListener(({ action }) => {
    if (action === 'inFilter') {
        log("Reload message received");
        main();
    }
});
