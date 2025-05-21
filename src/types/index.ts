export type View = 'token' | 'wallet' | 'mytokens' | 'trade';

export type TokenMetadataCache = Record<string, { 
  name?: string; 
  symbol?: string; 
  logoURI?: string; 
  decimals?: number; 
  creator?: string 
}>;

export type TokenCacheData = {
  tokens: Array<{
    name: string;
    symbol: string;
    address: string;
    balance: string;
    decimals: number;
    logo?: string;
  }>;
  metadata: TokenMetadataCache;
  lastFetched: number;
};

export interface TransactionConfirmation {
  value: {
    err: any;
  };
};

export interface HeliusTokenMetadata {
  account: string;
  onChainMetadata?: {
    metadata?: {
      data?: {
        name?: string;
        symbol?: string;
        creators?: Array<{ address: string; verified: boolean; share: number }>;
      };
    };
  };
  offChainMetadata?: {
    metadata?: {
      name?: string;
      symbol?: string;
      image?: string;
    };
  };
  legacyMetadata?: {
    logoURI?: string;
    name?: string;
    symbol?: string;
  };
}

export interface SolanaToken {
  chainId: number;
  address: string;
  name: string;
  symbol: string;
  logoURI?: string;
  extensions?: any;
  tags?: string[];
  decimals: number;
}

export interface SolanaTokenList {
  name: string;
  logoURI: string;
  keywords: string[];
  timestamp: string;
  tokens: SolanaToken[];
  version: {
    major: number;
    minor: number;
    patch: number;
  };
}

export interface WalletStorage {
  blazr_wallet?: {
    publicKey: string;
    secretKey: number[];
  };
  blazr_api_key?: string;
} 