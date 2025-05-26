import React, { useState, useEffect } from 'react';
import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import { getWalletKeypair, saveWalletToStorage } from '../utils/wallet';
import { WalletStorage } from '../services/wallet/types';
import WalletBackup from './WalletBackup';
import SuccessModal from './SuccessModal';
import { logger } from '../utils/logger';

const Wallet: React.FC = () => {
  const [keypair, setKeypair] = useState<Keypair | null>(null);
  const [showBackup, setShowBackup] = useState(false);
  const [showBackupPrompt, setShowBackupPrompt] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [privateKeyInput, setPrivateKeyInput] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccessMessage, setImportSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const initWallet = async () => {
      const storedKeypair = await getWalletKeypair();
      if (storedKeypair) {
        setKeypair(storedKeypair);
        // Show backup prompt if this is a new wallet
        const hasShownBackupPrompt = localStorage.getItem('has_shown_backup_prompt');
        if (!hasShownBackupPrompt) {
          setShowBackupPrompt(true);
          localStorage.setItem('has_shown_backup_prompt', 'true');
        }
      }
    };
    initWallet();
  }, []);

  const handleRestore = async (restoredKeypair: Keypair) => {
    const walletStorage: WalletStorage = {
      blazr_wallet: {
        publicKey: restoredKeypair.publicKey.toBase58(),
        secretKey: Array.from(restoredKeypair.secretKey)
      }
    };
    await saveWalletToStorage(walletStorage);
    setKeypair(restoredKeypair);
    setShowBackup(false);
  };

  const handleImportPrivateKey = async () => {
    setImportError(null);
    setImportSuccessMessage(null);

    if (keypair) {
      const confirmReplace = window.confirm(
        '⚠️ Importing a new wallet will replace your current one. Be sure you\'ve backed it up. Continue?'
      );
      if (!confirmReplace) {
        return;
      }
    }

    try {
      if (!privateKeyInput.trim()) {
        setImportError('Private key cannot be empty.');
        return;
      }
      const decodedKey = (bs58 as any).decode(privateKeyInput.trim());
      const newKeypair = Keypair.fromSecretKey(decodedKey);

      const walletStorage: WalletStorage = {
        blazr_wallet: {
          publicKey: newKeypair.publicKey.toBase58(),
          secretKey: Array.from(newKeypair.secretKey)
        }
      };
      await saveWalletToStorage(walletStorage);
      setKeypair(newKeypair);
      setImportSuccessMessage('✅ Wallet imported successfully!');
      setShowImportModal(false);
      setPrivateKeyInput('');
    } catch (error) {
      logger.error('Import private key error:', error);
      setImportError('❌ Invalid private key format. Please check and try again.');
    }
  };

  if (!keypair && !showImportModal) {
    // Allow showing import modal if no wallet exists yet
    // Or, you could have a dedicated "Create/Import" initial screen
  }

  useEffect(() => {
    if (importSuccessMessage) {
      const timer = setTimeout(() => {
        setImportSuccessMessage(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [importSuccessMessage]);

  logger.log('Wallet component updated');

  return (
    <div className="p-4">
      {keypair && (
        <div className="bg-zinc-900 rounded-lg p-4 mb-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-white">Your Wallet</h2>
            <button
              onClick={() => setShowBackup(true)}
              className="text-gray-400 hover:text-white"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </button>
          </div>

          <div className="space-y-2">
            <div className="text-sm text-gray-400">Public Key</div>
            <div className="font-mono text-white break-all">
              {keypair.publicKey.toBase58()}
            </div>
          </div>
        </div>
      )}

      <button
        onClick={() => {
          setShowImportModal(true);
          setImportError(null);
          setImportSuccessMessage(null);
        }}
        className="w-full mb-4 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 font-semibold"
      >
        Import Wallet from Private Key
      </button>

      {importSuccessMessage && (
        <SuccessModal
          title="Wallet Imported!"
          message="You can now manage assets and launch tokens."
          buttons={[
            { label: 'Done', onClick: () => setImportSuccessMessage(null) },
          ]}
          onClose={() => setImportSuccessMessage(null)}
        />
      )}

      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 rounded-lg p-6 w-[95vw] max-w-md shadow-xl">
            <h3 className="text-xl font-bold text-white mb-4">Import Private Key</h3>
            
            <div className="mb-4">
              <label htmlFor="privateKeyInput" className="block text-sm font-medium text-gray-300 mb-1">
                Paste your private key (Base58)
              </label>
              <textarea
                id="privateKeyInput"
                value={privateKeyInput}
                onChange={(e) => setPrivateKeyInput(e.target.value)}
                placeholder="Enter your Base58 encoded private key"
                className="w-full p-2 rounded-md bg-zinc-800 text-white border border-zinc-700 focus:ring-2 focus:ring-red-500 focus:border-red-500 min-h-[80px]"
                rows={3}
              />
            </div>

            {importError && (
              <div className="mb-4 p-3 rounded-md bg-red-700/30 border border-red-500 text-red-300 text-sm">
                {importError}
              </div>
            )}

            <div className="flex space-x-3">
              <button
                onClick={handleImportPrivateKey}
                className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 font-semibold"
              >
                Import
              </button>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setPrivateKeyInput('');
                  setImportError(null);
                }}
                className="flex-1 bg-zinc-700 text-gray-300 py-2 px-4 rounded-md hover:bg-zinc-600 hover:text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showBackupPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur">
          <div className="bg-zinc-900 rounded-lg p-6 w-[90vw] max-w-md">
            <h3 className="text-xl font-bold text-white mb-4">Save Your Wallet Backup</h3>
            <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4 text-sm text-red-200 mb-4">
              <p className="font-bold mb-2">⚠️ Important Security Warning</p>
              <p>You won't be able to recover your wallet if you uninstall the extension without a backup.</p>
              <p className="mt-2">Anyone with your backup file can control your wallet and all funds in it.</p>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={() => {
                  setShowBackupPrompt(false);
                  setShowBackup(true);
                }}
                className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 font-bold"
              >
                Backup Now
              </button>
              <button
                onClick={() => setShowBackupPrompt(false)}
                className="flex-1 bg-zinc-800 text-gray-400 py-2 px-4 rounded-md hover:text-white"
              >
                Later
              </button>
            </div>
          </div>
        </div>
      )}

      {showBackup && (
        <WalletBackup
          onClose={() => setShowBackup(false)}
          onRestore={handleRestore}
        />
      )}
    </div>
  );
};

export default Wallet; 