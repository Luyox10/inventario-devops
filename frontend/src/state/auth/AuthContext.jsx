import React, { createContext, useContext, useMemo, useState } from 'react';

const AuthContext = createContext(null);

const STORAGE_KEY = 'inventario_auth';

function readStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { token: null, user: null };
    const parsed = JSON.parse(raw);
    return {
      token: parsed.token || null,
      user: parsed.user || null,
    };
  } catch {
    return { token: null, user: null };
  }
}

function writeStored({ token, user }) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, user }));
}

function clearStored() {
  localStorage.removeItem(STORAGE_KEY);
}

export function AuthProvider({ children }) {
  const stored = readStored();
  const [token, setToken] = useState(stored.token);
  const [user, setUser] = useState(stored.user);

  const value = useMemo(() => {
    return {
      token,
      user,
      isAuthenticated: Boolean(token && user),
      setSession(next) {
        setToken(next.token);
        setUser(next.user);
        writeStored(next);
      },
      logout() {
        setToken(null);
        setUser(null);
        clearStored();
      },
    };
  }, [token, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
