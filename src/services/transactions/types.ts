export interface Transaction {
  signature: string;
  timestamp: number;
  type: 'send' | 'receive' | 'swap' | 'create' | 'other';
  status: 'confirmed' | 'pending' | 'failed';
  amount: number;
  token: {
    mint: string;
    symbol: string;
    decimals: number;
  };
  from: string;
  to: string;
  fee: number;
  error?: string;
}

export interface TransactionListResponse {
  transactions: Transaction[];
  total: number;
}

export interface TransactionSearchParams {
  publicKey: string;
  page?: number;
  limit?: number;
  type?: Transaction['type'];
  status?: Transaction['status'];
  startDate?: number;
  endDate?: number;
}

export interface TransactionStats {
  totalSent: number;
  totalReceived: number;
  totalSwaps: number;
  totalFees: number;
  averageTransactionValue: number;
  mostActiveToken: {
    mint: string;
    symbol: string;
    count: number;
  };
} 