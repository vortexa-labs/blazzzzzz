export interface Token {
  mint: string;
  symbol: string;
  name: string;
  decimals: number;
  image?: string;
  price?: number;
  volume24h?: number;
  marketCap?: number;
}

export interface TokenMetadata {
  mint: string;
  symbol: string;
  name: string;
  decimals: number;
  image?: string;
  description?: string;
  website?: string;
  twitter?: string;
  telegram?: string;
  discord?: string;
}

export interface TokenBalance {
  mint: string;
  symbol: string;
  name: string;
  balance: number;
  decimals: number;
  value?: number;
}

export interface TokenListResponse {
  tokens: Token[];
  total: number;
}

export interface TokenSearchParams {
  query?: string;
  page?: number;
  limit?: number;
  sortBy?: 'volume' | 'price' | 'marketCap';
  sortOrder?: 'asc' | 'desc';
} 