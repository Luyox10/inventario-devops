import React from 'react';
import { useAuth } from '../../state/auth/AuthContext.jsx';

export default function AdminDashboardPage() {
  const { user, logout } = useAuth();

  return (
    <div style={{ padding: 20, fontFamily: 'system-ui, Arial' }}>
      <h2>Dashboard (ADMIN)</h2>
      <p>
        Bienvenido: <b>{user?.nombre}</b> ({user?.rol})
      </p>
      <button onClick={logout}>Cerrar sesión</button>

      <div style={{ marginTop: 18 }}>
        Próximo:
        <ul>
          <li>Dashboard con métricas reales</li>
          <li>Productos (CRUD)</li>
          <li>Stock / Alertas / Ventas / Reportes</li>
        </ul>
      </div>
    </div>
  );
}
