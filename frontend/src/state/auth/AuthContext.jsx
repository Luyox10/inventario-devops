import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const AuthContext = createContext(null);

const STORAGE_KEY = 'inventario_auth';

// Politica de expiracion de sesion:
//  - Inactividad: 15 minutos sin interaccion del usuario (ajustable 15-30 min)
//  - Absoluta: 8 horas desde el login (jornada laboral, ajustable 8-12 h)
const INACTIVITY_LIMIT_MS = 15 * 60 * 1000;
const ABSOLUTE_LIMIT_MS = 8 * 60 * 60 * 1000;
const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'scroll', 'touchstart'];
const ACTIVITY_THROTTLE_MS = 10_000;
const CHECK_INTERVAL_MS = 5_000;
// Tiempo que el toast de 'sesion expirada' permanece visible antes de redirigir al login
const EXPIRED_TOAST_DELAY_MS = 3_000;

function readStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { token: null, user: null, loginAt: null, lastActivity: null };
    const parsed = JSON.parse(raw);
    return {
      token: parsed.token || null,
      user: parsed.user || null,
      loginAt: parsed.loginAt || null,
      lastActivity: parsed.lastActivity || null,
    };
  } catch {
    return { token: null, user: null, loginAt: null, lastActivity: null };
  }
}

function writeStored({ token, user, loginAt, lastActivity }) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, user, loginAt, lastActivity }));
}

function persistLastActivity(at) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    parsed.lastActivity = at;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
  } catch {
    // ignore
  }
}

function isSessionExpired({ loginAt, lastActivity }) {
  if (!loginAt || !lastActivity) return true;
  const now = Date.now();
  return now - Number(lastActivity) >= INACTIVITY_LIMIT_MS || now - Number(loginAt) >= ABSOLUTE_LIMIT_MS;
}

function clearStored() {
  localStorage.removeItem(STORAGE_KEY);
}

const expiredToastStyle = {
  position: 'fixed',
  right: '1.25rem',
  bottom: '1.25rem',
  zIndex: 9999,
  background: '#7f1d1d',
  color: '#fecaca',
  border: '1px solid #ef4444',
  borderRadius: '8px',
  padding: '0.85rem 1.2rem',
  fontSize: '0.9rem',
  fontWeight: 600,
  boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
};

export function AuthProvider({ children }) {
  const stored = readStored();
  const storedExpired = stored.token && isSessionExpired(stored);
  if (storedExpired) clearStored();

  const [token, setToken] = useState(storedExpired ? null : stored.token);
  const [user, setUser] = useState(storedExpired ? null : stored.user);
  const [loginAt, setLoginAt] = useState(storedExpired ? null : stored.loginAt);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    if (!token) return undefined;

    const doLogout = () => {
      setExpired(false);
      setToken(null);
      setUser(null);
      setLoginAt(null);
      clearStored();
    };

    let logoutTimer = null;

    const check = () => {
      const current = readStored();
      if (logoutTimer !== null || !current.token || !isSessionExpired(current)) return;
      // Mostrar aviso y cerrar sesion luego del delay
      setExpired(true);
      logoutTimer = setTimeout(doLogout, EXPIRED_TOAST_DELAY_MS);
    };

    let lastWrite = 0;
    const onActivity = () => {
      const now = Date.now();
      if (now - lastWrite < ACTIVITY_THROTTLE_MS) return;
      lastWrite = now;
      persistLastActivity(now);
    };

    const id = setInterval(check, CHECK_INTERVAL_MS);
    ACTIVITY_EVENTS.forEach((event) =>
      window.addEventListener(event, onActivity, { passive: true })
    );

    check();

    return () => {
      clearInterval(id);
      if (logoutTimer !== null) clearTimeout(logoutTimer);
      ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, onActivity));
    };
  }, [token, loginAt]);

  const value = useMemo(() => {
    return {
      token,
      user,
      isAuthenticated: Boolean(token && user),
      setSession(next) {
        const at = Date.now();
        setToken(next.token);
        setUser(next.user);
        setLoginAt(at);
        writeStored({ token: next.token, user: next.user, loginAt: at, lastActivity: at });
      },
      logout() {
        setExpired(false);
        setToken(null);
        setUser(null);
        setLoginAt(null);
        clearStored();
      },
    };
  }, [token, user, loginAt]);

  return (
    <AuthContext.Provider value={value}>
      {children}
      {expired && (
        <div style={expiredToastStyle} role="alert">
          Tu sesión expiró, inicia sesión nuevamente
        </div>
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
