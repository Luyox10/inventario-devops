import React, { useState } from 'react';
import { apiFetch } from '../../api/http'; // Importamos la herramienta de tus compañeros
import { useAuth } from '../../state/auth/AuthContext'; // Para obtener el token

const VentasPage = () => {
  const { token } = useAuth(); // Sacamos el token del estado global
  const [venta, setVenta] = useState({ producto_id: '', cantidad: '' });

  const manejarEnvio = async (e) => {
    e.preventDefault();
    try {
      // Usamos apiFetch como lo hacen tus compañeros
      await apiFetch('/ventas', {
        method: 'POST',
        token: token,
        body: venta
      });
      alert("¡Venta registrada!");
      setVenta({ producto_id: '', cantidad: '' });
    } catch (error) {
      alert("Error al registrar venta: " + error.message);
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>Módulo de Registro de Ventas</h2>
      <form onSubmit={manejarEnvio}>
        <div style={{ marginBottom: '10px' }}>
          <label>ID del Producto: </label>
          <input 
            type="text" 
            value={venta.producto_id}
            onChange={(e) => setVenta({...venta, producto_id: e.target.value})}
            required
          />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label>Cantidad: </label>
          <input 
            type="number" 
            value={venta.cantidad}
            onChange={(e) => setVenta({...venta, cantidad: e.target.value})}
            required
          />
        </div>
        <button type="submit" style={{ padding: '5px 15px', cursor: 'pointer' }}>
          Finalizar Venta
        </button>
      </form>
    </div>
  );
};

export default VentasPage;