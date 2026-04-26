import React, { useEffect, useState } from 'react';
import { apiFetch } from '../../api/http';
import { useAuth } from '../../state/auth/AuthContext';

const ProductosPage = () => {
  const { token } = useAuth();
  const [productos, setProductos] = useState([]);

  useEffect(() => {
    // El Frontend envía la solicitud al Backend (Capa 2.3)
    apiFetch('/productos', { token })
      .then(data => setProductos(data))
      .catch(err => console.error("Error en Capa de Datos:", err));
  }, [token]);

  return (
    <div style={{ padding: '20px' }}>
      <h2>Catálogo de Productos</h2>
      <table border="1" style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ backgroundColor: '#f4f4f4' }}>
            <th>Nombre</th>
            <th>Precio</th>
            <th>Stock Disponible</th>
          </tr>
        </thead>
        <tbody>
          {productos.map(p => (
            <tr key={p.id}>
              <td>{p.nombre}</td>
              <td>S/ {p.precio}</td>
              <td>{p.stock}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ProductosPage;