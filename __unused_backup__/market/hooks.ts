/*
// Market hooks temporarily disabled due to build errors and unused feature.
*/

import { useState, useEffect } from 'react';
import {
  getMarketList,
  getMarketData,
  getMarketChart,
  getMarketStats,
  getMarketPrice
} from './api';
// import {
//   MarketData,
//   MarketChart,
//   MarketListResponse,
//   MarketSearchParams,
//   MarketStats
// } from './types';

export function useMarketList(params: MarketSearchParams = {}) {
  const [state, setState] = useState<{
    markets: MarketData[];
    total: number;
    isLoading: boolean;
    error: string | null;
  }>({
    markets: [],
    total: 0,
    isLoading: false,
    error: null
  });

  const fetchMarkets = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      const response = await getMarketList(params);
      setState({
        markets: response.markets,
        total: response.total,
        isLoading: false,
        error: null
      });
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to fetch markets'
      }));
    }
  };

  useEffect(() => {
    fetchMarkets();
  }, [params.query, params.page, params.limit, params.sortBy, params.sortOrder]);

  return {
    ...state,
    refresh: fetchMarkets
  };
}

export function useMarketData(mint: string) {
  const [state, setState] = useState<{
    data: MarketData | null;
    isLoading: boolean;
    error: string | null;
  }>({
    data: null,
    isLoading: false,
    error: null
  });

  const fetchData = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      const data = await getMarketData(mint);
      setState({
        data,
        isLoading: false,
        error: null
      });
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to fetch market data'
      }));
    }
  };

  useEffect(() => {
    if (mint) {
      fetchData();
      const interval = setInterval(fetchData, 30000); // Update every 30 seconds
      return () => clearInterval(interval);
    }
  }, [mint]);

  return {
    ...state,
    refresh: fetchData
  };
}

export function useMarketChart(mint: string, timeframe: '1d' | '1w' | '1m' | '1y') {
  const [state, setState] = useState<{
    chart: MarketChart | null;
    isLoading: boolean;
    error: string | null;
  }>({
    chart: null,
    isLoading: false,
    error: null
  });

  const fetchChart = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      const chart = await getMarketChart(mint, timeframe);
      setState({
        chart,
        isLoading: false,
        error: null
      });
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to fetch market chart'
      }));
    }
  };

  useEffect(() => {
    if (mint) {
      fetchChart();
    }
  }, [mint, timeframe]);

  return {
    ...state,
    refresh: fetchChart
  };
}

export function useMarketStats() {
  const [state, setState] = useState<{
    stats: MarketStats | null;
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
      const stats = await getMarketStats();
      setState({
        stats,
        isLoading: false,
        error: null
      });
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to fetch market stats'
      }));
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  return {
    ...state,
    refresh: fetchStats
  };
}

export function useMarketPrice(mint: string) {
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
      const price = await getMarketPrice(mint);
      setState({
        price,
        isLoading: false,
        error: null
      });
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to fetch market price'
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