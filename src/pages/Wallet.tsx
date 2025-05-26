import React, { useState, useEffect } from 'react';
import { Download, Upload, Copy, RefreshCw } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { getWalletFromStorage } from '../utils/wallet';
import { getWalletBalance, createWallet, importWallet } from '../services/wallet/api';
import { useWallet } from '../services/wallet/hooks';
import { useSession } from '../context/SessionContext';
import SuccessModal from '../components/SuccessModal';
import bs58 from 'bs58';
import { logger } from '../utils/logger';

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

const Wallet: React.FC = () => {
  const {
    keypair,
    balance,
    isInitialized,
    error: walletError,
    refreshBalance
  } = useWallet();
  const { checkSession } = useSession();

  const [isCopied, setIsCopied] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [importPrivateKey, setImportPrivateKey] = useState('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [tokenBalances, setTokenBalances] = useState<TokenData[]>([]);
  const [isLoadingTokens, setIsLoadingTokens] = useState(true);
  const [showExportOverlay, setShowExportOverlay] = useState(false);
  const [privateKeyRevealed, setPrivateKeyRevealed] = useState(false);
  const [privateKeyCopied, setPrivateKeyCopied] = useState(false);
  const [base58PrivateKey, setBase58PrivateKey] = useState('');
  const [importSuccessMessage, setImportSuccessMessage] = useState('');

  useEffect(() => {
    if (isInitialized) {
      setIsLoading(false);
    }
  }, [isInitialized]);

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

  const totalUsdValue = Array.isArray(tokenBalances) ? tokenBalances.reduce((sum, t) => sum + (t.usdValue || 0), 0) : 0;
  const solPrice = Array.isArray(tokenBalances) ? tokenBalances.find(t => t.symbol === 'SOL')?.usdPrice || 0 : 0;
  const totalSolEquivalent = solPrice > 0 ? totalUsdValue / solPrice : 0;

  const handleImport = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Trim whitespace and remove any quotes
      const cleanedKey = importPrivateKey.trim().replace(/['"]/g, '');
      
      // Log the cleaned key for debugging
      logger.log('Attempting to import with cleaned key:', cleanedKey);
      
      await importWallet(cleanedKey);
      
      // Refresh session to ensure it's still valid
      await checkSession();
      
      setShowImportModal(false);
      setImportPrivateKey('');
      await refreshBalance();
      
      // Show success message with session info
      setImportSuccessMessage('Wallet imported successfully! Your session remains active.');
    } catch (err: any) {
      logger.error('Import error:', err);
      setError(err.message || 'Failed to import wallet');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = () => {
    setShowExportModal(true);
  };

  const handleCopyAddress = () => {
    if (!keypair) return;
    navigator.clipboard.writeText(keypair.publicKey.toBase58());
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  };

  const handleRevealPrivateKey = () => {
    if (!keypair) return;
    setPrivateKeyRevealed(true);
    setBase58PrivateKey(bs58.encode(keypair.secretKey));
  };

  const handleCopyPrivateKey = () => {
    if (!keypair) return;
    navigator.clipboard.writeText(bs58.encode(keypair.secretKey));
    setPrivateKeyCopied(true);
    setTimeout(() => setPrivateKeyCopied(false), 2000);
  };

  const handleHideKey = () => {
    setPrivateKeyRevealed(false);
    setBase58PrivateKey('');
  };

  if (isLoadingTokens) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#FF3131]"></div>
      </div>
    );
  }

  if (error || walletError) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="text-red-500">{error || walletError}</div>
      </div>
    );
  }

  if (!keypair) {
    return (
      <div className="flex flex-col items-center px-4 pt-6 pb-20 min-h-[500px]">
        <h1 className="text-2xl font-bold mb-6">Create Wallet</h1>
        <button
          onClick={async () => {
            try {
              setIsLoading(true);
              await createWallet();
              await refreshBalance();
            } catch (err) {
              setError('Failed to create wallet');
              console.error(err);
            } finally {
              setIsLoading(false);
            }
          }}
          className="w-full bg-[#FF3131] text-white py-3 rounded-lg font-semibold hover:bg-[#ff4646] transition-colors"
        >
          Create New Wallet
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center px-4 pt-6 pb-20 min-h-[500px]">
      <h1 className="text-2xl font-bold mb-6">Wallet</h1>

      <div className="w-full bg-[#181818] rounded-2xl p-6 mb-6">
        <div className="flex justify-between items-center mb-2">
          <div className="text-gray-400">Balance</div>
        </div>
        <div className="text-3xl font-bold">{formatCurrency(totalUsdValue)}</div>
        <div className="text-sm text-gray-400 mt-1">{totalSolEquivalent.toFixed(4)} SOL</div>
      </div>

      <div className="w-full space-y-4">
        <div className="bg-[#181818] rounded-2xl p-4">
          <div className="flex justify-between items-center mb-2">
            <div className="text-gray-400">Wallet Address</div>
            <button
              onClick={handleCopyAddress}
              className="text-[#FF3131] text-sm"
            >
              {isCopied ? 'Copied!' : <Copy className="w-4 h-4" />}
            </button>
          </div>
          <div className="font-mono text-sm break-all">{keypair.publicKey.toBase58()}</div>
          <div className="mt-4 flex justify-center">
            <div className="bg-white p-2 rounded-lg">
              <QRCodeSVG 
                value={keypair.publicKey.toBase58()} 
                size={128}
                level="H"
                includeMargin={true}
                bgColor="#ffffff"
                fgColor="#000000"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Import/Export Buttons */}
      <div className="w-full flex gap-4 mt-6">
        <button
          onClick={() => setShowImportModal(true)}
          className="flex-1 bg-[#181818] text-white py-3 rounded-lg font-semibold hover:bg-[#2A2A2A] transition-colors flex items-center justify-center gap-2"
        >
          <Upload className="w-5 h-5" />
          Import
        </button>
        <button
          onClick={handleExport}
          className="flex-1 bg-[#181818] text-white py-3 rounded-lg font-semibold hover:bg-[#2A2A2A] transition-colors flex items-center justify-center gap-2"
        >
          <Download className="w-5 h-5" />
          Export
        </button>
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-[#181818] rounded-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold text-white mb-4">Import Wallet</h3>
            <div className="text-gray-300 mb-4">
              Enter your private key (base58 format). Your current password and session will remain active.
            </div>
            <textarea
              value={importPrivateKey}
              onChange={(e) => setImportPrivateKey(e.target.value)}
              placeholder="Enter your private key..."
              className="w-full h-32 bg-[#1E1E1E] text-white rounded-lg p-3 mb-4 resize-none"
            />
            <div className="flex gap-4">
              <button
                onClick={() => setShowImportModal(false)}
                className="flex-1 bg-[#2A2A2A] text-white py-3 rounded-lg font-semibold hover:bg-[#3A3A3A] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                className="flex-1 bg-[#FF3131] text-white py-3 rounded-lg font-semibold hover:bg-[#ff4646] transition-colors"
              >
                Import
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-[#181818] rounded-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold text-white mb-4">Export Wallet</h3>
            <div className="bg-[#1E1E1E] rounded-lg p-4 mb-4">
              <p className="text-white font-mono text-sm break-all mb-2">
                {uint8ArrayToBase64(keypair.secretKey)}
              </p>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(uint8ArrayToBase64(keypair.secretKey));
                  setIsCopied(true);
                  setTimeout(() => setIsCopied(false), 2000);
                }}
                className="text-[#FF3131] hover:text-[#ff4646] transition-colors text-sm flex items-center gap-1"
              >
                <Copy className="w-4 h-4" />
                {isCopied ? 'Copied!' : 'Copy to clipboard'}
              </button>
            </div>
            <p className="text-red-500 text-sm mb-4">
              Warning: Never share your private key with anyone. Anyone with this key can access your wallet.
            </p>
            <button
              onClick={() => setShowExportModal(false)}
              className="w-full bg-[#2A2A2A] text-white py-3 rounded-lg font-semibold hover:bg-[#3A3A3A] transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Overlay Modal for Export Private Key */}
      {showExportOverlay && (
        <SuccessModal
          title="Warning: Private Key Access"
          message={
            'Obtaining a private key is the same as obtaining ownership of the asset.\nDo not disclose it to others and keep a backup!'
          }
          buttons={[
            !privateKeyRevealed
              ? { label: 'Reveal Key', onClick: handleRevealPrivateKey }
              : { label: privateKeyCopied ? 'Copied!' : 'Copy Private Key', onClick: handleCopyPrivateKey },
            { label: privateKeyRevealed ? 'Hide Key' : 'Cancel', onClick: handleHideKey },
          ]}
          details={
            privateKeyRevealed && base58PrivateKey
              ? [
                  { label: 'Private Key', value: base58PrivateKey, copy: true },
                ]
              : undefined
          }
          onClose={handleHideKey}
        />
      )}
    </div>
  );
};

export default Wallet; 