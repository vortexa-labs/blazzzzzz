import { useState, useEffect } from 'react';
import {
  getTokenList,
  getTokenMetadata,
  getTokenBalances,
  getTokenPrice,
  getTokenChart
} from './api';
import {
  Token,
  TokenMetadata,
  TokenBalance,
  TokenListResponse,
  TokenSearchParams
} from './types';

export function useTokenList(params: TokenSearchParams = {}) {
  const [state, setState] = useState<{
    tokens: Token[];
    total: number;
    isLoading: boolean;
    error: string | null;
  }>({
    tokens: [],
    total: 0,
    isLoading: false,
    error: null
  });

  const fetchTokens = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      const response = await getTokenList(params);
      setState({
        tokens: response.tokens,
        total: response.total,
        isLoading: false,
        error: null
      });
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to fetch tokens'
      }));
    }
  };

  useEffect(() => {
    fetchTokens();
  }, [params.query, params.page, params.limit, params.sortBy, params.sortOrder]);

  return {
    ...state,
    refresh: fetchTokens
  };
}

export function useTokenMetadata(mint: string) {
  const [state, setState] = useState<{
    metadata: TokenMetadata | null;
    isLoading: boolean;
    error: string | null;
  }>({
    metadata: null,
    isLoading: false,
    error: null
  });

  const fetchMetadata = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      const metadata = await getTokenMetadata(mint);
      setState({
        metadata,
        isLoading: false,
        error: null
      });
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to fetch token metadata'
      }));
    }
  };

  useEffect(() => {
    if (mint) {
      fetchMetadata();
    }
  }, [mint]);

  return {
    ...state,
    refresh: fetchMetadata
  };
}

export function useTokenBalances(publicKey: string) {
  const [state, setState] = useState<{
    balances: TokenBalance[];
    isLoading: boolean;
    error: string | null;
  }>({
    balances: [],
    isLoading: false,
    error: null
  });

  const fetchBalances = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      const balances = await getTokenBalances(publicKey);
      setState({
        balances,
        isLoading: false,
        error: null
      });
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to fetch token balances'
      }));
    }
  };

  useEffect(() => {
    if (publicKey) {
      fetchBalances();
    }
  }, [publicKey]);

  return {
    ...state,
    refresh: fetchBalances
  };
}

export function useTokenPrice(mint: string) {
  const [state, setState] = useState<{
    price: number | null;
    isLoading: boolean;
    error: string | null;
  }>({
    price: null,
    isLoading: false,
    error: null
  });

  const fetchPrice = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      const price = await getTokenPrice(mint);
      setState({
        price,
        isLoading: false,
        error: null
      });
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to fetch token price'
      }));
    }
  };

  useEffect(() => {
    if (mint) {
      fetchPrice();
      const interval = setInterval(fetchPrice, 30000); // Update every 30 seconds
      return () => clearInterval(interval);
    }
  }, [mint]);

  return {
    ...state,
    refresh: fetchPrice
  };
}

export function useTokenChart(mint: string, timeframe: '1d' | '1w' | '1m' | '1y') {
  const [state, setState] = useState<{
    data: { timestamp: number; price: number }[];
    isLoading: boolean;
    error: string | null;
  }>({
    data: [],
    isLoading: false,
    error: null
  });

  const fetchChartData = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      const data = await getTokenChart(mint, timeframe);
      setState({
        data,
        isLoading: false,
        error: null
      });
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to fetch chart data'
      }));
    }
  };

  useEffect(() => {
    if (mint) {
      fetchChartData();
    }
  }, [mint, timeframe]);

  return {
    ...state,
    refresh: fetchChartData
  };
} 