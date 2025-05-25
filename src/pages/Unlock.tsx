import React, { useState } from 'react';
import { useSession } from '../context/SessionContext';
import { useNavigate } from 'react-router-dom';
import BlazrLogo from '../assets/blazr-logo.png';

const Unlock: React.FC = () => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { unlockSession } = useSession();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError('Please enter your password.');
      return;
    }
    setError('');
    const ok = await unlockSession(password);
    if (ok) {
      navigate('/home');
    } else {
      setError('Incorrect password.');
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
          <h2 className="text-2xl font-bold text-white mb-2 text-center">Unlock</h2>
          <input
            type="password"
            placeholder="Password"
            className="rounded-lg px-4 py-3 bg-[#232323] text-white focus:outline-none focus:ring-2 focus:ring-[#FF3131]"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
          {error && <div className="text-red-500 text-sm text-center">{error}</div>}
          <button
            type="submit"
            className="bg-[#FF3131] text-white font-bold py-3 rounded-lg mt-2 hover:bg-red-700 transition-all text-lg shadow-md"
          >
            Unlock
          </button>
        </form>
      </div>
    </div>
  );
};

export default Unlock; 