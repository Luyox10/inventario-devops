import React, { useEffect, useMemo, useState } from 'react';

import { listStockBajo } from '../../api/alertas';
import { useAuth } from '../../state/auth/AuthContext.jsx';

export default function AdminAlertasPage() {
  const { token, logout } = useAuth();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [tab, setTab] = useState('todos');

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

  function estadoFor(r) {
    const actual = Number(r.stock_actual || 0);
    const minimo = Number(r.stock_minimo || 0);
    if (actual <= 0) return { key: 'critico', text: 'CRÍTICO', style: styles.badgeDanger };
    if (actual <= minimo) return { key: 'bajo', text: 'BAJO', style: styles.badgeWarn };
    return { key: 'ok', text: 'OK', style: styles.badgeOk };
  }

  const filteredSorted = useMemo(() => {
    function urgency(r) {
      const actual = Number(r.stock_actual || 0);
      const minimo = Number(r.stock_minimo || 0);
      const faltante = Math.max(0, minimo - actual);
      const estado = estadoFor(r).key;
      const sev = estado === 'critico' ? 2 : estado === 'bajo' ? 1 : 0;
      return { sev, faltante };
    }

    const arr = rows
      .filter((r) => {
        const st = estadoFor(r).key;
        return tab === 'todos' ? true : tab === 'criticos' ? st === 'critico' : tab === 'bajo' ? st === 'bajo' : true;
      })
      .sort((a, b) => {
        const ua = urgency(a);
        const ub = urgency(b);
        if (ub.sev !== ua.sev) return ub.sev - ua.sev;
        if (ub.faltante !== ua.faltante) return ub.faltante - ua.faltante;
        return String(a.nombre || '').localeCompare(String(b.nombre || ''), 'es', { sensitivity: 'base' });
      });

    return arr;
  }, [rows, tab]);

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <h2 style={styles.h2}>Alertas</h2>
          <p style={styles.p}>Productos por debajo del stock mínimo.</p>
        </div>
      </header>

      <section style={styles.card}>
        {error ? <div style={styles.error}>{error}</div> : null}

        <div style={styles.tabs}>
          <button type="button" onClick={() => setTab('todos')} style={{ ...styles.tab, ...(tab === 'todos' ? styles.tabActive : null) }}>
            Todos
          </button>
          <button
            type="button"
            onClick={() => setTab('criticos')}
            style={{ ...styles.tab, ...(tab === 'criticos' ? styles.tabActive : null) }}
          >
            Críticos
          </button>
          <button type="button" onClick={() => setTab('bajo')} style={{ ...styles.tab, ...(tab === 'bajo' ? styles.tabActive : null) }}>
            Bajo
          </button>
        </div>

        {loading ? (
          <div style={styles.muted}>Cargando...</div>
        ) : filteredSorted.length === 0 ? (
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
                  <th style={styles.th}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {filteredSorted.map((r) => {
                  const st = estadoFor(r);
                  return (
                    <tr key={r.id} style={st.key === 'critico' ? styles.trDanger : styles.trWarn}>
                      <td style={styles.tdStrong}>{r.nombre}</td>
                      <td style={styles.td}>{r.sku || '-'}</td>
                      <td style={styles.td}>{r.unidad || 'und'}</td>
                      <td style={styles.td}>{r.stock_actual}</td>
                      <td style={styles.td}>{r.stock_minimo}</td>
                      <td style={styles.td}>
                        <span style={{ ...styles.badgeBase, ...st.style }}>{st.text}</span>
                      </td>
                    </tr>
                  );
                })}
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
  tabs: {
    marginTop: 12,
    display: 'flex',
    gap: 8,
    padding: 6,
    borderRadius: 14,
    border: '1px solid rgba(11, 42, 82, 0.14)',
    background: 'rgba(255,255,255,0.22)',
    width: 'fit-content',
  },
  tab: {
    padding: '8px 10px',
    borderRadius: 12,
    border: '1px solid rgba(11, 42, 82, 0.12)',
    background: 'rgba(255,255,255,0.25)',
    color: 'rgba(11, 42, 82, 0.86)',
    fontWeight: 900,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  tabActive: {
    background: 'rgba(11, 42, 82, 0.92)',
    color: 'rgba(255,255,255,0.96)',
    border: '1px solid rgba(11, 42, 82, 0.18)',
  },
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
  trDanger: { background: 'rgba(239, 68, 68, 0.10)' },
  badgeBase: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '4px 10px',
    borderRadius: 999,
    fontWeight: 900,
    fontSize: 11,
    letterSpacing: 0.6,
  },
  badgeOk: { background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.35)', color: '#065f46' },
  badgeWarn: { background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.35)', color: '#92400e' },
  badgeDanger: { background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.35)', color: '#7f1d1d' },
  secondaryBtn: {
    padding: '8px 10px',
    borderRadius: 12,
    border: '1px solid rgba(11, 42, 82, 0.2)',
    background: 'rgba(255,255,255,0.25)',
    color: '#0b2a52',
    fontWeight: 800,
    cursor: 'pointer',
  },
};
