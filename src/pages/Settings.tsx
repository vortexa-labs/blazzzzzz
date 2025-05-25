import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, RefreshCw, LogOut, Upload } from 'lucide-react';
import { Keypair } from '@solana/web3.js';
import { useSession } from '../context/SessionContext';
import { useWallet } from '../services/wallet/hooks';
import bs58 from 'bs58';

const BLZR_RED = '#FF3131';
const PASSWORD_KEY = 'blazr_password_hash';
const WALLET_KEY = 'blazr_wallet';

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { checkSession, logout } = useSession();
  const { importExistingWallet } = useWallet();
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Helper: Show toast
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  // Helper: Hash password (SHA-256)
  const hashPassword = async (password: string) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
  };

  // Change Password logic (local only)
  const handleChangePassword = async () => {
    setLoading(true);
    setError(null);
    try {
      // Get stored hash
      const { [PASSWORD_KEY]: password_hash } = await new Promise<any>(resolve => {
        chrome.storage.local.get([PASSWORD_KEY], (result) => resolve(result));
      });
      const currentHash = await hashPassword(currentPassword);
      if (currentHash !== password_hash) {
        setError('Current password is incorrect.');
        setLoading(false);
        return;
      }
      if (newPassword !== confirmPassword) {
        setError('New passwords do not match.');
        setLoading(false);
        return;
      }
      const newHash = await hashPassword(newPassword);
      chrome.storage.local.set({ [PASSWORD_KEY]: newHash }, async () => {
        await checkSession();
        setShowPasswordModal(false);
        setError(null);
        setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
        showToast('Password updated successfully!');
        setLoading(false);
      });
    } catch (e: any) {
      setError(e.message || 'Failed to update password.');
      setLoading(false);
    }
  };

  // Reset Wallet logic (local only)
  const handleResetWallet = async () => {
    setLoading(true);
    setError(null);
    try {
      // Remove wallet from storage
      await new Promise(resolve => chrome.storage.local.remove([WALLET_KEY], () => resolve(undefined)));
      // Generate new keypair
      const newKeypair = Keypair.generate();
      const newWallet = {
        publicKey: newKeypair.publicKey.toBase58(),
        secretKey: Array.from(newKeypair.secretKey)
      };
      chrome.storage.local.set({ [WALLET_KEY]: newWallet }, () => {
        setShowResetModal(false);
        setError(null);
        showToast('New wallet generated!');
        setLoading(false);
        // Close popup or sidepanel automatically
        setTimeout(() => {
          if (window.close) window.close();
        }, 1200);
      });
    } catch (e: any) {
      setError(e.message || 'Failed to reset wallet.');
      setLoading(false);
    }
  };

  // Logout logic (local only)
  const handleLogout = async () => {
    setLoading(true);
    setError(null);
    try {
      // Clear session keys
      await new Promise(resolve => chrome.storage.local.remove([PASSWORD_KEY, WALLET_KEY, 'lastActiveAt', 'sessionLocked'], () => resolve(undefined)));
      await logout();
      setShowLogoutModal(false);
      setError(null);
      showToast('Logged out!');
      setTimeout(() => navigate('/unlock'), 1000);
    } catch (e: any) {
      setError(e.message || 'Failed to logout.');
      setLoading(false);
    }
  };

  // Import Wallet logic
  const handleImportWallet = async () => {
    setLoading(true);
    setError(null);
    try {
      // Trim whitespace and remove any quotes
      const cleanedKey = privateKey.trim().replace(/['"]/g, '');
      
      // Try to decode as base58 first
      try {
        const secretKey = bs58.decode(cleanedKey);
        const keypair = Keypair.fromSecretKey(secretKey);
        
        // Import wallet
        await importExistingWallet(cleanedKey);
        
        // Refresh session to ensure it's still valid
        await checkSession();
        
        setShowImportModal(false);
        setPrivateKey('');
        setError(null);
        showToast('Wallet imported successfully! Your session remains active.');
      } catch {
        throw new Error('Invalid private key format. Please provide a valid base58 private key.');
      }
    } catch (e: any) {
      setError(e.message || 'Failed to import wallet.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white font-sans flex flex-col items-center p-4" style={{ maxWidth: 400, margin: '0 auto' }}>
      <h1 className="text-2xl font-bold mb-8 text-center">Settings</h1>
      <div className="w-full flex flex-col gap-4">
        <button
          className="flex items-center justify-between w-full py-4 px-3 rounded-xl bg-[#181818] text-white font-bold text-lg shadow-md border border-[#232323] transition-all duration-150 ease-in-out hover:bg-zinc-900 hover:scale-[1.01] hover:shadow-[0_0_8px_2px_#FF3131]"
          onClick={() => { setShowPasswordModal(true); setError(null); }}
        >
          <div className="flex items-center">
            <span className="w-8 h-8 bg-red-900/20 rounded-full flex items-center justify-center mr-3">
              <Lock className="w-4 h-4 text-red-500" />
            </span>
            <span>Change Password</span>
          </div>
        </button>
        <button
          className="flex items-center justify-between w-full py-4 px-3 rounded-xl bg-[#181818] text-white font-bold text-lg shadow-md border border-[#232323] transition-all duration-150 ease-in-out hover:bg-zinc-900 hover:scale-[1.01] hover:shadow-[0_0_8px_2px_#FF3131]"
          onClick={() => { setShowResetModal(true); setError(null); }}
        >
          <div className="flex items-center">
            <span className="w-8 h-8 bg-red-900/20 rounded-full flex items-center justify-center mr-3">
              <RefreshCw className="w-4 h-4 text-red-500" />
            </span>
            <span>Reset Wallet</span>
          </div>
        </button>
        <button
          className="flex items-center justify-between w-full py-4 px-3 rounded-xl bg-[#181818] text-white font-bold text-lg shadow-md border border-[#232323] transition-all duration-150 ease-in-out hover:bg-zinc-900 hover:scale-[1.01] hover:shadow-[0_0_8px_2px_#FF3131]"
          onClick={() => { setShowImportModal(true); setError(null); }}
        >
          <div className="flex items-center">
            <span className="w-8 h-8 bg-red-900/20 rounded-full flex items-center justify-center mr-3">
              <Upload className="w-4 h-4 text-red-500" />
            </span>
            <span>Import Wallet</span>
          </div>
        </button>
      </div>
      <div className="w-full flex flex-col gap-4 mt-8">
        <button
          className="flex items-center justify-between w-full py-4 px-3 rounded-xl bg-[#181818] text-white font-bold text-lg shadow-md border border-[#232323] transition-all duration-150 ease-in-out hover:bg-zinc-900 hover:scale-[1.01] hover:shadow-[0_0_8px_2px_#FF3131]"
          onClick={() => { setShowLogoutModal(true); setError(null); }}
        >
          <div className="flex items-center">
            <span className="w-8 h-8 bg-red-900/20 rounded-full flex items-center justify-center mr-3">
              <LogOut className="w-4 h-4 text-red-500" />
            </span>
            <span>Reset Blazr</span>
          </div>
        </button>
      </div>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-[#181818] rounded-xl p-6 w-full max-w-xs">
            <h2 className="text-xl font-bold mb-4">Change Password</h2>
            <input
              type="password"
              placeholder="Current Password"
              className="w-full mb-3 p-2 rounded bg-[#232323] text-white"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              autoFocus
            />
            <input
              type="password"
              placeholder="New Password"
              className="w-full mb-3 p-2 rounded bg-[#232323] text-white"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
            />
            <input
              type="password"
              placeholder="Confirm New Password"
              className="w-full mb-4 p-2 rounded bg-[#232323] text-white"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
            />
            {error && <div className="text-red-500 text-sm mb-2">{error}</div>}
            <div className="flex gap-2 mt-2">
              <button
                className="flex-1 py-2 rounded bg-zinc-700 text-gray-300 hover:bg-zinc-600"
                onClick={() => { setShowPasswordModal(false); setError(null); }}
                disabled={loading}
              >Cancel</button>
              <button
                className="flex-1 py-2 rounded bg-[#FF3131] text-white font-bold hover:bg-red-700 shadow"
                onClick={handleChangePassword}
                disabled={loading}
              >Update</button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Wallet Modal */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-[#181818] rounded-xl p-6 w-full max-w-xs">
            <h2 className="text-xl font-bold mb-4 text-red-400">Reset Wallet</h2>
            <div className="text-gray-300 mb-4">This will permanently delete your current wallet and generate a new one.</div>
            {error && <div className="text-red-500 text-sm mb-2">{error}</div>}
            <div className="flex gap-2 mt-2">
              <button
                className="flex-1 py-2 rounded bg-zinc-700 text-gray-300 hover:bg-zinc-600"
                onClick={() => { setShowResetModal(false); setError(null); }}
                disabled={loading}
              >Cancel</button>
              <button
                className="flex-1 py-2 rounded bg-[#FF3131] text-white font-bold hover:bg-red-700 shadow"
                onClick={handleResetWallet}
                disabled={loading}
              >Reset Wallet</button>
            </div>
          </div>
        </div>
      )}

      {/* Logout Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-[#181818] rounded-xl p-6 w-full max-w-xs">
            <h2 className="text-xl font-bold mb-4">Logout</h2>
            <div className="text-gray-300 mb-4">This will log you out and erase all data. Are you sure?</div>
            {error && <div className="text-red-500 text-sm mb-2">{error}</div>}
            <div className="flex gap-2 mt-2">
              <button
                className="flex-1 py-2 rounded bg-zinc-700 text-gray-300 hover:bg-zinc-600"
                onClick={() => { setShowLogoutModal(false); setError(null); }}
                disabled={loading}
              >Cancel</button>
              <button
                className="flex-1 py-2 rounded bg-[#FF3131] text-white font-bold hover:bg-red-700 shadow"
                onClick={handleLogout}
                disabled={loading}
              >Logout</button>
            </div>
          </div>
        </div>
      )}

      {/* Import Wallet Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-[#181818] rounded-xl p-6 w-full max-w-xs">
            <h2 className="text-xl font-bold mb-4">Import Wallet</h2>
            <div className="text-gray-300 mb-4">
              Enter your private key (base58 format). Your current password and session will remain active.
            </div>
            <textarea
              placeholder="Private Key"
              className="w-full mb-4 p-2 rounded bg-[#232323] text-white h-24 resize-none"
              value={privateKey}
              onChange={e => setPrivateKey(e.target.value)}
              autoFocus
            />
            {error && <div className="text-red-500 text-sm mb-2">{error}</div>}
            <div className="flex gap-2 mt-2">
              <button
                className="flex-1 py-2 rounded bg-zinc-700 text-gray-300 hover:bg-zinc-600"
                onClick={() => { setShowImportModal(false); setError(null); setPrivateKey(''); }}
                disabled={loading}
              >Cancel</button>
              <button
                className="flex-1 py-2 rounded bg-[#FF3131] text-white font-bold hover:bg-red-700 shadow"
                onClick={handleImportWallet}
                disabled={loading}
              >Import</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#181818] text-white px-6 py-3 rounded-xl shadow-lg border border-[#FF3131] z-50">
          {toast}
        </div>
      )}
    </div>
  );
};

export default Settings; 