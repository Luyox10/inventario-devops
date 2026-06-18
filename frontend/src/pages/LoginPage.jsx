import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { loginRequest } from '../api/auth';
import { useAuth } from '../state/auth/AuthContext.jsx';

const GOOGLE_FONT = `@import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800;900&display=swap');`;

const KEYFRAMES = `
@keyframes loginSpin {
  to { transform: rotate(360deg); }
}
@keyframes cardIn {
  from { opacity: 0; transform: translateY(28px) scale(0.97); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes sphere1 {
  0%, 100% { transform: translate(0,0); }
  50%       { transform: translate(18px, -22px); }
}
@keyframes sphere2 {
  0%, 100% { transform: translate(0,0); }
  50%       { transform: translate(-16px, 18px); }
}
@keyframes sphere3 {
  0%, 100% { transform: translate(0,0); }
  50%       { transform: translate(14px, 14px); }
}
`;

export default function LoginPage() {
  const navigate = useNavigate();
  const auth = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
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
      setError(err.message || 'Credenciales incorrectas. Verifica tu email y contraseña.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <style>{GOOGLE_FONT + KEYFRAMES}</style>
      <div style={styles.page}>
        <div style={styles.card}>

          {/* ── LEFT: decorative ── */}
          <div style={styles.leftPanel}>
            <div style={styles.sphere1} />
            <div style={styles.sphere2} />
            <div style={styles.sphere3} />
            <div style={styles.leftContent}>
              <div style={styles.brand}>
                <div style={styles.brandIcon}><StoreIcon /></div>
                <span style={styles.brandName}>Bodega Helen</span>
              </div>
              <h1 style={styles.welcomeTitle}>Bienvenido.</h1>
              <p style={styles.welcomeText}>Gestiona tu inventario, ventas y stock desde un solo lugar.</p>
            </div>
          </div>

          {/* ── RIGHT: form ── */}
          <div style={styles.rightPanel}>
            <h2 style={styles.formTitle}>Iniciar sesión</h2>
            <p style={styles.formSub}>Ingresa tus credenciales para continuar</p>

            <form onSubmit={onSubmit} style={styles.form}>
              <div style={styles.field}>
                <div style={styles.iconCell}><MailIcon /></div>
                <input
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(''); }}
                  type="email"
                  placeholder="Correo electrónico"
                  required
                  autoComplete="username"
                  style={styles.input}
                />
              </div>

              <div style={styles.field}>
                <div style={styles.iconCell}><LockIcon /></div>
                <input
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  type={showPass ? 'text' : 'password'}
                  placeholder="Contraseña"
                  required
                  autoComplete="current-password"
                  style={styles.input}
                />
                <button
                  type="button"
                  style={styles.eyeBtn}
                  onClick={() => setShowPass((v) => !v)}
                  tabIndex={-1}
                  title={showPass ? 'Ocultar' : 'Mostrar'}
                >
                  {showPass ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>

              {error ? (
                <div style={styles.error}>
                  <ErrorIcon />
                  <span>{error}</span>
                </div>
              ) : null}

              <button type="submit" disabled={loading} style={{ ...styles.button, ...(loading ? styles.buttonLoading : null) }}>
                {loading ? (
                  <span style={styles.loadingRow}>
                    <span style={styles.spinner} />
                    Ingresando...
                  </span>
                ) : 'Ingresar'}
              </button>
            </form>
          </div>

        </div>
      </div>
    </>
  );
}

function InventoryIllustration() {
  return (
    <svg width="380" height="220" viewBox="0 0 380 220" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Floor */}
      <ellipse cx="190" cy="205" rx="170" ry="12" fill="rgba(255,255,255,0.10)" />

      {/* Back shelf unit */}
      <rect x="60" y="60" width="260" height="8" rx="4" fill="rgba(255,255,255,0.35)" />
      <rect x="60" y="110" width="260" height="8" rx="4" fill="rgba(255,255,255,0.35)" />
      <rect x="60" y="160" width="260" height="8" rx="4" fill="rgba(255,255,255,0.35)" />
      {/* Shelf verticals */}
      <rect x="60" y="60" width="7" height="148" rx="3" fill="rgba(255,255,255,0.28)" />
      <rect x="313" y="60" width="7" height="148" rx="3" fill="rgba(255,255,255,0.28)" />
      <rect x="186" y="60" width="7" height="148" rx="3" fill="rgba(255,255,255,0.20)" />

      {/* Top shelf items */}
      <rect x="80" y="38" width="32" height="22" rx="4" fill="rgba(242,161,165,0.85)" />
      <rect x="118" y="42" width="24" height="18" rx="4" fill="rgba(255,255,255,0.70)" />
      <rect x="148" y="36" width="28" height="24" rx="4" fill="rgba(176,135,183,0.80)" />
      <rect x="205" y="40" width="30" height="20" rx="4" fill="rgba(255,255,255,0.65)" />
      <rect x="241" y="37" width="26" height="23" rx="4" fill="rgba(242,161,165,0.75)" />
      <rect x="273" y="41" width="34" height="19" rx="4" fill="rgba(176,135,183,0.70)" />

      {/* Mid shelf items */}
      <rect x="75" y="88" width="40" height="22" rx="4" fill="rgba(255,255,255,0.65)" />
      <rect x="122" y="90" width="28" height="20" rx="4" fill="rgba(83,119,200,0.75)" />
      <rect x="156" y="86" width="22" height="24" rx="5" fill="rgba(242,161,165,0.80)" />
      <rect x="200" y="89" width="36" height="21" rx="4" fill="rgba(255,255,255,0.60)" />
      <rect x="243" y="87" width="30" height="23" rx="4" fill="rgba(83,119,200,0.65)" />
      <rect x="280" y="90" width="28" height="20" rx="4" fill="rgba(176,135,183,0.75)" />

      {/* Bottom shelf items */}
      <rect x="72" y="136" width="44" height="24" rx="4" fill="rgba(176,135,183,0.70)" />
      <rect x="124" y="138" width="32" height="22" rx="4" fill="rgba(242,161,165,0.75)" />
      <rect x="163" y="134" width="20" height="26" rx="5" fill="rgba(255,255,255,0.65)" />
      <rect x="202" y="137" width="38" height="23" rx="4" fill="rgba(83,119,200,0.70)" />
      <rect x="247" y="135" width="28" height="25" rx="4" fill="rgba(242,161,165,0.80)" />
      <rect x="282" y="138" width="30" height="22" rx="4" fill="rgba(255,255,255,0.60)" />

      {/* Floating box front */}
      <rect x="148" y="168" width="50" height="36" rx="6" fill="rgba(255,255,255,0.22)" stroke="rgba(255,255,255,0.50)" strokeWidth="1.5" />
      <rect x="148" y="178" width="50" height="2" rx="1" fill="rgba(255,255,255,0.40)" />
      <line x1="173" y1="168" x2="173" y2="204" stroke="rgba(255,255,255,0.40)" strokeWidth="1.5" />

      {/* Floating tag */}
      <rect x="242" y="155" width="64" height="30" rx="8" fill="rgba(255,255,255,0.18)" stroke="rgba(255,255,255,0.45)" strokeWidth="1.2" />
      <rect x="252" y="163" width="30" height="4" rx="2" fill="rgba(255,255,255,0.65)" />
      <rect x="252" y="171" width="20" height="3" rx="1.5" fill="rgba(255,255,255,0.40)" />
      <circle cx="295" cy="170" r="5" fill="rgba(242,161,165,0.85)" />

      {/* Small floating chart */}
      <rect x="68" y="155" width="58" height="34" rx="8" fill="rgba(255,255,255,0.16)" stroke="rgba(255,255,255,0.40)" strokeWidth="1.2" />
      <rect x="76" y="175" width="8" height="8" rx="2" fill="rgba(242,161,165,0.85)" />
      <rect x="88" y="170" width="8" height="13" rx="2" fill="rgba(176,135,183,0.85)" />
      <rect x="100" y="166" width="8" height="17" rx="2" fill="rgba(255,255,255,0.75)" />
      <rect x="112" y="172" width="8" height="11" rx="2" fill="rgba(83,119,200,0.80)" />
    </svg>
  );
}

function StoreIcon() {
  return (
    <svg width="38" height="38" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M9 21V12h6v9" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 6h16v12H4V6Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="m4 7 8 6 8-6" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7 11V8a5 5 0 1 1 10 0v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M7 11h10v9H7v-9Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M1 1l22 22" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function ErrorIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
      <circle cx="12" cy="12" r="10" stroke="#dc2626" strokeWidth="1.6" />
      <path d="M12 8v4M12 16h.01" stroke="#dc2626" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

const styles = {
  /* ── PAGE (fondo) ── */
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #f2a1a5 0%, #b087b7 45%, #5377c8 100%)',
    padding: 24,
    fontFamily: 'system-ui, Arial',
  },

  /* ── CARD flotante ── */
  card: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    width: '100%',
    maxWidth: 900,
    minHeight: 520,
    borderRadius: 28,
    overflow: 'hidden',
    boxShadow: '0 40px 80px rgba(11,42,82,0.35)',
    animation: 'cardIn 0.55s cubic-bezier(.22,.68,0,1.1) both',
  },

  /* ── LEFT: decorativo ── */
  leftPanel: {
    background: 'linear-gradient(145deg, #5377c8 0%, #b087b7 55%, #f2a1a5 100%)',
    position: 'relative',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  sphere1: {
    position: 'absolute',
    width: 280, height: 280, borderRadius: '50%',
    background: 'radial-gradient(circle at 35% 35%, rgba(255,255,255,0.28), rgba(83,119,200,0.55))',
    boxShadow: 'inset -12px -12px 30px rgba(11,42,82,0.25)',
    bottom: '-60px', left: '-60px',
    animation: 'sphere1 8s ease-in-out infinite',
  },
  sphere2: {
    position: 'absolute',
    width: 200, height: 200, borderRadius: '50%',
    background: 'radial-gradient(circle at 35% 35%, rgba(255,255,255,0.22), rgba(176,135,183,0.60))',
    boxShadow: 'inset -10px -10px 24px rgba(11,42,82,0.20)',
    top: '-40px', right: '-40px',
    animation: 'sphere2 10s ease-in-out infinite',
  },
  sphere3: {
    position: 'absolute',
    width: 130, height: 130, borderRadius: '50%',
    background: 'radial-gradient(circle at 35% 35%, rgba(255,255,255,0.30), rgba(242,161,165,0.55))',
    boxShadow: 'inset -8px -8px 18px rgba(11,42,82,0.18)',
    top: '38%', right: '14%',
    animation: 'sphere3 12s ease-in-out infinite',
  },
  leftContent: {
    position: 'relative', zIndex: 1,
    display: 'flex', flexDirection: 'column', gap: 16,
    width: '100%',
    overflow: 'hidden',
  },
  brand: { display: 'flex', alignItems: 'center', gap: 10 },
  brandIcon: {
    width: 38, height: 38, borderRadius: 10,
    background: 'rgba(255,255,255,0.22)',
    border: '1px solid rgba(255,255,255,0.40)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#fff', flexShrink: 0,
  },
  brandName: { fontWeight: 900, fontSize: 15, color: '#fff', letterSpacing: -0.2 },
  welcomeTitle: {
    margin: 0, fontSize: 40, fontWeight: 900,
    color: '#fff', letterSpacing: -1, lineHeight: 1.1,
    fontFamily: "'Syne', system-ui, Arial",
    textShadow: '0 4px 20px rgba(11,42,82,0.25)',
    wordBreak: 'break-word',
  },
  welcomeText: {
    margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.80)',
    lineHeight: 1.7, fontWeight: 500,
  },

  /* ── RIGHT: formulario ── */
  rightPanel: {
    background: '#fff',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    padding: '48px 44px',
  },
  formTitle: { margin: '0 0 6px', fontSize: 28, fontWeight: 900, color: '#0b2a52' },
  formSub: { margin: '0 0 28px', fontSize: 13, color: 'rgba(11,42,82,0.50)' },
  form: { display: 'flex', flexDirection: 'column', gap: 14 },
  field: {
    display: 'grid',
    gridTemplateColumns: '42px 1fr auto',
    borderRadius: 12,
    overflow: 'hidden',
    border: '1.5px solid rgba(11,42,82,0.12)',
    background: '#f7f8fc',
  },
  iconCell: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'linear-gradient(160deg, #5377c8, #b087b7)',
    color: '#fff',
  },
  input: {
    padding: '13px 12px',
    border: 'none', background: 'transparent', outline: 'none',
    fontSize: 14, color: '#0b2a52', width: '100%',
  },
  eyeBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '0 12px', border: 'none', background: 'transparent',
    color: 'rgba(11,42,82,0.35)', cursor: 'pointer',
  },
  error: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '10px 13px', borderRadius: 10,
    background: 'rgba(220,38,38,0.07)',
    border: '1px solid rgba(220,38,38,0.22)',
    color: '#991b1b', fontSize: 13, fontWeight: 600,
  },
  button: {
    marginTop: 6, padding: '14px',
    borderRadius: 12, border: 'none',
    background: 'linear-gradient(135deg, #5377c8 0%, #b087b7 60%, #f2a1a5 100%)',
    color: '#fff', fontWeight: 900, fontSize: 14,
    letterSpacing: 0.5, cursor: 'pointer',
    boxShadow: '0 6px 22px rgba(83,119,200,0.38)',
    transition: 'opacity 0.15s',
  },
  buttonLoading: { opacity: 0.72, cursor: 'not-allowed' },
  loadingRow: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 },
  spinner: {
    width: 16, height: 16,
    border: '2px solid rgba(255,255,255,0.35)',
    borderTopColor: '#fff',
    borderRadius: '50%', display: 'inline-block',
    animation: 'loginSpin 0.8s linear infinite',
  },
};
