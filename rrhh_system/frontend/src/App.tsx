// src/App.tsx
import React from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './AuthContext';

// Components
import { AppLayout } from './components/AppLayout';
import { LoginPage } from './components/LoginPage';
import { RegisterPage } from './components/RegisterPage';
import { ForgotPasswordPage } from './components/ForgotPasswordPage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { NotFoundPage } from './components/NotFoundPage';

// Pages
import { EmployeePage } from './pages/EmployeePage';
import { DepartmentPage } from './pages/DepartmentPage';
import { PositionPage } from './pages/PositionPage';
import { UserAdminPage } from './pages/UserAdminPage';
import { EmployeeFormPage } from './pages/EmployeeFormPage';
import { EmployeeDetailPage } from './pages/EmployeeDetailPage';
import { PermisosPage } from './pages/PermisosPage';
import { HorasExtrasPage } from './pages/HorasExtrasPage';

// Componente para manejar la ruta raíz
const Root = () => {
  const { token } = useAuth();
  // Si hay token, redirige a /permisos (dashboard principal). Si no, a /login.
  return <Navigate to={token ? "/permisos" : "/login"} replace />;
};

// Componente para restringir acceso solo a Admin y RRHH
const RequireAdminOrHR = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const isAdminOrHR = user?.is_superuser || user?.groups.some(g => ['Admin', 'RRHH'].includes(g.name));

  if (!isAdminOrHR) {
    return <Navigate to="/permisos" replace />;
  }
  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<Root />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/registro" element={<RegisterPage />} />
      <Route path="/recuperar-contrasena" element={<ForgotPasswordPage />} />

      {/* Rutas Protegidas dentro del Layout Principal */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="dashboard" element={<Navigate to="/permisos" replace />} />

          {/* Rutas exclusivas de Admin y RRHH */}
          <Route path="empleados" element={
            <RequireAdminOrHR>
              <Outlet />
            </RequireAdminOrHR>
          }>
            <Route index element={<EmployeePage />} />
            <Route path="nuevo" element={<EmployeeFormPage />} />
            <Route path="editar/:id" element={<EmployeeFormPage />} />
            <Route path="ver/:id" element={<EmployeeDetailPage />} />
          </Route>

          <Route path="departamentos" element={<RequireAdminOrHR><DepartmentPage /></RequireAdminOrHR>} />
          <Route path="cargos" element={<RequireAdminOrHR><PositionPage /></RequireAdminOrHR>} />

          <Route path="permisos" element={<PermisosPage />} />
          <Route path="horas-extras" element={<HorasExtrasPage />} />
          <Route path="admin-usuarios" element={<UserAdminPage />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};

export default App;