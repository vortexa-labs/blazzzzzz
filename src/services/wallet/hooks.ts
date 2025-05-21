import { useState, useEffect } from 'react';
import { Keypair } from '@solana/web3.js';
import { 
  createWallet, 
  importWallet, 
  getWalletBalance, 
  exportPrivateKey, 
  backupWallet 
} from './api';
import { WalletState, WalletBalance } from './types';
import { getWalletFromStorage } from '../../utils/wallet';

// Cache duration in milliseconds (1 minute)
const CACHE_DURATION = 60 * 1000;

interface CacheEntry {
  balance: WalletBalance;
  timestamp: number;
  isRefreshing: boolean;
}

// In-memory cache
const balanceCache: { [key: string]: CacheEntry } = {};

export function useWallet() {
  const [state, setState] = useState<WalletState>({
    keypair: null,
    balance: null,
    isInitialized: false,
    error: null
  });

  // Initialize wallet on mount
  useEffect(() => {
    initializeWallet();
  }, []);

  // Background refresh effect
  useEffect(() => {
    if (!state.keypair) return;

    const publicKey = state.keypair.publicKey.toBase58();
    const refreshInterval = setInterval(async () => {
      try {
        const freshBalance = await getWalletBalance(publicKey);
        balanceCache[publicKey] = {
          balance: freshBalance,
          timestamp: Date.now(),
          isRefreshing: false
        };
        setState(prev => ({ ...prev, balance: freshBalance }));
      } catch (error) {
        console.error('Background refresh failed:', error);
      }
    }, CACHE_DURATION);

    return () => clearInterval(refreshInterval);
  }, [state.keypair]);

  const initializeWallet = async () => {
    try {
      const storage = await getWalletFromStorage();
      if (!storage?.blazr_wallet) {
        setState((prev: WalletState) => ({ ...prev, isInitialized: true }));
        return;
      }

      const keypair = Keypair.fromSecretKey(
        Uint8Array.from(storage.blazr_wallet.secretKey)
      );

      try {
        const balance = await getCachedBalance(storage.blazr_wallet.publicKey);
        setState({
          keypair,
          balance,
          isInitialized: true,
          error: null
        });
      } catch (error: any) {
        // If balance fetch fails, still set the wallet but with error
        setState({
          keypair,
          balance: { sol: 0, usd: 0, tokens: {} },
          isInitialized: true,
          error: error.message || 'Failed to fetch balance'
        });
      }
    } catch (error: any) {
      setState((prev: WalletState) => ({
        ...prev,
        isInitialized: true,
        error: error.message || 'Failed to initialize wallet'
      }));
    }
  };

  const getCachedBalance = async (publicKey: string): Promise<WalletBalance> => {
    const now = Date.now();
    const cached = balanceCache[publicKey];

    // If we have a cached balance and it's not expired, return it
    if (cached && (now - cached.timestamp) < CACHE_DURATION) {
      // If we're not already refreshing, trigger a background refresh
      if (!cached.isRefreshing) {
        cached.isRefreshing = true;
        getWalletBalance(publicKey).then(freshBalance => {
          balanceCache[publicKey] = {
            balance: freshBalance,
            timestamp: Date.now(),
            isRefreshing: false
          };
          setState(prev => ({ ...prev, balance: freshBalance }));
        }).catch(error => {
          console.error('Background refresh failed:', error);
          cached.isRefreshing = false;
        });
      }
      return cached.balance;
    }

    // If cache is expired or doesn't exist, fetch fresh balance
    const balance = await getWalletBalance(publicKey);
    balanceCache[publicKey] = {
      balance,
      timestamp: now,
      isRefreshing: false
    };

    return balance;
  };

  const createNewWallet = async () => {
    try {
      setState((prev: WalletState) => ({ ...prev, error: null }));
      const walletStorage = await createWallet();
      
      if (!walletStorage.blazr_wallet) {
        throw new Error('Failed to create wallet');
      }

      const keypair = Keypair.fromSecretKey(
        Uint8Array.from(walletStorage.blazr_wallet.secretKey)
      );

      try {
        const balance = await getCachedBalance(walletStorage.blazr_wallet.publicKey);
        setState({
          keypair,
          balance,
          isInitialized: true,
          error: null
        });
      } catch (error: any) {
        // If balance fetch fails, still set the wallet but with error
        setState({
          keypair,
          balance: { sol: 0, usd: 0, tokens: {} },
          isInitialized: true,
          error: error.message || 'Failed to fetch balance'
        });
      }
    } catch (error: any) {
      setState((prev: WalletState) => ({
        ...prev,
        error: error.message || 'Failed to create wallet'
      }));
      throw error;
    }
  };

  const importExistingWallet = async (privateKey: string) => {
    try {
      setState((prev: WalletState) => ({ ...prev, error: null }));
      const walletStorage = await importWallet(privateKey);
      
      if (!walletStorage.blazr_wallet) {
        throw new Error('Failed to import wallet');
      }

      const keypair = Keypair.fromSecretKey(
        Uint8Array.from(walletStorage.blazr_wallet.secretKey)
      );

      try {
        const balance = await getCachedBalance(walletStorage.blazr_wallet.publicKey);
        setState({
          keypair,
          balance,
          isInitialized: true,
          error: null
        });
      } catch (error: any) {
        // If balance fetch fails, still set the wallet but with error
        setState({
          keypair,
          balance: { sol: 0, usd: 0, tokens: {} },
          isInitialized: true,
          error: error.message || 'Failed to fetch balance'
        });
      }
    } catch (error: any) {
      setState((prev: WalletState) => ({
        ...prev,
        error: error.message || 'Failed to import wallet'
      }));
      throw error;
    }
  };

  const refreshBalance = async () => {
    if (!state.keypair) return;

    try {
      setState((prev: WalletState) => ({ ...prev, error: null }));
      const balance = await getCachedBalance(state.keypair.publicKey.toBase58());
      setState((prev: WalletState) => ({ ...prev, balance, error: null }));
    } catch (error: any) {
      setState((prev: WalletState) => ({
        ...prev,
        error: error.message || 'Failed to refresh balance'
      }));
    }
  };

  const getPrivateKey = async () => {
    try {
      return await exportPrivateKey();
    } catch (error: any) {
      setState((prev: WalletState) => ({
        ...prev,
        error: error.message || 'Failed to export private key'
      }));
      throw error;
    }
  };

  const getBackup = async () => {
    try {
      return await backupWallet();
    } catch (error: any) {
      setState((prev: WalletState) => ({
        ...prev,
        error: error.message || 'Failed to backup wallet'
      }));
      throw error;
    }
  };

  return {
    ...state,
    createNewWallet,
    importExistingWallet,
    refreshBalance,
    getPrivateKey,
    getBackup
  };
} 