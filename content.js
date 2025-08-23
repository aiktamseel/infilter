let observer;
let keywords = [];
let headerKeywords = ['Promoted', 'ecommended for you', 'follows', 'follow ']
let removeSuggested;

// Set element selectors
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
    profilebutton: 'button.global-nav__primary-link-me-menu-trigger', //#ember15
    profilemenu: 'div.global-nav__me-content > div > ul > li:nth-child(2) > ul',
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
    // Switch to Recent
    function switchToRecent() {
        const sortButton = document.querySelector(SELECTORS.dropdownbtn);
        if (!sortButton) return setTimeout(switchToRecent, 100);
        
        sortButton.click();
        
        function waitForDropdown() {
            const dropdown = document.querySelector(SELECTORS.dropdownoptions);
            if (!dropdown) return setTimeout(waitForDropdown, 100);
            document.querySelectorAll(SELECTORS.dropdownoptions)[1].click();
        }
        
        setTimeout(waitForDropdown, 100);
    }
    switchToRecent();


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
    const style = document.createElement('style');
    style.textContent = ['rightpanel', 'leftpanel', 'logo', 'forbusiness', 'premium']
        .map(key => SELECTORS[key])
        .join(', ') + ' { visibility: hidden !important; }';
    document.head.appendChild(style);

    //Add buttons to Profile Menu
    const profileButton = document.querySelector(SELECTORS.profilebutton);

    if (profileButton && !profileButton.hasAttribute('data-menu-handler')) {
        profileButton.setAttribute('data-menu-handler', 'true');
        
        profileButton.addEventListener('click', function() {
            function addMenuItems() {
                setTimeout(() => {
                    const profileMenu = document.querySelector(SELECTORS.profilemenu);
                    if (!profileMenu) {
                        addMenuItems();
                        return;
                    }
                    
                    const items = [
                        { text: 'Saved items', href: 'https://www.linkedin.com/my-items/' },
                        { text: 'Groups', href: 'https://www.linkedin.com/groups' },
                        { text: 'Newsletter', href: 'https://www.linkedin.com/mynetwork/network-manager/newsletters' },
                        { text: 'Events', href: 'https://www.linkedin.com/events' }
                    ];
                    
                    items.reverse().forEach(item => {
                        const li = document.createElement('li');
                        const a = document.createElement('a');
                        a.textContent = item.text;
                        a.href = item.href;
                        a.className = 'global-nav__secondary-link';
                        li.appendChild(a);
                        profileMenu.insertBefore(li, profileMenu.firstChild);
                    });

                    // Remove Premium button
                    document.querySelector(SELECTORS.premium2).remove();

                }, 100);
            }
            
            addMenuItems();
        });
    }


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
        setTimeout(tidyChat, 1000);
    }
});


// Re-run main function when message received
chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'removePosts') {
        console.log("Remove post message recieved")
        removePosts();
    }
    else if (message.action === 'tidyChat') {
        console.log("Tidy chat message recieved")
        tidyChat();
    }
});
