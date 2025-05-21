import { Keypair } from '@solana/web3.js';

export interface WalletState {
  keypair: Keypair | null;
  balance: WalletBalance | null;
  isInitialized: boolean;
  error: string | null;
}

export interface WalletBalance {
  sol: number;
  usd: number;
  tokens: {
    [mint: string]: {
      amount: number;
      decimals: number;
      symbol?: string;
    };
  };
}

export interface CreateWalletResponse {
  publicKey: string;
  secretKey: number[];
  mnemonic: string;
}

export interface ImportWalletResponse {
  publicKey: string;
  secretKey: number[];
}

export interface WalletStorage {
  blazr_wallet?: {
    publicKey: string;
    secretKey: number[];
    mnemonic?: string;
  };
  blazr_api_key?: string;
}

export {}; 