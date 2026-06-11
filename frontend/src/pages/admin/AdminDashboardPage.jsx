import React, { useEffect, useMemo, useState } from 'react';
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

function DonutSegments({ segments = [], size = 62, stroke = 10, track = 'rgba(11, 42, 82, 0.10)' }) {
  const safe = Array.isArray(segments) ? segments : [];
  const total = safe.reduce((acc, s) => acc + Number(s?.value || 0), 0);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;

  let offset = 0;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={styles.chartSvg}>
      <circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
      {safe
        .filter((s) => Number(s?.value || 0) > 0)
        .map((s) => {
          const v = Number(s.value || 0);
          const frac = total > 0 ? v / total : 0;
          const dash = c * frac;
          const gap = c - dash;
          const dashoffset = c * (offset / (total || 1));
          offset += v;

          return (
            <circle
              key={s.key}
              cx={size / 2}
              cy={size / 2}
              r={r}
              stroke={s.color}
              strokeWidth={stroke}
              fill="none"
              strokeDasharray={`${dash} ${gap}`}
              strokeDashoffset={-dashoffset}
              strokeLinecap="round"
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          );
        })}
    </svg>
  );
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

function formatShortDayLabel(iso) {
  const d = new Date(`${iso}T00:00:00`);
  const names = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  return `${names[d.getDay()]} ${pad2(d.getDate())}`;
}

function Sparkline({ data = [], labels = [], width = 180, height = 44, stroke = '#0b2a52' }) {
  const values = Array.isArray(data) ? data.map((n) => Number(n || 0)) : [];
  const [hoverIdx, setHoverIdx] = useState(-1);
  const max = Math.max(1, ...values);
  const min = Math.min(0, ...values);
  const range = Math.max(1e-9, max - min);
  const step = values.length > 1 ? width / (values.length - 1) : width;

  const pointsArr = values.map((v, i) => {
    const x = i * step;
    const y = height - ((v - min) / range) * height;
    return { x, y, v };
  });

  const points = pointsArr.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  function onMove(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const raw = step > 0 ? Math.round(x / step) : 0;
    const idx = Math.max(0, Math.min(values.length - 1, raw));
    setHoverIdx(idx);
  }

  function onLeave() {
    setHoverIdx(-1);
  }

  const hp = hoverIdx >= 0 ? pointsArr[hoverIdx] : null;
  const hLabel = hoverIdx >= 0 ? String(labels?.[hoverIdx] || '') : '';

  return (
    <div style={{ position: 'relative', width, maxWidth: '100%' }}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={styles.chartSvg}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
      >
        <line x1="0" y1={height - 0.5} x2={width} y2={height - 0.5} stroke="rgba(11, 42, 82, 0.10)" strokeWidth="1" />
        <line x1="0" y1={height * 0.5} x2={width} y2={height * 0.5} stroke="rgba(11, 42, 82, 0.06)" strokeWidth="1" />
        <line x1="0" y1="0.5" x2={width} y2="0.5" stroke="rgba(11, 42, 82, 0.06)" strokeWidth="1" />

        <polyline fill="none" stroke={stroke} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" points={points} />

        {hp ? (
          <>
            <circle cx={hp.x} cy={hp.y} r="4.5" fill={stroke} />
            <circle cx={hp.x} cy={hp.y} r="8" fill={stroke} opacity="0.18" />
          </>
        ) : null}
      </svg>

      {hp ? (
        <div
          style={{
            position: 'absolute',
            left: Math.min(width - 10, Math.max(10, hp.x)) - 10,
            top: Math.max(0, hp.y) - 36,
            transform: 'translate(-50%, -50%)',
            background: 'rgba(11, 42, 82, 0.92)',
            color: 'rgba(255,255,255,0.95)',
            padding: '6px 8px',
            borderRadius: 10,
            fontSize: 12,
            fontWeight: 800,
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          {hLabel ? `${hLabel}: ` : ''}{formatMoney(hp.v)}
        </div>
      ) : null}
    </div>
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
  const [ventas7dLabels, setVentas7dLabels] = useState([]);
  const [productosStats, setProductosStats] = useState({ ok: 0, bajo: 0, sinStock: 0, total: 0 });
  const [alertas, setAlertas] = useState([]);
  const [expiryStats, setExpiryStats] = useState({ proximos: 0, vencidos: 0 });

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
      const labels = [];
      for (let i = 0; i < 7; i += 1) {
        const d = new Date(from7);
        d.setDate(from7.getDate() + i);
        const key = isoDate(d);
        series.push(Number(byDay.get(key) || 0));
        labels.push(formatShortDayLabel(key));
      }
      setVentas7d(series);
      setVentas7dLabels(labels);

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

      setExpiryStats({
        proximos: Number(resDashboard?.proximos_a_vencer || 0),
        vencidos: Number(resDashboard?.vencidos || 0),
      });
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

  const ventasTrend = useMemo(() => {
    const v = Array.isArray(ventas7d) ? ventas7d : [];
    const last = Number(v[v.length - 1] || 0);
    const prev = Number(v[v.length - 2] || 0);
    return last - prev;
  }, [ventas7d]);

  const ventasAllZero = useMemo(() => {
    const v = Array.isArray(ventas7d) ? ventas7d : [];
    return v.length > 0 && v.every((x) => Number(x || 0) === 0);
  }, [ventas7d]);

  const alertasCounts = useMemo(() => {
    const rows = Array.isArray(alertas) ? alertas : [];
    let criticos = 0;
    let bajo = 0;
    for (const a of rows) {
      const actual = Number(a?.stock_actual ?? a?.stock ?? 0);
      if (actual <= 0) criticos += 1;
      else bajo += 1;
    }
    return { criticos, bajo, total: rows.length };
  }, [alertas]);

  const productosPct = useMemo(() => {
    const total = Number(productosStats.total || 0);
    const toPct = (n) => (total > 0 ? Math.round((Number(n || 0) / total) * 100) : 0);
    return {
      ok: toPct(productosStats.ok),
      bajo: toPct(productosStats.bajo),
      sin: toPct(productosStats.sinStock),
    };
  }, [productosStats]);

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
          <div style={styles.kpiChartBelow}>
            {loading ? null : ventasAllZero ? (
              <div style={styles.muted}>Sin ventas en los últimos 7 días</div>
            ) : (
              <Sparkline
                data={ventas7d}
                labels={ventas7dLabels}
                width={240}
                stroke={ventasTrend >= 0 ? 'rgba(34, 197, 94, 0.95)' : 'rgba(239, 68, 68, 0.92)'}
              />
            )}
          </div>
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
          <div style={{ ...styles.kpiHint, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            <span style={{ ...styles.badge, background: 'rgba(34, 197, 94, 0.14)', border: '1px solid rgba(34, 197, 94, 0.28)' }}>
              OK: {loading ? '...' : productosStats.ok} ({loading ? '...' : productosPct.ok}%)
            </span>
            <span style={{ ...styles.badge, background: 'rgba(245, 158, 11, 0.14)', border: '1px solid rgba(245, 158, 11, 0.28)' }}>
              Bajo: {loading ? '...' : productosStats.bajo} ({loading ? '...' : productosPct.bajo}%)
            </span>
            <span style={{ ...styles.badge, background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.26)' }}>
              Sin stock: {loading ? '...' : productosStats.sinStock} ({loading ? '...' : productosPct.sin}%)
            </span>
          </div>
        </Link>

        <Link to="/admin/alertas" style={styles.kpiCardWarn}>
          <div style={styles.kpiLabel}>Alertas de stock bajo</div>
          <div style={styles.kpiValue}>{loading ? '...' : Number(data?.stock_bajo || 0)}</div>
          <div style={styles.kpiChartBelow}>
            {loading ? null : (
              <DonutSegments
                segments={[
                  { key: 'crit', value: alertasCounts.criticos, color: 'rgba(239, 68, 68, 0.92)' },
                  { key: 'bajo', value: alertasCounts.bajo, color: 'rgba(245, 158, 11, 0.95)' },
                ]}
              />
            )}
          </div>
          <div style={styles.kpiHint}>
            {loading
              ? '...'
              : alertas.length === 0
                ? 'Sin alertas'
                : `Críticos: ${alertasCounts.criticos} | Bajo: ${alertasCounts.bajo}`}
          </div>
          {loading ? null : <div style={styles.cta}>Ver alertas</div>}
        </Link>

        <div style={styles.kpiCardExpiry}>
          <div style={styles.kpiLabel}>Próximos a vencer</div>
          <div style={styles.kpiValue}>{loading ? '...' : expiryStats.proximos}</div>
          <div style={styles.kpiChartBelow}>
            {loading ? null : (
              <DonutSegments
                segments={[
                  { key: 'pront', value: expiryStats.proximos, color: 'rgba(245, 158, 11, 0.92)' },
                  { key: 'vencidos', value: expiryStats.vencidos, color: 'rgba(239, 68, 68, 0.92)' },
                ]}
              />
            )}
          </div>
          <div style={styles.kpiHint}>
            {loading ? '...' : expiryStats.vencidos > 0 ? `⚠️ ${expiryStats.vencidos} vencidos` : 'Sin expirados'}
          </div>
        </div>
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
  kpiCardExpiry: {
    textDecoration: 'none',
    background: 'rgba(239, 68, 68, 0.08)',
    border: '1px solid rgba(239, 68, 68, 0.20)',
    borderRadius: 18,
    padding: 16,
    boxShadow: '0 28px 60px rgba(0, 0, 0, 0.16)',
    backdropFilter: 'blur(14px)',
  },
  kpiChartBelow: { marginTop: 10 },
  kpiLabel: { fontWeight: 900, color: 'rgba(11, 42, 82, 0.70)', fontSize: 12, letterSpacing: 0.4 },
  kpiValue: { marginTop: 8, fontWeight: 900, color: '#0b2a52', fontSize: 24 },
  kpiHint: { marginTop: 10, color: 'rgba(11, 42, 82, 0.70)', fontSize: 12, fontWeight: 800 },
  muted: { color: 'rgba(11, 42, 82, 0.55)', fontSize: 12, fontWeight: 800, paddingTop: 6 },
  chartSvg: { display: 'block' },
  badge: {
    padding: '4px 10px',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 900,
    color: 'rgba(11, 42, 82, 0.86)',
  },
  cta: {
    marginTop: 10,
    display: 'inline-block',
    padding: '8px 10px',
    borderRadius: 12,
    background: 'rgba(11, 42, 82, 0.92)',
    color: 'rgba(255,255,255,0.95)',
    fontWeight: 900,
    fontSize: 12,
    width: 'fit-content',
  },
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
