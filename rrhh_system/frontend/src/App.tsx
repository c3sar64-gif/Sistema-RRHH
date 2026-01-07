// src/App.tsx
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
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

// Componente para manejar la ruta raíz
const Root = () => {
  const { token } = useAuth();
  // Si hay token, redirige a /empleados. Si no, a /login.
  return <Navigate to={token ? "/empleados" : "/login"} replace />;
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
          <Route path="dashboard" element={<Navigate to="/empleados" replace />} />
          
          {/* Rutas de Empleados (Anidadas para mayor claridad) */}
          <Route path="empleados">
            <Route index element={<EmployeePage />} />
            <Route path="nuevo" element={<EmployeeFormPage />} />
            <Route path="editar/:id" element={<EmployeeFormPage />} />
            <Route path="ver/:id" element={<EmployeeDetailPage />} />
          </Route>

          <Route path="departamentos" element={<DepartmentPage />} />
          <Route path="cargos" element={<PositionPage />} />
          <Route path="admin-usuarios" element={<UserAdminPage />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};

export default App;