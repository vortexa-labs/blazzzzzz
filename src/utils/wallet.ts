import { Keypair } from '@solana/web3.js';
import { createClient } from '@supabase/supabase-js';
import { WalletStorage } from '../services/wallet/types';

interface StoredWallet {
  publicKey: string;
  name?: string;
  lastUsed?: number;
}

// Get all stored wallets
export const getAllStoredWallets = async (): Promise<StoredWallet[]> => {
  if (isChromeStorageAvailable()) {
    return await new Promise<StoredWallet[]>((resolve) => {
      chrome.storage.local.get(null, (result) => {
        const wallets: StoredWallet[] = [];
        Object.keys(result).forEach(key => {
          if (key.startsWith('blazr_wallet_')) {
            try {
              const walletData = JSON.parse(result[key]);
              wallets.push({
                publicKey: walletData.publicKey,
                name: walletData.name || `Wallet ${wallets.length + 1}`,
                lastUsed: walletData.lastUsed || Date.now()
              });
            } catch (error) {
              console.error('Error parsing wallet data:', error);
            }
          }
        });
        // Sort by last used
        wallets.sort((a, b) => (b.lastUsed || 0) - (a.lastUsed || 0));
        resolve(wallets);
      });
    });
  } else {
    const wallets: StoredWallet[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('blazr_wallet_')) {
        try {
          const walletData = JSON.parse(localStorage.getItem(key) || '{}');
          wallets.push({
            publicKey: walletData.publicKey,
            name: walletData.name || `Wallet ${wallets.length + 1}`,
            lastUsed: walletData.lastUsed || Date.now()
          });
        } catch (error) {
          console.error('Error parsing wallet data:', error);
        }
      }
    }
    // Sort by last used
    wallets.sort((a, b) => (b.lastUsed || 0) - (a.lastUsed || 0));
    return wallets;
  }
};

// Check if Chrome storage is available
const isChromeStorageAvailable = () => {
  return typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local;
};

// Get wallet from storage
export const getWalletFromStorage = async (): Promise<WalletStorage> => {
  try {
    if (isChromeStorageAvailable()) {
      return new Promise((resolve) => {
        chrome.storage.local.get(['blazr_wallet', 'blazr_api_key'], (result) => {
          resolve({
            blazr_wallet: result.blazr_wallet,
            blazr_api_key: result.blazr_api_key
          });
        });
      });
    } else {
      const walletData = localStorage.getItem('blazr_wallet');
      const apiKey = localStorage.getItem('blazr_api_key');
      return {
        blazr_wallet: walletData ? JSON.parse(walletData) : undefined,
        blazr_api_key: apiKey || undefined
      };
    }
  } catch (error) {
    console.error('Error getting wallet from storage:', error);
    return { blazr_wallet: undefined, blazr_api_key: undefined };
  }
};

// Save wallet to storage
export const saveWalletToStorage = async (walletObj: WalletStorage): Promise<void> => {
  try {
    if (isChromeStorageAvailable()) {
      await new Promise<void>((resolve) => {
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
  } catch (error) {
    console.error('Error saving wallet to storage:', error);
    throw error;
  }
};

// Generate new wallet
export const generateNewWallet = async (): Promise<WalletStorage> => {
  const keypair = Keypair.generate();
  const walletStorage: WalletStorage = {
    blazr_wallet: {
      publicKey: keypair.publicKey.toBase58(),
      secretKey: Array.from(keypair.secretKey)
    }
  };
  await saveWalletToStorage(walletStorage);
  return walletStorage;
};

// Get wallet keypair
export const getWalletKeypair = async (): Promise<Keypair | null> => {
  const storage = await getWalletFromStorage();
  if (!storage?.blazr_wallet) {
    return null;
  }
  return Keypair.fromSecretKey(Uint8Array.from(storage.blazr_wallet.secretKey));
};

// Clear wallet from storage
export const clearWalletFromStorage = async (): Promise<void> => {
  try {
    if (isChromeStorageAvailable()) {
      await new Promise<void>((resolve) => {
        chrome.storage.local.remove(['blazr_wallet', 'blazr_api_key'], resolve);
      });
    } else {
      localStorage.removeItem('blazr_wallet');
      localStorage.removeItem('blazr_api_key');
    }
  } catch (error) {
    console.error('Error clearing wallet from storage:', error);
    throw error;
  }
};

export const setWalletToStorage = async (walletObj: WalletStorage, walletName?: string): Promise<void> => {
  const walletKey = walletName ? `blazr_wallet_${walletName}` : 'blazr_wallet';
  const walletData = {
    ...walletObj.blazr_wallet,
    name: walletName,
    lastUsed: Date.now()
  };

  if (isChromeStorageAvailable()) {
    await new Promise<void>(resolve => {
      chrome.storage.local.set({
        [walletKey]: JSON.stringify(walletData),
        blazr_api_key: walletObj.blazr_api_key
      }, resolve);
    });
  } else {
    if (walletObj.blazr_wallet) {
      localStorage.setItem(walletKey, JSON.stringify(walletData));
    }
    if (walletObj.blazr_api_key) {
      localStorage.setItem('blazr_api_key', walletObj.blazr_api_key);
    }
  }
};

export const removeWalletFromStorage = async (walletName: string): Promise<void> => {
  const walletKey = `blazr_wallet_${walletName}`;
  if (isChromeStorageAvailable()) {
    await new Promise<void>(resolve => {
      chrome.storage.local.remove(walletKey, resolve);
    });
  } else {
    localStorage.removeItem(walletKey);
  }
};

// --- Device ID Helper ---
export function getOrCreateDeviceId(): string {
  let deviceId = localStorage.getItem('blazr_device_id');
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem('blazr_device_id', deviceId);
  }
  return deviceId;
}

// --- Supabase Client ---
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.REACT_APP_SUPABASE_KEY || process.env.SUPABASE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey); 