import React, { lazy, Suspense } from 'react';
import { Navigate, Route, Routes, Outlet } from 'react-router-dom';

import LoginPage from './pages/LoginPage.jsx';
import RequireAuth from './routes/RequireAuth.jsx';
import EmpleadoLayout from './components/layout/EmpleadoLayout.jsx';
import AdminLayout from './layouts/AdminLayout.jsx';

const AdminDashboardPage = lazy(() => import('./pages/admin/AdminDashboardPage.jsx'));
const AdminProductosPage = lazy(() => import('./pages/admin/AdminProductosPage.jsx'));
const AdminStockPage = lazy(() => import('./pages/admin/AdminStockPage.jsx'));
const AdminVentasPage = lazy(() => import('./pages/admin/AdminVentasPage.jsx'));
const AdminAlertasPage = lazy(() => import('./pages/admin/AdminAlertasPage.jsx'));
const AdminReportesPage = lazy(() => import('./pages/admin/AdminReportesPage.jsx'));
const AdminUsuariosPage = lazy(() => import('./pages/admin/AdminUsuariosPage.jsx'));
const AdminPrediccionesPage = lazy(() => import('./pages/admin/AdminPrediccionesPage.jsx'));
const AdminKardexPage = lazy(() => import('./pages/admin/AdminKardexPage.jsx'));
const EmpleadoDashboardPage = lazy(() => import('./pages/empleado/EmpleadoDashboardPage.jsx'));
const VentasPage = lazy(() => import('./pages/empleado/VentasPage.jsx'));
const ProductosPage = lazy(() => import('./pages/empleado/ProductosPage.jsx'));
const ReposicionPage = lazy(() => import('./pages/empleado/ReposicionPage.jsx'));
const AlertasPage = lazy(() => import('./pages/empleado/AlertasPage.jsx'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage.jsx'));

const pageFallback = <div style={{ padding: 24 }}>Cargando...</div>;

export default function App() {
  return (
    <Suspense fallback={pageFallback}>
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
          <Route path="ventas" element={<AdminVentasPage />} />
          <Route path="alertas" element={<AdminAlertasPage />} />
          <Route path="reportes" element={<AdminReportesPage />} />
          <Route path="usuarios" element={<AdminUsuariosPage />} />
          <Route path="predicciones" element={<AdminPrediccionesPage />} />
          <Route path="kardex" element={<AdminKardexPage />} />
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
    </Suspense>
  );
}
