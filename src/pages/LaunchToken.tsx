import React, { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon, ChevronUpIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { resizeImageToSquare, validateImage } from '../utils/imageProcessing';
import * as web3Js from '@solana/web3.js';
import { getWalletFromStorage } from '../utils/wallet';
import { scrapePageData, mapScrapedDataToForm } from '../utils/webScraper';
import { TokenFormData } from '../types/token';
import { API_ENDPOINTS } from '../config/api';
import SuccessModal from '../components/SuccessModal';

type FormState = {
  [K in keyof TokenFormData]: string;
};

const LaunchToken: React.FC = () => {
  const [showSocial, setShowSocial] = useState(false);
  const [form, setForm] = useState<FormState>({
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

  useEffect(() => {
    const initializeForm = async () => {
      try {
        const scrapedData = await scrapePageData();
        const formData = mapScrapedDataToForm(scrapedData);
        
        // Convert all values to strings
        const stringifiedData = Object.fromEntries(
          Object.entries(formData).map(([key, value]) => [key, String(value || '')])
        ) as FormState;
        
        setForm(prev => ({
          ...prev,
          ...stringifiedData
        }));

        // If we got an image URL from scraping, fetch and set it
        if (formData.image) {
          try {
            const response = await fetch(formData.image);
            const blob = await response.blob();
            const file = new File([blob], 'scraped-image.jpg', { type: blob.type });
            setImageFile(file);
            setImagePreview(formData.image);
          } catch (error) {
            console.error('Error fetching scraped image:', error);
          }
        }
      } catch (error) {
        console.error('Error initializing form with scraped data:', error);
      }
    };

    initializeForm();
  }, []);

  useEffect(() => {
    chrome.storage?.local?.get(['tokenData'], (result) => {
      if (result.tokenData) {
        // Convert all values to strings for the form
        const stringifiedData = Object.fromEntries(
          Object.entries(result.tokenData).map(([key, value]) => [key, String(value || '')])
        ) as FormState;
        setForm(prev => ({ ...prev, ...stringifiedData }));
        // If we got an image URL, set the preview
        if (result.tokenData.image) {
          setImagePreview(result.tokenData.image);
        }
      }
    });
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = e.target.value || '';
    setForm(prev => ({ ...prev, [e.target.name]: value }));
    setErrors(prev => ({ ...prev, [e.target.name]: '' }));
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploading(true);
      setUploadError(null);
      try {
        validateImage(file);
      } catch (validationError: any) {
        setUploadError(validationError.message);
        return;
      }
      const resizedImage = await resizeImageToSquare(file);
      setImageFile(resizedImage);
      const previewUrl = URL.createObjectURL(resizedImage);
      setImagePreview(previewUrl);
      setForm(prev => ({ ...prev, image: previewUrl }));
      setSuccessMessage('Image ready for upload!');
    } catch (err: any) {
      setUploadError(err.message || 'Failed to process image');
    } finally {
      setIsUploading(false);
    }
  };

  const handleLaunchClick = (e: React.FormEvent) => {
    console.log('[LaunchToken] Launch button clicked');
    e.preventDefault();
    const newErrors: { [key: string]: string } = {};
    if (!form.name.trim()) newErrors.name = '* Token name is required';
    if (!form.ticker.trim() || form.ticker.length < 3 || form.ticker.length > 7) newErrors.ticker = '* Ticker must be 3-7 letters';
    if (!form.description.trim()) newErrors.description = '* Description is required';
    if (!imageFile && !form.image) newErrors.image = '* Token image is required (upload an image file)';
    setErrors(newErrors);
    if (Object.keys(newErrors).length === 0) setShowModal(true);
    console.log('[LaunchToken] Validation errors:', newErrors);
  };

  // Add a helper to convert image URL to base64
  const urlToBase64 = async (url: string): Promise<string> => {
    const response = await fetch(url);
    const blob = await response.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const launchToken = async (buyAmount: string) => {
    console.log('[LaunchToken] Starting launchToken with amount:', buyAmount);
    setLaunching(true);
    setLaunchError(null);
    setLaunchSuccess(null);
    try {
      let kp: web3Js.Keypair | null = null;
      const storage = await getWalletFromStorage();
      if (storage.blazr_wallet) {
        kp = web3Js.Keypair.fromSecretKey(Uint8Array.from(storage.blazr_wallet.secretKey));
      } else {
        throw new Error('Wallet not found');
      }
      const mintKeypair = web3Js.Keypair.generate();
      let fileToUpload = imageFile;
      let imageBase64 = '';
      // If no file but we have a form.image (URL), fetch and convert to File
      if (!fileToUpload && form.image) {
        try {
          const response = await fetch(form.image);
          const blob = await response.blob();
          const fileName = form.image.split('/').pop() || 'scraped-image.jpg';
          fileToUpload = new File([blob], fileName, { type: blob.type });
          setImageFile(fileToUpload);
        } catch (err) {
          setLaunchError('Failed to process prefilled image for upload.');
          setLaunching(false);
          return;
        }
      }
      // Convert fileToUpload to base64
      if (fileToUpload) {
        imageBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(fileToUpload!);
        });
      } else {
        setLaunchError('No valid image file to upload.');
        setLaunching(false);
        return;
      }
      const toBase64 = (arr: Uint8Array) => {
        const bytes = Array.from(arr);
        const binary = bytes.map(byte => String.fromCharCode(byte)).join('');
        return btoa(binary);
      };
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
      const tradeRes = await fetch(API_ENDPOINTS.TRADE_LOCAL, {
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
          throw new Error(`Pump Portal API error: ${tradeRes.status} ${tradeRes.statusText}. Response: ${errorText.substring(0, 200)}...`);
        }
        throw new Error(errorData.details || errorData.error || errorData.message || 'Pump Portal API error');
      }
      const txBuffer = await tradeRes.arrayBuffer();
      const tx = web3Js.VersionedTransaction.deserialize(new Uint8Array(txBuffer));
      const connection = new web3Js.Connection('https://greatest-lingering-forest.solana-mainnet.quiknode.pro/7d9cdaae49e7f160cc664e2070e978a345de47d0/');
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('finalized');
      tx.message.recentBlockhash = blockhash;
      tx.sign([mintKeypair, kp]);
      try {
        const signature = await connection.sendTransaction(tx, {
          maxRetries: 3,
          preflightCommitment: 'confirmed',
          skipPreflight: false
        });
        const confirmation = await Promise.race([
          connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed'),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Transaction confirmation timeout')), 30000))
        ]) as any;
        if (confirmation.value.err) {
          throw new Error('Transaction failed: ' + JSON.stringify(confirmation.value.err));
        }
        setSuccessDetails({ name: form.name, contract: mintKeypair.publicKey.toBase58(), signature });
        setShowSuccessModal(true);
        setLaunchSuccess({ name: form.name, signature, tokenLink: `https://solscan.io/tx/${signature}` });
        // Clear form and storage
        setForm({ name: '', ticker: '', description: '', image: '', website: '', twitter: '', telegram: '' });
        setImageFile(null);
        setImagePreview(null);
        if (typeof chrome !== 'undefined' && chrome.storage?.local) {
          chrome.storage.local.remove('tokenData');
        }
        console.log('[LaunchToken] Launch successful, form and storage cleared.');
      } catch (err: any) {
        if (err.message.includes('memory allocation failed') || err.message.includes('insufficient compute units') || err.message.includes('out of memory')) {
          throw new Error('Transaction failed: Insufficient compute units. Please try again with a smaller initial buy amount.');
        }
        throw err;
      }
    } catch (err: any) {
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
      setLaunchError(error.message || 'Failed to launch token');
    }
  };

  const handleModalCancel = () => {
    setShowModal(false);
    setSolError('');
  };

  const handleReset = () => {
    setForm({ name: '', ticker: '', description: '', image: '', website: '', twitter: '', telegram: '' });
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
    <div className="flex flex-col items-center px-4 pt-6 pb-20 min-h-[500px]">
      <h2 className="text-2xl font-bold text-white mb-4">Launch Token</h2>
      {showSuccessModal && successDetails && (
        <SuccessModal
          title="Token Launched!"
          message={`'${successDetails.name}' has been successfully deployed to Solana.`}
          details={[
            { label: 'Contract', value: successDetails.contract, copy: true },
            { label: 'Tx Signature', value: successDetails.signature, copy: true },
          ]}
          links={[
            { label: 'View on Pump.fun', url: `https://pump.fun/coin/${successDetails.contract}` },
            { label: 'View on Solscan', url: `https://solscan.io/tx/${successDetails.signature}` },
          ]}
          buttons={[
            {
              label: 'Copy All',
              onClick: () => {
                const details = `Token Name: ${successDetails.name}\nContract: ${successDetails.contract}\nTx: ${successDetails.signature}\nPump.fun: https://pump.fun/coin/${successDetails.contract}\nSolscan: https://solscan.io/tx/${successDetails.signature}`;
                navigator.clipboard.writeText(details);
              },
            },
            { label: 'Launch Another', onClick: handleReset },
            { label: 'Done', onClick: () => setShowSuccessModal(false) },
          ]}
          onClose={() => setShowSuccessModal(false)}
        />
      )}
      {launchError && (
        <div className="bg-red-900/80 border border-red-500 text-white rounded-xl p-4 mb-4 text-center">
          <div className="font-bold text-lg mb-2">Error</div>
          <div>{launchError}</div>
        </div>
      )}
      <form className="bg-[#181818] rounded-2xl border border-gray-800 p-6 space-y-4 shadow-md w-full max-w-md" onSubmit={handleLaunchClick}>
        <FormField label="Token Name" name="name" type="text" placeholder="Solana Doge" value={form.name} onChange={handleChange} inputClass={`h-12 py-2 ${errors.name ? 'border-red-600 ring-2 ring-red-600' : ''}`} error={errors.name} />
        <FormField
          label="Token Ticker (7 chars max)"
          name="ticker"
          type="text"
          placeholder="$DOGE"
          maxLength={7}
          value={form.ticker}
          onChange={handleChange}
          inputClass={`h-12 py-2 ${errors.ticker ? 'border-red-600 ring-2 ring-red-600' : ''}`}
          error={errors.ticker}
        />
        <FormField label="Token Description" name="description" type="textarea" placeholder="Tell us about your meme token..." value={form.description} onChange={handleChange} inputClass={`h-24 py-2 ${errors.description ? 'border-red-600 ring-2 ring-red-600' : ''}`} error={errors.description} />
        {/* Image Upload */}
        <div className="mb-6">
          <label className="block text-[#FF3131] font-bold text-xs mb-2">Token Image</label>
          <div className="flex flex-col space-y-4">
            <div className="relative">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
                id="image-upload"
                disabled={isUploading}
                ref={fileInputRef}
              />
              <label
                htmlFor="image-upload"
                className={`flex items-center justify-center w-full h-32 rounded-xl border-2 border-dashed ${
                  isUploading
                    ? 'border-gray-600 bg-[#181818] cursor-not-allowed'
                    : 'border-[#FF3131] bg-[#181818] hover:bg-[#222] cursor-pointer'
                } transition-colors`}
              >
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Token preview"
                    className="w-full h-full object-cover rounded-xl"
                  />
                ) : (
                  <div className="text-center">
                    <div className="text-gray-400 mb-2">
                      {isUploading ? (
                        <div className="flex items-center justify-center">
                          <svg className="animate-spin h-5 w-5 text-[#FF3131]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        </div>
                      ) : (
                        <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      )}
                    </div>
                    <p className="text-sm text-gray-400">
                      {isUploading ? 'Uploading...' : 'Click to upload image'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">PNG, JPG up to 2MB</p>
                  </div>
                )}
              </label>
              {imagePreview && (
                <button
                  type="button"
                  onClick={() => {
                    setImagePreview(null);
                    setImageFile(null);
                    setForm(prev => ({ ...prev, image: '' }));
                  }}
                  className="absolute top-2 right-2 p-1 bg-black/50 rounded-full hover:bg-black/70 transition-colors"
                >
                  <XMarkIcon className="h-5 w-5 text-white" />
                </button>
              )}
            </div>
            {uploadError && (
              <div className="text-red-500 text-sm bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                {uploadError}
              </div>
            )}
            {successMessage && (
              <div className="text-green-500 text-sm bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                {successMessage}
              </div>
            )}
          </div>
        </div>
        {/* Social Links Collapsible */}
        <div className="mb-6">
          <button
            type="button"
            onClick={() => setShowSocial((v) => !v)}
            className="flex items-center text-[#FF3131] font-bold text-sm mb-4 focus:outline-none select-none hover:text-red-600 transition-colors"
          >
            {showSocial ? (
              <ChevronUpIcon className="w-5 h-5 mr-2" />
            ) : (
              <ChevronDownIcon className="w-5 h-5 mr-2" />
            )}
            {showSocial ? 'Hide Social Links' : 'Add Social Links (Optional)'}
          </button>
          <div
            className={`space-y-4 transition-all duration-300 ease-in-out ${
              showSocial ? 'opacity-100 max-h-[500px]' : 'opacity-0 max-h-0 overflow-hidden'
            }`}
          >
            <FormField
              label="Website URL"
              name="website"
              type="url"
              placeholder="https://..."
              value={form.website ?? ''}
              onChange={handleChange}
              inputClass="h-12 py-2 pl-10"
              icon={
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                  </svg>
                </span>
              }
            />
            <FormField
              label="Twitter/X"
              name="twitter"
              type="text"
              placeholder="@username"
              value={form.twitter ?? ''}
              onChange={handleChange}
              inputClass="h-12 py-2 pl-10"
              icon={
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </span>
              }
            />
            <FormField
              label="Telegram"
              name="telegram"
              type="text"
              placeholder="t.me/yourtoken"
              value={form.telegram ?? ''}
              onChange={handleChange}
              inputClass="h-12 py-2 pl-10"
              icon={
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.2-.04-.28-.02-.12.02-1.96 1.25-5.54 3.69-.52.36-1 .53-1.42.52-.47-.01-1.37-.26-2.03-.48-.82-.27-1.47-.42-1.42-.88.03-.25.38-.51 1.05-.78 4.12-1.79 6.87-2.97 8.26-3.54 3.93-1.63 4.75-1.91 5.41-1.91.12 0 .38.03.55.17.14.12.18.28.2.45-.02.05-.02.31-.17 1.2z" />
                  </svg>
                </span>
              }
            />
          </div>
        </div>
        <button type="submit" className="w-full bg-[#FF3131] text-white font-bold py-3 rounded-full mt-2 shadow-md hover:bg-red-700 transition-all text-base" disabled={launching}>{launching ? 'Launching...' : 'Launch Token'}</button>
      </form>
      {/* Confirmation Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="bg-black border-2 border-[#FF3131] rounded-2xl shadow-2xl p-6 w-[90vw] max-w-xs flex flex-col items-center animate-fadeIn">
            <div className="text-lg font-bold text-white mb-2">Enter Initial Buy Amount</div>
            <div className="text-sm text-gray-400 mb-2">Enter 0 to create token without buying</div>
            <input type="number" min="0" step="0.00000001" placeholder="e.g. 0.01 or 0" value={solAmount} onChange={e => setSolAmount(e.target.value)} className="w-full rounded-lg bg-[#181818] border border-gray-700 focus:border-[#FF3131] focus:ring-1 focus:ring-[#FF3131] text-white placeholder-gray-400 px-4 py-3 mb-2 mt-2 text-center" />
            {solError && <div className="text-red-500 text-xs mb-2">{solError}</div>}
            <div className="flex w-full space-x-2 mt-2">
              <button className="flex-1 bg-[#FF3131] text-white font-bold py-2 rounded-md shadow-md hover:bg-red-700 transition-all" onClick={handleModalConfirm} type="button">{parseFloat(solAmount) === 0 ? 'Create Token' : 'Create & Buy'}</button>
              <button className="flex-1 bg-gray-800 text-[#FF3131] border border-[#FF3131] font-bold py-2 rounded-md shadow-md hover:bg-gray-700 transition-all" onClick={handleModalCancel} type="button">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

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
  <div className="mb-4">
    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    <div className="relative">
      {icon && <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">{icon}</div>}
      {type === 'textarea' ? (
        <textarea
          name={name}
          placeholder={placeholder}
          value={value ?? ''}
          onChange={onChange}
          className={`w-full px-3 py-2 border rounded-md bg-[#181818] text-white ${inputClass} ${error ? 'border-red-500' : 'border-gray-300'}`}
        />
      ) : (
        <input
          type={type}
          name={name}
          placeholder={placeholder}
          maxLength={maxLength}
          value={value ?? ''}
          onChange={onChange}
          className={`w-full px-3 py-2 border rounded-md bg-[#181818] text-white ${inputClass} ${error ? 'border-red-500' : 'border-gray-300'}`}
        />
      )}
    </div>
    {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
  </div>
);

export default LaunchToken; 