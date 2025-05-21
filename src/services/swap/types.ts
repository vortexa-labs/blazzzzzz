export interface SwapRequest {
  publicKey: string;
  action: 'buy' | 'sell';
  mint: string;
  denominatedInSol: 'true' | 'false';
  amount: number;
  slippage: number;
  priorityFee: number;
  pool: string;
  computeUnits: number;
}

export interface SwapResponse {
  signature: string;
  status: 'success' | 'error';
  error?: string;
}

export interface SwapQuote {
  inputAmount: number;
  outputAmount: number;
  priceImpact: number;
  networkFee: number;
  minimumReceived: number;
} 