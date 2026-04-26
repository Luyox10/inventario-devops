import React from 'react';
import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div style={{ padding: 20, fontFamily: 'system-ui, Arial' }}>
      <h2>404</h2>
      <p>Página no encontrada</p>
      <Link to="/login">Ir al login</Link>
    </div>
  );
}
