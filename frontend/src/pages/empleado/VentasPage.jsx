import React, { useEffect, useMemo, useState } from 'react';
import { Trash2, Plus, ShoppingCart } from 'lucide-react';

import { listProductos } from '../../api/productos';
import { crearVenta } from '../../api/ventas';
import { useAuth } from '../../state/auth/AuthContext.jsx';

function formatMoney(n) {
  const v = Number(n || 0);
  return `S/ ${v.toFixed(2)}`;
}

const VentasPage = () => {
  const { token, logout } = useAuth();
  const [status, setStatus]               = useState({ type: '', msg: '' });
  const [productos, setProductos]         = useState([]);
  const [loadingProductos, setLoadingProductos] = useState(true);
  const [submitting, setSubmitting]       = useState(false);

  const [carrito, setCarrito]             = useState([]);

  const [productoId, setProductoId]       = useState('');
  const [productoQuery, setProductoQuery] = useState('');
  const [productoOpen, setProductoOpen]   = useState(false);
  const [cantidadInput, setCantidadInput] = useState('');

  const productoById = useMemo(() => {
    const map = new Map();
    for (const p of productos) map.set(String(p.id), p);
    return map;
  }, [productos]);

  const productoMatches = useMemo(() => {
    const s = productoQuery.trim().toLowerCase();
    if (!s) return [];
    return productos
      .filter((p) => p.nombre?.toLowerCase().includes(s) || p.sku?.toLowerCase().includes(s))
      .slice(0, 10);
  }, [productoQuery, productos]);

  const productoSelected = useMemo(() => {
    if (!productoId) return null;
    return productoById.get(String(productoId)) || null;
  }, [productoById, productoId]);

  const productoResolved = useMemo(() => {
    if (productoSelected) return productoSelected;
    const q = productoQuery.trim().toLowerCase();
    if (!q) return null;
    return productos.find((p) => p.sku?.trim().toLowerCase() === q) || null;
  }, [productoQuery, productoSelected, productos]);

  const totalCarrito = useMemo(() =>
    carrito.reduce((acc, item) => acc + item.subtotal, 0),
  [carrito]);

  const previewSubtotal = useMemo(() => {
    const qty = Number(cantidadInput);
    if (!productoResolved || !qty || qty <= 0) return null;
    return Number((Number(productoResolved.precio || 0) * qty).toFixed(2));
  }, [productoResolved, cantidadInput]);

  useEffect(() => {
    let alive = true;
    async function load() {
      setLoadingProductos(true);
      try {
        const data = await listProductos({ token });
        if (!alive) return;
        setProductos(Array.isArray(data) ? data : []);
      } catch (err) {
        if (err.status === 401) logout();
        if (!alive) return;
        setStatus({ type: 'error', msg: '❌ No se pudo cargar el catálogo.' });
      } finally {
        if (!alive) return;
        setLoadingProductos(false);
      }
    }
    load();
    return () => { alive = false; };
  }, [token, logout]);

  function isVencido(p) {
    if (!p?.expiry_date) return false;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const expiry = new Date(p.expiry_date); expiry.setHours(0, 0, 0, 0);
    return expiry <= today;
  }
  function sinStock(p) { return Number(p?.stock_actual || 0) <= 0; }
  function isDisponible(p) { return !isVencido(p) && !sinStock(p); }

  function stockDisponible(productoId) {
    const p = productoById.get(String(productoId));
    if (!p) return 0;
    const enCarrito = carrito
      .filter((i) => String(i.producto_id) === String(productoId))
      .reduce((s, i) => s + i.cantidad, 0);
    return Math.max(0, Number(p.stock_actual || 0) - enCarrito);
  }

  function agregarAlCarrito() {
    const p = productoResolved;
    if (!p) return setStatus({ type: 'error', msg: '❌ Selecciona un producto.' });
    if (isVencido(p)) return setStatus({ type: 'error', msg: `❌ "${p.nombre}" está vencido.` });
    if (sinStock(p)) return setStatus({ type: 'error', msg: `❌ "${p.nombre}" sin stock.` });

    const qty = Number(cantidadInput);
    if (!qty || qty <= 0) return setStatus({ type: 'error', msg: '❌ Ingresa una cantidad válida.' });

    const disponible = stockDisponible(p.id);
    if (qty > disponible) return setStatus({ type: 'error', msg: `❌ Stock insuficiente. Disponible: ${disponible} ${p.unidad || 'uds'}.` });

    const existente = carrito.findIndex((i) => String(i.producto_id) === String(p.id));
    if (existente >= 0) {
      const nuevaCantidad = carrito[existente].cantidad + qty;
      const nuevoDisponible = Number(p.stock_actual || 0) - (nuevaCantidad - qty);
      if (qty > nuevoDisponible) return setStatus({ type: 'error', msg: `❌ Stock insuficiente. Disponible adicional: ${nuevoDisponible} ${p.unidad || 'uds'}.` });
      setCarrito((prev) => prev.map((i, idx) => idx === existente
        ? { ...i, cantidad: nuevaCantidad, subtotal: Number((Number(p.precio) * nuevaCantidad).toFixed(2)) }
        : i
      ));
    } else {
      setCarrito((prev) => [...prev, {
        producto_id: p.id,
        nombre: p.nombre,
        sku: p.sku,
        unidad: p.unidad,
        precio: Number(p.precio),
        cantidad: qty,
        subtotal: Number((Number(p.precio) * qty).toFixed(2)),
      }]);
    }

    setStatus({ type: '', msg: '' });
    setProductoId('');
    setProductoQuery('');
    setProductoOpen(false);
    setCantidadInput('');
  }

  function quitarDelCarrito(idx) {
    setCarrito((prev) => prev.filter((_, i) => i !== idx));
  }

  function cambiarCantidad(idx, nuevaCantidad) {
    const item = carrito[idx];
    const p = productoById.get(String(item.producto_id));
    if (!p) return;
    const otrasEnCarrito = carrito
      .filter((_, i) => i !== idx)
      .filter((i) => String(i.producto_id) === String(item.producto_id))
      .reduce((s, i) => s + i.cantidad, 0);
    const maxDisponible = Number(p.stock_actual || 0) - otrasEnCarrito;
    const qty = Math.max(1, Math.min(nuevaCantidad, maxDisponible));
    setCarrito((prev) => prev.map((i, index) => index === idx
      ? { ...i, cantidad: qty, subtotal: Number((i.precio * qty).toFixed(2)) }
      : i
    ));
  }

  const manejarEnvio = async (e) => {
    e.preventDefault();
    if (carrito.length === 0) return setStatus({ type: 'error', msg: '❌ Agrega al menos un producto.' });
    setSubmitting(true);
    setStatus({ type: 'info', msg: 'Procesando venta...' });
    try {
      const items = carrito.map((i) => ({ producto_id: Number(i.producto_id), cantidad: i.cantidad }));
      await crearVenta({ token, items });
      setStatus({ type: 'success', msg: '✅ ¡Venta registrada exitosamente!' });
      setCarrito([]);
      setTimeout(() => setStatus({ type: '', msg: '' }), 3000);
    } catch (error) {
      setStatus({ type: 'error', msg: '❌ ' + error.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <header style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <ShoppingCart size={24} color="#0b2a52" />
          <h2 style={{ margin: 0, color: '#0b2a52', fontSize: 28, fontWeight: 900 }}>Registro de Ventas</h2>
        </div>
        <p style={{ margin: '5px 0 0', color: 'rgba(11,42,82,0.7)', fontSize: 15 }}>
          Agrega los productos del cliente y finaliza la venta.
        </p>
      </header>

      {status.msg && (
        <div style={{
          padding: '12px 16px', borderRadius: 12, marginBottom: 20,
          fontSize: 14, fontWeight: 700,
          backgroundColor: status.type === 'success' ? 'rgba(52,211,153,0.15)' : status.type === 'error' ? 'rgba(239,68,68,0.15)' : 'rgba(99,102,241,0.10)',
          color: status.type === 'success' ? '#065f46' : status.type === 'error' ? '#b91c1c' : '#3730a3',
          border: `1px solid ${status.type === 'success' ? 'rgba(52,211,153,0.25)' : status.type === 'error' ? 'rgba(239,68,68,0.25)' : 'rgba(99,102,241,0.20)'}`,
        }}>
          {status.msg}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>

        {/* Panel agregar producto */}
        <div style={{ background: 'rgba(255,255,255,0.3)', padding: 24, borderRadius: 20, border: '1px solid rgba(255,255,255,0.4)' }}>
          <div style={{ fontSize: 12, fontWeight: 900, color: 'rgba(11,42,82,0.55)', letterSpacing: 0.5, marginBottom: 16 }}>
            AGREGAR PRODUCTO
          </div>

          <div style={s.inputGroup}>
            <label style={s.label}>PRODUCTO (SKU O NOMBRE)</label>
            <div style={s.autoWrap}>
              <input
                type="text"
                placeholder="Buscar por SKU o nombre..."
                style={s.input}
                value={productoQuery}
                onChange={(e) => { setProductoQuery(e.target.value); setProductoId(''); setProductoOpen(true); }}
                onFocus={() => setProductoOpen(true)}
                onBlur={() => setTimeout(() => setProductoOpen(false), 120)}
                disabled={loadingProductos}
              />
              {productoOpen && productoMatches.length > 0 && (
                <div style={s.autoDropdown}>
                  {productoMatches.map((p) => (
                    <button key={p.id} type="button"
                      style={{ ...s.autoItem, ...(String(p.id) === String(productoId) ? s.autoItemActive : {}), ...(!isDisponible(p) ? (isVencido(p) ? s.autoItemVencido : s.autoItemSinStock) : {}) }}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        if (!isDisponible(p)) return;
                        setProductoId(String(p.id));
                        setProductoQuery(p.sku ? `${p.nombre} (${p.sku})` : p.nombre);
                        setProductoOpen(false);
                      }}
                      disabled={!isDisponible(p)}
                    >
                      <div style={{ ...s.autoTitle, display: 'flex', alignItems: 'center', gap: 6 }}>
                        {p.nombre}
                        {isVencido(p) && <span style={s.vencidoBadge}>VENCIDO</span>}
                        {!isVencido(p) && sinStock(p) && <span style={s.sinStockBadge}>SIN STOCK</span>}
                      </div>
                      <div style={s.autoMeta}>
                        {p.sku ? `SKU: ${p.sku}` : 'Sin SKU'}{p.unidad ? ` · ${p.unidad}` : ''}{` · Stock: ${stockDisponible(p.id)}`}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div style={{ ...s.inputGroup, marginTop: 16 }}>
            <label style={s.label}>CANTIDAD</label>
            <input
              type="number" placeholder="1" min="1"
              style={s.input}
              value={cantidadInput}
              onChange={(e) => setCantidadInput(e.target.value)}
            />
          </div>

          {productoResolved && cantidadInput > 0 && (
            <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 12, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.18)' }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: 'rgba(11,42,82,0.55)' }}>SUBTOTAL</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#6366f1' }}>{previewSubtotal != null ? formatMoney(previewSubtotal) : '-'}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(11,42,82,0.50)', marginTop: 2 }}>
                {productoResolved.nombre} · {formatMoney(productoResolved.precio)} c/u
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={agregarAlCarrito}
            disabled={!productoResolved || !cantidadInput}
            style={{ ...s.btnAgregar, opacity: (!productoResolved || !cantidadInput) ? 0.5 : 1 }}
          >
            <Plus size={16} /> Agregar al carrito
          </button>
        </div>

        {/* Panel carrito */}
        <div style={{ background: 'rgba(255,255,255,0.3)', padding: 24, borderRadius: 20, border: '1px solid rgba(255,255,255,0.4)' }}>
          <div style={{ fontSize: 12, fontWeight: 900, color: 'rgba(11,42,82,0.55)', letterSpacing: 0.5, marginBottom: 16 }}>
            CARRITO · {carrito.length} PRODUCTO{carrito.length !== 1 ? 'S' : ''}
          </div>

          {carrito.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'rgba(11,42,82,0.35)', fontSize: 13, fontWeight: 700 }}>
              <ShoppingCart size={32} style={{ opacity: 0.3, marginBottom: 8 }} />
              <div>Aún no hay productos</div>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                {carrito.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 12, background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(11,42,82,0.08)' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 900, color: '#0b2a52', fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.nombre}</div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(11,42,82,0.50)' }}>{formatMoney(item.precio)} c/u</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <button type="button" onClick={() => cambiarCantidad(idx, item.cantidad - 1)}
                        style={s.qtyBtn}>−</button>
                      <span style={{ minWidth: 24, textAlign: 'center', fontWeight: 900, fontSize: 14, color: '#0b2a52' }}>{item.cantidad}</span>
                      <button type="button" onClick={() => cambiarCantidad(idx, item.cantidad + 1)}
                        style={s.qtyBtn}>+</button>
                    </div>
                    <div style={{ fontWeight: 900, fontSize: 14, color: '#6366f1', minWidth: 60, textAlign: 'right' }}>
                      {formatMoney(item.subtotal)}
                    </div>
                    <button type="button" onClick={() => quitarDelCarrito(idx)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 4 }}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>

              <div style={{ borderTop: '1.5px solid rgba(11,42,82,0.10)', paddingTop: 14, marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: 'rgba(11,42,82,0.60)' }}>TOTAL A COBRAR</span>
                  <span style={{ fontSize: 26, fontWeight: 900, color: '#0b2a52' }}>{formatMoney(totalCarrito)}</span>
                </div>
              </div>

              <form onSubmit={manejarEnvio}>
                <button type="submit" disabled={submitting} style={{ ...s.btnFinalizar, opacity: submitting ? 0.7 : 1 }}>
                  {submitting ? 'Procesando...' : 'Finalizar y Cobrar'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      <footer style={{ marginTop: 24, fontSize: 12, color: 'rgba(11,42,82,0.5)' }}>
        * Verifica el stock antes de confirmar la transacción.
      </footer>
    </div>
  );
};

const s = {
  inputGroup: { display: 'flex', flexDirection: 'column', gap: 8 },
  label: { fontSize: 11, fontWeight: 800, color: 'rgba(11,42,82,0.6)', letterSpacing: 0.5 },
  input: {
    padding: '14px 16px', borderRadius: 14,
    border: '1px solid rgba(11,42,82,0.1)',
    background: 'rgba(255,255,255,0.6)',
    fontSize: 15, color: '#0b2a52', outline: 'none',
    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)',
    width: '100%', boxSizing: 'border-box',
  },
  autoWrap: { position: 'relative' },
  autoDropdown: {
    position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0, zIndex: 20,
    borderRadius: 14, overflow: 'hidden',
    border: '1px solid rgba(11,42,82,0.14)',
    background: 'rgba(255,255,255,0.97)',
    boxShadow: '0 18px 40px rgba(0,0,0,0.18)',
    maxHeight: 260, overflowY: 'auto',
  },
  autoItem: {
    width: '100%', textAlign: 'left', border: 'none',
    background: 'transparent', padding: '10px 12px',
    cursor: 'pointer', borderBottom: '1px solid rgba(11,42,82,0.08)',
  },
  autoItemActive: { background: 'rgba(11,42,82,0.08)' },
  autoItemVencido: { opacity: 0.55, cursor: 'not-allowed', background: 'rgba(239,68,68,0.06)' },
  autoItemSinStock: { opacity: 0.55, cursor: 'not-allowed', background: 'rgba(245,158,11,0.06)' },
  autoTitle: { fontWeight: 900, color: '#0b2a52', fontSize: 13 },
  autoMeta: { marginTop: 4, fontWeight: 800, color: 'rgba(11,42,82,0.65)', fontSize: 12 },
  vencidoBadge: {
    display: 'inline-flex', alignItems: 'center', padding: '2px 7px',
    borderRadius: 999, fontSize: 10, fontWeight: 900, letterSpacing: 0.5,
    background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.35)', color: '#dc2626',
  },
  sinStockBadge: {
    display: 'inline-flex', alignItems: 'center', padding: '2px 7px',
    borderRadius: 999, fontSize: 10, fontWeight: 900, letterSpacing: 0.5,
    background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.35)', color: '#b45309',
  },
  qtyBtn: {
    width: 26, height: 26, borderRadius: 8,
    border: '1.5px solid rgba(11,42,82,0.15)',
    background: 'rgba(255,255,255,0.7)',
    color: '#0b2a52', fontWeight: 900, fontSize: 16,
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  btnAgregar: {
    marginTop: 18, width: '100%', padding: '13px 16px',
    borderRadius: 14, border: 'none',
    background: 'rgba(99,102,241,0.90)', color: '#fff',
    fontSize: 14, fontWeight: 900, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    boxShadow: '0 6px 16px rgba(99,102,241,0.30)',
  },
  btnFinalizar: {
    width: '100%', padding: '15px 16px',
    borderRadius: 14, border: 'none',
    background: '#0b2a52', color: '#fff',
    fontSize: 15, fontWeight: 900, cursor: 'pointer',
    boxShadow: '0 8px 20px rgba(11,42,82,0.25)',
  },
};

export default VentasPage;