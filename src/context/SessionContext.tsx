import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface SessionContextType {
  sessionLocked: boolean;
  isFirstTime: boolean;
  checkSession: () => Promise<void>;
  lockSession: () => Promise<void>;
  unlockSession: (password: string) => Promise<boolean>;
  createPassword: (password: string) => Promise<boolean>;
  updateLastActive: () => Promise<void>;
  logout: () => Promise<void>;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

const PASSWORD_KEY = 'blazr_password_hash';
const LAST_ACTIVE_KEY = 'lastActiveAt';
const SESSION_LOCKED_KEY = 'sessionLocked';
const SESSION_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  return window.crypto.subtle.digest('SHA-256', data).then(hashBuffer =>
    Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('')
  );
}

export const SessionProvider = ({ children }: { children: ReactNode }) => {
  const [sessionLocked, setSessionLocked] = useState(false);
  const [isFirstTime, setIsFirstTime] = useState(false);

  // Check session on mount
  useEffect(() => {
    checkSession();
    // eslint-disable-next-line
  }, []);

  const checkSession = async () => {
    chrome.storage.local.get([PASSWORD_KEY, LAST_ACTIVE_KEY, SESSION_LOCKED_KEY], (result) => {
      const passwordHash = result[PASSWORD_KEY];
      const lastActiveAt = result[LAST_ACTIVE_KEY];
      const locked = result[SESSION_LOCKED_KEY];
      if (!passwordHash) {
        setIsFirstTime(true);
        setSessionLocked(false);
        return;
      }
      setIsFirstTime(false);
      const now = Date.now();
      if (locked || !lastActiveAt || now - lastActiveAt > SESSION_TIMEOUT_MS) {
        setSessionLocked(true);
        chrome.storage.local.set({ [SESSION_LOCKED_KEY]: true });
      } else {
        setSessionLocked(false);
        chrome.storage.local.set({ [SESSION_LOCKED_KEY]: false, [LAST_ACTIVE_KEY]: now });
      }
    });
  };

  const lockSession = async () => {
    setSessionLocked(true);
    chrome.storage.local.set({ [SESSION_LOCKED_KEY]: true });
  };

  const unlockSession = async (password: string) => {
    return new Promise<boolean>((resolve) => {
      chrome.storage.local.get([PASSWORD_KEY], async (result) => {
        const passwordHash = result[PASSWORD_KEY];
        if (!passwordHash) {
          resolve(false);
          return;
        }
        const inputHash = await hashPassword(password);
        if (inputHash === passwordHash) {
          setSessionLocked(false);
          chrome.storage.local.set({ [SESSION_LOCKED_KEY]: false, [LAST_ACTIVE_KEY]: Date.now() });
          resolve(true);
        } else {
          resolve(false);
        }
      });
    });
  };

  const createPassword = async (password: string) => {
    const hash = await hashPassword(password);
    return new Promise<boolean>((resolve) => {
      chrome.storage.local.set({ [PASSWORD_KEY]: hash, [LAST_ACTIVE_KEY]: Date.now(), [SESSION_LOCKED_KEY]: false }, () => {
        setIsFirstTime(false);
        setSessionLocked(false);
        resolve(true);
      });
    });
  };

  const updateLastActive = async () => {
    chrome.storage.local.set({ [LAST_ACTIVE_KEY]: Date.now() });
  };

  const logout = async () => {
    setSessionLocked(true);
    chrome.storage.local.set({ [SESSION_LOCKED_KEY]: true });
  };

  return (
    <SessionContext.Provider value={{ sessionLocked, isFirstTime, checkSession, lockSession, unlockSession, createPassword, updateLastActive, logout }}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within a SessionProvider');
  return ctx;
}; 