import React, { useState, useEffect } from 'react';
import { useWallet } from '../services/wallet/hooks';
import { WalletBalance } from '../services/wallet/types';
import { ArrowPathIcon } from '@heroicons/react/24/outline';

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

interface TokenResponse {
  tokens: {
    [key: string]: TokenData;
  };
}

const Portfolio: React.FC = () => {
  const { balance, refreshBalance, keypair } = useWallet();
  const [tokenBalances, setTokenBalances] = useState<TokenData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTokens = async () => {
    if (!keypair) {
      setError('Wallet not connected');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const publicKey = keypair.publicKey.toBase58();
      
      // Fetch token accounts using the background script
      console.log('Fetching tokens for:', publicKey);
      const response = await new Promise<TokenResponse>((resolve, reject) => {
        chrome.runtime.sendMessage(
          { 
            type: 'GET_TOKEN_ACCOUNTS', 
            data: { owner: publicKey }
          },
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

      // Use backend values directly, no mock price/usdValue
      const tokenArray = Object.values(response.tokens) as TokenData[];
      setTokenBalances(tokenArray);
    } catch (error) {
      console.error('Error fetching tokens:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch tokens');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTokens();
  }, [keypair]);

  // Calculate total USD value of all tokens (including SOL)
  const totalUsdValue = tokenBalances.reduce((sum, t) => sum + (t.usdValue || 0), 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#FF3131]"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center px-4 pt-6 pb-20 min-h-[500px]">
      <div className="w-full flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Portfolio</h1>
      </div>

      <div className="w-full bg-[#181818] rounded-2xl p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <div className="text-gray-400">Total Balance</div>
        </div>
        <div className="text-3xl font-bold">
          ${totalUsdValue.toFixed(2)}
        </div>
        <div className="text-sm text-gray-400 mt-1">
          {balance?.sol.toFixed(4) || '0.0000'} SOL
        </div>
      </div>

      <div className="w-full">
        <h2 className="text-xl font-semibold mb-4">Tokens</h2>
        {error ? (
          <div className="text-red-500 text-center py-8">
            {error}
          </div>
        ) : tokenBalances.length === 0 ? (
          <div className="text-gray-400 text-center py-8">
            No tokens found
          </div>
        ) : (
          <div className="space-y-2">
            {tokenBalances.map((token) => (
              <div key={token.mint} className="bg-[#181818] rounded-xl p-4 flex items-center">
                <div className="flex items-center flex-1">
                  <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center overflow-hidden mr-3">
                    {token.image ? (
                      <img src={token.image} alt={token.symbol} className="w-full h-full object-cover" />
                    ) : (
                      <span>{token.symbol?.[0] || token.mint.slice(0, 2)}</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center">
                      <span className="font-semibold">{token.symbol || token.mint.slice(0, 4)}</span>
                      <span className="text-gray-500 text-sm ml-2">
                        {token.name || 'Unknown Token'}
                      </span>
                    </div>
                    <div className="flex items-center text-sm">
                      <span className="text-gray-400">
                        ${token.usdPrice?.toFixed(6) || '0.00'}
                      </span>
                      {token.priceChange24h && (
                        <span className={`ml-2 ${token.priceChange24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {token.priceChange24h >= 0 ? '+' : ''}{token.priceChange24h.toFixed(2)}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium">
                    {token.uiAmount.toLocaleString(undefined, { maximumFractionDigits: 6 })}
                  </div>
                  <div className="text-sm text-gray-400">
                    ${token.usdValue?.toFixed(2) || '0.00'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Portfolio; 