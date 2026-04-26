import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../state/auth/AuthContext';

const EmpleadoNavbar = () => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation(); // Para saber en qué página estamos

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Función para resaltar el botón de la página actual
  const activeStyle = (path) => ({
    color: location.pathname === path ? '#3498db' : 'white',
    marginRight: '20px',
    textDecoration: 'none',
    fontWeight: location.pathname === path ? 'bold' : 'normal',
    transition: '0.3s'
  });

  return (
    <nav style={{ 
      backgroundColor: '#2c3e50', 
      padding: '1rem 2rem', 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center',
      color: 'white',
      boxShadow: '0 2px 10px rgba(0,0,0,0.2)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <span style={{ fontSize: '1.2rem', marginRight: '30px', borderRight: '1px solid #555', paddingRight: '15px' }}>
          📦 <strong>InventarioApp</strong>
        </span>
        <Link to="/empleado/dashboard" style={activeStyle('/empleado/dashboard')}>Inicio</Link>
        <Link to="/empleado/ventas" style={activeStyle('/empleado/ventas')}>Ventas</Link>
        <Link to="/empleado/productos" style={activeStyle('/empleado/productos')}>Productos</Link>
        <Link to="/empleado/reposicion" style={activeStyle('/empleado/reposicion')}>Reposición</Link>
        <Link to="/empleado/alertas" style={activeStyle('/empleado/alertas')}>Alertas</Link>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
        <span style={{ fontSize: '0.9rem', color: '#bdc3c7' }}>
          Hola, <strong>{user?.nombre || 'Empleado'}</strong>
        </span>
        <button 
          onClick={handleLogout}
          style={{ 
            backgroundColor: '#e74c3c', 
            color: 'white', 
            border: 'none', 
            padding: '8px 15px', 
            borderRadius: '5px', 
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          Cerrar Sesión
        </button>
      </div>
    </nav>
  );
};

export default EmpleadoNavbar;