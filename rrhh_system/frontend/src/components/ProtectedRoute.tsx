// src/components/ProtectedRoute.tsx
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../AuthContext';

export const ProtectedRoute: React.FC = () => {
  const { token } = useAuth();

  if (!token) {
    // Si no hay token, redirigir a la página de login
    return <Navigate to="/login" replace />;
  }

  // Si hay un token, renderizar el contenido de la ruta (Dashboard en este caso)
  return <Outlet />;
};
