import './index.css';
import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { WalletStorage } from './types';
import Home from './pages/Home';
import LaunchToken from './pages/LaunchToken';
import Portfolio from './pages/Portfolio';
import Swap from './pages/Swap';
import Wallet from './pages/Wallet';
import Send from './pages/Send';
import BottomNav from './components/BottomNav';
import { createRoot } from 'react-dom/client';
import Settings from './pages/Settings';
import { SessionProvider } from './context/SessionContext';

// @ts-ignore
// eslint-disable-next-line no-var
var chrome: any;

const SidepanelNavHandler: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
      function handleStorageChange(changes: any, area: string) {
        if (area === 'local' && changes.sidepanelState) {
          const newState = changes.sidepanelState.newValue;
          if (newState.loading) {
            setLoading(true);
          } else {
            setLoading(false);
          }
          if (newState.navigate) {
            setLoading(false);
            navigate('/launch');
            // Reset navigate flag so it doesn't trigger again
            chrome.storage.local.set({ sidepanelState: { loading: false, navigate: false } });
          }
        }
      }
      chrome.storage.onChanged.addListener(handleStorageChange);
      // On mount, check current state
      chrome.storage.local.get(['sidepanelState'], (result: any) => {
        if (result.sidepanelState) {
          const newState = result.sidepanelState;
          if (newState.loading) setLoading(true);
          if (newState.navigate) {
            setLoading(false);
            navigate('/launch');
            chrome.storage.local.set({ sidepanelState: { loading: false, navigate: false } });
          }
        }
      });
      return () => chrome.storage.onChanged.removeListener(handleStorageChange);
    }
  }, [navigate]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0f0f0f] text-white">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-[#FF3131] mb-4"></div>
        <div className="text-lg font-bold">Preparing Launch Form...</div>
      </div>
    );
  }
  return null;
};

const Sidepanel: React.FC = () => {
  const [wallet, setWallet] = useState<WalletStorage | null>(null);

  useEffect(() => {
    // Load wallet data when component mounts
    const loadWallet = async () => {
      const storedWallet = await getWalletFromStorage();
      setWallet(storedWallet);
    };
    loadWallet();
  }, []);

  const getWalletFromStorage = async (): Promise<WalletStorage> => {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      return await new Promise<WalletStorage>(resolve => {
        chrome.storage.local.get(['blazr_wallet', 'blazr_api_key'], resolve);
      });
    } else {
      const val = localStorage.getItem('blazr_wallet');
      const apiKey = localStorage.getItem('blazr_api_key');
      return {
        blazr_wallet: val ? JSON.parse(val) : undefined,
        blazr_api_key: apiKey || undefined
      };
    }
  };

  const handlePinToSidebar = async () => {
    try {
      if (typeof chrome !== 'undefined' && chrome?.sidePanel?.setOptions && chrome?.sidePanel?.open) {
        await chrome.sidePanel.setOptions({
          path: 'sidepanel.html',
          enabled: true
        });
        await chrome.sidePanel.open(); // No arguments!
      } else {
        console.warn('Side panel API not available in this context.');
      }
    } catch (error) {
      console.error('Failed to open side panel:', error);
    }
  };

  return (
    <Router>
      <SidepanelNavHandler />
      <div className="bg-[#0f0f0f] min-h-screen flex flex-col font-sans text-white w-full max-w-full overflow-x-hidden" style={{minHeight: '100vh'}}>
        <div className="flex-1 pb-16 w-full max-w-full overflow-x-hidden">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/launch" element={<LaunchToken />} />
            <Route path="/portfolio" element={<Portfolio />} />
            <Route path="/swap" element={<Swap />} />
            <Route path="/wallet" element={<Wallet />} />
            <Route path="/send" element={<Send />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Home />} />
          </Routes>
        </div>
        <BottomNav />
      </div>
    </Router>
  );
};

// Mount the Sidepanel component to the #root div
const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <SessionProvider>
      <Sidepanel />
    </SessionProvider>
  );
}

export default Sidepanel; 