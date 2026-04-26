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
import EmpleadoLayout from './components/layout/EmpleadoLayout.jsx';

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
            <EmpleadoLayout>
              <EmpleadoDashboardPage />
            </EmpleadoLayout>
          </RequireAuth>
        }
      />

      <Route
        path="/empleado/ventas"
        element={
          <RequireAuth allowRoles={["EMPLEADO"]}>
            <EmpleadoLayout>
              <VentasPage />
            </EmpleadoLayout>
          </RequireAuth>
        }
      />

      <Route
        path="/empleado/productos"
        element={
          <RequireAuth allowRoles={["EMPLEADO"]}>
            <EmpleadoLayout>
              <ProductosPage />
            </EmpleadoLayout> {/**/}
          </RequireAuth>
        }
      />

      <Route
        path="/empleado/reposicion"
        element={
          <RequireAuth allowRoles={["EMPLEADO"]}>
            <EmpleadoLayout>
              <ReposicionPage />
            </EmpleadoLayout>
          </RequireAuth>
        }
      />

      <Route
        path="/empleado/alertas"
        element={
          <RequireAuth allowRoles={["EMPLEADO"]}>
            <EmpleadoLayout>
              <AlertasPage />
            </EmpleadoLayout>
          </RequireAuth>
        }
      />

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
