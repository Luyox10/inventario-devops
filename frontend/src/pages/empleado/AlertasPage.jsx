import React, { useEffect, useState } from 'react';
import { apiFetch } from '../../api/http';
import { useAuth } from '../../state/auth/AuthContext';

const AlertasPage = () => {
  const { token } = useAuth();
  const [alertas, setAlertas] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    // El flujo: Frontend solicita a Backend -> Backend consulta BD
    apiFetch('/alertas', { token })
      .then(data => setAlertas(data))
      .catch(err => {
        console.error("Error al obtener alertas:", err);
        setError("No se pudieron cargar las alertas.");
      });
  }, [token]);

  return (
    <div style={{ padding: '20px' }}>
      <h1>Alertas de Stock Bajo</h1>
      <p>Productos que requieren reposición inmediata.</p>
      
      {error && <p style={{ color: 'orange' }}>{error}</p>}

      {alertas.length === 0 ? (
        <div style={{ padding: '20px', backgroundColor: '#e7f3ef', color: '#2d6a4f' }}>
          ✅ Todo el inventario se encuentra en niveles óptimos.
        </div>
      ) : (
        <ul style={{ listStyleType: 'none', padding: 0 }}>
          {alertas.map((alerta) => (
            <li key={alerta.id} style={{ 
              padding: '15px', 
              marginBottom: '10px', 
              backgroundColor: '#fff5f5', 
              borderLeft: '5px solid #e53e3e',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              <strong>⚠️ PRODUCTO: {alerta.nombre}</strong> <br />
              <span>Stock actual: <span style={{ color: '#e53e3e', fontWeight: 'bold' }}>{alerta.stock}</span> unidades.</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default AlertasPage;