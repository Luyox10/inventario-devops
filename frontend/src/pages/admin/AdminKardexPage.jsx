import React, { useEffect, useMemo, useState } from 'react';
import { listProductos } from '../../api/productos';
import { getKardex } from '../../api/kardex';
import { useAuth } from '../../state/auth/AuthContext.jsx';

function formatMoney(n) {
  return `S/ ${Number(n || 0).toFixed(2)}`;
}

function formatFecha(raw) {
  if (!raw) return '—';
  const s = String(raw).slice(0, 10);
  const [y, m, d] = s.split('-');
  return `${d}/${m}/${y}`;
}

function formatFechaHora(raw) {
  if (!raw) return '—';
  const s = String(raw).slice(0, 16).replace('T', ' ');
  const [fecha, hora] = s.split(' ');
  const [y, m, d] = fecha.split('-');
  return `${d}/${m}/${y} ${hora}`;
}

const AdminKardexPage = () => {
  const { token, logout } = useAuth();

  const [productos, setProductos]               = useState([]);
  const [loadingProductos, setLoadingProductos] = useState(true);

  const [productoId, setProductoId]       = useState('');
  const [productoQuery, setProductoQuery] = useState('');
  const [productoOpen, setProductoOpen]   = useState(false);

  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');

  const [kardex, setKardex]       = useState(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');

  useEffect(() => {
    let alive = true;
    setLoadingProductos(true);
    listProductos({ token })
      .then((d) => { if (alive) setProductos(Array.isArray(d) ? d : []); })
      .catch((err) => { if (err.status === 401) logout(); })
      .finally(() => { if (alive) setLoadingProductos(false); });
    return () => { alive = false; };
  }, [token, logout]);

  const productoById = useMemo(() => {
    const m = new Map();
    for (const p of productos) m.set(String(p.id), p);
    return m;
  }, [productos]);

  const productoMatches = useMemo(() => {
    const s = productoQuery.trim().toLowerCase();
    if (!s) return [];
    return productos
      .filter((p) => p.nombre?.toLowerCase().includes(s) || p.sku?.toLowerCase().includes(s))
      .slice(0, 10);
  }, [productoQuery, productos]);

  const productoSelected = useMemo(() => productoById.get(String(productoId)) || null, [productoById, productoId]);

  async function buscarKardex() {
    if (!productoId) return;
    setLoading(true);
    setError('');
    setKardex(null);
    try {
      const data = await getKardex({ token, productoId, desde: desde || undefined, hasta: hasta || undefined });
      setKardex(data);
    } catch (err) {
      if (err.status === 401) logout();
      setError('No se pudo cargar el kardex: ' + (err.message || 'Error desconocido'));
    } finally {
      setLoading(false);
    }
  }

  const [buscado, setBuscado] = useState(false);

  function handleBuscar() {
    if (!productoId) return;
    setBuscado(true);
    buscarKardex();
  }

  function limpiarFiltros() {
    setDesde('');
    setHasta('');
    setProductoId('');
    setProductoQuery('');
    setKardex(null);
    setError('');
    setBuscado(false);
  }

  const estadoBadge = (p) => {
    const stock = Number(p?.stock_actual || 0);
    const min   = Number(p?.stock_minimo || 0);
    if (stock <= 0)    return { label: 'SIN STOCK', color: '#dc2626', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)' };
    if (stock <= min)  return { label: 'BAJO',      color: '#b45309', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)' };
    return               { label: 'OK',        color: '#065f46', bg: 'rgba(52,211,153,0.12)', border: 'rgba(52,211,153,0.3)' };
  };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <header style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 24 }}>📋</span>
          <h2 style={{ margin: 0, color: '#0b2a52', fontSize: 28, fontWeight: 900 }}>Kardex</h2>
        </div>
        <p style={{ margin: '5px 0 0', color: 'rgba(11,42,82,0.7)', fontSize: 15 }}>
          Historial de entradas y salidas por producto.
        </p>
      </header>

      {/* Filtros */}
      <div style={{ background: 'rgba(255,255,255,0.35)', borderRadius: 20, border: '1px solid rgba(255,255,255,0.4)', padding: 20, marginBottom: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto auto', gap: 14, alignItems: 'end' }}>

          {/* Buscador producto */}
          <div style={s.inputGroup}>
            <label style={s.label}>PRODUCTO (SKU O NOMBRE)</label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Buscar producto..."
                style={s.input}
                value={productoQuery}
                disabled={loadingProductos}
                onChange={(e) => { setProductoQuery(e.target.value); setProductoId(''); setKardex(null); setProductoOpen(true); }}
                onFocus={() => setProductoOpen(true)}
                onBlur={() => setTimeout(() => setProductoOpen(false), 120)}
              />
              {productoOpen && productoMatches.length > 0 && (
                <div style={s.autoDropdown}>
                  {productoMatches.map((p) => (
                    <button key={p.id} type="button" style={s.autoItem}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setProductoId(String(p.id));
                        setProductoQuery(p.sku ? `${p.nombre} (${p.sku})` : p.nombre);
                        setProductoOpen(false);
                      }}
                    >
                      <div style={s.autoTitle}>{p.nombre}</div>
                      <div style={s.autoMeta}>{p.sku ? `SKU: ${p.sku}` : 'Sin SKU'} · Stock: {p.stock_actual ?? 0}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Desde */}
          <div style={s.inputGroup}>
            <label style={s.label}>DESDE</label>
            <input type="date" style={s.input} value={desde} onChange={(e) => setDesde(e.target.value)} />
          </div>

          {/* Hasta */}
          <div style={s.inputGroup}>
            <label style={s.label}>HASTA</label>
            <input type="date" style={s.input} value={hasta} onChange={(e) => setHasta(e.target.value)} />
          </div>

          {/* Buscar */}
          <button type="button" onClick={handleBuscar} disabled={!productoId}
            style={{ ...s.btnBuscar, opacity: !productoId ? 0.5 : 1 }}>
            Buscar
          </button>

          {/* Limpiar */}
          <button type="button" onClick={limpiarFiltros} style={s.btnLimpiar}>
            Limpiar
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: '12px 16px', borderRadius: 12, marginBottom: 20, fontSize: 14, fontWeight: 700, background: 'rgba(239,68,68,0.12)', color: '#b91c1c', border: '1px solid rgba(239,68,68,0.25)' }}>
          ❌ {error}
        </div>
      )}

      {/* Estado vacío enriquecido */}
      {!buscado && !loading && (
        <div>
          {/* Pasos */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
            {[
              { step: '1', icon: '🔍', title: 'Selecciona un producto', desc: 'Escribe el nombre o SKU en el buscador para encontrar el producto.' },
              { step: '2', icon: '📅', title: 'Filtra por fecha', desc: 'Elige un rango de fechas opcional para acotar el historial.' },
              { step: '3', icon: '📊', title: 'Consulta el Kardex', desc: 'Haz clic en Buscar para ver entradas, salidas y saldo acumulado.' },
            ].map(({ step, icon, title, desc }) => (
              <div key={step} style={{
                background: 'rgba(255,255,255,0.35)', borderRadius: 18,
                border: '1px solid rgba(255,255,255,0.5)', padding: '24px 20px',
                textAlign: 'center', position: 'relative',
              }}>
                <div style={{
                  position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)',
                  background: '#0b2a52', color: '#fff', borderRadius: '50%',
                  width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 900,
                }}>{step}</div>
                <div style={{ fontSize: 36, marginBottom: 10, marginTop: 6 }}>{icon}</div>
                <div style={{ fontWeight: 900, color: '#0b2a52', fontSize: 15, marginBottom: 6 }}>{title}</div>
                <div style={{ fontSize: 13, color: 'rgba(11,42,82,0.6)', lineHeight: 1.5 }}>{desc}</div>
              </div>
            ))}
          </div>

          {/* Info cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
            {[
              { icon: '📈', color: '#059669', bg: 'rgba(52,211,153,0.1)', border: 'rgba(52,211,153,0.25)', title: 'Entradas', desc: 'Registros de reposición de stock, compras o ajustes de inventario positivos.' },
              { icon: '📉', color: '#dc2626', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.25)', title: 'Salidas', desc: 'Descuentos de stock por ventas realizadas u otros egresos de mercadería.' },
              { icon: '⚖️', color: '#6366f1', bg: 'rgba(99,102,241,0.1)', border: 'rgba(99,102,241,0.25)', title: 'Saldo acumulado', desc: 'Balance corrido que refleja el stock disponible después de cada movimiento.' },
              { icon: '🗂️', color: '#b45309', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.25)', title: 'Historial completo', desc: 'Sin filtro de fechas se muestran todos los movimientos del producto.' },
            ].map(({ icon, color, bg, border, title, desc }) => (
              <div key={title} style={{
                background: bg, borderRadius: 16,
                border: `1px solid ${border}`, padding: '18px 20px',
                display: 'flex', gap: 14, alignItems: 'flex-start',
              }}>
                <div style={{ fontSize: 28, flexShrink: 0 }}>{icon}</div>
                <div>
                  <div style={{ fontWeight: 900, color, fontSize: 14, marginBottom: 4 }}>{title}</div>
                  <div style={{ fontSize: 13, color: 'rgba(11,42,82,0.65)', lineHeight: 1.5 }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'rgba(11,42,82,0.5)', fontWeight: 700 }}>
          Cargando kardex...
        </div>
      )}

      {/* Contenido kardex */}
      {kardex && !loading && (
        <>
          {/* Info producto */}
          <div style={{ background: 'rgba(255,255,255,0.35)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.4)', padding: '16px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontWeight: 900, fontSize: 17, color: '#0b2a52' }}>{kardex.producto.nombre}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(11,42,82,0.55)', marginTop: 2 }}>
                {kardex.producto.sku ? `SKU: ${kardex.producto.sku}` : 'Sin SKU'}
                {kardex.producto.unidad ? ` · ${kardex.producto.unidad}` : ''}
                {` · Precio: ${formatMoney(kardex.producto.precio)}`}
                {` · Stock mín: ${kardex.producto.stock_minimo}`}
              </div>
            </div>
            {(() => {
              const b = estadoBadge(kardex.producto);
              return (
                <span style={{ padding: '4px 12px', borderRadius: 999, fontSize: 11, fontWeight: 900, letterSpacing: 0.5, background: b.bg, border: `1px solid ${b.border}`, color: b.color }}>
                  {b.label}
                </span>
              );
            })()}
          </div>

          {/* Tarjetas resumen */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
            {[
              { label: 'TOTAL ENTRADAS', value: kardex.resumen.total_entradas, color: '#065f46', bg: 'rgba(52,211,153,0.10)', border: 'rgba(52,211,153,0.20)', suffix: ' uds' },
              { label: 'TOTAL SALIDAS',  value: kardex.resumen.total_salidas,  color: '#b91c1c', bg: 'rgba(239,68,68,0.10)', border: 'rgba(239,68,68,0.20)', suffix: ' uds' },
              { label: 'SALDO ACTUAL',   value: kardex.resumen.saldo_actual,   color: '#0b2a52', bg: 'rgba(99,102,241,0.10)', border: 'rgba(99,102,241,0.20)', suffix: ' uds' },
              { label: 'MOVIMIENTOS',    value: kardex.resumen.total_movimientos, color: '#1d4ed8', bg: 'rgba(59,130,246,0.10)', border: 'rgba(59,130,246,0.20)', suffix: '' },
            ].map((card) => (
              <div key={card.label} style={{ background: card.bg, border: `1px solid ${card.border}`, borderRadius: 16, padding: '16px 20px' }}>
                <div style={{ fontSize: 10, fontWeight: 900, color: 'rgba(11,42,82,0.55)', letterSpacing: 0.5 }}>{card.label}</div>
                <div style={{ fontSize: 26, fontWeight: 900, color: card.color, marginTop: 4 }}>{card.value}{card.suffix}</div>
              </div>
            ))}
          </div>

          {/* Tabla */}
          {kardex.movimientos.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'rgba(11,42,82,0.4)', fontWeight: 700, background: 'rgba(255,255,255,0.3)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.4)' }}>
              No hay movimientos en el período seleccionado.
            </div>
          ) : (
            <div style={{ background: 'rgba(255,255,255,0.3)', borderRadius: 20, border: '1px solid rgba(255,255,255,0.4)', overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: 'rgba(11,42,82,0.06)' }}>
                      {['Fecha / Hora', 'Tipo', 'Cantidad', 'Saldo', 'Usuario', 'Motivo', 'Venta #'].map((h) => (
                        <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 900, fontSize: 11, color: 'rgba(11,42,82,0.6)', letterSpacing: 0.4, whiteSpace: 'nowrap', borderBottom: '1px solid rgba(11,42,82,0.08)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {kardex.movimientos.map((mov, idx) => {
                      const esEntrada = mov.tipo === 'ENTRADA';
                      const saldoCritico = mov.saldo <= 0;
                      const zebra = idx % 2 === 0 ? 'rgba(255,255,255,0.05)' : 'transparent';
                      return (
                        <tr key={mov.id} style={{ background: saldoCritico ? 'rgba(239,68,68,0.06)' : zebra }}>
                          <td style={s.td}>{formatFechaHora(mov.fecha)}</td>
                          <td style={s.td}>
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', padding: '3px 10px',
                              borderRadius: 999, fontSize: 11, fontWeight: 900, letterSpacing: 0.4,
                              background: esEntrada ? 'rgba(52,211,153,0.15)' : 'rgba(239,68,68,0.15)',
                              color: esEntrada ? '#065f46' : '#b91c1c',
                              border: `1px solid ${esEntrada ? 'rgba(52,211,153,0.3)' : 'rgba(239,68,68,0.3)'}`,
                            }}>
                              {esEntrada ? '▲' : '▼'} {mov.tipo}
                            </span>
                          </td>
                          <td style={{ ...s.td, fontWeight: 900, color: esEntrada ? '#065f46' : '#b91c1c' }}>
                            {esEntrada ? '+' : '-'}{mov.cantidad}
                          </td>
                          <td style={{ ...s.td, fontWeight: 900, color: saldoCritico ? '#dc2626' : '#0b2a52' }}>
                            {mov.saldo}
                          </td>
                          <td style={s.td}>{mov.usuario}</td>
                          <td style={s.td}>{mov.motivo}</td>
                          <td style={s.td}>{mov.venta_id ? `#${mov.venta_id}` : '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

const s = {
  inputGroup: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 11, fontWeight: 800, color: 'rgba(11,42,82,0.6)', letterSpacing: 0.5 },
  input: {
    padding: '11px 14px', borderRadius: 12,
    border: '1px solid rgba(11,42,82,0.1)',
    background: 'rgba(255,255,255,0.7)',
    fontSize: 14, color: '#0b2a52', outline: 'none',
    width: '100%', boxSizing: 'border-box',
  },
  autoDropdown: {
    position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 20,
    borderRadius: 12, overflow: 'hidden',
    border: '1px solid rgba(11,42,82,0.14)',
    background: 'rgba(255,255,255,0.97)',
    boxShadow: '0 16px 36px rgba(0,0,0,0.16)',
    maxHeight: 240, overflowY: 'auto',
  },
  autoItem: {
    width: '100%', textAlign: 'left', border: 'none',
    background: 'transparent', padding: '10px 12px',
    cursor: 'pointer', borderBottom: '1px solid rgba(11,42,82,0.07)',
  },
  autoTitle: { fontWeight: 900, color: '#0b2a52', fontSize: 13 },
  autoMeta: { marginTop: 3, fontWeight: 700, color: 'rgba(11,42,82,0.55)', fontSize: 11 },
  btnBuscar: {
    padding: '11px 18px', borderRadius: 12, border: 'none',
    background: '#0b2a52', color: '#fff',
    fontSize: 13, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap',
    boxShadow: '0 4px 12px rgba(11,42,82,0.25)',
  },
  btnLimpiar: {
    padding: '11px 18px', borderRadius: 12,
    border: '1.5px solid rgba(11,42,82,0.15)',
    background: 'rgba(255,255,255,0.7)',
    color: '#0b2a52', fontSize: 13, fontWeight: 800,
    cursor: 'pointer', whiteSpace: 'nowrap',
  },
  td: {
    padding: '11px 14px',
    borderBottom: '1px solid rgba(11,42,82,0.06)',
    color: 'rgba(11,42,82,0.8)',
    whiteSpace: 'nowrap',
  },
};

export default AdminKardexPage;
