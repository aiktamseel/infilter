const SELECTORS = {
    post: 'div:has(> div.fie-impression-container)',
    content: 'div.feed-shared-update-v2__description',
    header: 'div.relative',
    feed: 'div.scaffold-finite-scroll--finite',
    postTextBox: '.share-box-feed-entry__top-bar > button',
    postTextField: '.ql-editor',
    postButton: 'button.share-actions__primary-action',
    postLinkClose: '.share-creation-state__preview-container-btn',
    // postConfirmation: '.sharing-nba-framework__toast-v2 > div',
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


const SHARENUDGE = (postnum) => `
<div style="margin: 2.5rem; font-size: 1.4rem;">
  <p style="margin-bottom: 1.5rem; font-size: inherit">
    You have removed ${postnum} unwanted posts thanks to inFilter. Why not share this awesome extension with your connections?
  </p>
  <div style="text-align: center;">
    <button class="artdeco-button" data-action="inFilterShare" style="font-size: inherit">Share on Linkedin</button>
  </div>
</div>
`;

const SHARETEXT = (postnum) => `<p>Ever feel like your feed shows you more ads than actual content?</p><p>Or that you’re scrolling past things you’d never want to see in the first place? 👀</p><p><br></p><p>I came across a Chrome extension called inFilter that fixes exactly that:</p><p><br></p><p>&gt; Removes promoted posts 🚫</p><p>&gt; Lets you hide posts with specific keywords 🔑</p><p>&gt; Simplifies the UI for a distraction-free experience 👌</p><p><br></p><p>So far, I have saved ~${Math.round(postnum*0.23)} minutes and removed ${postnum} unwanted posts.</p><p><br></p><p>Sharing in case it helps others too:&nbsp;</p><p>https://chromewebstore.google.com/detail/infilter/lmlhegmkjkkeigpmgfgbdfdgpcocapeg</p><p><br></p><p><br></p><p><strong class="ql-hashtag" data-test-ql-hashtag="true">#productivity</strong> <strong class="ql-hashtag" data-test-ql-hashtag="true">#tools</strong> <strong class="ql-hashtag" data-test-ql-hashtag="true">#inFilter</strong></p>`;


const HEADER_KEYWORDS = ['ecommended for you', 'follows', 'follow ', 'course'];

let observer;
let keywords = [];
let autoSort;
let minimalTheme;
let removeRecommended;
let removeSuggested;
let totalPostsRemoved;
let sessionPostsRemoved = 0;

let sharedOnLinkedin;
let shareTotalPostLimit = 50;
let shareSessionPostLimit = 6;
let shareEveryNthPost = 4;
let shareEveryNthPostSortOn = 4;
let shareEveryNthPostSortOff = 12;

let removeQueue = Promise.resolve();


// Print timestamped logs
function log(...messages) {
    console.log(`inFilter: ${messages.join(' ')} [${(Date.now() / 1000).toFixed(3)}s]`);
}

// Fetch settings from chrome storage & load to local vars
function refreshSettings() {
    return new Promise((resolve) => {
        chrome.storage.sync.get(['keywords', 'autoSort', 'minimalTheme', 'removeRecommended', 'removeSuggested', 'totalPostsRemoved', 'sharedOnLinkedin'], (data) => {
            keywords = (data.keywords || []).map(str => str.toLowerCase());
            autoSort = data.autoSort !== undefined ? data.autoSort : true;
            minimalTheme = data.minimalTheme !== undefined ? data.minimalTheme : true;
            removeRecommended = data.removeRecommended !== undefined ? data.removeRecommended : true;
            removeSuggested = data.removeSuggested !== undefined ? data.removeSuggested : true;
            totalPostsRemoved = data.totalPostsRemoved || 0;
            sharedOnLinkedin = data.sharedOnLinkedin;
            
            if (autoSort) shareEveryNthPost = shareEveryNthPostSortOn; else shareEveryNthPost = shareEveryNthPostSortOff;

            resolve();
            log('autoSort =', autoSort);
            log('minimalTheme =', minimalTheme);
            log('removeRecommended =', removeRecommended);
            log('removeSuggested =', removeSuggested);
        });
    });
}

// Remove feed element (or replace with share nudge)
function removeElement(element) {
    removeQueue = removeQueue.then(() => {
        return new Promise((resolve) => {
            if (totalPostsRemoved < shareTotalPostLimit || sharedOnLinkedin ||
                 sessionPostsRemoved < shareSessionPostLimit || sessionPostsRemoved % shareEveryNthPost !== 0) {
                element.remove();
                totalPostsRemoved++;
                sessionPostsRemoved++;
                log("Post removed. #", sessionPostsRemoved);
                chrome.storage.sync.set({ totalPostsRemoved: totalPostsRemoved }, resolve);
            } else {
                element.innerHTML = SHARENUDGE(totalPostsRemoved);
                sessionPostsRemoved++;
                log("Post removed. #", sessionPostsRemoved);
                const feedElement = document.querySelector(SELECTORS.feed);
                if (!feedElement.hasAttribute('data-infilter-share-listener')) {
                    log("Creating infilter share listener")
                    feedElement.addEventListener('click', function(e) {
                        if (e.target.dataset.action === 'inFilterShare') {
                            inFilterShare();
                        }
                    });
                    feedElement.setAttribute('data-infilter-share-listener', 'true');
                } else log("infilter share listener already exists");
                resolve();
            }
        });
    }).catch(error => {
        console.error('inFilter: Error in removeElement queue:', error);
    });
}

// Draft linkedin post when share button clicked
function inFilterShare() {
    document.querySelector(SELECTORS.postTextBox).click();
    waitForElement(SELECTORS.postTextField, (element) => {
        element.innerHTML = SHARETEXT(totalPostsRemoved);
        waitForElement(SELECTORS.postLinkClose, (closebtn) => closebtn.click());
        
        // Wait for post button and add click event listener
        waitForElement(SELECTORS.postButton, (postButton) => {
            postButton.addEventListener('click', function() {
                if (document.querySelector(SELECTORS.postTextField).textContent.toLowerCase().includes('infilter')) {
                    chrome.storage.sync.set({ sharedOnLinkedin: true }, () => {
                        log("Share on Linkedin Successful");
                    });
                    sharedOnLinkedin = true;
                } else {
                    log("Share Unsuccesful - Post content doesn't include infilter: ", postText);
                }
            });
        });
    });
}

// Check if post meets removal criteria
function checkPost(post) {
    const contentWrapper = post.querySelector(SELECTORS.content);
    const header = post.querySelector(SELECTORS.header);
    
    // Always remove promoted posts
    return header?.textContent.includes('Promoted') ||
        // Remove "recommended for you" if flag is set and post header includes HEADER_KEYWORDS
        (removeRecommended && header && HEADER_KEYWORDS.some(str => header.textContent.includes(str))) ||
        // Remove suggested if flag is set
        (removeSuggested && header?.textContent.includes('Suggested')) ||
        // Remove if post content includes blocked keywords
        (contentWrapper && keywords.some(str => contentWrapper.textContent.toLowerCase().includes(str)));
}

// Check all posts and observe new loading posts
function removePosts() {
    log("Check all posts");
    
    // Check existing posts
    document.querySelectorAll(SELECTORS.post).forEach(post => {
        if (checkPost(post)) removeElement(post);
    });

    // Observe new loading posts
    if (observer) observer.disconnect();
    observer = new MutationObserver((mutations) => {
        mutations.forEach(({ addedNodes }) => {
            addedNodes.forEach(node => {
                if (node.nodeType === Node.ELEMENT_NODE && node.matches(SELECTORS.post) && checkPost(node)) {
                    removeElement(node);
                }
            });
        });
    });
    observer.observe(document.querySelector(SELECTORS.feed), { childList: true, subtree: true });

}

function waitForElement(selector, callback, maxAttempts = 200, delay = 30) {
    let attempts = 0;
    
    function check() {
        const element = document.querySelector(selector);
        if (element) {
            log(selector, "found in attempt:", attempts);
            callback(element);
        } else if (attempts < maxAttempts) {
            attempts++;
            setTimeout(check, delay);
        } else {
            log("Error -", selector, "not found.")
        }
    }
    
    check();
}

// Auto sort by Recent
function switchToRecent() {
    log("Switching to Recent");
    waitForElement(SELECTORS.dropdownbtn, (sortButton) => {
        if (!sortButton.textContent.includes('Recent')) {
            
            sortButton.click();
            
            waitForElement(SELECTORS.dropdownoptions, () => {
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


async function main() {
    await refreshSettings();
    
    if (minimalTheme) {
        cleanUI()
    } else {
        document.getElementById('inFilter-styles')?.remove()
    }

    if (window.location.href.includes('linkedin.com/feed')) {
        if (autoSort) switchToRecent();
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
