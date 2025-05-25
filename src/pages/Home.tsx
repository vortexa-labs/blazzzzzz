import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '../services/wallet/hooks';
import { Cog6ToothIcon, RocketLaunchIcon, ChartBarIcon, ArrowPathIcon, BoltIcon } from '@heroicons/react/24/outline';
import BlazrLogo from '../assets/blazr-logo.png';

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

const TIPS = [
  "Create your own $DOGE in 30 seconds. Welcome to speedrun crypto.",
  "Pump smarter. Meme harder. Launch faster.",
  "No devs. No Discord. Just tokens.",
  "SOL is cheap. Your meme shouldn't be.",
  "Not financial advice. Just financial chaos.",
  "Launch now. Regret never. Tokens are free.",
  "Your favorite shitcoin could've been yours. Do it yourself."
];

const SidepanelIcon = (props: React.ComponentProps<'svg'>) => (
  <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#FF3131" {...props}>
    <rect x="3" y="4" width="18" height="16" rx="3" strokeWidth="2" stroke="#FF3131"/>
    <rect x="7" y="4" width="2" height="16" fill="#FF3131"/>
  </svg>
);

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { keypair, balance, isInitialized, refreshBalance, createNewWallet } = useWallet();
  const [tokenBalances, setTokenBalances] = useState<TokenData[]>([]);
  const [isLoadingTokens, setIsLoadingTokens] = useState(true);
  const [tip] = useState(() => TIPS[Math.floor(Math.random() * TIPS.length)]);

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

  // Calculate total USD and SOL values from tokens, fallback to balance if needed
  const totalUsdValue = Array.isArray(tokenBalances) && tokenBalances.length > 0
    ? tokenBalances.reduce((sum, t) => sum + (t.usdValue || 0), 0)
    : (typeof balance?.usd === 'number' ? balance.usd : 0);
  // Find SOL price from tokenBalances
  const solPrice = Array.isArray(tokenBalances) ? tokenBalances.find(t => t.symbol === 'SOL')?.usdPrice || 0 : 0;
  const totalSolEquivalent = solPrice > 0 ? totalUsdValue / solPrice : 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const handlePinToSidebar = () => {
    chrome.runtime.sendMessage({ action: "openSidePanel" });
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

  if (isLoadingTokens) {
    return (
      <div className="flex flex-col min-h-[500px] w-full max-w-full overflow-x-hidden items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#FF3131]"></div>
      </div>
    );
  }

  if (!keypair) {
    return (
      <div className="flex flex-col min-h-[500px] w-full max-w-full overflow-x-hidden">
        <div className="flex items-center justify-between mb-4 mt-2">
          <img src={BlazrLogo} alt="Blazr Logo" className="h-12 w-auto" style={{ height: 48 }} />
          <div className="flex items-center gap-2">
            <button
              className="p-2 rounded-full hover:bg-[#181818] transition-colors"
              title="Open Sidepanel"
              onClick={() => {
                chrome.runtime.sendMessage({ action: "openSidePanel" });
                window.close && window.close();
              }}
            >
              <SidepanelIcon className="w-6 h-6" />
            </button>
            <button
              className="p-2 rounded-full hover:bg-[#181818] transition-colors"
              title="Create Token from Tweet"
              onClick={() => {
                if (chrome?.runtime?.id) {
                  chrome.runtime.sendMessage({ type: 'FORWARD_ACTIVATE_TWEET_SELECTION' });
                }
              }}
            >
              <BoltIcon className="w-6 h-6 text-[#FF3131]" />
            </button>
            <button
              className="p-2 rounded-full hover:bg-[#181818] transition-colors"
              title="Settings"
              onClick={() => navigate('/settings')}
            >
              <Cog6ToothIcon className="w-6 h-6 text-[#FF3131]" />
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
    <div className="flex flex-col min-h-[500px] w-full max-w-full bg-[#0f0f0f] text-white p-4" style={{ maxWidth: 400, margin: '0 auto' }}>
      {/* Header: Logo left, icons right */}
      <div className="flex items-center justify-between mb-4 mt-2">
        <img src={BlazrLogo} alt="Blazr Logo" className="h-12 w-auto" style={{ height: 48 }} />
        <div className="flex items-center gap-2">
          <button
            className="p-2 rounded-full hover:bg-[#181818] transition-colors"
            title="Open Sidepanel"
            onClick={() => {
              chrome.runtime.sendMessage({ action: "openSidePanel" });
              window.close && window.close();
            }}
          >
            <SidepanelIcon className="w-6 h-6" />
          </button>
          <button
            className="p-2 rounded-full hover:bg-[#181818] transition-colors"
            title="Create Token from Tweet"
            onClick={() => {
              if (chrome?.runtime?.id) {
                chrome.runtime.sendMessage({ type: 'FORWARD_ACTIVATE_TWEET_SELECTION' });
              }
            }}
          >
            <BoltIcon className="w-6 h-6 text-[#FF3131]" />
          </button>
          <button
            className="p-2 rounded-full hover:bg-[#181818] transition-colors"
            title="Settings"
            onClick={() => navigate('/settings')}
          >
            <Cog6ToothIcon className="w-6 h-6 text-[#FF3131]" />
          </button>
        </div>
      </div>

      {/* Large Wallet Balance */}
      <div className="flex flex-col items-center mb-6 mt-2">
        <div className="text-4xl font-extrabold text-white mb-1">{formatCurrency(totalUsdValue)}</div>
        <div className="text-base text-gray-400 font-medium">{totalSolEquivalent.toFixed(4)} SOL</div>
      </div>

      {/* Quick Action Buttons (now 4 side-by-side) */}
      <div className="flex gap-2 w-full mb-6">
        <button
          className="flex-1 bg-[#FF3131] text-white font-bold py-3 rounded-full shadow-md hover:bg-red-700 transition-all text-base"
          onClick={() => navigate('/launch')}
        >
          Launch
        </button>
        <button
          className="flex-1 bg-[#181818] text-white font-bold py-3 rounded-full shadow-md hover:bg-[#232323] transition-all text-base border border-[#232323]"
          onClick={() => navigate('/swap')}
        >
          Swap
        </button>
        <button
          className="flex-1 bg-[#181818] text-white font-bold py-3 rounded-full shadow-md hover:bg-[#232323] transition-all text-base border border-[#232323]"
          onClick={() => navigate('/send')}
        >
          Send
        </button>
        <div className="flex-1 relative">
          <button
            className="w-full bg-[#232323] text-gray-400 font-bold py-3 rounded-full shadow-md cursor-not-allowed text-base border border-[#232323]"
            disabled
          >
            Buy
          </button>
          <span className="absolute top-0.5 right-1 bg-gray-600 text-[10px] text-white px-1.5 py-0.5 rounded-full font-bold leading-none">Soon</span>
        </div>
      </div>

      {/* Tip Card */}
      <div className="bg-[#181818] rounded-xl p-4 text-center text-sm text-gray-300 shadow mb-2 min-h-[56px] flex items-center justify-center">
        {tip}
      </div>
    </div>
  );
};

export default Home; 