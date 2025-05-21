/*
// Swaps hooks temporarily disabled due to build errors and unused feature.
*/

import { useState, useEffect } from 'react';
import {
  getSwapQuote,
  executeSwap,
  getSwapStats,
  getSwapStatus
} from './api';
import {
  SwapQuote,
  SwapTransaction,
  SwapHistoryResponse,
  SwapHistoryParams,
  SwapStats
} from './types';

export function useSwapQuote(
  inputMint: string,
  outputMint: string,
  amount: number,
  slippage: number = 1
) {
  const [state, setState] = useState<{
    quote: SwapQuote | null;
    isLoading: boolean;
    error: string | null;
  }>({
    quote: null,
    isLoading: false,
    error: null
  });

  const fetchQuote = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      const quote = await getSwapQuote(inputMint, outputMint, String(amount));
      setState({
        quote,
        isLoading: false,
        error: null
      });
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to get swap quote'
      }));
    }
  };

  useEffect(() => {
    if (inputMint && outputMint && amount) {
      fetchQuote();
    }
  }, [inputMint, outputMint, amount, slippage]);

  return {
    ...state,
    refresh: fetchQuote
  };
}

export function useSwapStats(publicKey: string) {
  const [state, setState] = useState<{
    stats: SwapStats | null;
    isLoading: boolean;
    error: string | null;
  }>({
    stats: null,
    isLoading: false,
    error: null
  });

  const fetchStats = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      const stats = await getSwapStats(publicKey);
      setState({
        stats,
        isLoading: false,
        error: null
      });
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to fetch swap stats'
      }));
    }
  };

  useEffect(() => {
    if (publicKey) {
      fetchStats();
    }
  }, [publicKey]);

  return {
    ...state,
    refresh: fetchStats
  };
}

export function useSwapStatus(signature: string) {
  const [state, setState] = useState<{
    status: SwapTransaction['status'] | null;
    isLoading: boolean;
    error: string | null;
  }>({
    status: null,
    isLoading: false,
    error: null
  });

  const fetchStatus = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      const status = await getSwapStatus(signature);
      setState({
        status,
        isLoading: false,
        error: null
      });
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to fetch swap status'
      }));
    }
  };

  useEffect(() => {
    if (signature) {
      fetchStatus();
      const interval = setInterval(fetchStatus, 5000); // Poll every 5 seconds
      return () => clearInterval(interval);
    }
  }, [signature]);

  return {
    ...state,
    refresh: fetchStatus
  };
}

export {}; 