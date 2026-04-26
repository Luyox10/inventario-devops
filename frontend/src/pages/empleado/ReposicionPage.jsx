import React, { useState } from 'react';
import { apiFetch } from '../../api/http';
import { useAuth } from '../../state/auth/AuthContext';

const ReposicionPage = () => {
  const { token } = useAuth();
  const [form, setForm] = useState({ producto_id: '', cantidad: '' });
  const [status, setStatus] = useState({ type: '', msg: '' });

  const handleReposicion = async (e) => {
    e.preventDefault();
    setStatus({ type: 'info', msg: 'Procesando...' });
    
    try {
      await apiFetch(`/stock/reposicion`, {
        method: 'POST',
        token: token,
        body: form
      });
      setStatus({ type: 'success', msg: '✅ Stock actualizado correctamente en el sistema.' });
      setForm({ producto_id: '', cantidad: '' });
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
          <label style={styles.label}>ID DEL PRODUCTO</label>
          <input 
            type="text" 
            placeholder="Ej: 102" 
            style={styles.input}
            value={form.producto_id} 
            onChange={e => setForm({...form, producto_id: e.target.value})} 
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