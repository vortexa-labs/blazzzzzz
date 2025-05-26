import { TokenFormData } from '../types/token';
import { logger } from '../utils/logger';

interface TweetData {
  text: string;
  mediaUrls: string[];
  tweetUrl: string;
  authorName: string;
  authorAvatar: string;
}

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
let cleanupListeners: (() => void)[] = [];

function initializeContentScript() {
  const currentUrl = window.location.href;
  const isValidPage = VALID_PAGES.some(page => currentUrl.includes(page));
  
  if (isValidPage) {
    logger.log('Initializing content script on:', currentUrl);
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
  if (document.getElementById('blazr-create-token-btn')) return;
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
    logger.log('Create Token button clicked');
    activateTweetSelectionMode();
  };
  document.body.appendChild(btn);
}

function activateTweetSelectionMode() {
  logger.log('Activating tweet selection mode');
  tweetSelectionMode = true;
  document.body.style.cursor = 'crosshair';
  document.body.classList.add('blazr-selecting-tweet');
  
  const tweets = document.querySelectorAll(TWEET_SELECTOR);
  logger.log('Found tweets:', tweets.length);
  
  // Highlight all tweets and add listeners
  tweets.forEach((tweet, index) => {
    logger.log(`Setting up tweet ${index + 1}`);
    addTweetHighlight(tweet as HTMLElement);
    const mouseenter = () => {
      logger.log(`Mouse entered tweet ${index + 1}`);
      highlightTweet(tweet as HTMLElement);
    };
    const mouseleave = () => {
      logger.log(`Mouse left tweet ${index + 1}`);
      unhighlightTweet(tweet as HTMLElement);
    };
    const click = (e: Event) => {
      logger.log(`Tweet ${index + 1} clicked`);
      onTweetClick(e, tweet as HTMLElement);
    };
    tweet.addEventListener('mouseenter', mouseenter);
    tweet.addEventListener('mouseleave', mouseleave);
    tweet.addEventListener('click', click, true);
    cleanupListeners.push(() => {
      tweet.removeEventListener('mouseenter', mouseenter);
      tweet.removeEventListener('mouseleave', mouseleave);
      tweet.removeEventListener('click', click, true);
      (tweet as HTMLElement).style.outline = '';
      (tweet as HTMLElement).style.transform = '';
    });
  });
}

function highlightTweet(tweet: HTMLElement) {
  tweet.style.outline = '2px solid #FF3131';
  tweet.style.transform = 'scale(1.01)';
}
function unhighlightTweet(tweet: HTMLElement) {
  tweet.style.outline = '';
  tweet.style.transform = '';
}

function onTweetClick(e: Event, tweet: HTMLElement) {
  logger.log('onTweetClick called, tweetSelectionMode:', tweetSelectionMode);
  if (!tweetSelectionMode) {
    logger.log('Tweet selection mode is off, ignoring click');
    return;
  }
  e.preventDefault();
  e.stopPropagation();
  tweetSelectionMode = false;
  cleanupTweetSelection();
  // Show loading state
  tweet.style.opacity = '0.7';
  const tweetData = extractTweetData(tweet);
  logger.log('Extracted tweet data:', tweetData);
  // Send to background/sidepanel for OpenAI processing and form prefill
  chrome.runtime.sendMessage({
    type: 'TWEET_SELECTED',
    data: tweetData
  }, (response) => {
    logger.log('Message sent to background script, response:', response);
  });
  setTimeout(() => { tweet.style.opacity = '1'; }, 1000);
}

function cleanupTweetSelection() {
  document.body.classList.remove('blazr-selecting-tweet');
  document.body.style.cursor = '';
  cleanupListeners.forEach(fn => fn());
  cleanupListeners = [];
}

const addTweetHighlight = (tweet: HTMLElement) => {
  tweet.style.transition = 'all 0.2s ease';
  tweet.style.cursor = 'pointer';
  tweet.style.border = '2px solid transparent';
  tweet.style.borderRadius = '12px';
};

const extractTweetData = (tweetElement: HTMLElement): TweetData => {
  const text = tweetElement.querySelector(TWEET_TEXT_SELECTOR)?.textContent || '';
  const mediaElements = tweetElement.querySelectorAll(TWEET_MEDIA_SELECTOR);
  // Only use the first image for the token image
  const mediaUrls = mediaElements.length > 0 ? [(mediaElements[0] as HTMLImageElement).src] : [];
  const authorName = tweetElement.querySelector(AUTHOR_NAME_SELECTOR)?.textContent || '';
  const authorAvatar = (tweetElement.querySelector(AUTHOR_AVATAR_SELECTOR) as HTMLImageElement)?.src || '';

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
  logger.log('Content script received message:', message);
  if (message.type === 'ACTIVATE_TWEET_SELECTION') {
    activateTweetSelectionMode();
  }
});

function handleTweetClick(event: MouseEvent) {
  logger.log('Tweet clicked, extracting data...');
  const tweetElement = (event.target as HTMLElement).closest('article');
  if (!tweetElement) {
    logger.log('No tweet element found');
    return;
  }

  // Extract tweet data
  const tweetText = tweetElement.querySelector('[data-testid="tweetText"]')?.textContent || '';
  const authorName = tweetElement.querySelector('[data-testid="User-Name"]')?.textContent || '';
  const authorAvatar = tweetElement.querySelector('img[alt*="profile"]')?.getAttribute('src') || '';
  const mediaUrls = Array.from(tweetElement.querySelectorAll('img[src*="pbs.twimg.com/media"]'))
    .map(img => img.getAttribute('src'))
    .filter((src): src is string => src !== null);
  const tweetUrl = window.location.href;

  logger.log('Extracted tweet data:', {
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
    logger.log('Received response from background script:', response);
  });
}

logger.log('Twitter content script updated'); 