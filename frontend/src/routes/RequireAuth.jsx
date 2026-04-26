import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../state/auth/AuthContext.jsx';

export default function RequireAuth({ allowRoles, children }) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (Array.isArray(allowRoles) && allowRoles.length > 0) {
    if (!user?.rol || !allowRoles.includes(user.rol)) {
      return <Navigate to="/login" replace />;
    }
  }

  return children;
}
