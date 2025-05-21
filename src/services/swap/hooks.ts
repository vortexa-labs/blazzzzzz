import { useState } from 'react';
import { getSwapQuote, executeSwap } from './api';
import { SwapRequest, SwapQuote } from './types';
import { getWalletFromStorage } from '../../utils/wallet';
import * as web3Js from '@solana/web3.js';

export function useSwap() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quote, setQuote] = useState<SwapQuote | null>(null);

  const getQuote = async (fromToken: string, toToken: string, amount: number) => {
    try {
      setIsLoading(true);
      setError(null);
      const quote = await getSwapQuote(fromToken, toToken, amount);
      setQuote(quote);
      return quote;
    } catch (err: any) {
      setError(err.message || 'Failed to get quote');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const performSwap = async (request: SwapRequest) => {
    try {
      setIsLoading(true);
      setError(null);

      // Get wallet from storage
      const storage = await getWalletFromStorage();
      if (!storage.blazr_wallet) {
        throw new Error('Wallet not found');
      }

      // Create keypair from stored wallet
      const wallet = web3Js.Keypair.fromSecretKey(
        Uint8Array.from(storage.blazr_wallet.secretKey)
      );

      // Execute swap
      const result = await executeSwap(request, wallet);
      
      if (result.status === 'error') {
        throw new Error(result.error);
      }

      return result;
    } catch (err: any) {
      setError(err.message || 'Failed to execute swap');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    error,
    quote,
    getQuote,
    performSwap
  };
} 