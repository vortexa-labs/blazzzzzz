"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const TWEET_SELECTOR = '[data-testid="tweet"]';
const TWEET_TEXT_SELECTOR = '[data-testid="tweetText"]';
const TWEET_MEDIA_SELECTOR = '[data-testid="tweetPhoto"] img';
const AUTHOR_NAME_SELECTOR = '[data-testid="User-Name"]';
const AUTHOR_AVATAR_SELECTOR = '[data-testid="UserAvatar-Container"] img';
const VALID_PAGES = [
    'twitter.com/home',
    'x.com/home',
    'twitter.com/token-launch',
    'x.com/token-launch'
];
let tweetSelectionMode = false;
let cleanupListeners = [];
function initializeContentScript() {
    const currentUrl = window.location.href;
    const isValidPage = VALID_PAGES.some(page => currentUrl.includes(page));
    if (isValidPage) {
        console.log('Initializing content script on:', currentUrl);
        injectCreateTokenButton();
    }
}
// Call initialize when the script loads
initializeContentScript();
// Also listen for URL changes (Twitter is a SPA)
let lastUrl = location.href;
new MutationObserver(() => {
    const currentUrl = location.href;
    if (currentUrl !== lastUrl) {
        lastUrl = currentUrl;
        initializeContentScript();
    }
}).observe(document, { subtree: true, childList: true });
function injectCreateTokenButton() {
    if (document.getElementById('blazr-create-token-btn'))
        return;
    const btn = document.createElement('button');
    btn.id = 'blazr-create-token-btn';
    btn.innerText = '🪙 Create Token';
    Object.assign(btn.style, {
        position: 'fixed',
        bottom: '32px',
        right: '32px',
        zIndex: 99999,
        background: '#FF3131',
        color: 'white',
        border: 'none',
        borderRadius: '999px',
        padding: '16px 24px',
        fontWeight: 'bold',
        fontSize: '16px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
        cursor: 'pointer',
        transition: 'background 0.2s',
    });
    btn.onmouseenter = () => btn.style.background = '#ff4646';
    btn.onmouseleave = () => btn.style.background = '#FF3131';
    btn.onclick = () => {
        console.log('Create Token button clicked');
        activateTweetSelectionMode();
    };
    document.body.appendChild(btn);
}
function activateTweetSelectionMode() {
    console.log('Activating tweet selection mode');
    tweetSelectionMode = true;
    document.body.style.cursor = 'crosshair';
    document.body.classList.add('blazr-selecting-tweet');
    const tweets = document.querySelectorAll(TWEET_SELECTOR);
    console.log('Found tweets:', tweets.length);
    // Highlight all tweets and add listeners
    tweets.forEach((tweet, index) => {
        console.log(`Setting up tweet ${index + 1}`);
        addTweetHighlight(tweet);
        const mouseenter = () => {
            console.log(`Mouse entered tweet ${index + 1}`);
            highlightTweet(tweet);
        };
        const mouseleave = () => {
            console.log(`Mouse left tweet ${index + 1}`);
            unhighlightTweet(tweet);
        };
        const click = (e) => {
            console.log(`Tweet ${index + 1} clicked`);
            onTweetClick(e, tweet);
        };
        tweet.addEventListener('mouseenter', mouseenter);
        tweet.addEventListener('mouseleave', mouseleave);
        tweet.addEventListener('click', click, true);
        cleanupListeners.push(() => {
            tweet.removeEventListener('mouseenter', mouseenter);
            tweet.removeEventListener('mouseleave', mouseleave);
            tweet.removeEventListener('click', click, true);
            tweet.style.outline = '';
            tweet.style.transform = '';
        });
    });
}
function highlightTweet(tweet) {
    tweet.style.outline = '2px solid #FF3131';
    tweet.style.transform = 'scale(1.01)';
}
function unhighlightTweet(tweet) {
    tweet.style.outline = '';
    tweet.style.transform = '';
}
function onTweetClick(e, tweet) {
    console.log('onTweetClick called, tweetSelectionMode:', tweetSelectionMode);
    if (!tweetSelectionMode) {
        console.log('Tweet selection mode is off, ignoring click');
        return;
    }
    e.preventDefault();
    e.stopPropagation();
    tweetSelectionMode = false;
    cleanupTweetSelection();
    // Show loading state
    tweet.style.opacity = '0.7';
    const tweetData = extractTweetData(tweet);
    console.log('Extracted tweet data:', tweetData);
    // Send to background/sidepanel for OpenAI processing and form prefill
    chrome.runtime.sendMessage({
        type: 'TWEET_SELECTED',
        data: tweetData
    }, (response) => {
        console.log('Message sent to background script, response:', response);
    });
    setTimeout(() => { tweet.style.opacity = '1'; }, 1000);
}
function cleanupTweetSelection() {
    document.body.classList.remove('blazr-selecting-tweet');
    document.body.style.cursor = '';
    cleanupListeners.forEach(fn => fn());
    cleanupListeners = [];
}
const addTweetHighlight = (tweet) => {
    tweet.style.transition = 'all 0.2s ease';
    tweet.style.cursor = 'pointer';
    tweet.style.border = '2px solid transparent';
    tweet.style.borderRadius = '12px';
};
const extractTweetData = (tweetElement) => {
    var _a, _b, _c;
    const text = ((_a = tweetElement.querySelector(TWEET_TEXT_SELECTOR)) === null || _a === void 0 ? void 0 : _a.textContent) || '';
    const mediaElements = tweetElement.querySelectorAll(TWEET_MEDIA_SELECTOR);
    // Only use the first image for the token image
    const mediaUrls = mediaElements.length > 0 ? [mediaElements[0].src] : [];
    const authorName = ((_b = tweetElement.querySelector(AUTHOR_NAME_SELECTOR)) === null || _b === void 0 ? void 0 : _b.textContent) || '';
    const authorAvatar = ((_c = tweetElement.querySelector(AUTHOR_AVATAR_SELECTOR)) === null || _c === void 0 ? void 0 : _c.src) || '';
    // Try to construct the tweet's direct URL
    let tweetUrl = window.location.href;
    const anchor = tweetElement.querySelector('a[href*="/status/"]');
    if (anchor) {
        const base = anchor.getAttribute('href');
        if (base && base.startsWith('/')) {
            tweetUrl = `https://twitter.com${base}`;
        }
    }
    return {
        text,
        mediaUrls,
        tweetUrl,
        authorName,
        authorAvatar
    };
};
// Listen for extension message to activate tweet selection
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Content script received message:', message);
    if (message.type === 'ACTIVATE_TWEET_SELECTION') {
        activateTweetSelectionMode();
    }
});
function handleTweetClick(event) {
    var _a, _b, _c;
    console.log('Tweet clicked, extracting data...');
    const tweetElement = event.target.closest('article');
    if (!tweetElement) {
        console.log('No tweet element found');
        return;
    }
    // Extract tweet data
    const tweetText = ((_a = tweetElement.querySelector('[data-testid="tweetText"]')) === null || _a === void 0 ? void 0 : _a.textContent) || '';
    const authorName = ((_b = tweetElement.querySelector('[data-testid="User-Name"]')) === null || _b === void 0 ? void 0 : _b.textContent) || '';
    const authorAvatar = ((_c = tweetElement.querySelector('img[alt*="profile"]')) === null || _c === void 0 ? void 0 : _c.getAttribute('src')) || '';
    const mediaUrls = Array.from(tweetElement.querySelectorAll('img[src*="pbs.twimg.com/media"]'))
        .map(img => img.getAttribute('src'))
        .filter((src) => src !== null);
    const tweetUrl = window.location.href;
    console.log('Extracted tweet data:', {
        text: tweetText.substring(0, 50) + '...',
        authorName,
        hasAvatar: !!authorAvatar,
        mediaCount: mediaUrls.length,
        tweetUrl
    });
    // Send data to background script
    chrome.runtime.sendMessage({
        type: 'TWEET_SELECTED',
        data: {
            text: tweetText,
            mediaUrls,
            tweetUrl,
            authorName,
            authorAvatar
        }
    }, response => {
        console.log('Received response from background script:', response);
    });
}
