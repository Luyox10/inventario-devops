import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { getDashboard } from '../../api/reportes';
import { listStockBajo } from '../../api/alertas';
import { listProductos } from '../../api/productos';
import { listVentas } from '../../api/ventas';
import { useAuth } from '../../state/auth/AuthContext.jsx';

function formatMoney(n) {
  const v = Number(n || 0);
  return `S/ ${v.toFixed(2)}`;
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

function isoDate(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function startOfDayIso(d) {
  return `${isoDate(d)} 00:00:00`;
}

function endOfDayIso(d) {
  return `${isoDate(d)} 23:59:59`;
}

function clamp01(v) {
  if (v <= 0) return 0;
  if (v >= 1) return 1;
  return v;
}

function Sparkline({ data = [], width = 180, height = 44, stroke = '#0b2a52' }) {
  const values = Array.isArray(data) ? data.map((n) => Number(n || 0)) : [];
  const max = Math.max(1, ...values);
  const min = Math.min(0, ...values);
  const range = Math.max(1e-9, max - min);
  const step = values.length > 1 ? width / (values.length - 1) : width;

  const points = values
    .map((v, i) => {
      const x = i * step;
      const y = height - ((v - min) / range) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={styles.chartSvg}>
      <polyline fill="none" stroke={stroke} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" points={points} />
    </svg>
  );
}

function Donut({ value = 0, size = 62, stroke = 10, color = '#f59e0b', track = 'rgba(11, 42, 82, 0.12)' }) {
  const v = clamp01(Number(value || 0));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = c * v;
  const gap = c - dash;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={styles.chartSvg}>
      <circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={color}
        strokeWidth={stroke}
        fill="none"
        strokeDasharray={`${dash} ${gap}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  );
}

function StackedBar({ parts, height = 10 }) {
  const safe = Array.isArray(parts) ? parts : [];
  const total = safe.reduce((acc, p) => acc + Number(p?.value || 0), 0);

  return (
    <div style={{ ...styles.stackedBar, height }}>
      {safe.map((p) => {
        const v = Number(p?.value || 0);
        const w = total > 0 ? (v / total) * 100 : 0;
        return <div key={p.key} style={{ ...styles.stackedPart, width: `${w}%`, background: p.color }} />;
      })}
    </div>
  );
}

export default function AdminDashboardPage() {
  const { token, logout } = useAuth();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [ventas7d, setVentas7d] = useState([]);
  const [productosStats, setProductosStats] = useState({ ok: 0, bajo: 0, sinStock: 0, total: 0 });
  const [alertas, setAlertas] = useState([]);

  async function refresh() {
    setError('');
    setLoading(true);
    try {
      const today = new Date();
      const from7 = new Date(today);
      from7.setDate(today.getDate() - 6);

      const [resDashboard, resVentas, resProductos, resAlertas] = await Promise.all([
        getDashboard({ token }),
        listVentas({ token, from: startOfDayIso(from7), to: endOfDayIso(today) }),
        listProductos({ token }),
        listStockBajo({ token }),
      ]);

      setData(resDashboard);

      const ventasRows = Array.isArray(resVentas) ? resVentas : [];
      const byDay = new Map();
      for (const v of ventasRows) {
        const key = String(v?.created_at || '').slice(0, 10);
        if (!key) continue;
        byDay.set(key, (byDay.get(key) || 0) + Number(v?.total || 0));
      }
      const series = [];
      for (let i = 0; i < 7; i += 1) {
        const d = new Date(from7);
        d.setDate(from7.getDate() + i);
        const key = isoDate(d);
        series.push(Number(byDay.get(key) || 0));
      }
      setVentas7d(series);

      const productos = Array.isArray(resProductos) ? resProductos : [];
      let ok = 0;
      let bajo = 0;
      let sinStock = 0;
      for (const p of productos) {
        const actual = Number(p?.stock_actual || 0);
        const minimo = Number(p?.stock_minimo || 0);
        if (actual <= 0) sinStock += 1;
        else if (actual <= minimo) bajo += 1;
        else ok += 1;
      }
      setProductosStats({ ok, bajo, sinStock, total: productos.length });

      setAlertas(Array.isArray(resAlertas) ? resAlertas : []);
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
    <div>
      <div style={styles.head}>
        <div>
          <h2 style={styles.h2}>Panel de administración</h2>
          <p style={styles.p}>Resumen general del negocio.</p>
        </div>
        <button onClick={refresh} style={styles.secondaryBtn} disabled={loading}>
          {loading ? 'Cargando...' : 'Actualizar'}
        </button>
      </div>

      {error ? <div style={styles.error}>{error}</div> : null}

      <div style={styles.kpis}>
        <Link to="/admin/ventas" style={styles.kpiCard}>
          <div style={styles.kpiLabel}>Ventas hoy</div>
          <div style={styles.kpiValue}>{loading ? '...' : formatMoney(data?.total_ventas_hoy)}</div>
          <div style={styles.kpiChartBelow}>{loading ? null : <Sparkline data={ventas7d} width={240} />}</div>
          <div style={styles.kpiHint}>Últimos 7 días</div>
        </Link>

        <Link to="/admin/productos" style={styles.kpiCard}>
          <div style={styles.kpiLabel}>Productos disponibles</div>
          <div style={styles.kpiValue}>{loading ? '...' : Number(data?.productos_activos || 0)}</div>
          <div style={styles.kpiChartBelow}>
            {loading ? null : (
              <StackedBar
                parts={[
                  { key: 'ok', value: productosStats.ok, color: 'rgba(34, 197, 94, 0.75)' },
                  { key: 'bajo', value: productosStats.bajo, color: 'rgba(245, 158, 11, 0.75)' },
                  { key: 'sin', value: productosStats.sinStock, color: 'rgba(239, 68, 68, 0.70)' },
                ]}
              />
            )}
          </div>
          <div style={styles.kpiHint}>
            Stock OK: {loading ? '...' : productosStats.ok} | Bajo: {loading ? '...' : productosStats.bajo} | Sin stock:{' '}
            {loading ? '...' : productosStats.sinStock}
          </div>
        </Link>

        <Link to="/admin/alertas" style={styles.kpiCardWarn}>
          <div style={styles.kpiLabel}>Alertas de stock bajo</div>
          <div style={styles.kpiValue}>{loading ? '...' : Number(data?.stock_bajo || 0)}</div>
          <div style={styles.kpiChartBelow}>
            {loading ? null : (
              <Donut
                value={productosStats.total > 0 ? Number(data?.stock_bajo || 0) / productosStats.total : 0}
                color="rgba(245, 158, 11, 0.95)"
              />
            )}
          </div>
          <div style={styles.kpiHint}>
            {loading
              ? '...'
              : alertas.length === 0
                ? 'Sin alertas'
                : `Críticos: ${alertas
                    .slice(0, 3)
                    .map((a) => String(a?.nombre || '').slice(0, 16))
                    .join(', ')}`}
          </div>
        </Link>
      </div>
    </div>
  );
}

const styles = {
  head: {
    marginBottom: 14,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  h2: { margin: 0, color: '#0b2a52', fontSize: 26, fontWeight: 900 },
  p: { margin: '8px 0 0', color: 'rgba(11, 42, 82, 0.75)' },
  error: {
    padding: 10,
    borderRadius: 12,
    background: 'rgba(239, 68, 68, 0.12)',
    border: '1px solid rgba(239, 68, 68, 0.35)',
    color: 'rgba(11, 42, 82, 0.92)',
    fontSize: 14,
    marginBottom: 14,
  },
  secondaryBtn: {
    padding: '10px 12px',
    borderRadius: 14,
    border: 'none',
    background: 'rgba(11, 42, 82, 0.92)',
    color: 'rgba(255,255,255,0.95)',
    fontWeight: 900,
    cursor: 'pointer',
  },
  kpis: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 14,
    marginBottom: 14,
  },
  kpiCard: {
    textDecoration: 'none',
    background: 'rgba(235, 240, 255, 0.78)',
    border: '1px solid rgba(255,255,255,0.55)',
    borderRadius: 18,
    padding: 16,
    boxShadow: '0 28px 60px rgba(0, 0, 0, 0.16)',
    backdropFilter: 'blur(14px)',
  },
  kpiCardWarn: {
    textDecoration: 'none',
    background: 'rgba(245, 158, 11, 0.10)',
    border: '1px solid rgba(245, 158, 11, 0.25)',
    borderRadius: 18,
    padding: 16,
    boxShadow: '0 28px 60px rgba(0, 0, 0, 0.16)',
    backdropFilter: 'blur(14px)',
  },
  kpiChartBelow: { marginTop: 10 },
  kpiLabel: { fontWeight: 900, color: 'rgba(11, 42, 82, 0.70)', fontSize: 12, letterSpacing: 0.4 },
  kpiValue: { marginTop: 8, fontWeight: 900, color: '#0b2a52', fontSize: 24 },
  kpiHint: { marginTop: 10, color: 'rgba(11, 42, 82, 0.70)', fontSize: 12, fontWeight: 800 },
  chartSvg: { display: 'block' },
  stackedBar: {
    width: 240,
    maxWidth: '100%',
    borderRadius: 999,
    overflow: 'hidden',
    background: 'rgba(11, 42, 82, 0.10)',
    display: 'flex',
    border: '1px solid rgba(11, 42, 82, 0.10)',
  },
  stackedPart: { height: '100%' },
};
