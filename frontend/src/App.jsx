import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import LoginPage from './pages/LoginPage.jsx';
import AdminDashboardPage from './pages/admin/AdminDashboardPage.jsx';
import AdminProductosPage from './pages/admin/AdminProductosPage.jsx';
import AdminStockPage from './pages/admin/AdminStockPage.jsx';
import AdminVentasPage from './pages/admin/AdminVentasPage.jsx';
import AdminAlertasPage from './pages/admin/AdminAlertasPage.jsx';
import AdminReportesPage from './pages/admin/AdminReportesPage.jsx';
import AdminUsuariosPage from './pages/admin/AdminUsuariosPage.jsx';
import EmpleadoDashboardPage from './pages/empleado/EmpleadoDashboardPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import RequireAuth from './routes/RequireAuth.jsx';
import AdminLayout from './layouts/AdminLayout.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/admin"
        element={
          <RequireAuth allowRoles={["ADMIN"]}>
            <AdminLayout />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboardPage />} />
        <Route path="productos" element={<AdminProductosPage />} />
        <Route path="stock" element={<AdminStockPage />} />
        <Route path="ventas" element={<AdminVentasPage />} />
        <Route path="alertas" element={<AdminAlertasPage />} />
        <Route path="reportes" element={<AdminReportesPage />} />
        <Route path="usuarios" element={<AdminUsuariosPage />} />
      </Route>

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
