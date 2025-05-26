import { SwapRequest, SwapResponse, SwapQuote } from './types';
import * as web3Js from '@solana/web3.js';

const API_BASE_URL = 'https://blazzzzzz-111.onrender.com/api';

export async function getSwapQuote(
  fromToken: string,
  toToken: string,
  amount: number
): Promise<SwapQuote> {
  const response = await fetch(`${API_BASE_URL}/quote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fromToken,
      toToken,
      amount
    })
  });

  if (!response.ok) {
    throw new Error('Failed to get swap quote');
  }

  return response.json();
}

export async function executeSwap(
  request: SwapRequest,
  wallet: web3Js.Keypair
): Promise<SwapResponse> {
  try {
    // Get transaction data from server
    const response = await fetch(`${API_BASE_URL}/trade-local`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage;
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.details || errorData.error || 'Failed to process swap';
      } catch (e) {
        errorMessage = `Server error: ${response.status} ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    // Get transaction data
    const txBuffer = await response.arrayBuffer();
    const tx = web3Js.VersionedTransaction.deserialize(new Uint8Array(txBuffer));

    // Fetch a fresh blockhash
    const connection = new web3Js.Connection('https://greatest-lingering-forest.solana-mainnet.quiknode.pro/7d9cdaae49e7f160cc664e2070e978a345de47d0/');
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('finalized');
    tx.message.recentBlockhash = blockhash;

    // Sign the transaction
    tx.sign([wallet]);

    // Send the transaction
    const signature = await connection.sendTransaction(tx, {
      maxRetries: 3,
      preflightCommitment: 'confirmed',
      skipPreflight: false
    });

    // Wait for confirmation
    const confirmation = await connection.confirmTransaction({
      signature,
      blockhash,
      lastValidBlockHeight
    }, 'confirmed');

    if (confirmation.value.err) {
      throw new Error('Transaction failed: ' + JSON.stringify(confirmation.value.err));
    }

    return {
      signature,
      status: 'success'
    };
  } catch (error: any) {
    return {
      signature: '',
      status: 'error',
      error: error.message || 'Failed to process swap'
    };
  }
} 