import { Keypair, Connection, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { WalletStorage, WalletBalance } from './types';
import { generateNewWallet, getWalletFromStorage, saveWalletToStorage } from '../../utils/wallet';
import bs58 from 'bs58';
import { logger } from '../../utils/logger';

// Use a more reliable RPC endpoint
const connection = new Connection('https://greatest-lingering-forest.solana-mainnet.quiknode.pro/7d9cdaae49e7f160cc664e2070e978a345de47d0/', {
  commitment: 'confirmed',
  confirmTransactionInitialTimeout: 60000
});

// Helper function to convert Uint8Array to base64
const uint8ArrayToBase64 = (bytes: Uint8Array): string => {
  return btoa(String.fromCharCode.apply(null, Array.from(bytes)));
};

// Helper function to convert base64 to Uint8Array
const base64ToUint8Array = (base64: string): Uint8Array => {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

export const createWallet = async (): Promise<WalletStorage> => {
  try {
    const walletStorage = await generateNewWallet();
    return walletStorage;
  } catch (error) {
    logger.error('Error creating wallet:', error);
    throw error;
  }
};

export const importWallet = async (privateKey: string): Promise<WalletStorage> => {
  try {
    logger.log('Attempting to import wallet with key:', privateKey);
    
    // Clean the input
    const cleanedKey = privateKey.trim().replace(/['"]/g, '');
    logger.log('Cleaned key:', cleanedKey);
    
    // Try to decode as base58
    let secretKey: Uint8Array;
    try {
      secretKey = bs58.decode(cleanedKey);
      logger.log('Successfully decoded as base58, length:', secretKey.length);
    } catch (e) {
      logger.error('Base58 decode failed:', e);
      throw new Error('Invalid private key format - must be base58 encoded');
    }

    // Validate key length - Solana private keys are 64 bytes
    if (secretKey.length !== 64) {
      logger.error('Invalid key length:', secretKey.length);
      throw new Error(`Invalid private key length: ${secretKey.length} bytes (expected 64)`);
    }

    const keypair = Keypair.fromSecretKey(secretKey);
    logger.log('Successfully created keypair with public key:', keypair.publicKey.toBase58());
    
    const walletStorage: WalletStorage = {
      blazr_wallet: {
        publicKey: keypair.publicKey.toBase58(),
        secretKey: Array.from(keypair.secretKey)
      }
    };
    
    await saveWalletToStorage(walletStorage);
    return walletStorage;
  } catch (error) {
    logger.error('Error importing wallet:', error);
    throw error;
  }
};

export const getWalletBalance = async (publicKey: string): Promise<WalletBalance> => {
  try {
    // Add retry logic for balance fetching
    let retries = 3;
    let lastError;

    while (retries > 0) {
      try {
        // Only fetch balance, skip CoinGecko
        // You may want to fetch SOL balance from your backend or another source here
        return {
          sol: 0,
          usd: 0,
          tokens: {}
        };
      } catch (error) {
        lastError = error;
        retries--;
        if (retries > 0) {
          // Wait for 1 second before retrying
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }

    throw lastError;
  } catch (error: any) {
    logger.error('Error fetching wallet balance:', error);
    // Return a default balance instead of throwing
    return {
      sol: 0,
      usd: 0,
      tokens: {}
    };
  }
};

export async function exportPrivateKey(): Promise<string> {
  const storage = await getWalletFromStorage();
  if (!storage.blazr_wallet) {
    throw new Error('Wallet not found');
  }

  const keypair = Keypair.fromSecretKey(Uint8Array.from(storage.blazr_wallet.secretKey));
  // Use base58 encoding
  const privateKey = bs58.encode(keypair.secretKey);
  logger.log('Exported private key length:', privateKey.length);
  return privateKey;
}

export async function backupWallet(): Promise<WalletStorage> {
  const storage = await getWalletFromStorage();
  if (!storage.blazr_wallet) {
    throw new Error('Wallet not found');
  }

  return storage;
} 