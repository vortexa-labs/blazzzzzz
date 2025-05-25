import React, { useState } from 'react';
import { useSession } from '../context/SessionContext';
import { useNavigate } from 'react-router-dom';
import { Keypair } from '@solana/web3.js';
import BlazrLogo from '../assets/blazr-logo.png';

const CreatePassword: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const { createPassword } = useSession();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || !confirmPassword) {
      setError('Please fill in both fields.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setError('');
    const ok = await createPassword(password);
    if (ok) {
      // Check if wallet exists, if not, create and store it
      chrome.storage.local.get(['blazr_wallet'], (result) => {
        if (!result.blazr_wallet) {
          const kp = Keypair.generate();
          const walletObj = {
            publicKey: kp.publicKey.toBase58(),
            secretKey: Array.from(kp.secretKey),
          };
          chrome.storage.local.set({ blazr_wallet: walletObj }, () => {
            navigate('/home');
          });
        } else {
          navigate('/home');
        }
      });
    } else {
      setError('Failed to create password.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f0f0f]">
      <div className="flex flex-col items-center w-full max-w-sm">
        <img src={BlazrLogo} alt="Blazr Logo" className="h-16 w-auto mb-8" />
        <form
          onSubmit={handleSubmit}
          className="bg-[#181818] rounded-2xl shadow-lg p-8 w-full flex flex-col gap-6"
        >
          <h2 className="text-2xl font-bold text-white mb-2 text-center">Create Password</h2>
          <input
            type="password"
            placeholder="Password"
            className="rounded-lg px-4 py-3 bg-[#232323] text-white focus:outline-none focus:ring-2 focus:ring-[#FF3131]"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
          <input
            type="password"
            placeholder="Confirm Password"
            className="rounded-lg px-4 py-3 bg-[#232323] text-white focus:outline-none focus:ring-2 focus:ring-[#FF3131]"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
          />
          {error && <div className="text-red-500 text-sm text-center">{error}</div>}
          <button
            type="submit"
            className="bg-[#FF3131] text-white font-bold py-3 rounded-lg mt-2 hover:bg-red-700 transition-all text-lg shadow-md"
          >
            Create Wallet & Continue
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreatePassword; 