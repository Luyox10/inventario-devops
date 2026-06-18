import React, { useEffect, useMemo, useState } from 'react';

import { listProductos } from '../../api/productos';
import { crearVenta } from '../../api/ventas';
import { useAuth } from '../../state/auth/AuthContext.jsx';

function formatMoney(n) {
  const v = Number(n || 0);
  return `S/ ${v.toFixed(2)}`;
}

const VentasPage = () => {
  const { token, logout } = useAuth();
  const [venta, setVenta] = useState({ cantidad: '' });
  const [status, setStatus] = useState({ type: '', msg: '' });
  const [productos, setProductos] = useState([]);
  const [loadingProductos, setLoadingProductos] = useState(true);

  const [productoId, setProductoId] = useState('');
  const [productoQuery, setProductoQuery] = useState('');
  const [productoOpen, setProductoOpen] = useState(false);

  const productoById = useMemo(() => {
    const map = new Map();
    for (const p of productos) {
      map.set(String(p.id), p);
    }
    return map;
  }, [productos]);

  const productoMatches = useMemo(() => {
    const s = productoQuery.trim().toLowerCase();
    if (!s) return [];
    const matches = productos.filter((p) => {
      const nombre = String(p.nombre || '').toLowerCase();
      const sku = String(p.sku || '').toLowerCase();
      return nombre.includes(s) || sku.includes(s);
    });
    return matches.slice(0, 10);
  }, [productoQuery, productos]);

  const productoSelected = useMemo(() => {
    if (!productoId) return null;
    return productoById.get(String(productoId)) || null;
  }, [productoById, productoId]);

  const productoResolved = useMemo(() => {
    if (productoSelected) return productoSelected;
    const q = productoQuery.trim().toLowerCase();
    if (!q) return null;
    const exactSku = productos.find((p) => String(p.sku || '').trim().toLowerCase() === q);
    if (exactSku) return exactSku;
    return null;
  }, [productoQuery, productoSelected, productos]);

  const totalPreview = useMemo(() => {
    const qty = Number(venta.cantidad);
    if (!productoResolved) return null;
    if (!qty || Number.isNaN(qty) || qty <= 0) return null;
    const precio = Number(productoResolved.precio || 0);
    return Number((precio * qty).toFixed(2));
  }, [productoResolved, venta.cantidad]);

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
        setStatus({ type: 'error', msg: '❌ Error: ' + (err.message || 'No se pudo cargar el catálogo') });
      } finally {
        if (!alive) return;
        setLoadingProductos(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, [token, logout]);

  function isVencido(p) {
    if (!p?.expiry_date) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(p.expiry_date);
    expiry.setHours(0, 0, 0, 0);
    return expiry <= today;
  }

  function sinStock(p) {
    return Number(p?.stock_actual || 0) <= 0;
  }

  function isDisponible(p) {
    return !isVencido(p) && !sinStock(p);
  }

  const manejarEnvio = async (e) => {
    e.preventDefault();
    setStatus({ type: 'info', msg: 'Procesando venta...' });
    
    try {
      if (loadingProductos) throw new Error('Cargando catálogo de productos...');

      let producto = productoResolved;

      if (!producto) throw new Error('Producto no encontrado');
      if (isVencido(producto)) throw new Error(`El producto "${producto.nombre}" está vencido y no puede venderse.`);
      if (sinStock(producto)) throw new Error(`El producto "${producto.nombre}" no tiene stock disponible.`);
      const cantidadSolicitada = Number(venta.cantidad);
      if (cantidadSolicitada > Number(producto.stock_actual || 0)) throw new Error(`Stock insuficiente. Disponible: ${producto.stock_actual} ${producto.unidad || 'uds'}.`);

      const producto_id = Number(producto.id);
      const cantidad = Number(venta.cantidad);
      if (!producto_id || Number.isNaN(producto_id) || producto_id <= 0) throw new Error('Producto inválido');
      if (!cantidad || Number.isNaN(cantidad) || cantidad <= 0) throw new Error('Cantidad inválida');

      await crearVenta({ token, items: [{ producto_id, cantidad }] });
      setStatus({ type: 'success', msg: '✅ ¡Venta registrada exitosamente!' });

      setProductoId('');
      setProductoQuery('');
      setProductoOpen(false);
      setVenta({ cantidad: '' });
      
      // Limpiar mensaje después de 3 segundos
      setTimeout(() => setStatus({ type: '', msg: '' }), 3000);
    } catch (error) {
      setStatus({ type: 'error', msg: '❌ Error: ' + error.message });
    }
  };

  return (
    <div>
      {/* Encabezado con estética Admin */}
      <header style={{ marginBottom: '30px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '24px' }}>🛒</span>
          <h2 style={{ margin: 0, color: '#0b2a52', fontSize: '28px', fontWeight: 900 }}>
            Registro de Ventas
          </h2>
        </div>
        <p style={{ margin: '5px 0 0', color: 'rgba(11, 42, 82, 0.7)', fontSize: '15px' }}>
          Ingresa los datos del producto para descontar del stock.
        </p>
      </header>

      {/* Mensajes de estado tipo Toast */}
      {status.msg && (
        <div style={{
          padding: '12px 16px',
          borderRadius: '12px',
          marginBottom: '20px',
          fontSize: '14px',
          fontWeight: 700,
          backgroundColor: status.type === 'success' ? 'rgba(52, 211, 153, 0.15)' : 'rgba(239, 68, 68, 0.15)',
          color: status.type === 'success' ? '#065f46' : '#b91c1c',
          border: `1px solid ${status.type === 'success' ? 'rgba(52, 211, 153, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
          transition: 'all 0.3s ease'
        }}>
          {status.msg}
        </div>
      )}

      {/* Formulario Estilizado */}
      <div style={{ 
        background: 'rgba(255, 255, 255, 0.3)', 
        padding: '25px', 
        borderRadius: '20px', 
        border: '1px solid rgba(255, 255, 255, 0.4)',
        maxWidth: '450px'
      }}>
        <form onSubmit={manejarEnvio} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div style={styles.inputGroup}>
            <label style={styles.label}>PRODUCTO (SKU O NOMBRE)</label>
            <div style={styles.autoWrap}>
              <input
                type="text"
                placeholder="Buscar por SKU o nombre..."
                style={styles.input}
                value={productoQuery}
                onChange={(e) => {
                  setProductoQuery(e.target.value);
                  setProductoId('');
                  setProductoOpen(true);
                }}
                onFocus={() => setProductoOpen(true)}
                onBlur={() => setTimeout(() => setProductoOpen(false), 120)}
                disabled={loadingProductos}
                required
              />

              {productoOpen && productoMatches.length > 0 ? (
                <div style={styles.autoDropdown}>
                  {productoMatches.map((p) => {
                    const selected = String(p.id) === String(productoId);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        style={{ ...styles.autoItem, ...(selected ? styles.autoItemActive : null), ...(!isDisponible(p) ? (isVencido(p) ? styles.autoItemVencido : styles.autoItemSinStock) : {}) }}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          if (!isDisponible(p)) return;
                          setProductoId(String(p.id));
                          setProductoQuery(p.sku ? `${p.nombre} (${p.sku})` : p.nombre);
                          setProductoOpen(false);
                        }}
                        disabled={!isDisponible(p)}
                      >
                        <div style={{ ...styles.autoTitle, display: 'flex', alignItems: 'center', gap: 6 }}>
                          {p.nombre}
                          {isVencido(p) && <span style={styles.vencidoBadge}>VENCIDO</span>}
                          {!isVencido(p) && sinStock(p) && <span style={styles.sinStockBadge}>SIN STOCK</span>}
                        </div>
                        <div style={styles.autoMeta}>
                          {p.sku ? `SKU: ${p.sku}` : 'Sin SKU'}
                          {p.unidad ? ` · ${p.unidad}` : ''}
                          {` · Stock: ${p.stock_actual ?? 0}`}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>CANTIDAD A VENDER</label>
            <input 
              type="number" 
              placeholder="1" 
              min="1"
              style={styles.input}
              value={venta.cantidad}
              onChange={(e) => setVenta({...venta, cantidad: e.target.value})}
              required
            />
          </div>

          <div style={styles.totalBox}>
            <div style={styles.totalLabel}>TOTAL A COBRAR</div>
            <div style={styles.totalValue}>{totalPreview == null ? '-' : formatMoney(totalPreview)}</div>
            {productoResolved ? (
              <div style={styles.totalMeta}>
                {productoResolved.nombre}
                {productoResolved.sku ? ` (${productoResolved.sku})` : ''}
                {` · ${formatMoney(productoResolved.precio)}`}
              </div>
            ) : (
              <div style={styles.totalMeta}>Selecciona un producto para ver el total.</div>
            )}
          </div>

          <button type="submit" style={styles.button}>
            Finalizar y Cobrar
          </button>
        </form>
      </div>

      <footer style={{ marginTop: '30px', fontSize: '12px', color: 'rgba(11, 42, 82, 0.5)' }}>
        * Asegúrate de verificar el stock antes de confirmar la transacción.
      </footer>
    </div>
  );
};

const styles = {
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  label: {
    fontSize: '11px',
    fontWeight: 800,
    color: 'rgba(11, 42, 82, 0.6)',
    letterSpacing: '0.5px'
  },
  input: {
    padding: '14px 16px',
    borderRadius: '14px',
    border: '1px solid rgba(11, 42, 82, 0.1)',
    background: 'rgba(255, 255, 255, 0.6)',
    fontSize: '16px',
    color: '#0b2a52',
    outline: 'none',
    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
  },
  autoWrap: { position: 'relative' },
  autoDropdown: {
    position: 'absolute',
    top: 'calc(100% + 8px)',
    left: 0,
    right: 0,
    zIndex: 10,
    borderRadius: 14,
    overflow: 'hidden',
    border: '1px solid rgba(11, 42, 82, 0.14)',
    background: 'rgba(255, 255, 255, 0.92)',
    boxShadow: '0 18px 40px rgba(0,0,0,0.18)',
    maxHeight: 260,
    overflowY: 'auto',
  },
  autoItem: {
    width: '100%',
    textAlign: 'left',
    border: 'none',
    background: 'transparent',
    padding: '10px 12px',
    cursor: 'pointer',
    borderBottom: '1px solid rgba(11, 42, 82, 0.08)',
  },
  autoItemActive: { background: 'rgba(11, 42, 82, 0.08)' },
  autoItemVencido: { opacity: 0.55, cursor: 'not-allowed', background: 'rgba(239, 68, 68, 0.06)' },
  autoItemSinStock: { opacity: 0.55, cursor: 'not-allowed', background: 'rgba(245, 158, 11, 0.06)' },
  autoTitle: { fontWeight: 900, color: '#0b2a52', fontSize: 13 },
  autoMeta: { marginTop: 4, fontWeight: 800, color: 'rgba(11, 42, 82, 0.65)', fontSize: 12 },
  vencidoBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '2px 7px',
    borderRadius: 999,
    fontSize: 10,
    fontWeight: 900,
    letterSpacing: 0.5,
    background: 'rgba(239, 68, 68, 0.15)',
    border: '1px solid rgba(239, 68, 68, 0.35)',
    color: '#dc2626',
  },
  sinStockBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '2px 7px',
    borderRadius: 999,
    fontSize: 10,
    fontWeight: 900,
    letterSpacing: 0.5,
    background: 'rgba(245, 158, 11, 0.15)',
    border: '1px solid rgba(245, 158, 11, 0.35)',
    color: '#b45309',
  },
  totalBox: {
    padding: '14px 16px',
    borderRadius: '16px',
    border: '1px solid rgba(11, 42, 82, 0.10)',
    background: 'rgba(255, 255, 255, 0.35)',
  },
  totalLabel: {
    fontSize: 11,
    fontWeight: 900,
    color: 'rgba(11, 42, 82, 0.6)',
    letterSpacing: '0.5px',
  },
  totalValue: {
    marginTop: 6,
    fontSize: 22,
    fontWeight: 1000,
    color: '#0b2a52',
  },
  totalMeta: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: 800,
    color: 'rgba(11, 42, 82, 0.70)',
  },
  button: {
    marginTop: '10px',
    padding: '16px',
    borderRadius: '16px',
    border: 'none',
    background: '#0b2a52', 
    color: 'white',
    fontSize: '16px',
    fontWeight: 900,
    cursor: 'pointer',
    boxShadow: '0 8px 20px rgba(11, 42, 82, 0.25)',
    transition: 'transform 0.2s'
  }
};

export default VentasPage;