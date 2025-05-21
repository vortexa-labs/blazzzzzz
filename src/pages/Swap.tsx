/*
// Swap page temporarily disabled due to build errors and unused feature.
*/ 

import React, { useState, useEffect } from 'react';
import { useSwap } from '../services/swap/hooks';
import { getWalletFromStorage } from '../utils/wallet';
import { Loader2 } from 'lucide-react';
import { getSwapQuote } from '../services/swap/api';

interface Token {
  mint: string;
  symbol: string;
  name: string;
  image?: string;
  balance: number;
}

const Swap: React.FC = () => {
  const { isLoading, error, performSwap } = useSwap();
  const [tokens, setTokens] = useState<Token[]>([]);
  const [fromToken, setFromToken] = useState<Token | null>(null);
  const [toToken, setToToken] = useState<Token | null>(null);
  const [amount, setAmount] = useState('');
  const [swapError, setSwapError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [toAmount, setToAmount] = useState('');

  // Helper to identify base tokens
  const BASE_SYMBOLS = ['SOL', 'USDC', 'USDT'];

  useEffect(() => {
    const fetchTokens = async () => {
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
        setTokens(response.tokens as Token[]);
        setFromToken(response.tokens[0] || null);
        setToToken(response.tokens[1] || null);
      } catch (e) {
        setSwapError('Failed to load tokens');
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

  const handleMax = () => {
    if (!fromToken) return;
    
    let maxAmount = fromToken.balance;
    
    // If the token is SOL, leave some for transaction fees
    if (fromToken.symbol === 'SOL') {
      maxAmount = Math.max(0, fromToken.balance - 0.01); // Leave 0.01 SOL for fees
    }
    
    // Format to 6 decimal places to avoid floating point issues
    setAmount(maxAmount.toFixed(6));
  };

  // Filter To tokens based on From selection
  const getToTokens = () => {
    if (!fromToken) return tokens;
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
        action: 'sell' as 'sell', // or 'buy' as 'buy' depending on your logic
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
        setSuccess('Swap successful! Signature: ' + result.signature);
      } else {
        setSwapError(result?.error || 'Swap failed');
      }
    } catch (e: any) {
      setSwapError(e.message || 'Swap failed');
    }
  };

  return (
    <div className="flex flex-col min-h-[500px] bg-[#0f0f0f] text-white p-6">
      <h1 className="text-2xl font-bold mb-2">Swap</h1>
      <p className="text-gray-400 mb-6">Swap tokens instantly</p>
      <div className="mb-4">
        {/* FROM ROW */}
        <div className="flex items-center justify-between bg-[#181818] rounded-xl p-4 mb-2">
          {/* Token selector */}
          <div className="flex items-center gap-3">
            {fromToken?.image ? (
              <img src={fromToken.image} alt={fromToken.symbol} className="w-10 h-10 rounded-full" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center">
                <span className="text-white text-lg font-bold">{fromToken?.symbol[0]}</span>
              </div>
            )}
            <select
              className="bg-transparent text-white outline-none border-none appearance-none cursor-pointer font-bold text-lg"
              value={fromToken?.mint || ''}
              onChange={e => {
                const token = tokens.find(t => t.mint === e.target.value);
                setFromToken(token || null);
              }}
            >
              {tokens.map(token => (
                <option key={token.mint} value={token.mint} className="text-black">
                  {token.symbol}
                </option>
              ))}
            </select>
          </div>
          {/* Amount input */}
          <div className="flex flex-col items-end">
            <div className="text-xs text-gray-400 mb-1 flex items-center gap-2">
              <span>{fromToken?.balance?.toFixed(6) || '0.00'}</span>
              <button className="text-[#14F195] font-bold ml-1" onClick={handleMax} type="button">MAX</button>
            </div>
            <input
              type="number"
              min="0"
              step="any"
              className="bg-transparent text-2xl font-bold text-right outline-none border-none w-24"
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
        <div className="flex items-center justify-between bg-[#181818] rounded-xl p-4 mt-2">
          {/* Token selector */}
          <div className="flex items-center gap-3">
            {toToken?.image ? (
              <img src={toToken.image} alt={toToken.symbol} className="w-10 h-10 rounded-full" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center">
                <span className="text-white text-lg font-bold">{toToken?.symbol[0]}</span>
              </div>
            )}
            <select
              className="bg-transparent text-white outline-none border-none appearance-none cursor-pointer font-bold text-lg"
              value={toToken?.mint || ''}
              onChange={e => {
                const token = tokens.find(t => t.mint === e.target.value);
                setToToken(token || null);
              }}
            >
              {getToTokens().map(token => (
                <option key={token.mint} value={token.mint} className="text-black">
                  {token.symbol}
                </option>
              ))}
            </select>
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
              className="bg-transparent text-2xl font-bold text-right outline-none border-none w-24"
              placeholder="0.00"
              value={toAmount}
              readOnly
            />
          </div>
        </div>
      </div>
      {swapError && <div className="text-red-500 mb-2">{swapError}</div>}
      {success && <div className="text-green-500 mb-2">{success}</div>}
      <button
        className="w-full bg-[#FF3131] text-white font-bold py-3 rounded-full mt-2 shadow-md hover:bg-red-700 transition-all text-base disabled:opacity-50"
        onClick={handleSwap}
        disabled={isLoading}
      >
        {isLoading ? <Loader2 className="animate-spin w-5 h-5 mx-auto" /> : 'Swap'}
      </button>
    </div>
  );
};

export default Swap; 