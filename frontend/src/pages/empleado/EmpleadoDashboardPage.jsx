import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../state/auth/AuthContext.jsx';

export default function EmpleadoDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Estilo para las tarjetas de acceso rápido
  const cardStyle = {
    background: 'rgba(255, 255, 255, 0.4)',
    border: '1px solid rgba(255, 255, 255, 0.5)',
    borderRadius: '18px',
    padding: '20px',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'transform 0.2s, background 0.2s',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '10px',
    flex: '1 1 150px'
  };

  return (
    <div>
      {/* Cabecera de Bienvenida */}
      <header style={{ marginBottom: '30px' }}>
        <h2 style={{ margin: 0, color: '#0b2a52', fontSize: '32px', fontWeight: 900 }}>
          ¡Hola, {user?.nombre || 'Empleado'}! 👋
        </h2>
        <p style={{ margin: '8px 0 0', color: 'rgba(11, 42, 82, 0.7)', fontSize: '16px' }}>
          Panel de control de la <b>Bodega Helen</b>. ¿Qué deseas hacer hoy?
        </p>
      </header>

      {/* Grid de Accesos Rápidos */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '20px', 
        marginTop: '20px' 
      }}>
        
        <div 
          style={cardStyle} 
          onClick={() => navigate('/empleado/ventas')}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          <span style={{ fontSize: '40px' }}>🛒</span>
          <div style={{ fontWeight: 800, color: '#0b2a52' }}>Registrar Venta</div>
          <div style={{ fontSize: '12px', color: 'rgba(11, 42, 82, 0.6)' }}>Atiende a un cliente</div>
        </div>

        <div 
          style={cardStyle} 
          onClick={() => navigate('/empleado/productos')}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          <span style={{ fontSize: '40px' }}>📦</span>
          <div style={{ fontWeight: 800, color: '#0b2a52' }}>Inventario</div>
          <div style={{ fontSize: '12px', color: 'rgba(11, 42, 82, 0.6)' }}>Ver catálogo de productos</div>
        </div>

        <div 
          style={cardStyle} 
          onClick={() => navigate('/empleado/reposicion')}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          <span style={{ fontSize: '40px' }}>🔄</span>
          <div style={{ fontWeight: 800, color: '#0b2a52' }}>Reposición</div>
          <div style={{ fontSize: '12px', color: 'rgba(11, 42, 82, 0.6)' }}>Actualizar stock actual</div>
        </div>

        <div 
          style={{...cardStyle, border: '1px solid rgba(239, 68, 68, 0.3)'}} 
          onClick={() => navigate('/empleado/alertas')}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          <span style={{ fontSize: '40px' }}>⚠️</span>
          <div style={{ fontWeight: 800, color: '#e53e3e' }}>Alertas</div>
          <div style={{ fontSize: '12px', color: 'rgba(11, 42, 82, 0.6)' }}>Stock bajo el mínimo</div>
        </div>

      </div>

      {/* Pie de página informativo estilo "Admin" */}
      <footer style={{ 
        marginTop: '40px', 
        paddingTop: '20px', 
        borderTop: '1px solid rgba(11, 42, 82, 0.1)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ fontSize: '13px', color: 'rgba(11, 42, 82, 0.5)' }}>
          Rol asignado: <span style={{ fontWeight: 800, color: '#0b2a52' }}>{user?.rol}</span>
        </div>
        <div style={{ fontSize: '13px', color: 'rgba(11, 42, 82, 0.5)' }}>
          Sesión activa: <span style={{ fontWeight: 800, color: '#0b2a52' }}>{new Date().toLocaleDateString()}</span>
        </div>
      </footer>
    </div>
  );
}