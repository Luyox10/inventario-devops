import React, { useEffect, useMemo, useState } from 'react';

import { listProductos } from '../../api/productos';
import { crearVenta } from '../../api/ventas';
import { useAuth } from '../../state/auth/AuthContext.jsx';

const VentasPage = () => {
  const { token, logout } = useAuth();
  const [venta, setVenta] = useState({ sku: '', cantidad: '' });
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

  const manejarEnvio = async (e) => {
    e.preventDefault();
    setStatus({ type: 'info', msg: 'Procesando venta...' });
    
    try {
      if (loadingProductos) throw new Error('Cargando catálogo de productos...');

      const sku = String(venta.sku || '').trim().toUpperCase();
      if (!sku) throw new Error('SKU inválido');

      const producto = productoBySku.get(sku);
      if (!producto) throw new Error('SKU no encontrado');

      const producto_id = Number(producto.id);
      const cantidad = Number(venta.cantidad);
      if (!producto_id || Number.isNaN(producto_id) || producto_id <= 0) throw new Error('Producto inválido');
      if (!cantidad || Number.isNaN(cantidad) || cantidad <= 0) throw new Error('Cantidad inválida');

      await crearVenta({ token, items: [{ producto_id, cantidad }] });
      setStatus({ type: 'success', msg: '✅ ¡Venta registrada exitosamente!' });
      setVenta({ sku: '', cantidad: '' });
      
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
            <label style={styles.label}>SKU DEL PRODUCTO</label>
            <input 
              type="text" 
              placeholder="Ej: SKU-001" 
              style={styles.input}
              value={venta.sku}
              onChange={(e) => setVenta({ ...venta, sku: e.target.value })}
              required
            />
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