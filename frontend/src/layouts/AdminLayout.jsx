import React, { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';

import { useAuth } from '../state/auth/AuthContext.jsx';

const navItems = [
  { to: '/admin/dashboard', label: 'Dashboard', enabled: true },
  { to: '/admin/productos', label: 'Productos', enabled: true },
  { to: '/admin/stock', label: 'Stock', enabled: true },
  { to: '/admin/ventas', label: 'Ventas', enabled: true },
  { to: '/admin/alertas', label: 'Alertas', enabled: true },
  { to: '/admin/reportes', label: 'Reportes', enabled: true },
  { to: '/admin/usuarios', label: 'Usuarios', enabled: true },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();

  const [isMobile, setIsMobile] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    function onResize() {
      const next = window.innerWidth < 900;
      setIsMobile(next);
      if (!next) setMenuOpen(false);
    }
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const computedStyles = useMemo(() => {
    if (!isMobile) return styles;
    return {
      ...styles,
      page: {
        ...styles.page,
        display: 'block',
      },
      sidebar: {
        ...styles.sidebar,
        position: 'fixed',
        top: 0,
        left: 0,
        height: '100vh',
        width: 280,
        zIndex: 60,
        transform: menuOpen ? 'translateX(0)' : 'translateX(-110%)',
        transition: 'transform 180ms ease',
        boxShadow: '0 28px 60px rgba(0, 0, 0, 0.35)',
      },
      main: {
        ...styles.main,
        padding: 14,
      },
    };
  }, [isMobile, menuOpen]);

  return (
    <div style={computedStyles.page}>
      {isMobile ? (
        <header style={styles.mobileTopbar}>
          <button onClick={() => setMenuOpen(true)} style={styles.menuBtn} aria-label="Abrir menú">
            Menú
          </button>
          <Link to="/admin/dashboard" style={styles.mobileBrand}>
            Bodega Helen
          </Link>
          <button onClick={logout} style={styles.mobileLogoutBtn} aria-label="Cerrar sesión">
            Salir
          </button>
        </header>
      ) : null}

      {isMobile && menuOpen ? <div style={styles.backdrop} onClick={() => setMenuOpen(false)} /> : null}

      <aside style={computedStyles.sidebar}>
        <Link to="/admin/dashboard" style={styles.brand}>
          Bodega Helen
        </Link>
        <div style={styles.role}>ADMIN</div>

        <nav style={styles.nav}>
          {navItems.map((it) => {
            if (!it.enabled) {
              return (
                <div key={it.to} style={styles.navDisabled} title="Próximamente">
                  {it.label}
                  <span style={styles.badge}>Soon</span>
                </div>
              );
            }

            return (
              <NavLink
                key={it.to}
                to={it.to}
                style={({ isActive }) => ({
                  ...styles.navLink,
                  ...(isActive ? styles.navLinkActive : null),
                })}
                onClick={() => setMenuOpen(false)}
              >
                {it.label}
              </NavLink>
            );
          })}
        </nav>

        <div style={styles.sidebarFooter}>
          <div style={styles.userBox}>
            <div style={styles.userName}>{user?.nombre || 'Usuario'}</div>
            <div style={styles.userEmail}>{user?.email || ''}</div>
          </div>
          {!isMobile ? (
            <button onClick={logout} style={styles.logoutBtn}>
              Cerrar sesión
            </button>
          ) : (
            <button onClick={() => setMenuOpen(false)} style={styles.closeMenuBtn}>
              Cerrar
            </button>
          )}
        </div>
      </aside>

      <main style={computedStyles.main}>
        <Outlet />
      </main>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100dvh',
    width: '100%',
    minWidth: 0,
    display: 'grid',
    gridTemplateColumns: '280px 1fr',
    background: 'linear-gradient(135deg, #f2a1a5 0%, #b087b7 40%, #5377c8 100%)',
    fontFamily: 'system-ui, Arial',
    overflowX: 'hidden',
  },
  sidebar: {
    padding: 18,
    background: 'rgba(235, 240, 255, 0.55)',
    borderRight: '1px solid rgba(255,255,255,0.55)',
    backdropFilter: 'blur(14px)',
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  brand: {
    fontSize: 20,
    fontWeight: 900,
    color: '#0b2a52',
    textDecoration: 'none',
    letterSpacing: 0.2,
  },
  role: {
    display: 'inline-flex',
    width: 'fit-content',
    padding: '6px 10px',
    borderRadius: 999,
    background: 'rgba(11, 42, 82, 0.92)',
    color: 'rgba(255,255,255,0.95)',
    fontWeight: 900,
    fontSize: 12,
    letterSpacing: 1.2,
  },
  nav: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    marginTop: 4,
  },
  navLink: {
    padding: '10px 12px',
    borderRadius: 14,
    textDecoration: 'none',
    color: 'rgba(11, 42, 82, 0.86)',
    fontWeight: 800,
    border: '1px solid rgba(11, 42, 82, 0.10)',
    background: 'rgba(255,255,255,0.35)',
  },
  navLinkActive: {
    background: 'rgba(11, 42, 82, 0.92)',
    color: 'rgba(255,255,255,0.96)',
    border: '1px solid rgba(11, 42, 82, 0.18)',
  },
  navDisabled: {
    padding: '10px 12px',
    borderRadius: 14,
    color: 'rgba(11, 42, 82, 0.55)',
    fontWeight: 800,
    border: '1px dashed rgba(11, 42, 82, 0.18)',
    background: 'rgba(255,255,255,0.18)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  badge: {
    fontSize: 11,
    fontWeight: 900,
    padding: '4px 8px',
    borderRadius: 999,
    background: 'rgba(11, 42, 82, 0.10)',
    color: 'rgba(11, 42, 82, 0.75)',
  },
  sidebarFooter: {
    marginTop: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  userBox: {
    padding: 12,
    borderRadius: 16,
    background: 'rgba(255,255,255,0.35)',
    border: '1px solid rgba(11, 42, 82, 0.10)',
  },
  userName: { fontWeight: 900, color: '#0b2a52' },
  userEmail: { marginTop: 3, fontSize: 12, color: 'rgba(11, 42, 82, 0.65)' },
  logoutBtn: {
    padding: '10px 12px',
    borderRadius: 14,
    border: 'none',
    background: 'rgba(11, 42, 82, 0.92)',
    color: 'rgba(255,255,255,0.95)',
    fontWeight: 900,
    cursor: 'pointer',
  },
  main: {
    padding: 20,
    minWidth: 0,
    overflowX: 'hidden',
  },
  mobileTopbar: {
    position: 'sticky',
    top: 0,
    zIndex: 50,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    padding: '12px 14px',
    background: 'rgba(235, 240, 255, 0.75)',
    borderBottom: '1px solid rgba(255,255,255,0.55)',
    backdropFilter: 'blur(14px)',
  },
  menuBtn: {
    padding: '10px 12px',
    borderRadius: 14,
    border: '1px solid rgba(11, 42, 82, 0.14)',
    background: 'rgba(255,255,255,0.55)',
    color: 'rgba(11, 42, 82, 0.92)',
    fontWeight: 900,
    cursor: 'pointer',
  },
  mobileBrand: {
    fontWeight: 900,
    color: '#0b2a52',
    textDecoration: 'none',
    letterSpacing: 0.2,
  },
  mobileLogoutBtn: {
    padding: '10px 12px',
    borderRadius: 14,
    border: 'none',
    background: 'rgba(11, 42, 82, 0.92)',
    color: 'rgba(255,255,255,0.95)',
    fontWeight: 900,
    cursor: 'pointer',
  },
  closeMenuBtn: {
    padding: '10px 12px',
    borderRadius: 14,
    border: '1px solid rgba(11, 42, 82, 0.14)',
    background: 'rgba(255,255,255,0.55)',
    color: 'rgba(11, 42, 82, 0.92)',
    fontWeight: 900,
    cursor: 'pointer',
  },
  backdrop: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.35)',
    zIndex: 55,
  },
};
