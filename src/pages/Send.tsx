import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Copy, ChevronDown, Loader2, ExternalLink } from 'lucide-react';
import { useWallet } from '../services/wallet/hooks';
import { sendSol, sendSplToken } from '../services/transactions/api';
import SuccessModal from '../components/SuccessModal';

interface Token {
  symbol: string;
  balance: number;
  address: string;
  decimals: number;
  mint: string;
  name?: string;
  image?: string;
}

const Send: React.FC = () => {
  const navigate = useNavigate();
  const { keypair, balance, refreshBalance } = useWallet();
  const [tokens, setTokens] = useState<Token[]>([]);
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isAddressValid, setIsAddressValid] = useState(true);
  const [showTokenSelector, setShowTokenSelector] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transactionSignature, setTransactionSignature] = useState<string | null>(null);

  useEffect(() => {
    const fetchTokens = async () => {
      if (!keypair) return;
      try {
        const publicKey = keypair.publicKey.toBase58();
        const response = await new Promise<{ tokens: any[] }>((resolve, reject) => {
          chrome.runtime.sendMessage(
            { type: 'GET_TOKEN_ACCOUNTS', data: { owner: publicKey } },
            (response) => {
              if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
              } else if (!response.success) {
                reject(new Error(response.error));
              } else {
                resolve(response.data);
              }
            }
          );
        });
        const tokenList = response.tokens.map((token) => ({
          symbol: token.symbol || 'Unknown',
          balance: token.uiAmount,
          address: token.mint === 'So11111111111111111111111111111111111111112' ? '' : token.mint,
          decimals: token.decimals,
          mint: token.mint,
          name: token.name,
          image: token.image,
        }));
        setTokens(tokenList);
        setSelectedToken(tokenList[0] || null);
      } catch (e) {
        setTokens([]);
        setSelectedToken(null);
      }
    };
    fetchTokens();
  }, [keypair]);

  const handlePasteAddress = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setRecipient(text);
      validateAddress(text);
    } catch (err) {
      console.error('Failed to read clipboard:', err);
    }
  };

  const validateAddress = (address: string) => {
    // Basic Solana address validation (base58, 32-44 chars)
    const isValid = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
    setIsAddressValid(isValid);
    return isValid;
  };

  const handleMaxAmount = () => {
    setAmount(selectedToken?.balance.toString() || '');
  };

  const handleSend = async () => {
    if (!keypair || !validateAddress(recipient) || !amount || parseFloat(amount) <= 0) return;

    setIsLoading(true);
    setError(null);

    try {
      let signature: string;

      if (selectedToken?.symbol === 'SOL') {
        signature = await sendSol(
          keypair.publicKey.toBase58(),
          recipient,
          parseFloat(amount)
        );
      } else {
        signature = await sendSplToken(
          keypair.publicKey.toBase58(),
          recipient,
          selectedToken?.address || '',
          parseFloat(amount),
          selectedToken?.decimals || 0
        );
      }

      setTransactionSignature(signature);
      setShowSuccess(true);
      await refreshBalance();
    } catch (err: any) {
      setError(err.message || 'Failed to send transaction');
      console.error('Transaction failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid = () => {
    return (
      isAddressValid &&
      recipient.length > 0 &&
      amount.length > 0 &&
      parseFloat(amount) > 0 &&
      parseFloat(amount) <= (selectedToken?.balance || 0)
    );
  };

  return (
    <div className="flex flex-col min-h-[500px] bg-[#0f0f0f] text-white">
      {/* Header */}
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-center mb-2">
          <button
            onClick={() => navigate(-1)}
            className="mr-4 p-2 hover:bg-[#181818] rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold">Send</h1>
        </div>
        <p className="text-gray-400 text-sm">Transfer SOL or tokens to another wallet</p>
      </div>

      {/* Token Selector */}
      <div className="px-4 mb-6">
        <div className="relative">
          <button
            onClick={() => setShowTokenSelector(!showTokenSelector)}
            className="w-full bg-[#181818] rounded-full p-4 flex items-center justify-between"
          >
            <div className="flex items-center">
              <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center overflow-hidden mr-3">
                {selectedToken?.image ? (
                  <img src={selectedToken.image} alt={selectedToken.symbol} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white text-sm font-bold">{selectedToken?.symbol[0]}</span>
                )}
              </div>
              <div>
                <div className="font-bold">{selectedToken?.name || selectedToken?.symbol}</div>
                <div className="text-xs text-gray-400">{selectedToken?.balance.toFixed(4)} {selectedToken?.symbol}</div>
              </div>
            </div>
            <ChevronDown className="w-5 h-5 text-gray-400" />
          </button>

          {showTokenSelector && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-[#181818] rounded-2xl overflow-hidden z-10 shadow-lg">
              {tokens.map((token) => (
                <button
                  key={token.mint}
                  onClick={() => {
                    setSelectedToken(token);
                    setShowTokenSelector(false);
                  }}
                  className="w-full flex items-center gap-3 p-4 hover:bg-[#232323] transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center overflow-hidden">
                    {token.image ? (
                      <img src={token.image} alt={token.symbol} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-white text-lg font-bold">{token.symbol[0]}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold truncate">{token.name || token.symbol}</div>
                    <div className="text-xs text-gray-400 truncate">{token.balance.toFixed(4)} {token.symbol}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recipient Input */}
      <div className="px-4 mb-6">
        <label className="block text-sm font-medium mb-2">Recipient Wallet Address</label>
        <div className="relative">
          <input
            type="text"
            value={recipient}
            onChange={(e) => {
              setRecipient(e.target.value);
              validateAddress(e.target.value);
            }}
            className={`w-full bg-[#181818] rounded-full p-4 pr-12 text-white focus:outline-none focus:ring-2 focus:ring-[#FF3131] ${
              !isAddressValid && recipient ? 'ring-2 ring-red-500' : ''
            }`}
            placeholder="Enter wallet address"
          />
          <button
            onClick={handlePasteAddress}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
          >
            <Copy className="w-5 h-5" />
          </button>
        </div>
        {!isAddressValid && recipient && (
          <p className="text-red-500 text-sm mt-2">Invalid Solana address</p>
        )}
      </div>

      {/* Amount Input */}
      <div className="px-4 mb-6">
        <label className="block text-sm font-medium mb-2">Amount to Send</label>
        <div className="relative">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full bg-[#181818] rounded-full p-4 pr-24 text-white focus:outline-none focus:ring-2 focus:ring-[#FF3131]"
            placeholder="0.00"
          />
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
            <span className="text-gray-400">{selectedToken?.symbol}</span>
            <button
              onClick={handleMaxAmount}
              className="text-[#FF3131] text-sm font-medium hover:text-[#ff4646] transition-colors"
            >
              MAX
            </button>
          </div>
        </div>
        <p className="text-gray-400 text-sm mt-2">
          Available: {selectedToken?.balance.toFixed(4)} {selectedToken?.symbol}
        </p>
      </div>

      {/* Send Button */}
      <div className="px-4 mt-auto mb-6">
        <button
          onClick={handleSend}
          disabled={!isFormValid() || isLoading}
          className={`w-full bg-[#FF3131] text-white font-bold py-4 rounded-full text-lg shadow-md transition-all ${
            !isFormValid() || isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-700'
          }`}
        >
          {isLoading ? (
            <div className="flex items-center justify-center">
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Sending...
            </div>
          ) : (
            'Send'
          )}
        </button>
      </div>

      {/* Success Modal */}
      {showSuccess && (
        <SuccessModal
          title="Transfer Complete!"
          message={`You've successfully sent '${selectedToken?.symbol}' from your wallet.`}
          details={[
            { label: 'Amount', value: `${amount} ${selectedToken?.symbol || ''}` },
            { label: 'Recipient', value: recipient, copy: true },
            transactionSignature ? { label: 'Tx Signature', value: transactionSignature, copy: true } : undefined,
          ].filter(Boolean) as { label: string; value: string; copy?: boolean }[]}
          links={transactionSignature ? [
            { label: 'View on Solscan', url: `https://solscan.io/tx/${transactionSignature}` },
          ] : []}
          buttons={[
            {
              label: 'Done',
              onClick: () => {
                setShowSuccess(false);
                setAmount('');
                setRecipient('');
                navigate(-1);
              },
            },
          ]}
          onClose={() => setShowSuccess(false)}
        />
      )}
    </div>
  );
};

export default Send; 