import { 
  Token, 
  TokenMetadata, 
  TokenBalance, 
  TokenListResponse, 
  TokenSearchParams 
} from './types';
import { API_ENDPOINTS } from '../../config/api';

const API_BASE_URL = 'https://blazzzzzz-111.onrender.com/api';

export async function getTokenList(params: TokenSearchParams = {}): Promise<TokenListResponse> {
  const queryParams = new URLSearchParams();
  if (params.query) queryParams.append('query', params.query);
  if (params.page) queryParams.append('page', params.page.toString());
  if (params.limit) queryParams.append('limit', params.limit.toString());
  if (params.sortBy) queryParams.append('sortBy', params.sortBy);
  if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);

  const response = await fetch(`${API_BASE_URL}/tokens?${queryParams.toString()}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  });

  if (!response.ok) {
    throw new Error('Failed to get token list');
  }

  return response.json();
}

export async function getTokenMetadata(mint: string): Promise<TokenMetadata> {
  const response = await fetch(`${API_ENDPOINTS.TOKEN_METADATA}/${mint}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  });

  if (!response.ok) {
    throw new Error('Failed to get token metadata');
  }

  return response.json();
}

export async function getTokenBalances(publicKey: string): Promise<TokenBalance[]> {
  const response = await fetch(`${API_BASE_URL}/tokens/balances/${publicKey}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  });

  if (!response.ok) {
    throw new Error('Failed to get token balances');
  }

  return response.json();
}

export async function getTokenPrice(mint: string): Promise<number> {
  const response = await fetch(`${API_BASE_URL}/tokens/${mint}/price`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  });

  if (!response.ok) {
    throw new Error('Failed to get token price');
  }

  const data = await response.json();
  return data.price;
}

export async function getTokenChart(mint: string, timeframe: '1d' | '1w' | '1m' | '1y'): Promise<{ timestamp: number; price: number }[]> {
  const response = await fetch(`${API_BASE_URL}/tokens/${mint}/chart?timeframe=${timeframe}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  });

  if (!response.ok) {
    throw new Error('Failed to get token chart data');
  }

  return response.json();
} 