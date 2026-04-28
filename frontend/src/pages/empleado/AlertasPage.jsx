import React, { useEffect, useState } from 'react';

import { listStockBajo } from '../../api/alertas';
import { useAuth } from '../../state/auth/AuthContext.jsx';

const AlertasPage = () => {
  const { token, logout } = useAuth();
  const [alertas, setAlertas] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setError(null);
    listStockBajo({ token })
      .then((data) => {
        setAlertas(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (err.status === 401) logout();
        setError(err.message || 'No se pudieron cargar las alertas.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token, logout]);

  return (
    <div>
      {/* Títulos con el peso visual del Admin (fontWeight 900) */}
      <header style={{ marginBottom: '25px' }}>
        <h2 style={{ margin: 0, color: '#0b2a52', fontSize: '28px', fontWeight: 900 }}>
          Alertas de Stock Bajo
        </h2>
        <p style={{ margin: '5px 0 0', color: 'rgba(11, 42, 82, 0.7)', fontSize: '15px' }}>
          Productos que requieren reposición inmediata.
        </p>
      </header>

      {/* Manejo de Error con estilo consistente */}
      {error && (
        <div style={{ 
          padding: '12px', 
          backgroundColor: 'rgba(239, 68, 68, 0.1)', 
          border: '1px solid rgba(239, 68, 68, 0.2)', 
          borderRadius: '12px', 
          color: '#b91c1c', 
          marginBottom: '20px',
          fontSize: '14px'
        }}>
          ⚠️ {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', color: 'rgba(11, 42, 82, 0.5)', padding: '20px' }}>
          Verificando niveles de inventario...
        </div>
      ) : alertas.length === 0 ? (
        /* Cuadro de éxito estilizado */
        <div style={{ 
          padding: '30px', 
          backgroundColor: 'rgba(52, 211, 153, 0.1)', 
          color: '#065f46', 
          borderRadius: '15px', 
          textAlign: 'center',
          fontWeight: 600,
          border: '1px solid rgba(52, 211, 153, 0.2)'
        }}>
          ✅ Todo el inventario se encuentra en niveles óptimos.
        </div>
      ) : (
        /* Lista de alertas con diseño de tarjeta "Glass" interna */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {alertas.map((alerta) => (
            <div key={alerta.id} style={{ 
              padding: '18px', 
              backgroundColor: 'rgba(255, 255, 255, 0.4)', // Transparencia suave
              borderRadius: '16px',
              border: '1px solid rgba(255, 255, 255, 0.5)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
            }}>
              <div>
                <div style={{ color: 'rgba(11, 42, 82, 0.6)', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px' }}>
                  Producto Crítico
                </div>
                <div style={{ color: '#0b2a52', fontWeight: 800, fontSize: '16px' }}>
                  {alerta.nombre}
                </div>
                <div style={{ marginTop: 4, fontSize: '12px', color: 'rgba(11, 42, 82, 0.6)', fontWeight: 700 }}>
                  Mínimo: {Number(alerta.stock_minimo || 0)}
                </div>
              </div>
              
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '12px', color: 'rgba(11, 42, 82, 0.6)' }}>Stock actual</div>
                <div style={{ fontSize: '20px', fontWeight: 900, color: '#e53e3e' }}>
                  {Number(alerta.stock_actual || 0)} <span style={{ fontSize: '12px', fontWeight: 600 }}>unid.</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AlertasPage;