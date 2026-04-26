import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { listStockBajo } from '../../api/alertas';
import { useAuth } from '../../state/auth/AuthContext.jsx';

export default function AdminAlertasPage() {
  const { token, logout } = useAuth();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function refresh() {
    setError('');
    setLoading(true);
    try {
      const data = await listStockBajo({ token });
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      if (err.status === 401) logout();
      setError(err.message || 'Error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <h2 style={styles.h2}>Alertas</h2>
          <p style={styles.p}>Productos por debajo del stock mínimo.</p>
        </div>
        <div style={styles.headerRight}>
          <Link to="/admin/stock" style={styles.linkBtn}>
            Ir a Stock
          </Link>
          <button onClick={refresh} style={styles.secondaryBtn} disabled={loading}>
            {loading ? 'Cargando...' : 'Actualizar'}
          </button>
        </div>
      </header>

      <section style={styles.card}>
        {error ? <div style={styles.error}>{error}</div> : null}

        {loading ? (
          <div style={styles.muted}>Cargando...</div>
        ) : rows.length === 0 ? (
          <div style={styles.muted}>No hay alertas. Todo OK.</div>
        ) : (
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Producto</th>
                  <th style={styles.th}>SKU</th>
                  <th style={styles.th}>Unidad</th>
                  <th style={styles.th}>Stock</th>
                  <th style={styles.th}>Mínimo</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} style={styles.trWarn}>
                    <td style={styles.tdStrong}>{r.nombre}</td>
                    <td style={styles.td}>{r.sku || '-'}</td>
                    <td style={styles.td}>{r.unidad || 'und'}</td>
                    <td style={styles.td}>{r.stock_actual}</td>
                    <td style={styles.td}>{r.stock_minimo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    padding: 20,
    background: 'linear-gradient(135deg, #f2a1a5 0%, #b087b7 40%, #5377c8 100%)',
    fontFamily: 'system-ui, Arial',
  },
  header: {
    maxWidth: 1080,
    margin: '0 auto 16px',
    display: 'flex',
    justifyContent: 'space-between',
    gap: 16,
    alignItems: 'flex-start',
  },
  headerRight: { display: 'flex', gap: 10, alignItems: 'center' },
  h2: { margin: 0, color: '#0b2a52', fontSize: 26, fontWeight: 900 },
  p: { margin: '8px 0 0', color: 'rgba(11, 42, 82, 0.75)' },
  card: {
    maxWidth: 1080,
    margin: '0 auto',
    background: 'rgba(235, 240, 255, 0.78)',
    border: '1px solid rgba(255,255,255,0.55)',
    borderRadius: 18,
    padding: 18,
    boxShadow: '0 28px 60px rgba(0, 0, 0, 0.25)',
    backdropFilter: 'blur(14px)',
  },
  muted: { color: 'rgba(11, 42, 82, 0.75)', marginTop: 12 },
  error: {
    marginTop: 0,
    padding: 10,
    borderRadius: 12,
    background: 'rgba(239, 68, 68, 0.12)',
    border: '1px solid rgba(239, 68, 68, 0.35)',
    color: 'rgba(11, 42, 82, 0.92)',
    fontSize: 14,
  },
  tableWrap: { overflowX: 'auto', marginTop: 12 },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: {
    textAlign: 'left',
    fontSize: 12,
    color: 'rgba(11, 42, 82, 0.75)',
    padding: '10px 10px',
    borderBottom: '1px solid rgba(11, 42, 82, 0.14)',
    whiteSpace: 'nowrap',
  },
  td: {
    fontSize: 13,
    color: '#0b2a52',
    padding: '10px 10px',
    borderBottom: '1px solid rgba(11, 42, 82, 0.1)',
    whiteSpace: 'nowrap',
  },
  tdStrong: {
    fontSize: 13,
    color: '#0b2a52',
    padding: '10px 10px',
    borderBottom: '1px solid rgba(11, 42, 82, 0.1)',
    whiteSpace: 'nowrap',
    fontWeight: 900,
  },
  trWarn: { background: 'rgba(245, 158, 11, 0.10)' },
  secondaryBtn: {
    padding: '8px 10px',
    borderRadius: 12,
    border: '1px solid rgba(11, 42, 82, 0.2)',
    background: 'rgba(255,255,255,0.25)',
    color: '#0b2a52',
    fontWeight: 800,
    cursor: 'pointer',
  },
  linkBtn: {
    padding: '8px 10px',
    borderRadius: 12,
    border: 'none',
    background: 'rgba(11, 42, 82, 0.92)',
    color: 'rgba(255,255,255,0.96)',
    fontWeight: 900,
    cursor: 'pointer',
    textDecoration: 'none',
  },
};
