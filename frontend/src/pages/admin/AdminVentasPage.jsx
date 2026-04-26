import React, { useEffect, useMemo, useState } from 'react';

import { listProductos } from '../../api/productos';
import { crearVenta, listVentas } from '../../api/ventas';
import { useAuth } from '../../state/auth/AuthContext.jsx';

function formatMoney(n) {
  const v = Number(n || 0);
  return `S/ ${v.toFixed(2)}`;
}

export default function AdminVentasPage() {
  const { token, logout } = useAuth();

  const [productos, setProductos] = useState([]);
  const [loadingProductos, setLoadingProductos] = useState(true);

  const [historial, setHistorial] = useState([]);
  const [loadingHistorial, setLoadingHistorial] = useState(true);

  const [error, setError] = useState('');

  const [productoId, setProductoId] = useState('');
  const [cantidad, setCantidad] = useState('1');
  const [cart, setCart] = useState([]);
  const [saving, setSaving] = useState(false);

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const total = useMemo(() => {
    const sum = cart.reduce((acc, it) => acc + Number(it.subtotal || 0), 0);
    return Number(sum.toFixed(2));
  }, [cart]);

  const productoById = useMemo(() => {
    const map = new Map();
    for (const p of productos) map.set(String(p.id), p);
    return map;
  }, [productos]);

  async function refreshProductos() {
    setError('');
    setLoadingProductos(true);
    try {
      const data = await listProductos({ token });
      setProductos(Array.isArray(data) ? data : []);
    } catch (err) {
      if (err.status === 401) logout();
      setError(err.message || 'Error');
    } finally {
      setLoadingProductos(false);
    }
  }

  async function refreshHistorial() {
    setError('');
    setLoadingHistorial(true);
    try {
      const data = await listVentas({ token, from: from || undefined, to: to || undefined });
      setHistorial(Array.isArray(data) ? data : []);
    } catch (err) {
      if (err.status === 401) logout();
      setError(err.message || 'Error');
    } finally {
      setLoadingHistorial(false);
    }
  }

  useEffect(() => {
    refreshProductos();
    refreshHistorial();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function addItem() {
    setError('');
    const p = productoById.get(String(productoId));
    if (!p) {
      setError('Selecciona un producto');
      return;
    }

    const qty = Number(cantidad);
    if (Number.isNaN(qty) || qty <= 0) {
      setError('Cantidad inválida');
      return;
    }

    const precio = Number(p.precio || 0);
    const subtotal = Number((precio * qty).toFixed(2));

    setCart((prev) => {
      const idx = prev.findIndex((x) => x.producto_id === p.id);
      if (idx >= 0) {
        const next = [...prev];
        const existing = next[idx];
        const nextQty = Number(existing.cantidad) + qty;
        next[idx] = {
          ...existing,
          cantidad: nextQty,
          subtotal: Number((Number(existing.precio_unitario) * nextQty).toFixed(2)),
        };
        return next;
      }

      return [...prev, { producto_id: p.id, nombre: p.nombre, unidad: p.unidad, cantidad: qty, precio_unitario: precio, subtotal }];
    });
  }

  function removeItem(producto_id) {
    setCart((prev) => prev.filter((x) => x.producto_id !== producto_id));
  }

  async function submitVenta() {
    setError('');
    if (cart.length === 0) {
      setError('Agrega al menos un producto');
      return;
    }

    setSaving(true);
    try {
      const items = cart.map((it) => ({ producto_id: it.producto_id, cantidad: it.cantidad }));
      await crearVenta({ token, items });
      setCart([]);
      await refreshProductos();
      await refreshHistorial();
    } catch (err) {
      if (err.status === 401) logout();
      setError(err.message || 'Error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <h2 style={styles.h2}>Ventas</h2>
          <p style={styles.p}>Registra ventas y consulta el historial.</p>
        </div>
      </header>

      <section style={styles.grid}>
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <h3 style={styles.h3}>Registrar venta</h3>
          </div>

          {error ? <div style={styles.error}>{error}</div> : null}

          <div style={styles.row}>
            <label style={styles.label}>
              Producto
              <select value={productoId} onChange={(e) => setProductoId(e.target.value)} style={styles.select} disabled={loadingProductos}>
                <option value="">Selecciona...</option>
                {productos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} ({p.unidad || 'und'}) - Stock: {p.stock_actual}
                  </option>
                ))}
              </select>
            </label>

            <label style={styles.label}>
              Cantidad
              <input value={cantidad} onChange={(e) => setCantidad(e.target.value)} type="number" min="1" step="1" style={styles.input} />
            </label>

            <button type="button" onClick={addItem} style={styles.primaryBtn} disabled={loadingProductos}>
              Agregar
            </button>
          </div>

          {cart.length === 0 ? (
            <div style={styles.muted}>No hay items en la venta.</div>
          ) : (
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Producto</th>
                    <th style={styles.th}>Cantidad</th>
                    <th style={styles.th}>Precio</th>
                    <th style={styles.th}>Subtotal</th>
                    <th style={styles.thRight}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {cart.map((it) => (
                    <tr key={it.producto_id}>
                      <td style={styles.td}>{it.nombre}</td>
                      <td style={styles.td}>{it.cantidad}</td>
                      <td style={styles.td}>{formatMoney(it.precio_unitario)}</td>
                      <td style={styles.td}>{formatMoney(it.subtotal)}</td>
                      <td style={styles.tdRight}>
                        <button style={styles.smallDangerBtn} onClick={() => removeItem(it.producto_id)}>
                          Quitar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div style={styles.totalRow}>
            <div style={styles.totalText}>Total: {formatMoney(total)}</div>
            <button disabled={saving} onClick={submitVenta} style={styles.primaryBtn} type="button">
              {saving ? 'Guardando...' : 'Registrar venta'}
            </button>
          </div>
        </div>

        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <h3 style={styles.h3}>Historial</h3>
            <button onClick={refreshHistorial} style={styles.secondaryBtn} disabled={loadingHistorial}>
              {loadingHistorial ? 'Cargando...' : 'Actualizar'}
            </button>
          </div>

          <div style={styles.filters}>
            <label style={styles.label}>
              Desde
              <input value={from} onChange={(e) => setFrom(e.target.value)} type="date" style={styles.input} />
            </label>
            <label style={styles.label}>
              Hasta
              <input value={to} onChange={(e) => setTo(e.target.value)} type="date" style={styles.input} />
            </label>
            <button type="button" style={styles.secondaryBtn} onClick={refreshHistorial}>
              Filtrar
            </button>
          </div>

          {loadingHistorial ? (
            <div style={styles.muted}>Cargando...</div>
          ) : historial.length === 0 ? (
            <div style={styles.muted}>No hay ventas.</div>
          ) : (
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>ID</th>
                    <th style={styles.th}>Usuario</th>
                    <th style={styles.th}>Total</th>
                    <th style={styles.th}>Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {historial.map((v) => (
                    <tr key={v.id}>
                      <td style={styles.td}>{v.id}</td>
                      <td style={styles.td}>{v.usuario_id}</td>
                      <td style={styles.td}>{formatMoney(v.total)}</td>
                      <td style={styles.td}>{new Date(v.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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
    maxWidth: 1180,
    margin: '0 auto 16px',
    display: 'flex',
    justifyContent: 'space-between',
    gap: 16,
    alignItems: 'flex-start',
  },
  h2: { margin: 0, color: '#0b2a52', fontSize: 26, fontWeight: 900 },
  p: { margin: '8px 0 0', color: 'rgba(11, 42, 82, 0.75)' },
  grid: {
    maxWidth: 1180,
    margin: '0 auto',
    display: 'grid',
    gridTemplateColumns: '1.15fr 0.85fr',
    gap: 16,
    alignItems: 'start',
  },
  card: {
    background: 'rgba(235, 240, 255, 0.78)',
    border: '1px solid rgba(255,255,255,0.55)',
    borderRadius: 18,
    padding: 18,
    boxShadow: '0 28px 60px rgba(0, 0, 0, 0.25)',
    backdropFilter: 'blur(14px)',
  },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  h3: { margin: 0, color: '#0b2a52', fontSize: 18, fontWeight: 900 },
  muted: { color: 'rgba(11, 42, 82, 0.75)', marginTop: 12 },
  row: { display: 'grid', gridTemplateColumns: '1.8fr 0.6fr 0.6fr', gap: 12, marginTop: 12, alignItems: 'end' },
  filters: { display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 12, marginTop: 12, alignItems: 'end' },
  label: { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: 'rgba(11, 42, 82, 0.85)' },
  input: {
    padding: '10px 12px',
    borderRadius: 12,
    border: '1px solid rgba(11, 42, 82, 0.18)',
    outline: 'none',
    background: 'rgba(255,255,255,0.55)',
    color: '#0b2a52',
  },
  select: {
    padding: '10px 12px',
    borderRadius: 12,
    border: '1px solid rgba(11, 42, 82, 0.18)',
    outline: 'none',
    background: 'rgba(255,255,255,0.55)',
    color: '#0b2a52',
  },
  error: {
    marginTop: 12,
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
  thRight: {
    textAlign: 'right',
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
  tdRight: {
    fontSize: 13,
    color: '#0b2a52',
    padding: '10px 10px',
    borderBottom: '1px solid rgba(11, 42, 82, 0.1)',
    whiteSpace: 'nowrap',
    textAlign: 'right',
  },
  totalRow: { marginTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  totalText: { fontWeight: 900, color: '#0b2a52' },
  primaryBtn: {
    padding: '12px 12px',
    borderRadius: 14,
    border: 'none',
    background: 'linear-gradient(180deg, rgba(11, 42, 82, 0.94) 0%, rgba(11, 42, 82, 0.84) 100%)',
    color: 'rgba(255,255,255,0.96)',
    fontWeight: 900,
    letterSpacing: 0.4,
    cursor: 'pointer',
  },
  secondaryBtn: {
    padding: '8px 10px',
    borderRadius: 12,
    border: '1px solid rgba(11, 42, 82, 0.2)',
    background: 'rgba(255,255,255,0.25)',
    color: '#0b2a52',
    fontWeight: 800,
    cursor: 'pointer',
  },
  smallDangerBtn: {
    padding: '8px 10px',
    borderRadius: 12,
    border: '1px solid rgba(239, 68, 68, 0.35)',
    background: 'rgba(239, 68, 68, 0.10)',
    color: '#7f1d1d',
    fontWeight: 900,
    cursor: 'pointer',
  },
};
