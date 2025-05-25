import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { TokenFormData } from './types/token';

const Popup: React.FC = () => {
  const [tokenData, setTokenData] = useState<Partial<TokenFormData>>({});

  useEffect(() => {
    // Get token data from storage
    chrome.storage.local.get(['tokenData'], (result) => {
      if (result.tokenData) {
        setTokenData(result.tokenData);
      }
    });
  }, []);

  const handlePinToSidebar = () => {
    chrome.runtime.sendMessage({ action: "openSidePanel" });
    window.close();
  };

  const handleCreateTokenFromTweet = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (tab && tab.id) {
        chrome.tabs.sendMessage(tab.id, { type: 'ACTIVATE_TWEET_SELECTION' });
      }
    });
  };

  return (
    <div style={{ width: '400px', padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>Token Launch Form</h2>
        <button
          onClick={handlePinToSidebar}
          style={{
            padding: '8px 16px',
            backgroundColor: '#FF3131',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          Open Sidepanel
        </button>
      </div>
      <button
        onClick={handleCreateTokenFromTweet}
        style={{
          width: '100%',
          padding: '10px',
          backgroundColor: '#FF3131',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer',
          marginBottom: '20px',
          fontWeight: 'bold',
          fontSize: '16px'
        }}
      >
        🪙 Create Token from Tweet
      </button>
      <form>
        <div style={{ marginBottom: '10px' }}>
          <label>Name:</label>
          <input 
            type="text" 
            value={tokenData.name || ''} 
            onChange={(e) => setTokenData({ ...tokenData, name: e.target.value })}
            style={{ width: '100%' }}
          />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label>Ticker:</label>
          <input 
            type="text" 
            value={tokenData.ticker || ''} 
            onChange={(e) => setTokenData({ ...tokenData, ticker: e.target.value })}
            style={{ width: '100%' }}
          />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label>Description:</label>
          <textarea 
            value={tokenData.description || ''} 
            onChange={(e) => setTokenData({ ...tokenData, description: e.target.value })}
            style={{ width: '100%' }}
          />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label>Image URL:</label>
          <input 
            type="text" 
            value={tokenData.image || ''} 
            onChange={(e) => setTokenData({ ...tokenData, image: e.target.value })}
            style={{ width: '100%' }}
          />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label>Website:</label>
          <input 
            type="text" 
            value={tokenData.website || ''} 
            onChange={(e) => setTokenData({ ...tokenData, website: e.target.value })}
            style={{ width: '100%' }}
          />
        </div>
        <button 
          type="submit"
          style={{
            width: '100%',
            padding: '10px',
            backgroundColor: '#FF3131',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          Launch Token
        </button>
      </form>
    </div>
  );
};

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<Popup />);
} 