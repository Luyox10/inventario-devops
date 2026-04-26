import React, { useEffect, useState } from 'react';
import { apiFetch } from '../../api/http';
import { useAuth } from '../../state/auth/AuthContext';

const ProductosPage = () => {
  const { token } = useAuth();
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiFetch('/productos', { token })
      .then(data => {
        setProductos(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error en Capa de Datos:", err);
        setLoading(false);
      });
  }, [token]);

  return (
    <div>
      {/* Encabezado con estética Admin */}
      <header style={{ marginBottom: '25px' }}>
        <h2 style={{ margin: 0, color: '#0b2a52', fontSize: '28px', fontWeight: 900 }}>
          Catálogo de Productos
        </h2>
        <p style={{ margin: '5px 0 0', color: 'rgba(11, 42, 82, 0.7)', fontSize: '15px' }}>
          Consulta de precios y disponibilidad en tiempo real.
        </p>
      </header>

      {loading ? (
        <div style={{ textAlign: 'center', color: 'rgba(11, 42, 82, 0.5)', padding: '40px' }}>
          Cargando catálogo...
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={styles.th}>NOMBRE DEL PRODUCTO</th>
                <th style={styles.th}>PRECIO UNITARIO</th>
                <th style={styles.th}>STOCK DISPONIBLE</th>
              </tr>
            </thead>
            <tbody>
              {productos.map((p) => (
                <tr key={p.id} style={styles.tr}>
                  <td style={styles.tdStrong}>{p.nombre}</td>
                  <td style={styles.td}>S/ {parseFloat(p.precio).toFixed(2)}</td>
                  <td style={styles.td}>
                    <span style={{
                      padding: '4px 12px',
                      borderRadius: '10px',
                      backgroundColor: p.stock > 5 ? 'rgba(52, 211, 153, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                      color: p.stock > 5 ? '#065f46' : '#b91c1c',
                      fontWeight: 'bold',
                      fontSize: '12px'
                    }}>
                      {p.stock} unidades
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {productos.length === 0 && !loading && (
        <div style={{ textAlign: 'center', padding: '20px', color: 'rgba(11, 42, 82, 0.5)' }}>
          No se encontraron productos registrados.
        </div>
      )}
    </div>
  );
};

// Estilos internos que imitan al Administrador
const styles = {
  th: {
    textAlign: 'left',
    fontSize: '11px',
    fontWeight: 800,
    color: 'rgba(11, 42, 82, 0.6)',
    padding: '12px 15px',
    borderBottom: '1px solid rgba(11, 42, 82, 0.1)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  tr: {
    borderBottom: '1px solid rgba(11, 42, 82, 0.05)',
    transition: 'background 0.2s',
  },
  td: {
    fontSize: '14px',
    color: '#0b2a52',
    padding: '16px 15px',
  },
  tdStrong: {
    fontSize: '14px',
    color: '#0b2a52',
    padding: '16px 15px',
    fontWeight: 800, // Estilo característico del admin
  }
};

export default ProductosPage;