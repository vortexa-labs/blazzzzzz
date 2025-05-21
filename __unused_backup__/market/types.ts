/*
// Market types temporarily disabled due to build errors and unused feature.
*/

export interface MarketData {
  mint: string;
  symbol: string;
  name: string;
  price: number;
  priceChange24h: number;
  priceChangePercent24h: number;
  volume24h: number;
  marketCap: number;
  circulatingSupply: number;
  totalSupply: number;
  rank: number;
  lastUpdated: number;
}

export interface MarketChart {
  mint: string;
  symbol: string;
  prices: {
    timestamp: number;
    price: number;
  }[];
  volumes: {
    timestamp: number;
    volume: number;
  }[];
}

export interface MarketListResponse {
  markets: MarketData[];
  total: number;
}

export interface MarketSearchParams {
  query?: string;
  page?: number;
  limit?: number;
  sortBy?: 'price' | 'volume' | 'marketCap' | 'rank';
  sortOrder?: 'asc' | 'desc';
}

export interface MarketStats {
  totalMarketCap: number;
  totalVolume24h: number;
  btcDominance: number;
  ethDominance: number;
  activeMarkets: number;
  topGainers: MarketData[];
  topLosers: MarketData[];
}

export interface TokenPrice {
  mint: string;
  price: number;
  change24h: number;
  changePercentage24h: number;
  volume24h: number;
  marketCap: number;
  lastUpdated: number;
} 