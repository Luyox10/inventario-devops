import React, { useEffect, useMemo, useState } from 'react';

import { listProductos } from '../../api/productos';
import { updateStockMovimiento } from '../../api/stock';
import { useAuth } from '../../state/auth/AuthContext.jsx';

const ReposicionPage = () => {
  const { token, logout } = useAuth();
  const [form, setForm] = useState({ cantidad: '' });
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

  const handleReposicion = async (e) => {
    e.preventDefault();
    setStatus({ type: 'info', msg: 'Procesando...' });
    
    try {
      if (loadingProductos) throw new Error('Cargando catálogo de productos...');

      let producto = productoSelected;
      if (!producto) {
        const q = productoQuery.trim().toLowerCase();
        if (!q) throw new Error('Selecciona un producto');

        const exactSku = productos.find((p) => String(p.sku || '').trim().toLowerCase() === q);
        if (exactSku) producto = exactSku;
      }

      if (!producto) throw new Error('Producto no encontrado');

      const productoId = Number(producto.id);
      const cantidad = Number(form.cantidad);
      if (!productoId || Number.isNaN(productoId) || productoId <= 0) throw new Error('Producto inválido');
      if (!cantidad || Number.isNaN(cantidad) || cantidad <= 0) throw new Error('Cantidad inválida');

      await updateStockMovimiento({ token, productoId, tipo: 'ENTRADA', cantidad, motivo: 'Reposición' });
      setStatus({ type: 'success', msg: '✅ Stock actualizado correctamente en el sistema.' });

      setProductoId('');
      setProductoQuery('');
      setProductoOpen(false);
      setForm({ cantidad: '' });
    } catch (error) {
      setStatus({ type: 'error', msg: '❌ Error: ' + error.message });
    }
  };

  return (
    <div>
      {/* Encabezado estilo Admin */}
      <header style={{ marginBottom: '30px' }}>
        <h2 style={{ margin: 0, color: '#0b2a52', fontSize: '28px', fontWeight: 900 }}>
          Reposición de Inventario
        </h2>
        <p style={{ margin: '5px 0 0', color: 'rgba(11, 42, 82, 0.7)', fontSize: '15px' }}>
          Registra el ingreso físico de productos al almacén.
        </p>
      </header>

      {/* Mensajes de estado */}
      {status.msg && (
        <div style={{
          padding: '12px 16px',
          borderRadius: '12px',
          marginBottom: '20px',
          fontSize: '14px',
          fontWeight: 600,
          backgroundColor: status.type === 'success' ? 'rgba(52, 211, 153, 0.15)' : 'rgba(239, 68, 68, 0.15)',
          color: status.type === 'success' ? '#065f46' : '#b91c1c',
          border: `1px solid ${status.type === 'success' ? 'rgba(52, 211, 153, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`
        }}>
          {status.msg}
        </div>
      )}

      {/* Formulario Estilizado */}
      <form onSubmit={handleReposicion} style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '400px' }}>
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
                      style={{ ...styles.autoItem, ...(selected ? styles.autoItemActive : null) }}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setProductoId(String(p.id));
                        setProductoQuery(p.sku ? `${p.nombre} (${p.sku})` : p.nombre);
                        setProductoOpen(false);
                      }}
                    >
                      <div style={styles.autoTitle}>{p.nombre}</div>
                      <div style={styles.autoMeta}>
                        {p.sku ? `SKU: ${p.sku}` : 'Sin SKU'}
                        {p.unidad ? ` · ${p.unidad}` : ''}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>

        <div style={styles.inputGroup}>
          <label style={styles.label}>CANTIDAD RECIBIDA</label>
          <input 
            type="number" 
            placeholder="0" 
            style={styles.input}
            value={form.cantidad} 
            onChange={e => setForm({...form, cantidad: e.target.value})} 
            required
          />
        </div>

        <button type="submit" style={styles.button}>
          Actualizar Inventario
        </button>
      </form>
    </div>
  );
};

// Estilos que siguen el diseño "Admin Glass"
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
    padding: '12px 16px',
    borderRadius: '12px',
    border: '1px solid rgba(11, 42, 82, 0.15)',
    background: 'rgba(255, 255, 255, 0.5)',
    fontSize: '15px',
    color: '#0b2a52',
    outline: 'none',
    transition: 'border-color 0.2s',
    // Efecto sutil al enfocar
    onFocus: (e) => e.target.style.borderColor = '#0b2a52'
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
  autoTitle: { fontWeight: 900, color: '#0b2a52', fontSize: 13 },
  autoMeta: { marginTop: 4, fontWeight: 800, color: 'rgba(11, 42, 82, 0.65)', fontSize: 12 },
  button: {
    marginTop: '10px',
    padding: '14px',
    borderRadius: '14px',
    border: 'none',
    background: '#0b2a52', // Azul marino profundo del Admin
    color: 'white',
    fontSize: '15px',
    fontWeight: 800,
    cursor: 'pointer',
    transition: 'transform 0.1s, opacity 0.2s',
    boxShadow: '0 4px 12px rgba(11, 42, 82, 0.2)'
  }
};

export default ReposicionPage;