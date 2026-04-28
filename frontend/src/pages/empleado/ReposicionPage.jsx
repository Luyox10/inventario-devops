import React, { useEffect, useMemo, useState } from 'react';

import { listProductos } from '../../api/productos';
import { updateStockMovimiento } from '../../api/stock';
import { useAuth } from '../../state/auth/AuthContext.jsx';

const ReposicionPage = () => {
  const { token, logout } = useAuth();
  const [form, setForm] = useState({ sku: '', cantidad: '' });
  const [status, setStatus] = useState({ type: '', msg: '' });
  const [productos, setProductos] = useState([]);
  const [loadingProductos, setLoadingProductos] = useState(true);

  const productoBySku = useMemo(() => {
    const map = new Map();
    for (const p of productos) {
      const key = String(p.sku || '').trim().toUpperCase();
      if (key) map.set(key, p);
    }
    return map;
  }, [productos]);

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

      const sku = String(form.sku || '').trim().toUpperCase();
      if (!sku) throw new Error('SKU inválido');

      const producto = productoBySku.get(sku);
      if (!producto) throw new Error('SKU no encontrado');

      const productoId = Number(producto.id);
      const cantidad = Number(form.cantidad);
      if (!productoId || Number.isNaN(productoId) || productoId <= 0) throw new Error('Producto inválido');
      if (!cantidad || Number.isNaN(cantidad) || cantidad <= 0) throw new Error('Cantidad inválida');

      await updateStockMovimiento({ token, productoId, tipo: 'ENTRADA', cantidad, motivo: 'Reposición' });
      setStatus({ type: 'success', msg: '✅ Stock actualizado correctamente en el sistema.' });
      setForm({ sku: '', cantidad: '' });
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
          <label style={styles.label}>SKU DEL PRODUCTO</label>
          <input 
            type="text" 
            placeholder="Ej: SKU-001" 
            style={styles.input}
            value={form.sku} 
            onChange={e => setForm({ ...form, sku: e.target.value })} 
            required
          />
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