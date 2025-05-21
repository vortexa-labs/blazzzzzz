import { TokenFormData } from './types/token';
import { API_ENDPOINTS } from './config/api';

interface Message {
  type: string;
  data: any; // Accept raw tweet data
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
    console.error('Failed to open side panel:', err);
  }
}

// Helper function to make API requests
async function makeApiRequest(endpoint: string, method: string, data?: any) {
  const response = await fetch(`http://localhost:4000${endpoint}`, {
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
        console.error('Token accounts fetch error:', error);
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
      .then(async (tokenData: Partial<TokenFormData>) => {
        chrome.storage.local.set({ tokenData }, async () => {
          await openSidePanel();
          // Set navigation state in storage
          chrome.storage.local.set({ sidepanelState: { loading: false, navigate: true } });
          sendResponse({ success: true, tokenData });
        });
      })
      .catch(err => {
        console.error('Failed to generate token metadata:', err);
        console.error('Error details:', {
          message: err.message,
          stack: err.stack,
          type: err.name
        });
        chrome.storage.local.set({ sidepanelState: { loading: false, navigate: false } });
        sendResponse({ success: false, error: err.message });
      });
    return true;
  }
}); 