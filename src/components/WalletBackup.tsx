import React, { useState } from 'react';
import { Keypair } from '@solana/web3.js';
import { getWalletFromStorage } from '../utils/wallet';
import { WalletStorage } from '../services/wallet/types';
import SuccessModal from './SuccessModal';

interface WalletBackupProps {
  onClose: () => void;
  onRestore: (keypair: Keypair) => void;
}

const WalletBackup: React.FC<WalletBackupProps> = ({ onClose, onRestore }) => {
  const [activeTab, setActiveTab] = useState<'backup' | 'restore'>('backup');
  const [privateKey, setPrivateKey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState('');
  const [backupData, setBackupData] = useState<string>('');

  const uint8ArrayToBase64 = (bytes: Uint8Array): string => {
    return btoa(String.fromCharCode.apply(null, Array.from(bytes)));
  };

  const base64ToUint8Array = (base64: string): Uint8Array => {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  };

  const handleBackup = async () => {
    try {
      const storage = await getWalletFromStorage();
      if (!storage?.blazr_wallet) {
        throw new Error('No wallet found');
      }

      const keypair = Keypair.fromSecretKey(Uint8Array.from(storage.blazr_wallet.secretKey));
      const privateKeyBase58 = uint8ArrayToBase64(keypair.secretKey);

      // Create backup file
      const backupContent = {
        privateKey: privateKeyBase58,
        publicKey: storage.blazr_wallet.publicKey,
        timestamp: new Date().toISOString()
      };

      setBackupData(JSON.stringify(backupContent, null, 2));
      setError(null);
    } catch (err) {
      setError('Failed to backup wallet');
      console.error(err);
    }
  };

  const handleRestore = async () => {
    try {
      setError('');
      setSuccess('');

      if (!privateKey) {
        throw new Error('Please enter your private key');
      }

      // Try to parse as base64
      let secretKey: Uint8Array;
      try {
        secretKey = base64ToUint8Array(privateKey);
      } catch {
        throw new Error('Invalid private key format');
      }

      // Validate key length
      if (secretKey.length !== 64) {
        throw new Error('Invalid private key length');
      }

      const keypair = Keypair.fromSecretKey(secretKey);
      onRestore(keypair);
      setSuccess('Wallet restored successfully');
    } catch (err: any) {
      setError(err.message || 'Failed to restore wallet');
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const backupData = JSON.parse(content);

        if (!backupData.privateKey) {
          throw new Error('Invalid backup file format');
        }

        setPrivateKey(backupData.privateKey);
      } catch (err: any) {
        setError(err.message || 'Failed to read backup file');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur">
      <div className="bg-zinc-900 rounded-lg p-6 w-[90vw] max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">Wallet Backup & Restore</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex space-x-2 mb-4">
          <button
            onClick={() => setActiveTab('backup')}
            className={`flex-1 py-2 px-4 rounded-md ${
              activeTab === 'backup'
                ? 'bg-red-600 text-white'
                : 'bg-zinc-800 text-gray-400 hover:text-white'
            }`}
          >
            Backup
          </button>
          <button
            onClick={() => setActiveTab('restore')}
            className={`flex-1 py-2 px-4 rounded-md ${
              activeTab === 'restore'
                ? 'bg-red-600 text-white'
                : 'bg-zinc-800 text-gray-400 hover:text-white'
            }`}
          >
            Restore
          </button>
        </div>

        {activeTab === 'backup' ? (
          <div className="space-y-4">
            <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4 text-sm text-red-200">
              <p className="font-bold mb-2">⚠️ Important Security Warning</p>
              <p>Anyone with access to your backup file can control your wallet and all funds in it.</p>
              <p className="mt-2">Store your backup securely and never share it with anyone.</p>
            </div>

            <button
              onClick={handleBackup}
              className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 font-bold"
            >
              Download Backup File
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4 text-sm text-red-200">
              <p className="font-bold mb-2">⚠️ Restore Warning</p>
              <p>This will replace your current wallet. Make sure you have a backup of your current wallet if needed.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Upload Backup File
              </label>
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="w-full bg-zinc-800 text-white p-2 rounded-md border border-zinc-700"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Or Paste Private Key
              </label>
              <textarea
                value={privateKey}
                onChange={(e) => setPrivateKey(e.target.value)}
                placeholder="Enter your private key"
                className="w-full bg-zinc-800 text-white p-2 rounded-md border border-zinc-700 h-24"
              />
            </div>

            <button
              onClick={handleRestore}
              className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 font-bold"
            >
              Restore Wallet
            </button>
          </div>
        )}

        {error && (
          <div className="mt-4 bg-red-900/20 border border-red-500/50 rounded-lg p-4 text-sm text-red-200">
            {error}
          </div>
        )}

        {success && (
          <SuccessModal
            title={success.includes('restored') ? 'Wallet Restored!' : 'Wallet Backup Saved!'}
            message={success}
            buttons={[
              { label: 'Done', onClick: () => setSuccess('') },
            ]}
            onClose={() => setSuccess('')}
          />
        )}

        {backupData && (
          <div className="mt-4 bg-zinc-800 rounded-lg p-4 text-sm text-gray-400">
            <h3 className="font-bold mb-2">Backup Data:</h3>
            <pre>{backupData}</pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default WalletBackup; 