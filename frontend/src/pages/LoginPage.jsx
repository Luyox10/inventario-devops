import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { loginRequest } from '../api/auth';
import { useAuth } from '../state/auth/AuthContext.jsx';

export default function LoginPage() {
  const navigate = useNavigate();
  const auth = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await loginRequest({ email, password });
      auth.setSession({ token: result.token, user: result.user });

      if (result.user?.rol === 'ADMIN') {
        navigate('/admin/dashboard', { replace: true });
        return;
      }

      navigate('/empleado/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || 'Error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.cardWrap}>
        <div style={styles.avatar}>
          <UserIcon />
        </div>

        <div style={styles.card}>
          <h1 style={styles.title}>Bodega Helen</h1>
          <p style={styles.subtitle}>Sistema de Control de Inventario</p>

          <form onSubmit={onSubmit} style={styles.form}>
            <div style={styles.field}>
              <div style={styles.iconCell}>
                <MailIcon />
              </div>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                placeholder="Email"
                required
                style={styles.input}
              />
            </div>

            <div style={styles.field}>
              <div style={styles.iconCell}>
                <LockIcon />
              </div>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                placeholder="Password"
                required
                style={styles.input}
              />
            </div>

            <div style={styles.row}>
              <label style={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                Recordarme
              </label>
              <button
                type="button"
                style={styles.linkButton}
                onClick={() => {
                  setError('');
                  setError('Función pendiente');
                }}
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            {error ? <div style={styles.error}>{error}</div> : null}

            <button type="submit" disabled={loading} style={styles.button}>
              {loading ? 'Ingresando...' : 'LOGIN'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function UserIcon() {
  return (
    <svg width="44" height="44" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 12c2.761 0 5-2.239 5-5S14.761 2 12 2 7 4.239 7 7s2.239 5 5 5Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M20 22a8 8 0 0 0-16 0"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 6h16v12H4V6Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="m4 7 8 6 8-6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M7 11V8a5 5 0 1 1 10 0v3"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M7 11h10v9H7v-9Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #f2a1a5 0%, #b087b7 40%, #5377c8 100%)',
    padding: 16,
  },
  cardWrap: {
    width: '100%',
    maxWidth: 520,
    position: 'relative',
    display: 'flex',
    justifyContent: 'center',
    paddingTop: 44,
  },
  avatar: {
    position: 'absolute',
    top: -14,
    width: 78,
    height: 78,
    borderRadius: 999,
    background: '#0b2a52',
    color: 'rgba(255,255,255,0.95)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 16px 30px rgba(0,0,0,0.35)',
    border: '3px solid rgba(255,255,255,0.45)',
    zIndex: 2,
  },
  card: {
    width: '100%',
    background: 'rgba(235, 240, 255, 0.78)',
    border: '1px solid rgba(255,255,255,0.55)',
    borderRadius: 18,
    padding: 28,
    boxShadow: '0 28px 60px rgba(0, 0, 0, 0.35)',
    backdropFilter: 'blur(14px)',
  },
  title: { margin: 0, fontSize: 28, fontWeight: 800, color: '#0b2a52' },
  subtitle: { marginTop: 8, marginBottom: 18, color: 'rgba(11, 42, 82, 0.75)', lineHeight: 1.35 },
  form: { display: 'flex', flexDirection: 'column', gap: 12 },
  field: {
    display: 'grid',
    gridTemplateColumns: '44px 1fr',
    borderRadius: 12,
    overflow: 'hidden',
    border: '1px solid rgba(11, 42, 82, 0.18)',
    background: 'rgba(255,255,255,0.55)',
  },
  iconCell: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(11, 42, 82, 0.92)',
    color: 'rgba(255,255,255,0.92)',
  },
  input: {
    padding: '12px 12px',
    border: 'none',
    background: 'transparent',
    outline: 'none',
    fontSize: 14,
    color: '#0b2a52',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 2,
  },
  checkbox: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 12,
    color: 'rgba(11, 42, 82, 0.7)',
    userSelect: 'none',
  },
  linkButton: {
    background: 'transparent',
    border: 'none',
    padding: 0,
    fontSize: 12,
    color: 'rgba(11, 42, 82, 0.75)',
    textDecoration: 'underline',
    cursor: 'pointer',
  },
  button: {
    marginTop: 10,
    padding: '12px 12px',
    borderRadius: 14,
    border: 'none',
    background: 'linear-gradient(180deg, rgba(11, 42, 82, 0.94) 0%, rgba(11, 42, 82, 0.84) 100%)',
    color: 'rgba(255,255,255,0.96)',
    fontWeight: 800,
    letterSpacing: 1.5,
    cursor: 'pointer',
  },
  error: {
    padding: 10,
    borderRadius: 12,
    background: 'rgba(239, 68, 68, 0.12)',
    border: '1px solid rgba(239, 68, 68, 0.35)',
    color: 'rgba(11, 42, 82, 0.92)',
    fontSize: 14,
  },
};
