/*
// Swap page temporarily disabled due to build errors and unused feature.
*/ 

import React, { useState, useEffect } from 'react';
import { useSwap } from '../services/swap/hooks';
import { getWalletFromStorage } from '../utils/wallet';
import { Loader2 } from 'lucide-react';
import { getSwapQuote } from '../services/swap/api';
import SuccessModal from '../components/SuccessModal';

interface Token {
  mint: string;
  symbol: string;
  name: string;
  image?: string;
  balance: number;
  uiAmount: number;
  usdPrice?: number;
}

const DEFAULT_SOL_TOKEN = {
  mint: 'So11111111111111111111111111111111111111112',
  symbol: 'SOL',
  name: 'Solana',
  image: 'https://cryptologos.cc/logos/solana-sol-logo.png',
  balance: 0,
  uiAmount: 0,
};

const Swap: React.FC = () => {
  const { isLoading, error, performSwap } = useSwap();
  const [tokens, setTokens] = useState<Token[]>([]);
  const [fromToken, setFromToken] = useState<Token | null>(null);
  const [toToken, setToToken] = useState<Token | null>(null);
  const [amount, setAmount] = useState('');
  const [swapError, setSwapError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [toAmount, setToAmount] = useState('');
  const [isLoadingTokens, setIsLoadingTokens] = useState(true);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [swapSuccess, setSwapSuccess] = useState<boolean | null>(null); // true = success, false = fail

  // Helper to identify base tokens
  const BASE_SYMBOLS = ['SOL', 'USDC', 'USDT'];

  // Helper to format USD
  const formatUsd = (value: number) => {
    return '$' + value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  useEffect(() => {
    const fetchTokens = async () => {
      setIsLoadingTokens(true);
      try {
        // Fetch tokens from backend (unified/cached list)
        if (!window?.chrome?.runtime) return;
        const wallet = await getWalletFromStorage();
        if (!wallet?.blazr_wallet) return;
        const publicKey = wallet.blazr_wallet.publicKey;
        const response = await new Promise<{ tokens: Token[] }>((resolve, reject) => {
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
        if (!response.tokens || response.tokens.length === 0) {
          const fallbackSol = { ...DEFAULT_SOL_TOKEN };
          setTokens([fallbackSol]);
          setFromToken(fallbackSol);
          setToToken(null); // Leave toToken empty
          setSwapError(null); // Hide error if just empty wallet
        } else {
          const SOL_LOGO_URL = "@https://turquoise-faithful-whitefish-884.mypinata.cloud/ipfs/bafkreifxayewmnlfvwyydnkkq3f2vgbzk76pcpizfkpj4hlucaczw6kzim";
          const tokensWithSolImage = (response.tokens as Token[]).map(token =>
            token.symbol === 'SOL' && !token.image
              ? { ...token, image: SOL_LOGO_URL }
              : token
          );
          setTokens(tokensWithSolImage);
          setFromToken(tokensWithSolImage[0] || null);
          setToToken(tokensWithSolImage[1] || null);
        }
      } catch (e) {
        setSwapError('Failed to load tokens');
      } finally {
        setIsLoadingTokens(false);
      }
    };
    fetchTokens();
  }, []);

  // Fetch quote for To amount
  useEffect(() => {
    const fetchQuote = async () => {
      if (!fromToken || !toToken || !amount || isNaN(Number(amount)) || Number(amount) <= 0) {
        setToAmount('');
        return;
      }
      try {
        const quote = await getSwapQuote(fromToken.mint, toToken.mint, Number(amount));
        if (quote?.outputAmount) {
          // Format the output amount to 6 decimal places
          const formattedAmount = (Number(quote.outputAmount) / 1e9).toFixed(6);
          setToAmount(formattedAmount);
        } else {
          setToAmount('');
        }
      } catch (e) {
        console.error('Error fetching quote:', e);
        setToAmount('');
      }
    };

    // Add debounce to prevent too many API calls
    const timeoutId = setTimeout(fetchQuote, 500);
    return () => clearTimeout(timeoutId);
  }, [fromToken, toToken, amount]);

  useEffect(() => {
    // Ensure toToken is always a token from the tokens array with the image property set
    if (!fromToken) return;
    const toTokens = getToTokens();
    // If current toToken is not in the new toTokens list, or is missing image, set to first available
    if (!toToken || !toTokens.find(t => t.mint === toToken.mint)) {
      setToToken(toTokens[0] || null);
    } else if (toToken.symbol === 'SOL' && !toToken.image) {
      // If toToken is SOL and missing image, update it from tokens array
      const solWithImage = toTokens.find(t => t.symbol === 'SOL');
      if (solWithImage && solWithImage.image) setToToken(solWithImage);
    }
  }, [fromToken, tokens]);

  const handleMax = () => {
    console.log('MAX button clicked');
    console.log('handleMax clicked, fromToken:', fromToken);
    if (!fromToken) return;
    let maxAmount = fromToken.uiAmount;
    console.log('fromToken.uiAmount:', fromToken.uiAmount);
    // If the token is SOL, leave some for transaction fees
    if (fromToken.symbol === 'SOL') {
      maxAmount = Math.max(0, fromToken.uiAmount - 0.01); // Leave 0.01 SOL for fees
    }
    setAmount(maxAmount.toFixed(6));
    console.log('Amount set to:', maxAmount.toFixed(6));
  };

  // Filter To tokens based on From selection
  const getToTokens = () => {
    if (!fromToken) return tokens;
    if (tokens.length === 1) return tokens; // If only one token, show it
    if (BASE_SYMBOLS.includes(fromToken.symbol)) {
      // If From is SOL/USDC/USDT, To is all tokens except From
      return tokens.filter(t => t.mint !== fromToken.mint);
    } else {
      // If From is any other SPL, To is only SOL/USDC/USDT (except From)
      return tokens.filter(t => BASE_SYMBOLS.includes(t.symbol) && t.mint !== fromToken.mint);
    }
  };

  const handleSwap = async () => {
    setSwapError(null);
    setSuccess(null);
    if (!fromToken || !toToken) {
      setSwapError('Please select both tokens.');
      return;
    }
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      setSwapError('Enter a valid amount.');
      return;
    }
    if (Number(amount) > fromToken.balance) {
      setSwapError('Amount exceeds available balance.');
      return;
    }
    try {
      const wallet = await getWalletFromStorage();
      if (!wallet?.blazr_wallet) throw new Error('Wallet not found');
      const request = {
        publicKey: wallet.blazr_wallet.publicKey,
        action: 'sell' as 'sell',
        mint: fromToken.mint,
        denominatedInSol: 'false' as 'false' | 'true',
        amount: Number(amount),
        slippage: 10,
        priorityFee: 0.00005,
        pool: 'pump',
        computeUnits: 600000,
      };
      const result = await performSwap(request);
      if (result && result.status === 'success') {
        setSwapSuccess(true);
        setShowSuccessModal(true);
      } else {
        setSwapSuccess(false);
        setShowSuccessModal(true);
      }
    } catch (e: any) {
      setSwapSuccess(false);
      setShowSuccessModal(true);
    }
  };

  // In the render, show a spinner or nothing while loading tokens
  if (isLoadingTokens) {
    return (
      <div className="flex flex-col min-h-[500px] w-full max-w-full overflow-x-hidden items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#FF3131]"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[500px] w-full max-w-full bg-[#0f0f0f] text-white p-4" style={{ maxWidth: 400, margin: '0 auto' }}>
      <h1 className="text-2xl font-bold mb-2">Swap</h1>
      <p className="text-gray-400 mb-6">Swap tokens instantly</p>
      <div className="mb-4">
        {/* FROM ROW */}
        <div className="mb-1 text-xs text-gray-400 font-semibold">You Pay</div>
        <div className="flex items-center justify-between bg-[#181818] rounded-xl p-4 mb-2">
          {/* Token selector */}
          <div className="flex items-center gap-3">
            {(tokens.length === 1 && fromToken?.symbol === 'SOL') ? (
              <img src={DEFAULT_SOL_TOKEN.image} alt="SOL" className="w-10 h-10 rounded-full" />
            ) : (fromToken?.image || (fromToken?.symbol === 'SOL' && DEFAULT_SOL_TOKEN.image)) ? (
              <img src={fromToken.image || DEFAULT_SOL_TOKEN.image} alt={fromToken.symbol} className="w-10 h-10 rounded-full" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center">
                <span className="text-white text-lg font-bold">{fromToken?.symbol[0]}</span>
              </div>
            )}
            <div className="flex flex-col">
              <span className="text-xs text-gray-400 font-normal mb-1">
                {fromToken && amount && fromToken.usdPrice
                  ? formatUsd(Number(amount) * (fromToken.usdPrice || 0))
                  : fromToken && fromToken.usdPrice
                    ? formatUsd(0)
                    : '$0.00'}
              </span>
              <select
                className="bg-transparent text-white outline-none border-none appearance-none cursor-pointer font-bold text-lg focus:ring-0 focus:outline-none"
                value={fromToken?.mint || ''}
                onChange={e => {
                  const token = tokens.find(t => t.mint === e.target.value);
                  setFromToken(token || null);
                }}
                style={{ fontWeight: 700, fontSize: '1.125rem', color: 'white', background: 'transparent', border: 'none', padding: 0 }}
              >
                {tokens.map(token => (
                  <option key={token.mint} value={token.mint} style={{ color: 'black', fontWeight: 700 }}>
                    {token.symbol}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {/* Amount input */}
          <div className="flex flex-col items-end">
            <div className="text-xs text-gray-400 mb-1 flex items-center gap-1">
              <button className="text-[#14F195] font-bold px-2 py-1 text-xs rounded hover:bg-[#232323] transition-all" onClick={() => {
                if (!fromToken) return;
                let half = fromToken.uiAmount / 2;
                if (fromToken.symbol === 'SOL') half = Math.max(0, fromToken.uiAmount / 2 - 0.005);
                setAmount(half.toFixed(6));
              }} type="button">50%</button>
              <button className="text-[#14F195] font-bold px-2 py-1 text-xs rounded hover:bg-[#232323] transition-all" onClick={handleMax} type="button">MAX</button>
            </div>
            <input
              type="number"
              min="0"
              step="any"
              className="bg-transparent text-xl font-bold text-right outline-none border-none w-24 no-spinner"
              placeholder="0.00"
              value={amount}
              onChange={e => setAmount(e.target.value)}
            />
          </div>
        </div>
        {/* SWAP ICON */}
        <div className="flex justify-center items-center my-2">
          <div className="bg-[#232323] rounded-full p-2">
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="text-gray-400">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 17l4-4m0 0l-4-4m4 4H7m-4 4V7" />
            </svg>
          </div>
        </div>
        {/* TO ROW */}
        <div className="mb-1 text-xs text-gray-400 font-semibold">You Receive</div>
        <div className="flex items-center justify-between bg-[#181818] rounded-xl p-4 mt-2">
          {/* Token selector */}
          <div className="flex items-center gap-3">
            {toToken ? (
              (toToken.image || (toToken.symbol === 'SOL' && DEFAULT_SOL_TOKEN.image)) ? (
                <img src={toToken.image || DEFAULT_SOL_TOKEN.image} alt={toToken.symbol} className="w-10 h-10 rounded-full" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center">
                  <span className="text-white text-lg font-bold">{toToken.symbol[0]}</span>
                </div>
              )
            ) : null}
            <div className="flex flex-col">
              <span className="text-xs text-gray-400 font-normal mb-1">
                {toToken && toAmount && toToken.usdPrice
                  ? formatUsd(Number(toAmount) * (toToken.usdPrice || 0))
                  : toToken && toToken.usdPrice
                    ? formatUsd(0)
                    : '$0.00'}
              </span>
              {getToTokens().length > 0 && toToken ? (
                <select
                  className="bg-transparent text-white outline-none border-none appearance-none cursor-pointer font-bold text-lg focus:ring-0 focus:outline-none"
                  value={toToken?.mint || ''}
                  onChange={e => {
                    const token = tokens.find(t => t.mint === e.target.value);
                    setToToken(token || null);
                  }}
                  style={{ fontWeight: 700, fontSize: '1.125rem', color: 'white', background: 'transparent', border: 'none', padding: 0 }}
                >
                  {getToTokens().map(token => (
                    <option key={token.mint} value={token.mint} style={{ color: 'black', fontWeight: 700 }}>
                      {token.symbol}
                    </option>
                  ))}
                </select>
              ) : (
                <select
                  className="bg-transparent text-white outline-none border-none appearance-none font-bold text-lg focus:ring-0 focus:outline-none opacity-50 cursor-not-allowed"
                  disabled
                  value=""
                  style={{ fontWeight: 700, fontSize: '1.125rem', color: 'white', background: 'transparent', border: 'none', padding: 0 }}
                >
                  <option value="" disabled>
                    No tokens available
                  </option>
                </select>
              )}
            </div>
          </div>
          {/* Amount input */}
          <div className="flex flex-col items-end">
            <div className="text-xs text-gray-400 mb-1 flex items-center gap-2">
              <span>{toToken?.balance?.toFixed(6) || '0.00'}</span>
            </div>
            <input
              type="number"
              min="0"
              step="any"
              className="bg-transparent text-xl font-bold text-right outline-none border-none w-24 no-spinner"
              placeholder="0.00"
              value={toAmount}
              readOnly
            />
          </div>
        </div>
      </div>
      {swapError && tokens.length > 1 && <div className="text-red-500 mb-2">{swapError}</div>}
      {success && <div className="text-green-500 mb-2">{success}</div>}
      <button
        className="w-full bg-[#FF3131] text-white font-bold py-3 rounded-full mt-2 shadow-md hover:bg-red-700 transition-all text-base disabled:opacity-50"
        onClick={handleSwap}
        disabled={isLoading}
      >
        {isLoading ? <Loader2 className="animate-spin w-5 h-5 mx-auto" /> : 'Swap'}
      </button>
      {/* Success/Failure Modal */}
      {showSuccessModal && (
        <SuccessModal
          title={swapSuccess ? 'Swap Successful!' : 'Swap Failed'}
          message={swapSuccess ? 'Your swap was completed successfully.' : 'There was an error processing your swap.'}
          buttons={[
            { label: 'Done', onClick: () => setShowSuccessModal(false) },
          ]}
          onClose={() => setShowSuccessModal(false)}
        />
      )}
    </div>
  );
};

export default Swap; 