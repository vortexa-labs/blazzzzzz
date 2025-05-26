import { TokenFormData } from './types/token';
import { API_ENDPOINTS } from './config/api';
import { logger } from './utils/logger';

interface Message {
  type: string;
  data: any; // Accept raw tweet data
  action?: string; // Allow optional action property for sidepanel open
}

// Set sidepanel options once on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setOptions({
    path: 'sidepanel.html',
    enabled: true
  });
});

async function openSidePanel() {
  try {
    const window = await chrome.windows.getCurrent();
    if (window.id) {
      await chrome.sidePanel.open({ windowId: window.id });
    } else {
      throw new Error('No window ID available');
    }
  } catch (err) {
    logger.error('Failed to open side panel:', err);
  }
}

// Helper function to make API requests
async function makeApiRequest(endpoint: string, method: string, data?: any) {
  const response = await fetch(`https://blazzzzzz-111.onrender.com${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: data ? JSON.stringify(data) : undefined,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API request failed: ${response.status} ${errorText}`);
  }

  return response.json();
}

chrome.runtime.onMessage.addListener((message: Message, sender, sendResponse) => {
  if (message.type === 'GET_TOKEN_ACCOUNTS') {
    makeApiRequest('/api/rpc/token-accounts', 'POST', message.data)
      .then(data => {
        sendResponse({ success: true, data });
      })
      .catch(error => {
        logger.error('Token accounts fetch error:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }

  if (message.type === 'FORWARD_ACTIVATE_TWEET_SELECTION') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (tab && tab.id) {
        chrome.tabs.sendMessage(tab.id, { type: 'ACTIVATE_TWEET_SELECTION' });
      }
    });
    sendResponse({ success: true });
    return true;
  }

  if (message.type === 'TWEET_SELECTED') {
    // Set preloader state in storage
    chrome.storage.local.set({ sidepanelState: { loading: true, navigate: false } });
    
    makeApiRequest('/api/generate-token-metadata', 'POST', message.data)
      .then(async (response: any) => {
        // Map the response to use twitterUrl as the twitter field
        const tokenData: Partial<TokenFormData> = {
          ...response,
          twitter: response.twitterUrl || response.twitter || ''  // Use twitterUrl as the twitter field
        };
        
        chrome.storage.local.set({ tokenData }, async () => {
          await openSidePanel();
          // Set navigation state in storage
          chrome.storage.local.set({ sidepanelState: { loading: false, navigate: true } });
          sendResponse({ success: true, tokenData });
        });
      })
      .catch(err => {
        logger.error('Failed to generate token metadata:', err);
        logger.error('Error details:', {
          message: err.message,
          stack: err.stack,
          type: err.name
        });
        chrome.storage.local.set({ sidepanelState: { loading: false, navigate: false } });
        sendResponse({ success: false, error: err.message });
      });
    return true;
  }

  if (message.action === "openSidePanel") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.sidePanel.open({ tabId: tabs[0].id }, () => {
          if (chrome.runtime.lastError) {
            logger.error("Failed to open side panel:", chrome.runtime.lastError.message);
          } else {
            logger.log("Side panel opened");
            // Try to close the popup window if sender is a popup
            if (sender && sender.tab && sender.tab.windowId) {
              chrome.windows.remove(sender.tab.windowId);
            }
          }
        });
      }
    });
  }
}); 