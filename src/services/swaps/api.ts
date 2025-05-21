/*
// Swaps API temporarily disabled due to build errors and unused feature.
*/

import {
  SwapQuote,
  SwapTransaction,
  SwapHistoryResponse,
  SwapHistoryParams,
  SwapStats,
  Token
} from './types';
import { API_ENDPOINTS } from '../../config/api';

export async function getSwapQuote(
  fromToken: string,
  toToken: string,
  amount: string
): Promise<SwapQuote> {
  const response = await fetch(`${API_ENDPOINTS.SWAPS}/quote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fromToken, toToken, amount })
  });

  if (!response.ok) {
    throw new Error('Failed to get swap quote');
  }

  return response.json();
}

export async function executeSwap(
  fromToken: string,
  toToken: string,
  amount: string,
  slippage: number
): Promise<SwapTransaction> {
  const response = await fetch(`${API_ENDPOINTS.SWAPS}/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fromToken, toToken, amount, slippage })
  });

  if (!response.ok) {
    throw new Error('Failed to execute swap');
  }

  return response.json();
}

export const getTokenDetails = async (mint: string): Promise<Token> => {
  try {
    const response = await fetch(`${API_ENDPOINTS.TOKENS}/${mint}`);
    if (!response.ok) {
      throw new Error('Failed to fetch token details');
    }
    const data = await response.json();
    console.log('Token details:', data);
    return data;
  } catch (error) {
    console.error('Error fetching token details:', error);
    throw error;
  }
};

export const getTokensList = async (): Promise<Token[]> => {
  try {
    const response = await fetch(`${API_ENDPOINTS.TOKENS}/list`);
    if (!response.ok) {
      throw new Error('Failed to fetch tokens list');
    }
    const data = await response.json();
    console.log('Tokens list:', data);
    return data;
  } catch (error) {
    console.error('Error fetching tokens list:', error);
    throw error;
  }
};

// These functions are kept for future implementation
// export async function getSwapHistory(): Promise<SwapHistory[]> {
//   const response = await fetch(`${API_ENDPOINTS.SWAPS}/history`, {
//     method: 'GET',
//     headers: { 'Content-Type': 'application/json' }
//   });
//
//   if (!response.ok) {
//     throw new Error('Failed to get swap history');
//   }
//
//   return response.json();
// }

export async function getSwapStats(publicKey: string): Promise<SwapStats> {
  throw new Error('Not implemented');
}

export async function getSwapStatus(signature: string): Promise<SwapTransaction['status']> {
  throw new Error('Not implemented');
} 