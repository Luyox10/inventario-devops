import React from 'react';
import { Navigate, Route, Routes, Outlet } from 'react-router-dom';

import LoginPage from './pages/LoginPage.jsx';
import AdminDashboardPage from './pages/admin/AdminDashboardPage.jsx';
import AdminProductosPage from './pages/admin/AdminProductosPage.jsx';
import AdminStockPage from './pages/admin/AdminStockPage.jsx';
import EmpleadoDashboardPage from './pages/empleado/EmpleadoDashboardPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import RequireAuth from './routes/RequireAuth.jsx';
import VentasPage from './pages/empleado/VentasPage.jsx';
import ProductosPage from './pages/empleado/ProductosPage.jsx';
import ReposicionPage from './pages/empleado/ReposicionPage.jsx';
import AlertasPage from './pages/empleado/AlertasPage.jsx';
import EmpleadoLayout from './components/layout/EmpleadoLayout.jsx';
import AdminLayout from './layouts/AdminLayout.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />

      {/* RUTAS DE ADMINISTRADOR */}
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
        <Route path="ventas" element={<div style={{ color: '#0b2a52' }}>Próximamente</div>} />
        <Route path="alertas" element={<div style={{ color: '#0b2a52' }}>Próximamente</div>} />
        <Route path="reportes" element={<div style={{ color: '#0b2a52' }}>Próximamente</div>} />
        <Route path="usuarios" element={<div style={{ color: '#0b2a52' }}>Próximamente</div>} />
      </Route>

      {/* RUTAS DE EMPLEADO (Refactorizadas) */}
      <Route
        path="/empleado"
        element={
          <RequireAuth allowRoles={["EMPLEADO"]}>
            {/* El Layout envuelve a todas las sub-rutas automáticamente */}
            <EmpleadoLayout>
              <Outlet /> 
            </EmpleadoLayout>
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="/empleado/dashboard" replace />} />
        <Route path="dashboard" element={<EmpleadoDashboardPage />} />
        <Route path="ventas" element={<VentasPage />} />
        <Route path="productos" element={<ProductosPage />} />
        <Route path="reposicion" element={<ReposicionPage />} />
        <Route path="alertas" element={<AlertasPage />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}