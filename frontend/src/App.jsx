import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import LoginPage from './pages/LoginPage.jsx';
import AdminDashboardPage from './pages/admin/AdminDashboardPage.jsx';
import EmpleadoDashboardPage from './pages/empleado/EmpleadoDashboardPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import RequireAuth from './routes/RequireAuth.jsx';
import VentasPage from './pages/empleado/VentasPage.jsx';
import ProductosPage from './pages/empleado/ProductosPage.jsx';
import ReposicionPage from './pages/empleado/ReposicionPage.jsx';
import AlertasPage from './pages/empleado/AlertasPage.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/admin/dashboard"
        element={
          <RequireAuth allowRoles={["ADMIN"]}>
            <AdminDashboardPage />
          </RequireAuth>
        }
      />

      <Route
        path="/empleado/dashboard"
        element={
          <RequireAuth allowRoles={["EMPLEADO"]}>
            <EmpleadoDashboardPage />
          </RequireAuth>
        }
      />

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
