import React, { useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface SwapModalProps {
  isOpen: boolean;
  onClose: () => void;
  tokenAddress: string;
  tokenSymbol: string;
}

const SwapModal: React.FC<SwapModalProps> = ({ isOpen, onClose, tokenAddress, tokenSymbol }) => {
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSwap = async () => {
    try {
      setIsLoading(true);
      // Open Pump Portal swap page in a new tab
      window.open(`https://pump.fun/swap?inputCurrency=SOL&outputCurrency=${tokenAddress}`, '_blank');
      onClose();
    } catch (error) {
      console.error('Swap error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Swap {tokenSymbol}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Amount to Swap
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Enter amount"
            className="w-full p-2 border rounded-md"
          />
        </div>

        <button
          onClick={handleSwap}
          disabled={isLoading || !amount}
          className={`w-full py-2 px-4 rounded-md text-white ${
            isLoading || !amount
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {isLoading ? 'Loading...' : 'Swap on Pump Portal'}
        </button>
      </div>
    </div>
  );
};

export default SwapModal; 