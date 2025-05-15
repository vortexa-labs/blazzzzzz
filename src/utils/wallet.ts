import { Keypair } from '@solana/web3.js';

interface WalletStorage {
  blazr_wallet?: {
    publicKey: string;
    secretKey: number[];
  };
  blazr_api_key?: string;
}

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

export const getWalletFromStorage = async () => {
  return new Promise<any>((resolve) => {
    chrome.storage.local.get(['blazr_wallet'], (result) => {
      resolve(result);
    });
  });
};

export const saveWalletToStorage = async (keypair: Keypair) => {
  return new Promise<void>((resolve) => {
    chrome.storage.local.set({
      blazr_wallet: {
        secretKey: Array.from(keypair.secretKey),
        publicKey: keypair.publicKey.toBase58()
      }
    }, () => {
      resolve();
    });
  });
};

export const clearWalletFromStorage = async () => {
  return new Promise<void>((resolve) => {
    chrome.storage.local.remove(['blazr_wallet'], () => {
      resolve();
    });
  });
};

export const hasWallet = async (): Promise<boolean> => {
  const storage = await getWalletFromStorage();
  return !!storage.blazr_wallet;
};

export const getWalletKeypair = async (): Promise<Keypair | null> => {
  const storage = await getWalletFromStorage();
  if (!storage.blazr_wallet) {
    return null;
  }
  return Keypair.fromSecretKey(Uint8Array.from(storage.blazr_wallet.secretKey));
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

const isChromeStorageAvailable = (): boolean => {
  return typeof chrome !== 'undefined' && chrome.storage !== undefined;
}; 