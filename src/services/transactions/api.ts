import { Buffer } from 'buffer';
import { 
  Transaction, 
  TransactionListResponse, 
  TransactionSearchParams,
  TransactionStats 
} from './types';
import { 
  PublicKey, 
  Transaction as SolanaTransaction, 
  SystemProgram, 
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, createTransferInstruction } from '@solana/spl-token';
import { getWalletFromStorage } from '../../utils/wallet';
import { API_ENDPOINTS } from '../../config/api';

// Make Buffer available globally
(window as any).Buffer = Buffer;

const API_BASE_URL = 'https://blazzzzzz-111.onrender.com/api';

// Add missing API functions
export async function getTransactionList(params: TransactionSearchParams): Promise<TransactionListResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/transactions`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch transaction list');
    }

    return await response.json();
  } catch (error: any) {
    throw new Error(error.message || 'Failed to fetch transaction list');
  }
}

export async function getTransactionDetails(signature: string): Promise<Transaction> {
  try {
    const response = await fetch(`${API_BASE_URL}/transactions/${signature}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch transaction details');
    }

    return await response.json();
  } catch (error: any) {
    throw new Error(error.message || 'Failed to fetch transaction details');
  }
}

export async function getTransactionStats(publicKey: string): Promise<TransactionStats> {
  try {
    const response = await fetch(`${API_BASE_URL}/transactions/stats?publicKey=${publicKey}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch transaction stats');
    }

    return await response.json();
  } catch (error: any) {
    throw new Error(error.message || 'Failed to fetch transaction stats');
  }
}

export async function getTransactionStatus(signature: string): Promise<Transaction['status']> {
  try {
    const response = await fetch(`${API_BASE_URL}/transactions/${signature}/status`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch transaction status');
    }

    const data = await response.json();
    return data.status as Transaction['status'];
  } catch (error: any) {
    throw new Error(error.message || 'Failed to fetch transaction status');
  }
}

export async function sendSol(
  fromPublicKey: string,
  toPublicKey: string,
  amount: number
): Promise<string> {
  try {
    const storage = await getWalletFromStorage();
    if (!storage?.blazr_wallet) {
      throw new Error('Wallet not found');
    }

    const response = await fetch(`${API_BASE_URL}/transactions/send-sol`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fromPublicKey,
        toPublicKey,
        amount,
        secretKey: storage.blazr_wallet.secretKey
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to send SOL');
    }

    const { signature } = await response.json();
    return signature;
  } catch (error: any) {
    throw new Error(error.message || 'Failed to send SOL');
  }
}

export async function sendSplToken(
  fromPublicKey: string,
  toPublicKey: string,
  tokenMint: string,
  amount: number,
  decimals: number
): Promise<string> {
  try {
    const storage = await getWalletFromStorage();
    if (!storage?.blazr_wallet) {
      throw new Error('Wallet not found');
    }

    const response = await fetch(`${API_ENDPOINTS.TRADE_LOCAL}/send-spl`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fromPublicKey,
        toPublicKey,
        tokenMint,
        amount,
        decimals,
        secretKey: storage.blazr_wallet.secretKey
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to send token');
    }

    const { signature } = await response.json();
    return signature;
  } catch (error: any) {
    throw new Error(error.message || 'Failed to send token');
  }
} 