import { useState, useEffect } from 'react';
import {
  getTransactionList,
  getTransactionDetails,
  getTransactionStats,
  getTransactionStatus
} from './api';
import {
  Transaction,
  TransactionListResponse,
  TransactionSearchParams,
  TransactionStats
} from './types';

export function useTransactionList(params: TransactionSearchParams) {
  const [state, setState] = useState<{
    transactions: Transaction[];
    total: number;
    isLoading: boolean;
    error: string | null;
  }>({
    transactions: [],
    total: 0,
    isLoading: false,
    error: null
  });

  const fetchTransactions = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      const response = await getTransactionList(params);
      setState({
        transactions: response.transactions,
        total: response.total,
        isLoading: false,
        error: null
      });
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to fetch transactions'
      }));
    }
  };

  useEffect(() => {
    if (params.publicKey) {
      fetchTransactions();
    }
  }, [
    params.publicKey,
    params.page,
    params.limit,
    params.type,
    params.status,
    params.startDate,
    params.endDate
  ]);

  return {
    ...state,
    refresh: fetchTransactions
  };
}

export function useTransactionDetails(signature: string) {
  const [state, setState] = useState<{
    transaction: Transaction | null;
    isLoading: boolean;
    error: string | null;
  }>({
    transaction: null,
    isLoading: false,
    error: null
  });

  const fetchDetails = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      const transaction = await getTransactionDetails(signature);
      setState({
        transaction,
        isLoading: false,
        error: null
      });
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to fetch transaction details'
      }));
    }
  };

  useEffect(() => {
    if (signature) {
      fetchDetails();
    }
  }, [signature]);

  return {
    ...state,
    refresh: fetchDetails
  };
}

export function useTransactionStats(publicKey: string) {
  const [state, setState] = useState<{
    stats: TransactionStats | null;
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
      const stats = await getTransactionStats(publicKey);
      setState({
        stats,
        isLoading: false,
        error: null
      });
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to fetch transaction stats'
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

export function useTransactionStatus(signature: string) {
  const [state, setState] = useState<{
    status: Transaction['status'] | null;
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
      const status = await getTransactionStatus(signature);
      setState({
        status,
        isLoading: false,
        error: null
      });
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to fetch transaction status'
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