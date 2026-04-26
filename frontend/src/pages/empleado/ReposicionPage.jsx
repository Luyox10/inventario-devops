import React, { useState } from 'react';
import { apiFetch } from '../../api/http';
import { useAuth } from '../../state/auth/AuthContext';

const ReposicionPage = () => {
  const { token } = useAuth();
  const [form, setForm] = useState({ producto_id: '', cantidad: '' });

  const handleReposicion = async (e) => {
    e.preventDefault();
    try {
      // Envío de solicitud al Backend para actualizar la Capa de Datos
      await apiFetch(`/stock/reposicion`, {
        method: 'POST',
        token: token,
        body: form
      });
      alert("Reposición registrada en la Base de Datos");
      setForm({ producto_id: '', cantidad: '' });
    } catch (error) {
      alert("Error en la validación: " + error.message);
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>Reposición Física de Stock</h2>
      <form onSubmit={handleReposicion}>
        <input 
          type="text" 
          placeholder="ID del Producto" 
          value={form.producto_id} 
          onChange={e => setForm({...form, producto_id: e.target.value})} 
        />
        <input 
          type="number" 
          placeholder="Cantidad recibida" 
          value={form.cantidad} 
          onChange={e => setForm({...form, cantidad: e.target.value})} 
        />
        <button type="submit">Cargar al Sistema</button>
      </form>
    </div>
  );
};

export default ReposicionPage;