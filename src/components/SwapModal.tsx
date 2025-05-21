import React, { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { Loader2 } from 'lucide-react';
import { useSwap } from '../services/swap/hooks';
import { SwapQuote } from '../services/swap/types';

interface SwapModalProps {
  isOpen: boolean;
  onClose: () => void;
  tokenAddress: string;
  tokenSymbol: string;
  solBalance: number | null;
}

const SwapModal: React.FC<SwapModalProps> = ({
  isOpen,
  onClose,
  tokenAddress,
  tokenSymbol,
  solBalance
}) => {
  const { isLoading, error, getQuote, performSwap } = useSwap();
  const [amount, setAmount] = useState('');
  const [currentQuote, setCurrentQuote] = useState<SwapQuote | null>(null);

  // Get quote when amount changes
  useEffect(() => {
    const fetchQuote = async () => {
      if (amount && parseFloat(amount) > 0) {
        const quote = await getQuote('SOL', tokenSymbol, parseFloat(amount));
        setCurrentQuote(quote);
      } else {
        setCurrentQuote(null);
      }
    };

    const debounceTimer = setTimeout(fetchQuote, 500);
    return () => clearTimeout(debounceTimer);
  }, [amount, tokenSymbol, getQuote]);

  const handleSwap = async () => {
    if (!amount || parseFloat(amount) <= 0) return;

    const result = await performSwap({
      publicKey: '', // TODO: Get from wallet
      action: 'buy',
      mint: tokenAddress,
      denominatedInSol: 'true',
      amount: parseFloat(amount),
      slippage: 1,
      priorityFee: 0.00005,
      pool: 'pump',
      computeUnits: 600000
    });

    if (result?.status === 'success') {
      onClose();
    }
  };

  const handleMaxAmount = () => {
    if (solBalance !== null) {
      setAmount(solBalance.toString());
    }
  };

  const isFormValid = () => {
    return amount.length > 0 && parseFloat(amount) > 0 && solBalance !== null && parseFloat(amount) <= solBalance;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-[#181818] rounded-full p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">Swap {tokenSymbol}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#2A2A2A] rounded-full transition-colors"
          >
            <XMarkIcon className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-400 mb-2">Amount</label>
          <div className="relative">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-[#1E1E1E] rounded-full p-4 pr-24 text-white focus:outline-none focus:ring-2 focus:ring-[#FF3131]"
              placeholder="0.00"
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
              <span className="text-gray-400">SOL</span>
              <button
                onClick={handleMaxAmount}
                className="text-[#FF3131] text-sm font-medium hover:text-[#ff4646] transition-colors"
              >
                MAX
              </button>
            </div>
          </div>
          <p className="text-gray-400 text-sm mt-2">
            Available: {solBalance?.toFixed(4) || '0.0000'} SOL
          </p>
        </div>

        {/* Quote Information */}
        {currentQuote && (
          <div className="space-y-2 mb-6">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Price Impact</span>
              <span className="text-green-500">{currentQuote.priceImpact}%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Network Fee</span>
              <span className="text-gray-400">~${currentQuote.networkFee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Minimum Received</span>
              <span className="text-gray-400">{currentQuote.minimumReceived.toFixed(4)} {tokenSymbol}</span>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-4 text-red-500 text-sm">
            {error}
          </div>
        )}

        <button
          onClick={handleSwap}
          disabled={!isFormValid() || isLoading}
          className={`w-full bg-[#FF3131] text-white font-bold py-4 rounded-full text-lg shadow-md transition-all ${
            !isFormValid() || isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-700'
          }`}
        >
          {isLoading ? (
            <div className="flex items-center justify-center">
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Swapping...
            </div>
          ) : (
            'Swap'
          )}
        </button>
      </div>
    </div>
  );
};

export default SwapModal; 