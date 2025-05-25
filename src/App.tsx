import React, { useState, useEffect, useRef } from 'react';
import { SunIcon, MoonIcon, ChevronDownIcon, ChevronUpIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { PaperClipIcon } from '@heroicons/react/24/solid';
import BlazrLogo from './assets/blazr-logo.png';
import * as web3Js from '@solana/web3.js';
import bs58 from 'bs58';
import { resizeImageToSquare, validateImage } from './utils/imageProcessing';
import { 
  View, 
  TokenMetadataCache, 
  TokenCacheData, 
  TransactionConfirmation,
  HeliusTokenMetadata,
  SolanaToken,
  SolanaTokenList,
  WalletStorage
} from './types';
import SwapModal from './components/SwapModal';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import BottomNav from './components/BottomNav';
import Home from './pages/Home';
import LaunchToken from './pages/LaunchToken';
import Portfolio from './pages/Portfolio';
import Swap from './pages/Swap';
import Wallet from './pages/Wallet';
import Send from './pages/Send';
import Settings from './pages/Settings';
import CreatePassword from './pages/CreatePassword';
import Unlock from './pages/Unlock';
import { useSession } from './context/SessionContext';
import SessionActivityTracker from './context/SessionActivityTracker';

// @ts-ignore
// eslint-disable-next-line no-var
var chrome: any;

const THEME_KEY = 'blazr-theme';

const isValidImageUrl = (url: string) => {
  return /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(url.trim());
};

function isChromeStorageAvailable() {
  return (
    typeof chrome !== 'undefined' &&
    chrome.storage &&
    chrome.storage.local &&
    typeof chrome.storage.local.get === 'function' &&
    typeof chrome.storage.local.set === 'function'
  );
}

// Add these function declarations
const getWalletFromStorage = async (): Promise<WalletStorage> => {
  if (isChromeStorageAvailable()) {
    return await new Promise<WalletStorage>(resolve => {
      chrome.storage.local.get(['blazr_wallet', 'blazr_api_key'], resolve);
    });
  } else {
    const val = localStorage.getItem('blazr_wallet');
    const apiKey = localStorage.getItem('blazr_api_key');
    return {
      blazr_wallet: val ? JSON.parse(val) : undefined,
      blazr_api_key: apiKey || undefined
    };
  }
};

const setWalletToStorage = async (walletObj: WalletStorage): Promise<void> => {
  if (isChromeStorageAvailable()) {
    await new Promise<void>(resolve => {
      chrome.storage.local.set(walletObj, resolve);
    });
  } else {
    if (walletObj.blazr_wallet) {
      localStorage.setItem('blazr_wallet', JSON.stringify(walletObj.blazr_wallet));
    }
    if (walletObj.blazr_api_key) {
      localStorage.setItem('blazr_api_key', walletObj.blazr_api_key);
    }
  }
};

// HELPER for Helius RPC getTokenAccountsByOwner (used by MyTokensView and TradeView)
async function fetchTokenAccountsFromHeliusRpc(ownerPublicKey: string): Promise<any[]> {
  try {
    const response = await fetch('/api/helius/token-accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ownerPublicKey })
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Helius RPC getTokenAccountsByOwner error:', response.status, errorText);
      throw new Error(`Helius RPC error: ${response.status} - ${errorText}`);
    }
    const data = await response.json();
    if (data.error) {
      console.error('Helius RPC getTokenAccountsByOwner data error:', data.error);
      throw new Error(`Helius RPC data error: ${data.error.message || JSON.stringify(data.error)}`);
    }
    if (data.result && Array.isArray(data.result.value)) {
      return data.result.value;
    } else {
      console.warn('Helius RPC getTokenAccountsByOwner response did not have expected structure:', data);
      return [];
    }
  } catch (e) {
    console.error('Failed to fetch token accounts from Helius RPC:', e);
    throw e;
  }
}

// HELPER for Helius Metadata API (used by MyTokensView and TradeView)
async function fetchTokenMetadataFromHelius(mintAccounts: string[]): Promise<Record<string, Partial<SolanaToken> & { creator?: string }>> {
  if (mintAccounts.length === 0) return {};
  try {
    const response = await fetch('/api/helius/token-metadata', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mintAccounts })
    });
    if (!response.ok) {
      const errorData = await response.text();
      console.error('Helius API error:', response.status, errorData);
      return {};
    }
    const data: HeliusTokenMetadata[] = await response.json();
    const metadataMap: Record<string, Partial<SolanaToken> & { creator?: string }> = {};
    data.forEach(item => {
      const name = item.offChainMetadata?.metadata?.name || item.onChainMetadata?.metadata?.data?.name || item.legacyMetadata?.name;
      const symbol = item.offChainMetadata?.metadata?.symbol || item.onChainMetadata?.metadata?.data?.symbol || item.legacyMetadata?.symbol;
      const logoURI = item.offChainMetadata?.metadata?.image || item.legacyMetadata?.logoURI;
      const creator = item.onChainMetadata?.metadata?.data?.creators?.[0]?.address;
      if (name && symbol) {
        metadataMap[item.account] = { name, symbol, logoURI, creator };
      }
    });
    return metadataMap;
  } catch (e) {
    console.error('Error fetching metadata from Helius:', e);
    return {};
  }
}

// --- Start MyTokensView Specific Helpers ---

// MyTokensView: Helper for Helius RPC getTokenAccountsByOwner
async function myTokensView_fetchTokenAccounts(ownerPublicKey: string): Promise<any[]> {
  try {
    const response = await fetch('/api/helius/token-accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ownerPublicKey })
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error('(MyTokensView_HeliusRPC) getTokenAccountsByOwner error:', response.status, errorText);
      throw new Error(`MyTokensView Helius RPC error: ${response.status} - ${errorText}`);
    }
    const data = await response.json();
    if (data.error) {
      console.error('(MyTokensView_HeliusRPC) getTokenAccountsByOwner data error:', data.error);
      throw new Error(`MyTokensView Helius RPC data error: ${data.error.message || JSON.stringify(data.error)}`);
    }
    if (data.result && Array.isArray(data.result.value)) {
      return data.result.value;
    } else {
      console.warn('(MyTokensView_HeliusRPC) getTokenAccountsByOwner response did not have expected structure:', data);
      return [];
    }
  } catch (e) {
    console.error('(MyTokensView_HeliusRPC) Failed to fetch token accounts:', e);
    throw e;
  }
}

// MyTokensView: Helper for Helius Metadata API
async function myTokensView_fetchMetadata(mintAccounts: string[]): Promise<Record<string, { name?: string; symbol?: string; logoURI?: string; decimals?: number }>> {
  if (mintAccounts.length === 0) return {};
  try {
    const response = await fetch('/api/helius/token-metadata', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mintAccounts })
    });
    if (!response.ok) {
      const errorData = await response.text();
      console.error('(MyTokensView_HeliusMeta) API error:', response.status, errorData);
      return {};
    }
    const data: HeliusTokenMetadata[] = await response.json();
    const metadataMap: Record<string, { name?: string; symbol?: string; logoURI?: string; decimals?: number }> = {};
    data.forEach(item => {
      const name = item.offChainMetadata?.metadata?.name || item.onChainMetadata?.metadata?.data?.name || item.legacyMetadata?.name;
      const symbol = item.offChainMetadata?.metadata?.symbol || item.onChainMetadata?.metadata?.data?.symbol || item.legacyMetadata?.symbol;
      const logoURI = item.offChainMetadata?.metadata?.image || item.legacyMetadata?.logoURI;
      if (name && symbol) {
        metadataMap[item.account] = { name, symbol, logoURI };
      }
    });
    return metadataMap;
  } catch (e) {
    console.error('(MyTokensView_HeliusMeta) Error fetching metadata from Helius:', e);
    return {};
  }
}

// Reusable BalanceDisplay component
const BalanceDisplay: React.FC<{ sol: number | null, solUsdRate: number }> = ({ sol, solUsdRate }) => {
  const usd = sol !== null ? sol * solUsdRate : 0;
  return (
    <div className="flex justify-center items-end space-x-2 mt-6 mb-6">
      <span className="text-3xl font-bold text-white">${usd.toFixed(2)}</span>
      <span className="text-sm text-gray-400">{sol !== null ? sol.toFixed(4) : '0.0000'} SOL</span>
    </div>
  );
};

const App: React.FC = () => {
  const { sessionLocked, isFirstTime } = useSession();
  return (
    <Router>
      <SessionActivityTracker />
      <div className="bg-[#0f0f0f] min-h-screen flex flex-col font-sans text-white" style={{width: 400, minHeight: 600}}>
        <div className="flex-1 pb-16">
          <Routes>
            {isFirstTime ? (
              <>
                <Route path="/create-password" element={<CreatePassword />} />
                <Route path="*" element={<Navigate to="/create-password" replace />} />
              </>
            ) : sessionLocked ? (
              <>
                <Route path="/unlock" element={<Unlock />} />
                <Route path="*" element={<Navigate to="/unlock" replace />} />
              </>
            ) : (
              <>
                <Route path="/" element={<Navigate to="/home" />} />
                <Route path="/create-password" element={<Navigate to="/home" replace />} />
                <Route path="/unlock" element={<Navigate to="/home" replace />} />
                <Route path="/home" element={<Home />} />
                <Route path="/launch" element={<LaunchToken />} />
                <Route path="/portfolio" element={<Portfolio />} />
                <Route path="/swap" element={<Swap />} />
                <Route path="/wallet" element={<Wallet />} />
                <Route path="/send" element={<Send />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="*" element={<Navigate to="/home" replace />} />
              </>
            )}
          </Routes>
        </div>
        <BottomNav />
      </div>
    </Router>
  );
};

export default App;

// Nav Icon Button
const NavIconButton: React.FC<{
  icon: React.ReactNode;
  onClick: () => void;
  label: string;
  active?: boolean;
}> = ({ icon, onClick, label, active }) => (
  <button
    onClick={onClick}
    title={label}
    className={`relative flex items-center justify-center h-10 w-10 rounded-full transition-all
      bg-black border border-gray-800 shadow-sm
      hover:shadow-red-500/40 hover:border-blazr-red
      focus:outline-none focus:ring-2 focus:ring-blazr-red
      ${active ? 'ring-2 ring-blazr-red' : ''}`}
  >
    <span className="text-xl text-blazr-red">{icon}</span>
  </button>
);

// Token Form Component
const TokenForm: React.FC<{ solBalance: number | null }> = ({ solBalance }) => {
  const [showSocial, setShowSocial] = useState(false);
  const [form, setForm] = useState({
    name: '',
    ticker: '',
    description: '',
    image: '',
    website: '',
    twitter: '',
    telegram: '',
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [solAmount, setSolAmount] = useState('');
  const [solError, setSolError] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [launching, setLaunching] = useState(false);
  const [launchSuccess, setLaunchSuccess] = useState<{ name: string; signature: string; tokenLink: string } | null>(null);
  const [launchError, setLaunchError] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successDetails, setSuccessDetails] = useState<{ name: string; contract: string; signature: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors((prev) => ({ ...prev, [e.target.name]: '' }));
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      setUploadError(null);

      // Validate image
      try {
        validateImage(file);
      } catch (validationError: any) {
        setUploadError(validationError.message);
        return;
      }

      // Resize image if needed
      const resizedImage = await resizeImageToSquare(file);
      
      // Store the file object instead of uploading to Pinata
      setImageFile(resizedImage);
      
      // Create a preview URL
      const previewUrl = URL.createObjectURL(resizedImage);
      setImagePreview(previewUrl);
      
      // Update form with the preview URL
      setForm(prev => ({
        ...prev,
        image: previewUrl
      }));

      // Show success message
      setSuccessMessage('Image ready for upload!');
    } catch (err: any) {
      console.error('Image processing error:', err);
      setUploadError(err.message || 'Failed to process image');
    } finally {
      setIsUploading(false);
    }
  };

  const handleImageDrop = async (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const event = {
        target: { files: [file] }
      } as unknown as React.ChangeEvent<HTMLInputElement>;
      await handleImageChange(event);
    }
  };

  // Modal handlers
  const handleLaunchClick = (e: React.FormEvent) => {
    console.log('Launch button clicked');
    e.preventDefault();
    // Validation
    const newErrors: { [key: string]: string } = {};
    if (!form.name.trim()) newErrors.name = '* Token name is required';
    if (!form.ticker.trim() || form.ticker.length < 3 || form.ticker.length > 4) newErrors.ticker = '* Ticker must be 3-4 letters';
    if (!form.description.trim()) newErrors.description = '* Description is required';
    // Image: must have a file uploaded
    if (!imageFile) {
      newErrors.image = '* Token image is required (upload an image file)';
    }
    console.log('Validation errors:', newErrors);
    setErrors(newErrors);
    if (Object.keys(newErrors).length === 0) {
      console.log('Validation passed, showing modal');
      setShowModal(true);
    }
  };

  // Launch token handler
  const launchToken = async (buyAmount: string) => {
    console.log('Starting token launch with amount:', buyAmount);
    setLaunching(true);
    setLaunchError(null);
    setLaunchSuccess(null);
    try {
      // Load wallet from storage
      console.log('Loading wallet from storage');
      let kp: web3Js.Keypair | null = null;
      const storage = await getWalletFromStorage();
      console.log('Wallet storage:', storage);
      if (storage.blazr_wallet) {
        kp = web3Js.Keypair.fromSecretKey(Uint8Array.from(storage.blazr_wallet.secretKey));
        console.log('Wallet loaded successfully');
      } else {
        console.error('Wallet not found in storage');
        throw new Error('Wallet not found');
      }
      // Generate a random keypair for the mint
      const mintKeypair = web3Js.Keypair.generate();
      console.log('Generated mint keypair');

      // 1. Upload image to Pinata
      let imageBase64 = '';
      if (imageFile) {
        imageBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(imageFile);
        });
      } else {
        setLaunchError('No valid image file to upload.');
        setLaunching(false);
        return;
      }

      // Helper function to convert Uint8Array to base64
      const toBase64 = (arr: Uint8Array) => {
        const bytes = Array.from(arr);
        const binary = bytes.map(byte => String.fromCharCode(byte)).join('');
        return btoa(binary);
      };

      // Create compute budget instructions
      const computeBudgetInstructions = [
        {
          programId: "ComputeBudget111111111111111111111111111111",
          keys: [],
          data: toBase64(new Uint8Array(32).fill(0))
        },
        {
          programId: "ComputeBudget111111111111111111111111111111",
          keys: [],
          data: toBase64(new Uint8Array([1, ...new Uint8Array(31).fill(0)]))
        }
      ];

      // 2. Request the transaction from Pump Portal
      console.log('Requesting transaction from Pump Portal');
      const tradeRes = await fetch('http://localhost:4000/api/trade-local', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          publicKey: kp.publicKey.toBase58(),
          action: 'create',
          tokenMetadata: {
            name: form.name,
            symbol: form.ticker,
            imageFile: imageBase64,
            description: form.description,
            attributes: [
              { trait_type: "Twitter", value: form.twitter || "" },
              { trait_type: "Telegram", value: form.telegram || "" },
              { trait_type: "Website", value: form.website || "" }
            ]
          },
          mint: mintKeypair.publicKey.toBase58(),
          denominatedInSol: 'true',
          amount: parseFloat(buyAmount) || 0,
          slippage: 10,
          priorityFee: 0.001,
          pool: 'pump',
          skipInitialBuy: (parseFloat(buyAmount) || 0) === 0,
          computeUnits: 1_400_000,
          maxComputeUnits: 1_400_000,
          skipPreflight: false,
          computeBudget: { units: 1_400_000, microLamports: 1_000_000 },
          instructions: computeBudgetInstructions
        }),
      });

      if (!tradeRes.ok) {
        let errorText = await tradeRes.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          // If JSON parsing fails, use the raw text.
          // This handles cases where the server returns HTML or plain text error.
          console.error('Pump Portal API raw error response:', errorText);
          throw new Error(`Pump Portal API error: ${tradeRes.status} ${tradeRes.statusText}. Response: ${errorText.substring(0, 200)}...`);
        }
        console.error('Pump Portal API error:', errorData);
        throw new Error(errorData.details || errorData.error || errorData.message || 'Pump Portal API error');
      }

      console.log('Received transaction from Pump Portal');
      const txBuffer = await tradeRes.arrayBuffer();
      const tx = web3Js.VersionedTransaction.deserialize(new Uint8Array(txBuffer));

      // 3. Fetch a fresh blockhash and set it on the transaction
      console.log('Fetching fresh blockhash');
      const connection = new web3Js.Connection('https://greatest-lingering-forest.solana-mainnet.quiknode.pro/7d9cdaae49e7f160cc664e2070e978a345de47d0/');
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('finalized');
      tx.message.recentBlockhash = blockhash;

      // 4. Sign the transaction locally
      console.log('Signing transaction');
      tx.sign([mintKeypair, kp]);

      // 5. Send the signed transaction to Solana with retry logic
      try {
        console.log('Sending transaction to Solana');
        const signature = await connection.sendTransaction(tx, {
          maxRetries: 3,
          preflightCommitment: 'confirmed',
          skipPreflight: false // Enable preflight checks
        });

        console.log('Transaction sent:', signature);

        // Wait for confirmation with timeout
        console.log('Waiting for transaction confirmation');
        const confirmation = await Promise.race([
          connection.confirmTransaction({
            signature,
            blockhash,
            lastValidBlockHeight
          }, 'confirmed'),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Transaction confirmation timeout')), 30000)
          )
        ]) as TransactionConfirmation; // Use the existing TransactionConfirmation interface

        if (confirmation.value.err) {
          console.error('Transaction failed:', confirmation.value.err);
          throw new Error('Transaction failed: ' + JSON.stringify(confirmation.value.err));
        }

        console.log('Transaction confirmed successfully');
        // Show modal with details
        setSuccessDetails({
          name: form.name,
          contract: mintKeypair.publicKey.toBase58(),
          signature,
        });
        setShowSuccessModal(true);
        setLaunchSuccess({
          name: form.name,
          signature,
          tokenLink: `https://solscan.io/tx/${signature}`,
        });
      } catch (err: any) {
        console.error('Transaction error:', err);
        if (err.message.includes('memory allocation failed') || err.message.includes('insufficient compute units') || err.message.includes('out of memory')) {
          throw new Error('Transaction failed: Insufficient compute units. Please try again with a smaller initial buy amount.');
        }
        throw err;
      }
    } catch (err: any) {
      console.error('Launch error:', err);
      setLaunchError(err.message || 'Failed to launch token');
    } finally {
      setLaunching(false);
    }
  };

  const handleModalConfirm = async () => {
    const amount = parseFloat(solAmount);
    if (isNaN(amount) || amount < 0) {
      setSolError('Please enter a valid SOL amount (0 or greater)');
      return;
    }
    setSolError('');
    setShowModal(false);
    try {
      await launchToken(solAmount);
    } catch (error: any) {
      console.error('Launch error:', error);
      setLaunchError(error.message || 'Failed to launch token');
    }
  };

  const handleModalCancel = () => {
    setShowModal(false);
    setSolError('');
  };

  const handleReset = () => {
    setForm({
      name: '',
      ticker: '',
      description: '',
      image: '',
      website: '',
      twitter: '',
      telegram: '',
    });
    setImageFile(null);
    setImagePreview(null);
    setShowSuccessModal(false);
    setSuccessDetails(null);
    setLaunchSuccess(null);
    setLaunchError(null);
    setSolAmount('');
    setErrors({});
  };

  return (
    <>
      {showSuccessModal && successDetails && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/80 backdrop-blur rounded-2xl">
          <div className="bg-zinc-900 rounded-lg p-6 shadow-lg w-[90vw] max-w-xs flex flex-col items-center text-center">
            <div className="text-2xl font-bold text-red-500 mb-2">🎉 Token Launched Successfully!</div>
            <div className="text-lg font-bold text-white mb-2">{successDetails.name}</div>
            <div className="text-xs text-gray-400 mb-2 break-all">Contract: {successDetails.contract}</div>
            <div className="text-xs text-gray-400 mb-2 break-all">
              Signature: {successDetails.signature.slice(0, 6)}...{successDetails.signature.slice(-6)}
            </div>
            <a
              href={`https://pump.fun/coin/${successDetails.contract}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-red-500 hover:text-red-400 underline mb-1"
            >
              View on Pump.fun
            </a>
            <a
              href={`https://solscan.io/tx/${successDetails.signature}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-red-500 hover:text-red-400 underline mb-4"
            >
              View on Solscan
            </a>
            <button
              onClick={() => {
                const details = `🎉 Token Launched Successfully!\n\nToken Name: ${successDetails.name}\nContract Address: ${successDetails.contract}\nTransaction Signature: ${successDetails.signature}\n\nView on Pump.fun: https://pump.fun/coin/${successDetails.contract}\nView on Solscan: https://solscan.io/tx/${successDetails.signature}`;
                navigator.clipboard.writeText(details);
                alert('Details copied to clipboard!');
              }}
              className="bg-red-600 text-white rounded px-4 py-2 hover:bg-red-700 font-bold mt-2"
            >
              Copy All Details
            </button>
            <button
              onClick={handleReset}
              className="bg-red-600 text-white rounded px-4 py-2 hover:bg-red-700 font-bold mt-2"
            >
              Launch Another Token
            </button>
          </div>
        </div>
      )}
      {launchError && (
        <div className="bg-red-900/80 border border-red-500 text-white rounded-xl p-4 mb-4 text-center">
          <div className="font-bold text-lg mb-2">Error</div>
          <div>{launchError}</div>
        </div>
      )}
      <form 
        className="bg-[#111] rounded-2xl border border-gray-800 p-6 space-y-4 shadow-md"
        onSubmit={handleLaunchClick}
      >
        <FormField
          label="Token Name"
          name="name"
          type="text"
          placeholder="Solana Doge"
          value={form.name}
          onChange={handleChange}
          inputClass={`h-12 py-2 ${errors.name ? 'border-red-600 ring-2 ring-red-600' : ''}`}
          error={errors.name}
        />
        <FormField
          label="Token Ticker (4 chars max)"
          name="ticker"
          type="text"
          placeholder="$DOGE"
          maxLength={4}
          value={form.ticker}
          onChange={handleChange}
          inputClass={`h-12 py-2 ${errors.ticker ? 'border-red-600 ring-2 ring-red-600' : ''}`}
          error={errors.ticker}
        />
        <FormField
          label="Token Description"
          name="description"
          type="textarea"
          placeholder="Tell us about your meme token..."
          value={form.description}
          onChange={handleChange}
          inputClass={`h-24 py-2 ${errors.description ? 'border-red-600 ring-2 ring-red-600' : ''}`}
          error={errors.description}
        />
        {/* Image Upload */}
        <div className="mb-4">
          <label className="block text-blazr-red font-bold text-xs mb-1">
            Token Image
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
              id="image-upload"
              disabled={isUploading}
            />
            <label
              htmlFor="image-upload"
              className={`flex-1 cursor-pointer rounded-lg bg-[#181818] border border-gray-700 focus:border-blazr-red focus:ring-1 focus:ring-blazr-red text-white placeholder-gray-400 px-4 py-2 text-center ${
                isUploading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#222]'
              }`}
            >
              {isUploading ? 'Uploading...' : 'Upload Image'}
            </label>
            {form.image && (
              <button
                type="button"
                onClick={() => setForm(prev => ({ ...prev, image: '' }))}
                className="text-red-500 hover:text-red-400"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            )}
          </div>
          {uploadError && (
            <div className="text-red-500 text-xs mt-1">{uploadError}</div>
          )}
          {form.image && (
            <div className="mt-2">
              <img
                src={form.image}
                alt="Token preview"
                className="w-20 h-20 object-cover rounded-lg"
              />
            </div>
          )}
        </div>
        {/* Social Links Collapsible */}
        <div>
          <button
            type="button"
            onClick={() => setShowSocial((v) => !v)}
            className="flex items-center text-blazr-red font-bold text-xs mb-2 focus:outline-none select-none"
          >
            {showSocial ? <ChevronUpIcon className="w-4 h-4 mr-1" /> : <ChevronDownIcon className="w-4 h-4 mr-1" />}
            {showSocial ? 'Hide Social Links' : 'Add Social Links'}
          </button>
          <div
            className={`grid transition-all duration-300 ease-in-out overflow-hidden ${showSocial ? 'grid-rows-[1fr] opacity-100 max-h-96' : 'grid-rows-[0fr] opacity-0 max-h-0'}`}
            style={{ gridTemplateRows: showSocial ? '1fr' : '0fr' }}
          >
            <div className="space-y-4">
              <FormField
                label="Website URL"
                name="website"
                type="url"
                placeholder="https://..."
                value={form.website}
                onChange={handleChange}
                inputClass="h-12 py-2 pl-10"
                icon={<span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🌐</span>}
              />
              <FormField
                label="Twitter/X"
                name="twitter"
                type="text"
                placeholder="@username"
                value={form.twitter}
                onChange={handleChange}
                inputClass="h-12 py-2 pl-10"
                icon={<span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">𝕏</span>}
              />
              <FormField
                label="Telegram"
                name="telegram"
                type="text"
                placeholder="t.me/yourtoken"
                value={form.telegram}
                onChange={handleChange}
                inputClass="h-12 py-2 pl-10"
                icon={<span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">✈️</span>}
              />
            </div>
          </div>
        </div>
        <button
          type="submit"
          className="w-full bg-blazr-red text-white font-bold py-3 rounded-full mt-2 shadow-md hover:bg-red-700 hover:shadow-red-500/60 transition-all text-base"
          disabled={launching}
        >
          {launching ? 'Launching...' : 'Launch Token'}
        </button>
      </form>
      {/* Confirmation Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="bg-black border-2 border-blazr-red rounded-2xl shadow-2xl p-6 w-[90vw] max-w-xs flex flex-col items-center animate-fadeIn">
            <div className="text-lg font-bold text-white mb-2">Enter Initial Buy Amount</div>
            <div className="text-sm text-gray-400 mb-2">Enter 0 to create token without buying</div>
            <input
              type="number"
              min="0"
              step="0.00000001"
              placeholder="e.g. 0.01 or 0"
              value={solAmount}
              onChange={e => setSolAmount(e.target.value)}
              className="w-full rounded-lg bg-[#181818] border border-gray-700 focus:border-blazr-red focus:ring-1 focus:ring-blazr-red text-white placeholder-gray-400 px-4 py-3 mb-2 mt-2 text-center"
            />
            {solError && <div className="text-red-500 text-xs mb-2">{solError}</div>}
            <div className="flex w-full space-x-2 mt-2">
              <button
                className="flex-1 bg-blazr-red text-white font-bold py-2 rounded-full shadow-md hover:bg-red-700 hover:shadow-red-500/60 transition-all"
                onClick={handleModalConfirm}
                type="button"
              >
                {parseFloat(solAmount) === 0 ? 'Create Token' : 'Create & Buy'}
              </button>
              <button
                className="flex-1 bg-gray-800 text-blazr-red border border-blazr-red font-bold py-2 rounded-full shadow-md hover:bg-gray-700 transition-all"
                onClick={handleModalCancel}
                type="button"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// Form Field Component
const FormField: React.FC<{
  label: string;
  name: string;
  type: string;
  placeholder?: string;
  maxLength?: number;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  inputClass?: string;
  icon?: React.ReactNode;
  error?: string;
}> = ({ label, name, type, placeholder, maxLength, value, onChange, inputClass = '', icon, error }) => (
  <div>
    <label className="block text-blazr-red font-bold text-xs mb-1">{label}</label>
    <div className="relative">
      {type === 'textarea' ? (
        <textarea
          name={name}
          className={`w-full rounded-lg bg-[#181818] border border-gray-700 focus:border-blazr-red focus:ring-1 focus:ring-blazr-red text-white placeholder-gray-400 px-4 ${inputClass}`}
          placeholder={placeholder}
          rows={4}
          value={value}
          onChange={onChange}
        />
      ) : (
        <>
          {icon}
          <input
            name={name}
            type={type}
            maxLength={maxLength}
            className={`w-full rounded-lg bg-[#181818] border border-gray-700 focus:border-blazr-red focus:ring-1 focus:ring-blazr-red text-white placeholder-gray-400 px-4 ${inputClass}`}
            placeholder={placeholder}
            value={value}
            onChange={onChange}
          />
        </>
      )}
    </div>
    {error && <div className="text-red-500 text-xs mt-1">{error}</div>}
  </div>
);

// Wallet View Component
const WalletView: React.FC<{ setSolBalance: React.Dispatch<React.SetStateAction<number | null>> }> = ({ setSolBalance }) => {
  const [wallet, setWallet] = useState<web3Js.Keypair | null>(null);
  const [address, setAddress] = useState('');
  const [balance, setBalance] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [showExportOverlay, setShowExportOverlay] = useState(false);
  const [privateKeyRevealed, setPrivateKeyRevealed] = useState(false);
  const [privateKeyCopied, setPrivateKeyCopied] = useState(false);
  const [base58PrivateKey, setBase58PrivateKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [showBackupPrompt, setShowBackupPrompt] = useState(false);
  const [showBackup, setShowBackup] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [privateKeyInput, setPrivateKeyInput] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccessMessage, setImportSuccessMessage] = useState<string | null>(null);

  // Load or generate wallet
  useEffect(() => {
    async function loadWallet() {
      setLoading(true);
      try {
        const storage = await getWalletFromStorage();
        let kp: web3Js.Keypair;
        let isNewWallet = false;
        
        if (storage.blazr_wallet) {
          try {
            const { publicKey, secretKey } = storage.blazr_wallet;
            kp = web3Js.Keypair.fromSecretKey(Uint8Array.from(secretKey));
          } catch (e) {
            kp = web3Js.Keypair.generate();
            isNewWallet = true;
            await setWalletToStorage({
              blazr_wallet: {
                publicKey: kp.publicKey.toBase58(),
                secretKey: Array.from(kp.secretKey),
              },
            });
          }
        } else {
          kp = web3Js.Keypair.generate();
          isNewWallet = true;
          await setWalletToStorage({
            blazr_wallet: {
              publicKey: kp.publicKey.toBase58(),
              secretKey: Array.from(kp.secretKey),
            },
          });
        }
        setWallet(kp);
        setAddress(kp.publicKey.toBase58());

        // Show backup prompt for new wallet
        if (isNewWallet) {
          const hasShownBackupPrompt = localStorage.getItem('has_shown_backup_prompt');
          if (!hasShownBackupPrompt) {
            // Create and download backup file
            const privateKeyBase58 = uint8ArrayToBase64(kp.secretKey);
            const backupText = `Blazr Wallet Backup
Date: ${new Date().toISOString()}

Public Key: ${kp.publicKey.toBase58()}
Private Key: ${privateKeyBase58}

IMPORTANT: Keep this file secure. Anyone with access to your private key can control your wallet and all funds in it.
Never share this file with anyone.`;

            const blob = new Blob([backupText], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `blazr-wallet-backup-${new Date().toISOString().split('T')[0]}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            setShowBackupPrompt(true);
            localStorage.setItem('has_shown_backup_prompt', 'true');
          }
        }
      } catch (err) {
        // handle error
      }
      setLoading(false);
    }
    loadWallet();
  }, []);

  // Fetch balance
  useEffect(() => {
    if (!wallet) return;
    const connection = new web3Js.Connection('https://greatest-lingering-forest.solana-mainnet.quiknode.pro/7d9cdaae49e7f160cc664e2070e978a345de47d0/');
    let mounted = true;
    connection.getBalance(wallet.publicKey).then(lamports => {
      if (mounted) {
        const sol = lamports / web3Js.LAMPORTS_PER_SOL;
        setBalance(sol);
        setSolBalance(sol);
      }
    }).catch(e => {
      // handle error
    });
    return () => { mounted = false; };
  }, [wallet, setSolBalance]);

  // Copy address
  const handleCopyAddress = () => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  // Export private key logic
  const handleExportPrivateKey = () => {
    setShowExportOverlay(true);
    setPrivateKeyRevealed(false);
    setPrivateKeyCopied(false);
    setBase58PrivateKey('');
  };
  const handleRevealPrivateKey = () => {
    if (wallet) {
      const privateKeyBase58 = uint8ArrayToBase64(wallet.secretKey);
      setBase58PrivateKey(privateKeyBase58);
      setPrivateKeyRevealed(true);
    }
  };
  const handleCopyPrivateKey = () => {
    if (!base58PrivateKey) return;
    navigator.clipboard.writeText(base58PrivateKey);
    setPrivateKeyCopied(true);
    setTimeout(() => setPrivateKeyCopied(false), 1200);
  };
  const handleHideKey = () => {
    setShowExportOverlay(false);
    setPrivateKeyRevealed(false);
    setPrivateKeyCopied(false);
    setBase58PrivateKey('');
  };

  const handleBackup = async () => {
    try {
      if (!wallet) return;
      
      const privateKeyBase58 = uint8ArrayToBase64(wallet.secretKey);
      
      // Create backup text content
      const backupText = `Blazr Wallet Backup
Date: ${new Date().toISOString()}

Public Key: ${wallet.publicKey.toBase58()}
Private Key: ${privateKeyBase58}

IMPORTANT: Keep this file secure. Anyone with access to your private key can control your wallet and all funds in it.
Never share this file with anyone.`;

      const blob = new Blob([backupText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `blazr-wallet-backup-${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setShowBackup(false);
    } catch (err) {
      console.error('Failed to backup wallet:', err);
    }
  };

  // Import Private Key Handler
  const handleImportPrivateKey = async () => {
    setImportError(null);
    setImportSuccessMessage(null);
    if (wallet) {
      const confirmReplace = window.confirm(
        '⚠️ Importing a new wallet will replace your current one. Be sure you\'ve backed it up. Continue?'
      );
      if (!confirmReplace) return;
    }
    try {
      if (!privateKeyInput.trim()) {
        setImportError('Private key cannot be empty.');
        return;
      }
      const decodedKey = base64ToUint8Array(privateKeyInput.trim());
      const newKeypair = web3Js.Keypair.fromSecretKey(decodedKey);
      await setWalletToStorage({
        blazr_wallet: {
          publicKey: newKeypair.publicKey.toBase58(),
          secretKey: Array.from(newKeypair.secretKey),
        },
      });
      setWallet(newKeypair);
      setAddress(newKeypair.publicKey.toBase58());
      setImportSuccessMessage('✅ Wallet imported successfully!');
      setShowImportModal(false);
      setPrivateKeyInput('');
    } catch (error) {
      setImportError('❌ Invalid private key format. Please check and try again.');
    }
  };

  // Clear success message after a few seconds
  useEffect(() => {
    if (importSuccessMessage) {
      const timer = setTimeout(() => setImportSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [importSuccessMessage]);

  return (
    <div className="bg-[#111] rounded-xl border border-gray-800 p-5 shadow-md space-y-6 relative overflow-hidden">
      {/* Backup Prompt Modal */}
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

      {/* Backup Modal */}
      {showBackup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur">
          <div className="bg-zinc-900 rounded-lg p-6 w-[90vw] max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">Wallet Backup</h2>
              <button onClick={() => setShowBackup(false)} className="text-gray-400 hover:text-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4 text-sm text-red-200">
                <p className="font-bold mb-2">⚠️ Important Security Warning</p>
                <p>Anyone with access to your backup file can control your wallet and all funds in it.</p>
                <p className="mt-2">Store your backup securely and never share it with anyone.</p>
              </div>

              <button
                onClick={handleBackup}
                className="w-full bg-red-600 text-white py-2 px-4 rounded-full hover:bg-red-700 font-bold"
              >
                Download Backup File
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Overlay Modal for Export Private Key */}
      {showExportOverlay && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/80 backdrop-blur rounded-xl shadow-lg">
          <div className="flex flex-col items-center w-full px-4 py-6">
            {!privateKeyRevealed ? (
              <>
                <div className="text-red-400 font-bold text-center mb-4">
                  ⚠️ Obtaining a private key is the same as obtaining ownership of the asset.<br />
                  Do not disclose it to others and keep a backup!
                </div>
                <button
                  onClick={handleRevealPrivateKey}
                  className="w-full bg-blazr-red text-white font-bold py-2 rounded-md shadow hover:bg-red-700 transition-all mb-2"
                >
                  Reveal Private Key
                </button>
                <button
                  onClick={handleHideKey}
                  className="w-full border border-gray-500 text-gray-200 font-bold py-2 rounded-md shadow hover:bg-gray-800 transition-all"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <div className="break-all font-mono bg-black/60 p-3 rounded mb-3 text-xs text-white w-full text-center select-all">
                  {base58PrivateKey}
                </div>
                <button
                  onClick={handleCopyPrivateKey}
                  className="w-full bg-blazr-red text-white font-bold py-2 rounded-md shadow hover:bg-red-700 transition-all mb-2"
                >
                  {privateKeyCopied ? 'Copied!' : 'Copy Private Key'}
                </button>
                <button
                  onClick={handleHideKey}
                  className="w-full border border-gray-500 text-gray-200 font-bold py-2 rounded-md shadow hover:bg-gray-800 transition-all"
                >
                  Hide Key
                </button>
              </>
            )}
          </div>
        </div>
      )}
      {/* Wallet Content (blurred if overlay is open) */}
      <div className={showExportOverlay || showBackupPrompt || showBackup ? 'pointer-events-none blur-sm select-none' : ''}>
        <div className="text-center">
          <div className="text-xs text-gray-100 mb-1">Wallet Address</div>
          <div className="font-mono text-sm text-white break-all">
            {address ? (
              <>
                {address.slice(0, 6)}...{address.slice(-4)}
                <div className="text-xs text-gray-400 mt-1">{address}</div>
              </>
            ) : (
              <span className="text-gray-500">Loading...</span>
            )}
          </div>
        </div>
        <div className="flex justify-center">
          <div className="bg-black p-4 rounded-lg border border-gray-800">
            {/* QR Code will be rendered here */}
            <div className="w-32 h-32 bg-gray-900 rounded-lg flex items-center justify-center text-gray-700 text-xs break-all">
              {address ? (
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=128x128&data=${address}`}
                  alt="Wallet QR"
                  className="w-28 h-28 object-contain"
                />
              ) : 'QR'}
            </div>
          </div>
        </div>
        <div className="flex justify-center space-x-4 mt-4">
          <button
            onClick={handleCopyAddress}
            className="px-4 py-2 bg-blazr-red text-white font-bold rounded-full shadow-md hover:bg-red-700 hover:shadow-red-500/60 transition-all relative"
          >
            {copied ? 'Copied!' : 'Copy Address'}
          </button>
          <button
            onClick={handleExportPrivateKey}
            className="px-4 py-2 bg-black border border-blazr-red text-blazr-red font-bold rounded-full shadow-md hover:bg-red-900 hover:text-white hover:shadow-red-500/60 transition-all"
          >
            Export Private Key
          </button>
        </div>
        <div className="flex justify-center mt-4">
          <span className="text-white text-lg font-bold">{balance !== null ? balance.toFixed(4) : '0.0000'} SOL</span>
        </div>
      </div>
      {/* Import Wallet Button */}
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
        <div className="mb-4 p-3 rounded-md bg-green-700/30 border border-green-500 text-green-300 text-sm">
          {importSuccessMessage}
        </div>
      )}
      {/* Import Private Key Modal */}
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
                className="flex-1 bg-red-600 text-white py-2 px-4 rounded-full hover:bg-red-700 font-semibold"
              >
                Import
              </button>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setPrivateKeyInput('');
                  setImportError(null);
                }}
                className="flex-1 bg-zinc-700 text-gray-300 py-2 px-4 rounded-full hover:bg-zinc-600 hover:text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// TradeView component
const TradeView: React.FC<{ 
  solBalance: number | null;
  tokenMetadataCache: TokenMetadataCache;
}> = ({ solBalance, tokenMetadataCache }) => {
  const [tokens, setTokens] = useState<Array<{
    name: string;
    symbol: string;
    address: string;
    balance: string;
    decimals: number;
    logo?: string;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedToken, setSelectedToken] = useState<{
    name: string;
    symbol: string;
    address: string;
    balance: string;
    decimals: number;
    logo?: string;
  } | null>(null);
  const [isSwapModalOpen, setIsSwapModalOpen] = useState(false);

  const loadTokensInternal = async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);

      // Load wallet from storage
      const storage = await getWalletFromStorage();
      if (!storage.blazr_wallet) {
        throw new Error('Wallet not found');
      }

      // Fetch token accounts
      const tokenAccounts = await fetchTokenAccountsFromHeliusRpc(storage.blazr_wallet.publicKey);
      
      // Process token accounts
      const processedTokens = tokenAccounts.map(account => {
        const parsedInfo = account.account.data.parsed.info;
        const mint = parsedInfo.mint;
        const amount = parsedInfo.tokenAmount;
        
        return {
          address: mint,
          balance: amount.uiAmount?.toString() || '0',
          decimals: amount.decimals
        };
      }).filter(token => parseFloat(token.balance) > 0);

      // Fetch metadata for tokens
      const mintAccounts = processedTokens.map(t => t.address);
      const metadata = await fetchTokenMetadataFromHelius(mintAccounts);

      // Combine token data with metadata
      const tokensWithMetadata = processedTokens.map(token => {
        const meta = metadata[token.address] || {};
        return {
          ...token,
          name: meta.name || 'Unknown Token',
          symbol: meta.symbol || '???',
          logo: meta.logoURI
        };
      });

      setTokens(tokensWithMetadata);
    } catch (err: any) {
      console.error('Error loading tokens:', err);
      setError(err.message || 'Failed to load tokens');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTokensInternal();
  }, []);

  const handleSwap = (token: {
    name: string;
    symbol: string;
    address: string;
    balance: string;
    decimals: number;
    logo?: string;
  }) => {
    setSelectedToken(token);
    setIsSwapModalOpen(true);
  };

  return (
    <div className="bg-[#111] rounded-xl border border-gray-800 p-5 shadow-md">
      <h2 className="text-xl font-bold mb-4">Trade</h2>
      {loading ? (
        <div className="text-center py-4">Loading tokens...</div>
      ) : error ? (
        <div className="text-red-500 text-center py-4">{error}</div>
      ) : tokens.length === 0 ? (
        <div className="text-center py-4">No tokens found</div>
      ) : (
        <div className="space-y-4">
          {tokens.map(token => (
            <div key={token.address} className="flex items-center justify-between p-3 bg-black/50 rounded-lg">
              <div className="flex items-center space-x-3">
                {token.logo ? (
                  <img src={token.logo} alt={token.symbol} className="w-8 h-8 rounded-full" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
                    {token.symbol[0]}
                  </div>
                )}
                <div>
                  <div className="font-bold">{token.name}</div>
                  <div className="text-sm text-gray-400">{token.symbol}</div>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <div className="font-bold">{token.balance}</div>
                  <div className="text-sm text-gray-400">{token.address.slice(0, 4)}...{token.address.slice(-4)}</div>
                </div>
                <button
                  onClick={() => handleSwap(token)}
                  className="bg-blazr-red text-white px-4 py-2 rounded-full hover:bg-red-700 transition-colors"
                >
                  Swap
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Swap Modal */}
      {selectedToken && (
        <SwapModal
          isOpen={isSwapModalOpen}
          onClose={() => setIsSwapModalOpen(false)}
          tokenAddress={selectedToken.address}
          tokenSymbol={selectedToken.symbol}
          solBalance={solBalance}
        />
      )}
    </div>
  );
};

// MyTokensView component
const MyTokensView: React.FC<{ 
  setCurrentView: (view: View) => void; 
  tokenMetadataCache: TokenMetadataCache; 
  setTokenMetadataCache: React.Dispatch<React.SetStateAction<TokenMetadataCache>>; 
  tokenCache: TokenCacheData | null; 
  setTokenCache: React.Dispatch<React.SetStateAction<TokenCacheData | null>> 
}> = ({ setCurrentView, tokenMetadataCache, setTokenMetadataCache, tokenCache, setTokenCache }) => {
  const [tokens, setTokens] = useState<Array<{
    name: string;
    symbol: string;
    address: string;
    balance: string;
    decimals: number;
    logo?: string;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [solanaTokenList, setSolanaTokenList] = useState<Record<string, SolanaToken>>({});

  const loadTokensInternal = async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);

      // Load wallet from storage
      const storage = await getWalletFromStorage();
      if (!storage.blazr_wallet) {
        throw new Error('Wallet not found');
      }

      // Fetch token accounts
      const tokenAccounts = await fetchTokenAccountsFromHeliusRpc(storage.blazr_wallet.publicKey);
      
      // Process token accounts
      const processedTokens = tokenAccounts.map(account => {
        const parsedInfo = account.account.data.parsed.info;
        const mint = parsedInfo.mint;
        const amount = parsedInfo.tokenAmount;
        
        return {
          address: mint,
          balance: amount.uiAmount?.toString() || '0',
          decimals: amount.decimals
        };
      }).filter(token => parseFloat(token.balance) > 0);

      // Fetch metadata for tokens
      const mintAccounts = processedTokens.map(t => t.address);
      const metadata = await fetchTokenMetadataFromHelius(mintAccounts);

      // Combine token data with metadata
      const tokensWithMetadata = processedTokens.map(token => {
        const meta = metadata[token.address] || {};
        return {
          ...token,
          name: meta.name || 'Unknown Token',
          symbol: meta.symbol || '???',
          logo: meta.logoURI
        };
      });

      setTokens(tokensWithMetadata);
    } catch (err: any) {
      console.error('Error loading tokens:', err);
      setError(err.message || 'Failed to load tokens');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTokensInternal();
  }, []);

  return (
    <div className="bg-[#111] rounded-xl border border-gray-800 p-5 shadow-md">
      <h2 className="text-xl font-bold mb-4">My Tokens</h2>
      {loading ? (
        <div className="text-center py-4">Loading tokens...</div>
      ) : error ? (
        <div className="text-red-500 text-center py-4">{error}</div>
      ) : tokens.length === 0 ? (
        <div className="text-center py-4">No tokens found</div>
      ) : (
        <div className="space-y-4">
          {tokens.map(token => (
            <div key={token.address} className="flex items-center justify-between p-3 bg-black/50 rounded-lg">
              <div className="flex items-center space-x-3">
                {token.logo ? (
                  <img src={token.logo} alt={token.symbol} className="w-8 h-8 rounded-full" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
                    {token.symbol[0]}
                  </div>
                )}
                <div>
                  <div className="font-bold">{token.name}</div>
                  <div className="text-sm text-gray-400">{token.symbol}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold">{token.balance}</div>
                <div className="text-sm text-gray-400">{token.address.slice(0, 4)}...{token.address.slice(-4)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Add these helper functions at the top of the file
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
