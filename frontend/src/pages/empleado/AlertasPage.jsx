import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, PackageX, TrendingDown, CalendarX, Clock,
  RefreshCw, CheckCircle2,
} from 'lucide-react';

import { listStockBajo, listProductosVencidos } from '../../api/alertas';
import { listProductos } from '../../api/productos';
import { useAuth } from '../../state/auth/AuthContext.jsx';

const FILTERS = [
  { key: 'todos',    label: 'Todos' },
  { key: 'critico',  label: 'Sin stock' },
  { key: 'bajo',     label: 'Stock bajo' },
  { key: 'vencido',  label: 'Vencidos' },
  { key: 'proximo',  label: 'Próx. a vencer' },
];

function today0() {
  const d = new Date(); d.setHours(0,0,0,0); return d;
}

function severityStock(a) {
  const actual = Number(a?.stock_actual || 0);
  const minimo = Number(a?.stock_minimo || 0);
  if (actual <= 0) return 'critico';
  if (actual <= minimo) return 'bajo';
  return 'ok';
}

function severityExpiry(expiry_date) {
  if (!expiry_date) return null;
  const exp = new Date(String(expiry_date).slice(0,10) + 'T00:00:00');
  const hoy = today0();
  if (exp <= hoy) return 'vencido';
  const diff = Math.ceil((exp - hoy) / 86400000);
  if (diff <= 7) return 'proximo';
  return null;
}

const SEV_CONFIG = {
  critico: { label: 'SIN STOCK',      color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.30)',   Icon: PackageX },
  bajo:    { label: 'STOCK BAJO',     color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.30)',  Icon: TrendingDown },
  vencido: { label: 'VENCIDO',        color: '#dc2626', bg: 'rgba(220,38,38,0.12)',   border: 'rgba(220,38,38,0.30)',   Icon: CalendarX },
  proximo: { label: 'PRÓX. A VENCER', color: '#f97316', bg: 'rgba(249,115,22,0.12)',  border: 'rgba(249,115,22,0.30)',  Icon: Clock },
};

export default function AlertasPage() {
  const { token, logout } = useAuth();
  const [stockAlertas, setStockAlertas] = useState([]);
  const [vencidos, setVencidos] = useState([]);
  const [productosAll, setProductosAll] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filtro, setFiltro] = useState('todos');
  const [lastUpdate, setLastUpdate] = useState(null);

  async function load() {
    setLoading(true); setError(null);
    try {
      const [resStock, resVenc, resProd] = await Promise.all([
        listStockBajo({ token }),
        listProductosVencidos({ token }),
        listProductos({ token }),
      ]);
      setStockAlertas(Array.isArray(resStock) ? resStock : []);
      setVencidos(Array.isArray(resVenc) ? resVenc : []);
      setProductosAll(Array.isArray(resProd) ? resProd : []);
      setLastUpdate(new Date());
    } catch (err) {
      if (err.status === 401) logout();
      setError(err.message || 'No se pudieron cargar las alertas.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [token]);

  const items = useMemo(() => {
    const map = new Map();

    for (const a of stockAlertas) {
      const sev = severityStock(a);
      if (sev === 'ok') continue;
      map.set(String(a.id), {
        id: a.id, nombre: a.nombre, sku: a.sku, unidad: a.unidad,
        stock_actual: Number(a.stock_actual || 0),
        stock_minimo: Number(a.stock_minimo || 0),
        expiry_date: a.expiry_date || null,
        stockSev: sev,
        expirySev: severityExpiry(a.expiry_date),
      });
    }

    for (const p of productosAll) {
      const expSev = severityExpiry(p.expiry_date);
      if (!expSev) continue;
      const key = String(p.id);
      if (map.has(key)) {
        map.get(key).expirySev = expSev;
      } else {
        map.set(key, {
          id: p.id, nombre: p.nombre, sku: p.sku, unidad: p.unidad,
          stock_actual: Number(p.stock_actual || 0),
          stock_minimo: Number(p.stock_minimo || 0),
          expiry_date: p.expiry_date || null,
          stockSev: severityStock(p),
          expirySev: expSev,
        });
      }
    }

    return [...map.values()].sort((a, b) => {
      const order = { critico: 4, vencido: 3, proximo: 2, bajo: 1 };
      const wa = Math.max(order[a.stockSev] || 0, order[a.expirySev] || 0);
      const wb = Math.max(order[b.stockSev] || 0, order[b.expirySev] || 0);
      if (wb !== wa) return wb - wa;
      return String(a.nombre).localeCompare(String(b.nombre), 'es', { sensitivity: 'base' });
    });
  }, [stockAlertas, vencidos, productosAll]);

  const counts = useMemo(() => ({
    critico: items.filter(i => i.stockSev === 'critico').length,
    bajo:    items.filter(i => i.stockSev === 'bajo').length,
    vencido: items.filter(i => i.expirySev === 'vencido').length,
    proximo: items.filter(i => i.expirySev === 'proximo').length,
    todos:   items.length,
  }), [items]);

  const filtered = useMemo(() => {
    if (filtro === 'todos') return items;
    if (filtro === 'critico') return items.filter(i => i.stockSev === 'critico');
    if (filtro === 'bajo')    return items.filter(i => i.stockSev === 'bajo');
    if (filtro === 'vencido') return items.filter(i => i.expirySev === 'vencido');
    if (filtro === 'proximo') return items.filter(i => i.expirySev === 'proximo');
    return items;
  }, [items, filtro]);

  const KPI_CARDS = [
    { key: 'critico',  label: 'Sin stock',       Icon: PackageX,      color: '#ef4444', bg: 'rgba(239,68,68,0.10)' },
    { key: 'bajo',     label: 'Stock bajo',       Icon: TrendingDown,  color: '#f59e0b', bg: 'rgba(245,158,11,0.10)' },
    { key: 'vencido',  label: 'Vencidos',         Icon: CalendarX,     color: '#dc2626', bg: 'rgba(220,38,38,0.10)' },
    { key: 'proximo',  label: 'Próx. a vencer',   Icon: Clock,         color: '#f97316', bg: 'rgba(249,115,22,0.10)' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <AlertTriangle size={24} color="#f59e0b" />
            <h2 style={{ margin: 0, color: '#0b2a52', fontSize: 26, fontWeight: 900 }}>Alertas de Inventario</h2>
          </div>
          <p style={{ margin: '4px 0 0 34px', color: 'rgba(11,42,82,0.55)', fontSize: 13 }}>
            Stock crítico, bajo mínimo y vencimientos en tiempo real.
          </p>
        </div>
        <button onClick={load} disabled={loading} style={s.refreshBtn}>
          <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          {loading ? 'Cargando...' : lastUpdate ? `Actualizado ${lastUpdate.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}` : 'Actualizar'}
        </button>
      </div>

      {error && (
        <div style={s.errorBox}><AlertTriangle size={16} />{error}</div>
      )}

      {/* ── KPI Cards ── */}
      <div style={s.kpiGrid}>
        {KPI_CARDS.map(({ key, label, Icon, color, bg }) => (
          <button key={key} onClick={() => setFiltro(filtro === key ? 'todos' : key)}
            style={{ ...s.kpiCard, background: filtro === key ? bg : 'rgba(255,255,255,0.40)', borderColor: filtro === key ? color : 'rgba(255,255,255,0.5)' }}>
            <div style={{ ...s.kpiIconWrap, background: bg }}>
              <Icon size={18} color={color} />
            </div>
            <div style={{ ...s.kpiNum, color }}>{loading ? '—' : counts[key]}</div>
            <div style={s.kpiLabel}>{label}</div>
          </button>
        ))}
      </div>

      {/* ── Filtros ── */}
      <div style={s.filterRow}>
        {FILTERS.map(f => (
          <button key={f.key} onClick={() => setFiltro(f.key)}
            style={{ ...s.filterBtn, ...(filtro === f.key ? s.filterBtnActive : {}) }}>
            {f.label}
            {counts[f.key] > 0 && f.key !== 'todos' && (
              <span style={{ ...s.filterBadge, background: filtro === f.key ? '#0b2a52' : 'rgba(11,42,82,0.12)' }}>
                {counts[f.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Tabla ── */}
      {loading ? (
        <div style={s.emptyBox}>Verificando inventario...</div>
      ) : filtered.length === 0 ? (
        <div style={{ ...s.emptyBox, color: '#065f46', background: 'rgba(52,211,153,0.10)', border: '1px solid rgba(52,211,153,0.25)' }}>
          <CheckCircle2 size={20} color="#10b981" />
          <span>Sin alertas en esta categoría.</span>
        </div>
      ) : (
        <TableAlertas items={filtered} />
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function TableAlertas({ items }) {
  const paged = items;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, background: 'rgba(255,255,255,0.45)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.55)', overflow: 'hidden', boxShadow: '0 6px 24px rgba(0,0,0,0.06)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: 'rgba(11,42,82,0.04)', borderBottom: '1.5px solid rgba(11,42,82,0.09)' }}>
            <th style={s.th}>Producto</th>
            <th style={s.th}>Estado</th>
            <th style={{ ...s.th, textAlign: 'right' }}>Stock actual</th>
            <th style={{ ...s.th, textAlign: 'right' }}>Mínimo</th>
            <th style={s.th}>Vencimiento</th>
          </tr>
        </thead>
        <tbody>
          {paged.map((item, idx) => {
            const sc = SEV_CONFIG[item.stockSev] || SEV_CONFIG.bajo;
            const ec = item.expirySev ? SEV_CONFIG[item.expirySev] : null;
            const actual = item.stock_actual;
            const minimo = item.stock_minimo;
            const unidad = item.unidad || 'uds';
            const mainColor = ec ? ec.color : sc.color;
            const expStr = item.expiry_date
              ? new Date(String(item.expiry_date).slice(0, 10) + 'T00:00:00').toLocaleDateString('es-PE')
              : '—';

            return (
              <tr key={item.id} style={{ background: idx % 2 === 0 ? 'transparent' : 'rgba(11,42,82,0.025)', borderBottom: '1px solid rgba(11,42,82,0.07)', borderLeft: `4px solid ${mainColor}` }}>
                <td style={s.td}>
                  <div style={{ fontWeight: 800, color: '#0b2a52', fontSize: 13 }}>{item.nombre}</div>
                  {item.sku && <div style={{ fontSize: 11, color: 'rgba(11,42,82,0.50)', fontWeight: 700 }}>{item.sku}</div>}
                </td>
                <td style={s.td}>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {item.stockSev !== 'ok' && (
                      <span style={{ ...s.badge, background: sc.bg, border: `1px solid ${sc.border}`, color: sc.color }}>
                        <sc.Icon size={10} />{sc.label}
                      </span>
                    )}
                    {ec && (
                      <span style={{ ...s.badge, background: ec.bg, border: `1px solid ${ec.border}`, color: ec.color }}>
                        <ec.Icon size={10} />{ec.label}
                      </span>
                    )}
                  </div>
                </td>
                <td style={{ ...s.td, textAlign: 'right', fontWeight: 900, color: mainColor, fontSize: 14 }}>
                  {actual} <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(11,42,82,0.50)' }}>{unidad}</span>
                </td>
                <td style={{ ...s.td, textAlign: 'right', color: 'rgba(11,42,82,0.65)', fontWeight: 700, fontSize: 13 }}>
                  {minimo} <span style={{ fontSize: 11 }}>{unidad}</span>
                </td>
                <td style={{ ...s.td, fontWeight: 700, fontSize: 13, color: ec ? ec.color : 'rgba(11,42,82,0.55)' }}>
                  {expStr}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div style={{ padding: '8px 16px', borderTop: '1px solid rgba(11,42,82,0.07)', fontSize: 12, color: 'rgba(11,42,82,0.45)', fontWeight: 700 }}>
        {items.length} {items.length === 1 ? 'alerta' : 'alertas'}
      </div>
    </div>
  );
}

const s = {
  refreshBtn: {
    display: 'flex', alignItems: 'center', gap: 7,
    padding: '8px 16px', borderRadius: 10, border: '1px solid rgba(11,42,82,0.15)',
    background: 'rgba(255,255,255,0.55)', color: 'rgba(11,42,82,0.70)',
    fontSize: 12, fontWeight: 700, cursor: 'pointer',
  },
  errorBox: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '12px 16px', borderRadius: 12,
    background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.22)',
    color: '#b91c1c', fontSize: 13, fontWeight: 700,
  },
  kpiGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12,
  },
  kpiCard: {
    display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6,
    padding: '14px 16px', borderRadius: 16, border: '1.5px solid',
    cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
  },
  kpiIconWrap: {
    width: 34, height: 34, borderRadius: 10,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  kpiNum: { fontSize: 26, fontWeight: 900, lineHeight: 1 },
  kpiLabel: { fontSize: 12, fontWeight: 700, color: 'rgba(11,42,82,0.60)' },
  filterRow: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  filterBtn: {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '7px 14px', borderRadius: 999, border: '1.5px solid rgba(11,42,82,0.13)',
    background: 'rgba(255,255,255,0.45)', color: 'rgba(11,42,82,0.65)',
    fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s',
  },
  filterBtnActive: {
    background: '#0b2a52', color: '#fff', borderColor: '#0b2a52',
  },
  filterBadge: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    minWidth: 18, height: 18, borderRadius: 999,
    fontSize: 11, fontWeight: 900, color: '#0b2a52', padding: '0 5px',
  },
  emptyBox: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
    padding: '28px', borderRadius: 16, fontSize: 14, fontWeight: 700,
    color: 'rgba(11,42,82,0.50)', background: 'rgba(255,255,255,0.35)',
    border: '1px solid rgba(255,255,255,0.5)',
  },
  card: {
    background: 'rgba(255,255,255,0.45)', borderRadius: 16,
    border: '1px solid rgba(255,255,255,0.55)',
    boxShadow: '0 6px 20px rgba(0,0,0,0.06)', overflow: 'hidden',
  },
  cardBody: { display: 'flex', gap: 16, padding: '16px 18px', alignItems: 'flex-start' },
  radialWrap: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0 },
  badgeRow: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 },
  badge: {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    padding: '3px 9px', borderRadius: 999,
    fontSize: 11, fontWeight: 900, letterSpacing: 0.3,
  },
  itemName: { fontSize: 15, fontWeight: 900, color: '#0b2a52', marginBottom: 2 },
  itemSku: { fontSize: 12, fontWeight: 700, color: 'rgba(11,42,82,0.55)', marginBottom: 10 },
  metricsRow: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  chip: {
    padding: '6px 10px', borderRadius: 10,
    background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(11,42,82,0.10)',
    minWidth: 70,
  },
  chipLabel: { fontSize: 10, fontWeight: 900, color: 'rgba(11,42,82,0.55)', textTransform: 'uppercase', letterSpacing: 0.4 },
  chipVal: { fontSize: 14, fontWeight: 900, color: '#0b2a52', marginTop: 2 },
  chipUnit: { fontSize: 11, fontWeight: 700, color: 'rgba(11,42,82,0.55)' },
  barLbl: { fontSize: 11, fontWeight: 700, color: 'rgba(11,42,82,0.55)' },
  barTrack: { height: 8, borderRadius: 999, background: 'rgba(11,42,82,0.08)', overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 999, transition: 'width 0.4s ease' },
  th: {
    padding: '10px 14px', textAlign: 'left',
    fontSize: 11, fontWeight: 900, color: 'rgba(11,42,82,0.55)',
    textTransform: 'uppercase', letterSpacing: 0.5, whiteSpace: 'nowrap',
  },
  td: { padding: '10px 14px', verticalAlign: 'middle' },
  pageBtn: {
    padding: '5px 12px', borderRadius: 8, border: '1px solid rgba(11,42,82,0.15)',
    background: 'rgba(255,255,255,0.6)', color: 'rgba(11,42,82,0.65)',
    fontSize: 12, fontWeight: 700, cursor: 'pointer',
  },
};