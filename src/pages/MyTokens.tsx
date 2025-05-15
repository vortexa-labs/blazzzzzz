import React, { useState, useEffect } from 'react';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import { getWalletFromStorage } from '../utils/wallet';

interface Token {
  address: string;
  name: string;
  symbol: string;
  balance?: string;
}

const MyTokens: React.FC = () => {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [isSwapModalOpen, setIsSwapModalOpen] = useState(false);

  const fetchTokens = async () => {
    try {
      setIsLoading(true);
      const wallet = await getWalletFromStorage();
      if (!wallet?.blazr_wallet) {
        console.error('No wallet found');
        return;
      }

      const response = await fetch('http://localhost:4000/api/tokens');
      const data = await response.json();
      setTokens(data);
    } catch (error) {
      console.error('Error fetching tokens:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTokens();
  }, []);

  const handleSwap = (token: Token) => {
    setSelectedToken(token);
    setIsSwapModalOpen(true);
  };

  const handleSwapConfirm = () => {
    if (selectedToken) {
      // Open Pump Portal swap page in a new tab
      window.open(`https://pump.fun/swap?inputCurrency=SOL&outputCurrency=${selectedToken.address}`, '_blank');
      setIsSwapModalOpen(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">My Tokens</h1>
        <button
          onClick={fetchTokens}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <ArrowPathIcon className="h-5 w-5 mr-2" />
          Refresh
        </button>
      </div>

      {isLoading ? (
        <div className="text-center">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tokens.map((token) => (
            <div
              key={token.address}
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
            >
              <h2 className="text-xl font-semibold mb-2">{token.name}</h2>
              <p className="text-gray-600 mb-2">{token.symbol}</p>
              {token.balance && (
                <p className="text-gray-500 mb-4">Balance: {token.balance}</p>
              )}
              <div className="flex space-x-2">
                <button
                  onClick={() => handleSwap(token)}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
                >
                  Swap
                </button>
                <button
                  onClick={() => window.open(`https://pump.fun/token/${token.address}`, '_blank')}
                  className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300"
                >
                  Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Swap Modal */}
      {isSwapModalOpen && selectedToken && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Swap {selectedToken.symbol}</h2>
              <button 
                onClick={() => setIsSwapModalOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>
            <p className="mb-4 text-gray-600">
              You will be redirected to Pump Portal to complete the swap.
            </p>
            <button
              onClick={handleSwapConfirm}
              className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Continue to Swap
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyTokens; 