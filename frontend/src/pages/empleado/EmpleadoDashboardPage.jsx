import React from 'react';
import { useAuth } from '../../state/auth/AuthContext.jsx';

export default function EmpleadoDashboardPage() {
  const { user, logout } = useAuth();

  return (
    <div style={{ padding: 20, fontFamily: 'system-ui, Arial' }}>
      <h2>Dashboard (EMPLEADO)</h2>
      <p>
        Bienvenido: <b>{user?.nombre}</b> ({user?.rol})
      </p>
      <button onClick={logout}>Cerrar sesión</button>

      <div style={{ marginTop: 18 }}>
        Próximo:
        <ul>
          <li>Ventas (registrar)</li>
          <li>Productos (ver)</li>
          <li>Stock (actualizar cantidades)</li>
          <li>Alertas básicas</li>
        </ul>
      </div>
    </div>
  );
}
