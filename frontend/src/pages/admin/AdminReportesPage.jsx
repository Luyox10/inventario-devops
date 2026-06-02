import React, { useEffect, useMemo, useState } from 'react';

import { getDashboard } from '../../api/reportes';
import { listVentas } from '../../api/ventas';
import { useAuth } from '../../state/auth/AuthContext.jsx';

function formatMoney(n) {
  const v = Number(n || 0);
  return `S/ ${v.toFixed(2)}`;
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

function toISODate(y, m, d) {
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

function startOfDayIso(y, m, d) {
  return `${toISODate(y, m, d)} 00:00:00`;
}

function endOfDayIso(y, m, d) {
  return `${toISODate(y, m, d)} 23:59:59`;
}

function daysInMonth(year, month1to12) {
  return new Date(year, month1to12, 0).getDate();
}

export default function AdminReportesPage() {
  const { token, logout } = useAuth();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const [ventasLoading, setVentasLoading] = useState(false);
  const [ventasError, setVentasError] = useState('');
  const [ventas, setVentas] = useState([]);
  const [ventasResumen, setVentasResumen] = useState({ total: 0, cantidad: 0 });

  const [ventasPageSize, setVentasPageSize] = useState(10);
  const [ventasPage, setVentasPage] = useState(1);

  async function refresh() {
    setError('');
    setLoading(true);
    try {
      const res = await getDashboard({ token });
      setData(res);
    } catch (err) {
      if (err.status === 401) logout();
      setError(err.message || 'Error');
    } finally {
      setLoading(false);
    }
  }

  async function fetchVentasFiltradas() {
    setVentasError('');
    setVentasLoading(true);
    try {
      const res = await listVentas({ token, from: fromDate || undefined, to: toDate || undefined });
      const rows = Array.isArray(res) ? res : [];

      const total = rows.reduce((acc, v) => acc + Number(v?.total || 0), 0);
      setVentas(rows);
      setVentasResumen({ total, cantidad: rows.length });
    } catch (err) {
      if (err.status === 401) logout();
      setVentasError(err.message || 'Error');
    } finally {
      setVentasLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    fetchVentasFiltradas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ventasTotalPages = useMemo(() => Math.max(1, Math.ceil(ventas.length / ventasPageSize)), [ventas.length, ventasPageSize]);

  useEffect(() => {
    setVentasPage((p) => Math.min(Math.max(1, p), ventasTotalPages));
  }, [ventasTotalPages]);

  const ventasPaged = useMemo(() => {
    const start = (ventasPage - 1) * ventasPageSize;
    return ventas.slice(start, start + ventasPageSize);
  }, [ventas, ventasPage, ventasPageSize]);

  function limpiarFiltros() {
    setFromDate('');
    setToDate('');
    fetchVentasFiltradas();
  }

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <h2 style={styles.h2}>Reportes</h2>
          <p style={styles.p}>Resumen del negocio e inventario.</p>
        </div>
        <button onClick={refresh} style={styles.secondaryBtn} disabled={loading}>
          {loading ? 'Cargando...' : 'Actualizar'}
        </button>
      </header>

      <section style={styles.card}>
        {error ? <div style={styles.error}>{error}</div> : null}

        {loading ? (
          <div style={styles.muted}>Cargando...</div>
        ) : !data ? (
          <div style={styles.muted}>Sin datos.</div>
        ) : (
          <div style={styles.kpis}>
            <div style={{ ...styles.kpi, ...styles.kpiPrimary }}>
              <div style={{ ...styles.kpiLabel, ...styles.kpiOnDark }}>Ventas hoy</div>
              <div style={{ ...styles.kpiValue, ...styles.kpiValueOnDark }}>{formatMoney(data.total_ventas_hoy)}</div>
              <div style={{ ...styles.kpiSub, ...styles.kpiOnDarkMuted }}>Total vendido en el día</div>
            </div>
            <div style={styles.kpi}>
              <div style={styles.kpiLabel}>Productos activos</div>
              <div style={styles.kpiValue}>{Number(data.productos_activos || 0)}</div>
              <div style={styles.kpiSub}>Disponibles en catálogo</div>
            </div>
            <div style={{ ...styles.kpi, ...styles.kpiWarn }}>
              <div style={styles.kpiLabel}>Alertas de stock bajo</div>
              <div style={styles.kpiValue}>{Number(data.stock_bajo || 0)}</div>
              <div style={styles.kpiSub}>Productos bajo mínimo</div>
            </div>
          </div>
        )}
      </section>

      <section style={styles.card}>
        <div style={styles.sectionHead}>
          <div>
            <div style={styles.sectionTitle}>Ventas</div>
            <div style={styles.sectionSub}>Filtra por rango de fechas.</div>
          </div>
          <div style={styles.sectionButtons}>
            <button
              onClick={limpiarFiltros}
              style={styles.tertiaryBtn}
              disabled={ventasLoading}
            >
              Limpiar
            </button>
            <button
              onClick={fetchVentasFiltradas}
              style={styles.secondaryBtn}
              disabled={ventasLoading}
            >
              {ventasLoading ? 'Cargando...' : 'Aplicar filtro'}
            </button>
          </div>
        </div>

        <div style={styles.filters}>
          <label style={styles.filterItem}>
            <div style={styles.filterLabel}>Desde</div>
            <input
              type="date"
              style={styles.dateInput}
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </label>

          <label style={styles.filterItem}>
            <div style={styles.filterLabel}>Hasta</div>
            <input
              type="date"
              style={styles.dateInput}
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </label>
        </div>

        {ventasError ? <div style={styles.error}>{ventasError}</div> : null}

        <div style={styles.ventasResumen}>
          <div style={styles.ventasMetric}>
            <div style={styles.ventasMetricLabel}>Cantidad de ventas</div>
            <div style={styles.ventasMetricValue}>{ventasLoading ? '...' : ventasResumen.cantidad}</div>
          </div>
          <div style={styles.ventasMetric}>
            <div style={styles.ventasMetricLabel}>Total vendido</div>
            <div style={styles.ventasMetricValue}>{ventasLoading ? '...' : formatMoney(ventasResumen.total)}</div>
          </div>
        </div>

        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Fecha</th>
                <th style={styles.th}>Usuario</th>
                <th style={styles.thRight}>Total</th>
              </tr>
            </thead>
            <tbody>
              {ventasLoading ? (
                <tr>
                  <td style={styles.td} colSpan={3}>
                    Cargando...
                  </td>
                </tr>
              ) : ventas.length === 0 ? (
                <tr>
                  <td style={styles.td} colSpan={3}>
                    No hay ventas para el filtro seleccionado.
                  </td>
                </tr>
              ) : (
                ventasPaged.map((v) => (
                  <tr key={v.id} style={styles.tr}>
                    <td style={styles.td}>{new Date(v.created_at).toLocaleString()}</td>
                    <td style={styles.td}>{v.usuario_nombre || v.usuario_email || (v.usuario_id ?? '-')}</td>
                    <td style={styles.tdRight}>{formatMoney(v.total)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {!ventasLoading && ventas.length > 0 ? (
            <div style={styles.tableFooter}>
              <div style={styles.footerLeft}>
                <span style={styles.footerMuted}>
                  Mostrando {(ventasPage - 1) * ventasPageSize + 1}–{Math.min(ventasPage * ventasPageSize, ventas.length)} de {ventas.length}
                </span>
                <select value={ventasPageSize} onChange={(e) => setVentasPageSize(Number(e.target.value) || 10)} style={styles.selectSmall}>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>
              <div style={styles.footerRight}>
                <button type="button" style={styles.smallBtn} onClick={() => setVentasPage(1)} disabled={ventasPage <= 1}>
                  «
                </button>
                <button type="button" style={styles.smallBtn} onClick={() => setVentasPage((p) => Math.max(1, p - 1))} disabled={ventasPage <= 1}>
                  ‹
                </button>
                <span style={styles.footerMuted}>
                  Página {ventasPage} / {ventasTotalPages}
                </span>
                <button
                  type="button"
                  style={styles.smallBtn}
                  onClick={() => setVentasPage((p) => Math.min(ventasTotalPages, p + 1))}
                  disabled={ventasPage >= ventasTotalPages}
                >
                  ›
                </button>
                <button type="button" style={styles.smallBtn} onClick={() => setVentasPage(ventasTotalPages)} disabled={ventasPage >= ventasTotalPages}>
                  »
                </button>
              </div>
            </div>
          ) : null}
        </div>
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
  error: {
    marginTop: 0,
    padding: 10,
    borderRadius: 12,
    background: 'rgba(239, 68, 68, 0.12)',
    border: '1px solid rgba(239, 68, 68, 0.35)',
    color: 'rgba(11, 42, 82, 0.92)',
    fontSize: 14,
  },
  kpis: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 12,
    marginTop: 8,
  },
  kpi: {
    padding: 14,
    borderRadius: 16,
    background: 'rgba(255,255,255,0.55)',
    border: '1px solid rgba(11, 42, 82, 0.10)',
    boxShadow: '0 12px 30px rgba(0, 0, 0, 0.10)',
  },
  kpiPrimary: {
    background: 'rgba(11, 42, 82, 0.92)',
    border: '1px solid rgba(11, 42, 82, 0.18)',
  },
  kpiWarn: {
    background: 'rgba(245, 158, 11, 0.12)',
    border: '1px solid rgba(245, 158, 11, 0.25)',
  },
  kpiOnDark: { color: 'rgba(255,255,255,0.92)' },
  kpiOnDarkMuted: { color: 'rgba(255,255,255,0.78)' },
  kpiValueOnDark: { color: 'rgba(255,255,255,0.96)' },
  kpiLabel: { fontSize: 12, fontWeight: 900, color: 'rgba(11, 42, 82, 0.7)' },
  kpiValue: { marginTop: 8, fontSize: 22, fontWeight: 900, color: '#0b2a52' },
  kpiSub: { marginTop: 8, fontSize: 12, fontWeight: 800, color: 'rgba(11, 42, 82, 0.72)' },
  secondaryBtn: {
    padding: '10px 12px',
    borderRadius: 14,
    border: 'none',
    background: 'rgba(11, 42, 82, 0.92)',
    color: 'rgba(255,255,255,0.95)',
    fontWeight: 900,
    cursor: 'pointer',
  },
  tertiaryBtn: {
    padding: '10px 12px',
    borderRadius: 14,
    border: '1px solid rgba(11, 42, 82, 0.22)',
    background: 'rgba(255,255,255,0.55)',
    color: '#0b2a52',
    fontWeight: 900,
    cursor: 'pointer',
  },
  sectionHead: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  sectionButtons: {
    display: 'flex',
    gap: 8,
  },
  sectionTitle: { fontSize: 16, fontWeight: 900, color: '#0b2a52' },
  sectionSub: { marginTop: 6, fontSize: 13, fontWeight: 800, color: 'rgba(11, 42, 82, 0.72)' },
  filters: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 12,
    marginBottom: 12,
  },
  filterItem: { display: 'block' },
  filterLabel: { fontSize: 12, fontWeight: 900, color: 'rgba(11, 42, 82, 0.70)', marginBottom: 6 },
  dateInput: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 14,
    border: '1px solid rgba(11, 42, 82, 0.14)',
    background: 'rgba(255,255,255,0.70)',
    color: '#0b2a52',
    fontWeight: 900,
    outline: 'none',
  },
  select: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 14,
    border: '1px solid rgba(11, 42, 82, 0.14)',
    background: 'rgba(255,255,255,0.70)',
    color: '#0b2a52',
    fontWeight: 900,
    outline: 'none',
  },
  ventasResumen: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 12,
    marginTop: 8,
    marginBottom: 12,
  },
  ventasMetric: {
    padding: 14,
    borderRadius: 16,
    background: 'rgba(255,255,255,0.35)',
    border: '1px solid rgba(11, 42, 82, 0.10)',
  },
  ventasMetricLabel: { fontSize: 12, fontWeight: 900, color: 'rgba(11, 42, 82, 0.70)' },
  ventasMetricValue: { marginTop: 8, fontSize: 18, fontWeight: 900, color: '#0b2a52' },
  tableWrap: { overflowX: 'auto' },
  table: {
    width: '100%',
    borderCollapse: 'separate',
    borderSpacing: 0,
    borderRadius: 14,
    overflow: 'hidden',
  },
  th: {
    textAlign: 'left',
    padding: '10px 12px',
    fontSize: 12,
    fontWeight: 900,
    color: 'rgba(11, 42, 82, 0.75)',
    background: 'rgba(11, 42, 82, 0.08)',
    borderBottom: '1px solid rgba(11, 42, 82, 0.10)',
  },
  thRight: {
    textAlign: 'right',
    padding: '10px 12px',
    fontSize: 12,
    fontWeight: 900,
    color: 'rgba(11, 42, 82, 0.75)',
    background: 'rgba(11, 42, 82, 0.08)',
    borderBottom: '1px solid rgba(11, 42, 82, 0.10)',
  },
  tr: { background: 'rgba(255,255,255,0.22)' },
  td: {
    padding: '10px 12px',
    borderBottom: '1px solid rgba(11, 42, 82, 0.08)',
    fontSize: 13,
    fontWeight: 800,
    color: 'rgba(11, 42, 82, 0.88)',
    whiteSpace: 'nowrap',
  },
  tdRight: {
    padding: '10px 12px',
    borderBottom: '1px solid rgba(11, 42, 82, 0.08)',
    fontSize: 13,
    fontWeight: 900,
    color: 'rgba(11, 42, 82, 0.92)',
    whiteSpace: 'nowrap',
    textAlign: 'right',
  },
  tableFooter: {
    marginTop: 12,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  footerLeft: { display: 'flex', alignItems: 'center', gap: 10 },
  footerRight: { display: 'flex', alignItems: 'center', gap: 6 },
  footerMuted: { color: 'rgba(11, 42, 82, 0.72)', fontWeight: 800, fontSize: 12 },
  selectSmall: {
    padding: '8px 10px',
    borderRadius: 12,
    border: '1px solid rgba(11, 42, 82, 0.18)',
    outline: 'none',
    background: 'rgba(255,255,255,0.55)',
    color: '#0b2a52',
    fontWeight: 800,
  },
  smallBtn: {
    padding: '8px 10px',
    borderRadius: 12,
    border: '1px solid rgba(11, 42, 82, 0.22)',
    background: 'rgba(255,255,255,0.25)',
    color: '#0b2a52',
    fontWeight: 900,
    cursor: 'pointer',
  },
};
