import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '../services/wallet/hooks';

interface TokenData {
  mint: string;
  owner: string;
  amount: string;
  decimals: number;
  uiAmount: number;
  symbol?: string;
  name?: string;
  image?: string;
  usdPrice?: number;
  usdValue?: number;
  priceChange24h?: number;
}

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { keypair, balance, isInitialized, refreshBalance, createNewWallet } = useWallet();

  const [tokenBalances, setTokenBalances] = useState<TokenData[]>([]);
  const [isLoadingTokens, setIsLoadingTokens] = useState(true);

  useEffect(() => {
    const fetchTokens = async () => {
      if (!keypair) return;
      setIsLoadingTokens(true);
      try {
        const publicKey = keypair.publicKey.toBase58();
        const response = await new Promise<{ tokens: TokenData[] }>((resolve, reject) => {
          chrome.runtime.sendMessage(
            { type: 'GET_TOKEN_ACCOUNTS', data: { owner: publicKey } },
            (response) => {
              if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
              } else if (!response.success) {
                reject(new Error(response.error));
              } else {
                resolve(response.data);
              }
            }
          );
        });
        setTokenBalances(response.tokens as TokenData[]);
      } catch (e) {
        setTokenBalances([]);
      } finally {
        setIsLoadingTokens(false);
      }
    };
    fetchTokens();
  }, [keypair]);

  const totalUsdValue = tokenBalances.reduce((sum, t) => sum + (t.usdValue || 0), 0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  };

  const handlePinToSidebar = async () => {
    try {
      console.log('Sidepanel icon clicked. chrome.sidePanel:', chrome?.sidePanel);
      if (chrome?.sidePanel?.open) {
        await chrome.sidePanel.open();
      } else {
        console.warn('Side panel API not available in this context.');
      }
    } catch (error) {
      console.error('Failed to open side panel:', error);
    }
  };

  const handleCreateWallet = async () => {
    await createNewWallet();
    // No need to navigate, the state will update and show the dashboard
  };

  const handleCreateTokenFromTweet = () => {
    if (chrome?.runtime?.id) {
      chrome.runtime.sendMessage({ type: 'FORWARD_ACTIVATE_TWEET_SELECTION' });
    }
  };

  // Preloader always shown until initialized
  if (!isInitialized) {
    return (
      <div className="flex flex-col min-h-[500px] w-full max-w-full overflow-x-hidden">
        <div className="w-full max-w-full flex items-center justify-between px-2 py-3 bg-[#181818] border-b border-[#232323]">
          <div className="text-xl font-extrabold text-[#FF3131] tracking-tight">Blazr</div>
          <div className="flex items-center gap-2 ml-auto">
            <button
              className="p-2 hover:bg-[#232323] rounded-full"
              title="Create Token from Tweet"
              onClick={handleCreateTokenFromTweet}
            >
              {/* Custom SVG icon */}
              <img src="/blazrcreate.svg" alt="Create Token from Tweet" className="w-5 h-5" />
            </button>
            <button
              className="p-2 hover:bg-[#232323] rounded-full"
              title="Open Sidepanel"
              onClick={handlePinToSidebar}
            >
              {/* Simple sidebar icon */}
              <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="text-[#FF3131]">
                <rect x="3" y="4" width="18" height="16" rx="3" strokeWidth="2"/>
                <rect x="7" y="4" width="2" height="16" fill="#FF3131"/>
              </svg>
            </button>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center w-full max-w-full">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#FF3131]"></div>
        </div>
      </div>
    );
  }

  if (!keypair) {
    return (
      <div className="flex flex-col min-h-[500px] w-full max-w-full overflow-x-hidden">
        <div className="w-full max-w-full flex items-center justify-between px-2 py-3 bg-[#181818] border-b border-[#232323]">
          <div className="text-xl font-extrabold text-[#FF3131] tracking-tight">Blazr</div>
          <div className="flex items-center gap-2 ml-auto">
            <button
              className="p-2 hover:bg-[#232323] rounded-full"
              title="Create Token from Tweet"
              onClick={handleCreateTokenFromTweet}
            >
              {/* Custom SVG icon */}
              <img src="/blazrcreate.svg" alt="Create Token from Tweet" className="w-5 h-5" />
            </button>
            <button
              className="p-2 hover:bg-[#232323] rounded-full"
              title="Open Sidepanel"
              onClick={handlePinToSidebar}
            >
              <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="text-[#FF3131]">
                <rect x="3" y="4" width="18" height="16" rx="3" strokeWidth="2"/>
                <rect x="7" y="4" width="2" height="16" fill="#FF3131"/>
              </svg>
            </button>
          </div>
        </div>
        <div className="flex flex-col items-center px-2 pt-6 pb-20 flex-1 w-full max-w-full">
          <div className="text-4xl font-extrabold text-[#FF3131] mb-1 tracking-tight">Blazr</div>
          <div className="text-lg text-gray-400 mb-4">Create your secure Blazr wallet to get started.</div>
          <button
            onClick={handleCreateWallet}
            className="w-full bg-[#FF3131] text-white font-bold py-3 rounded-full text-lg shadow-md hover:bg-red-700 transition-all"
          >
            Create Wallet
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[500px] w-full max-w-full overflow-x-hidden">
      <div className="w-full max-w-full flex items-center justify-between px-2 py-3 bg-[#181818] border-b border-[#232323]">
        <div className="text-xl font-extrabold text-[#FF3131] tracking-tight">Blazr</div>
        <div className="flex items-center gap-2 ml-auto">
          <button
            className="p-2 hover:bg-[#232323] rounded-full"
            title="Create Token from Tweet"
            onClick={handleCreateTokenFromTweet}
          >
            {/* Custom SVG icon */}
            <img src="/blazrcreate.svg" alt="Create Token from Tweet" className="w-5 h-5" />
          </button>
          <button
            className="p-2 hover:bg-[#232323] rounded-full"
            title="Open Sidepanel"
            onClick={handlePinToSidebar}
          >
            <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="text-[#FF3131]">
              <rect x="3" y="4" width="18" height="16" rx="3" strokeWidth="2"/>
              <rect x="7" y="4" width="2" height="16" fill="#FF3131"/>
            </svg>
          </button>
        </div>
      </div>
      {/* Main content below header */}
      <div className="flex flex-col items-center px-2 pt-6 pb-20 flex-1 w-full max-w-full">
        <div className="w-full flex flex-col items-center mb-6 max-w-full">
          <div className="text-4xl font-extrabold text-[#FF3131] mb-1 tracking-tight">Blazr</div>
          <div className="text-xs text-gray-400 mb-2">
            {keypair.publicKey.toBase58().slice(0, 6)}...{keypair.publicKey.toBase58().slice(-4)}
          </div>
          <div className="text-5xl font-bold text-white mb-1 break-words w-full text-center">{formatCurrency(totalUsdValue)}</div>
          <div className="text-lg text-gray-400 mb-4">{(balance?.sol || 0).toFixed(4)} SOL</div>
        </div>
        <div className="w-full flex justify-between mb-6 flex-wrap max-w-full">
          <button 
            onClick={() => navigate('/send')}
            className="flex flex-col items-center flex-1 mx-1 min-w-[60px]"
          >
            <div className="bg-[#181818] rounded-full w-14 h-14 flex items-center justify-center mb-1 border border-[#FF3131]">
              <span className="text-[#FF3131] text-2xl">↑</span>
            </div>
            <span className="text-xs text-white">Send</span>
          </button>
          <button 
            onClick={() => navigate('/wallet')}
            className="flex flex-col items-center flex-1 mx-1 min-w-[60px]"
          >
            <div className="bg-[#181818] rounded-full w-14 h-14 flex items-center justify-center mb-1 border border-[#FF3131]">
              <span className="text-[#FF3131] text-2xl">↓</span>
            </div>
            <span className="text-xs text-white">Receive</span>
          </button>
          <button 
            onClick={() => navigate('/swap')}
            className="flex flex-col items-center flex-1 mx-1 min-w-[60px]"
          >
            <div className="bg-[#181818] rounded-full w-14 h-14 flex items-center justify-center mb-1 border border-[#FF3131]">
              <span className="text-[#FF3131] text-2xl">⟳</span>
            </div>
            <span className="text-xs text-white">Swap</span>
          </button>
          <div className="flex flex-col items-center flex-1 mx-1 min-w-[60px] relative">
            <div className="bg-[#181818] rounded-full w-14 h-14 flex items-center justify-center mb-1 border border-[#FF3131] opacity-50">
              <span className="text-[#FF3131] text-2xl">$</span>
            </div>
            <span className="text-xs text-white">Buy</span>
            <span className="absolute -top-1 -right-1 bg-[#FF3131] text-white text-[10px] px-1.5 py-0.5 rounded-full">
              Soon
            </span>
          </div>
        </div>
        <div className="w-full bg-[#181818] rounded-full p-4 flex items-center justify-between mb-6 max-w-full overflow-x-auto">
          <div className="flex items-center min-w-0">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#9945FF] to-[#14F195] flex items-center justify-center mr-3">
              {/* Solana logo placeholder */}
              <span className="text-white text-2xl font-bold">S</span>
            </div>
            <div className="min-w-0">
              <div className="font-bold text-white truncate">Solana</div>
              <div className="text-xs text-gray-400 truncate">{(balance?.sol || 0).toFixed(4)} SOL</div>
            </div>
          </div>
          <div className="text-right min-w-0">
            <div className="font-bold text-white truncate">{formatCurrency(totalUsdValue)}</div>
            <div className="text-xs text-gray-400 truncate">{formatCurrency(totalUsdValue)}</div>
          </div>
        </div>
        <div className="w-full mt-4">
          <button 
            onClick={() => navigate('/launch')}
            className="w-full bg-[#FF3131] text-white font-bold py-3 rounded-full text-lg shadow-md hover:bg-red-700 transition-all"
          >
            Launch a Token
          </button>
        </div>
        <div className="w-full mt-6 text-center text-gray-400 text-xs">
          <span>Tip: Launch your first token or receive SOL to get started!</span>
        </div>
      </div>
    </div>
  );
};

export default Home; 