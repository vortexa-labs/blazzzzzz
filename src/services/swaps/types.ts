/*
// Swaps types temporarily disabled due to build errors and unused feature.
*/

export interface SwapQuote {
  inputToken: {
    mint: string;
    symbol: string;
    decimals: number;
    amount: number;
  };
  outputToken: {
    mint: string;
    symbol: string;
    decimals: number;
    amount: number;
  };
  price: number;
  priceImpact: number;
  fee: number;
  minimumReceived: number;
  route: {
    hops: {
      from: string;
      to: string;
      protocol: string;
    }[];
  };
}

export interface SwapTransaction {
  signature: string;
  status: 'pending' | 'confirmed' | 'failed';
  inputToken: {
    mint: string;
    symbol: string;
    amount: number;
  };
  outputToken: {
    mint: string;
    symbol: string;
    amount: number;
  };
  price: number;
  timestamp: number;
  error?: string;
}

export interface SwapHistoryResponse {
  swaps: SwapTransaction[];
  total: number;
}

export interface SwapHistoryParams {
  publicKey: string;
  page?: number;
  limit?: number;
  startDate?: number;
  endDate?: number;
}

export interface SwapStats {
  totalSwaps: number;
  totalVolume: number;
  averagePriceImpact: number;
  mostSwappedToken: {
    mint: string;
    symbol: string;
    count: number;
  };
  successRate: number;
}

export interface Token {
  mint: string;
  symbol: string;
  name: string;
  image?: string;
  balance: number;
  price?: number;
}

export interface SwapHistory {
  id: string;
  fromToken: string;
  toToken: string;
  amount: string;
  timestamp: number;
  status: 'completed' | 'failed' | 'pending';
  transactionHash?: string;
} 