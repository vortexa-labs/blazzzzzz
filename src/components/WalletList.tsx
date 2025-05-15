import React, { useState, useEffect } from 'react';
import { getAllStoredWallets, removeWalletFromStorage } from '../utils/wallet';

interface StoredWallet {
  publicKey: string;
  name?: string;
  lastUsed?: number;
}

interface WalletListProps {
  onSelectWallet: (publicKey: string) => void;
}

const WalletList: React.FC<WalletListProps> = ({ onSelectWallet }) => {
  const [wallets, setWallets] = useState<StoredWallet[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadWallets = async () => {
    try {
      setIsLoading(true);
      const storedWallets = await getAllStoredWallets();
      setWallets(storedWallets);
    } catch (error) {
      console.error('Error loading wallets:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadWallets();
  }, []);

  const handleRemoveWallet = async (walletName: string) => {
    try {
      await removeWalletFromStorage(walletName);
      await loadWallets();
    } catch (error) {
      console.error('Error removing wallet:', error);
    }
  };

  if (isLoading) {
    return <div className="text-center">Loading wallets...</div>;
  }

  if (wallets.length === 0) {
    return <div className="text-center text-gray-500">No wallets found</div>;
  }

  return (
    <div className="space-y-4">
      {wallets.map((wallet) => (
        <div
          key={wallet.publicKey}
          className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow"
        >
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-semibold">{wallet.name}</h3>
              <p className="text-sm text-gray-500 truncate">
                {wallet.publicKey}
              </p>
              {wallet.lastUsed && (
                <p className="text-xs text-gray-400">
                  Last used: {new Date(wallet.lastUsed).toLocaleString()}
                </p>
              )}
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => onSelectWallet(wallet.publicKey)}
                className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Select
              </button>
              <button
                onClick={() => handleRemoveWallet(wallet.name || '')}
                className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default WalletList; 