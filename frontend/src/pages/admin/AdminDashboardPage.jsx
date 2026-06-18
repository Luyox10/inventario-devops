import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

import { getDashboard } from '../../api/reportes';
import { listStockBajo, listProductosVencidos } from '../../api/alertas';
import { listProductos } from '../../api/productos';
import { listVentas } from '../../api/ventas';
import { useAuth } from '../../state/auth/AuthContext.jsx';

function formatMoney(n) {
  const v = Number(n || 0);
  return `S/ ${v.toFixed(2)}`;
}

function DonutChart({ segments = [] }) {
  const safe = Array.isArray(segments) ? segments : [];
  const total = safe.reduce((acc, s) => acc + Number(s?.value || 0), 0);
  const data = safe.map((s) => ({ name: s.key, value: Number(s.value || 0), color: s.color }));

  const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    if (percent < 0.05) return null;
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return (
      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={900}>
        {`${Math.round(percent * 100)}%`}
      </text>
    );
  };

  if (total === 0) {
    return (
      <ResponsiveContainer width="100%" height={130}>
        <PieChart>
          <Pie data={[{ value: 1 }]} cx="50%" cy="50%" innerRadius={35} outerRadius={55} dataKey="value">
            <Cell fill="rgba(11,42,82,0.10)" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={130}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={35}
          outerRadius={55}
          dataKey="value"
          labelLine={false}
          label={renderLabel}
          strokeWidth={2}
          stroke="rgba(255,255,255,0.6)"
        >
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          formatter={(v, name) => [v, name]}
          contentStyle={{ background: 'rgba(11,42,82,0.92)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 12 }}
          itemStyle={{ color: '#fff' }}
        />
      </PieChart>
    </ResponsiveContainer>
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

function VentasChart({ data = [], labels = [], color = '#6366f1' }) {
  const chartData = labels.map((label, i) => ({ label, value: Number(data[i] || 0) }));
  return (
    <ResponsiveContainer width="100%" height={120}>
      <AreaChart data={chartData} margin={{ top: 6, right: 4, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="ventasGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.25} />
            <stop offset="95%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(11,42,82,0.08)" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'rgba(11,42,82,0.45)', fontWeight: 700 }} axisLine={false} tickLine={false} />
        <YAxis hide />
        <Tooltip
          formatter={(v) => [formatMoney(v), 'Ventas']}
          contentStyle={{ background: 'rgba(11,42,82,0.92)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 12 }}
          itemStyle={{ color: '#fff' }}
          labelStyle={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}
        />
        <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2.5} fill="url(#ventasGrad)" dot={false} activeDot={{ r: 5, fill: color }} />
      </AreaChart>
    </ResponsiveContainer>
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
  const [productosVencidos, setProductosVencidos] = useState([]);

  async function refresh() {
    setError('');
    setLoading(true);
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const from7 = new Date(today);
      from7.setDate(today.getDate() - 6);

      const [resDashboard, resVentas, resProductos, resAlertas, resVencidos] = await Promise.all([
        getDashboard({ token }),
        listVentas({ token, from: startOfDayIso(from7), to: endOfDayIso(today) }),
        listProductos({ token }),
        listStockBajo({ token }),
        listProductosVencidos({ token }),
      ]);

      setData(resDashboard);

      const ventasRows = Array.isArray(resVentas) ? resVentas : [];
      const byDay = new Map();
      for (const v of ventasRows) {
        const raw = v?.created_at;
        if (!raw) continue;
        // mysql2 puede devolver un objeto Date o un string ISO; normalizamos a YYYY-MM-DD
        let key;
        if (raw instanceof Date) {
          key = isoDate(raw);
        } else {
          // Convertir a Date local para que coincida con la zona del navegador
          const d = new Date(String(raw).replace(' ', 'T').replace(/(\.\d+)?$/, ''));
          key = isNaN(d.getTime()) ? String(raw).slice(0, 10) : isoDate(d);
        }
        if (!key || key.length !== 10) continue;
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

      let proximos = 0;
      let vencidos = 0;
      for (const p of productos) {
        if (!p?.expiry_date) continue;
        const expiry = new Date(p.expiry_date);
        expiry.setHours(0, 0, 0, 0);
        if (expiry <= today) {
          vencidos += 1;
        } else {
          const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
          if (diffDays <= 7) proximos += 1;
        }
      }
      setExpiryStats({ proximos, vencidos });

      setProductosVencidos(Array.isArray(resVencidos) ? resVencidos : []);
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
      const minimo = Number(a?.stock_minimo ?? 0);
      if (actual === 0) criticos += 1;
      else if (actual > 0 && actual <= minimo) bajo += 1;
    }
    return { criticos, bajo, total: criticos + bajo };
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
        {/* Ventas hoy */}
        <Link to="/admin/ventas" style={styles.kpiCard}>
          <div style={styles.kpiCardTop}>
            <div style={{ ...styles.kpiIcon, background: 'rgba(99, 102, 241, 0.12)' }}>
              <span style={{ fontSize: 20 }}>💰</span>
            </div>
            <div>
              <div style={styles.kpiLabel}>Ventas hoy</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={styles.kpiValue}>{loading ? '...' : formatMoney(data?.total_ventas_hoy)}</div>
                {!loading && (
                  <span style={{
                    fontSize: 12, fontWeight: 900,
                    color: ventasTrend >= 0 ? 'rgba(34,197,94,0.95)' : 'rgba(239,68,68,0.92)',
                  }}>
                    {ventasTrend >= 0 ? '▲' : '▼'} {Math.abs(ventasTrend) > 0 ? formatMoney(Math.abs(ventasTrend)) : ''}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            {loading ? null : ventasAllZero ? (
              <div style={styles.muted}>Sin ventas en los últimos 7 días</div>
            ) : (
              <VentasChart
                data={ventas7d}
                labels={ventas7dLabels}
                color={ventasTrend >= 0 ? '#6366f1' : '#ef4444'}
              />
            )}
          </div>
        </Link>

        {/* Productos disponibles */}
        <Link to="/admin/productos" style={styles.kpiCard}>
          <div style={styles.kpiCardTop}>
            <div style={{ ...styles.kpiIcon, background: 'rgba(16, 185, 129, 0.12)' }}>
              <span style={{ fontSize: 20 }}>📦</span>
            </div>
            <div>
              <div style={styles.kpiLabel}>Productos disponibles</div>
              <div style={styles.kpiValue}>
                {loading ? '...' : `${Number(data?.productos_activos || 0)} productos`}
              </div>
            </div>
          </div>
          <div style={styles.kpiChartCenter}>
            {loading ? null : (
              <DonutChart
                segments={[
                  { key: 'OK', value: productosStats.ok, color: '#10b981' },
                  { key: 'Bajo', value: productosStats.bajo, color: '#f59e0b' },
                  { key: 'Sin stock', value: productosStats.sinStock, color: '#ef4444' },
                ]}
              />
            )}
          </div>
          <div style={styles.kpiLegend}>
            <div style={styles.legendItem}>
              <span style={{ ...styles.legendDot, background: 'rgba(34, 197, 94, 0.92)' }} />
              OK: {loading ? '...' : productosStats.ok} ({loading ? '...' : productosPct.ok}%)
            </div>
            <div style={styles.legendItem}>
              <span style={{ ...styles.legendDot, background: 'rgba(245, 158, 11, 0.92)' }} />
              Bajo: {loading ? '...' : productosStats.bajo} ({loading ? '...' : productosPct.bajo}%)
            </div>
            <div style={styles.legendItem}>
              <span style={{ ...styles.legendDot, background: 'rgba(239, 68, 68, 0.92)' }} />
              Sin stock: {loading ? '...' : productosStats.sinStock} ({loading ? '...' : productosPct.sin}%)
            </div>
          </div>
        </Link>

        {/* Vencimientos */}
        <div style={styles.kpiCard}>
          <div style={styles.kpiCardTop}>
            <div style={{ ...styles.kpiIcon, background: 'rgba(239, 68, 68, 0.10)' }}>
              <span style={{ fontSize: 20 }}>📅</span>
            </div>
            <div>
              <div style={styles.kpiLabel}>Vencimientos</div>
              <div style={styles.kpiValue}>
                {loading ? '...' : `${expiryStats.proximos + expiryStats.vencidos} productos`}
              </div>
            </div>
          </div>
          <div style={styles.kpiChartCenter}>
            {loading ? null : (
              <DonutChart
                segments={[
                  { key: 'Vencidos', value: expiryStats.vencidos, color: '#ef4444' },
                  { key: 'Próximos', value: expiryStats.proximos, color: '#f59e0b' },
                ]}
              />
            )}
          </div>
          <div style={styles.kpiLegend}>
            {(() => {
              const total = expiryStats.vencidos + expiryStats.proximos;
              const pctV = total > 0 ? Math.round((expiryStats.vencidos / total) * 100) : 0;
              const pctP = total > 0 ? Math.round((expiryStats.proximos / total) * 100) : 0;
              return (
                <>
                  <div style={styles.legendItem}>
                    <span style={{ ...styles.legendDot, background: 'rgba(239, 68, 68, 0.92)' }} />
                    Vencidos: {loading ? '...' : expiryStats.vencidos} ({loading ? '...' : pctV}%)
                  </div>
                  <div style={styles.legendItem}>
                    <span style={{ ...styles.legendDot, background: 'rgba(245, 158, 11, 0.92)' }} />
                    Próximos: {loading ? '...' : expiryStats.proximos} ({loading ? '...' : pctP}%)
                  </div>
                </>
              );
            })()}
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
  alertaVencidos: {
    padding: 14,
    borderRadius: 12,
    background: 'rgba(220, 38, 38, 0.08)',
    border: '2px solid rgba(220, 38, 38, 0.30)',
    color: 'rgba(11, 42, 82, 0.92)',
    fontSize: 13,
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
  kpiCardTop: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 },
  kpiIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  kpiChartCenter: { display: 'flex', justifyContent: 'center', marginTop: 12, marginBottom: 4 },
  kpiLegend: { display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 },
  legendItem: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'rgba(11, 42, 82, 0.80)', fontWeight: 700 },
  legendDot: { width: 10, height: 10, borderRadius: '50%', flexShrink: 0 },
  kpiChartBelow: { marginTop: 10 },
  kpiLabel: { fontWeight: 900, color: 'rgba(11, 42, 82, 0.70)', fontSize: 12, letterSpacing: 0.4 },
  kpiValue: { marginTop: 4, fontWeight: 900, color: '#0b2a52', fontSize: 22 },
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
