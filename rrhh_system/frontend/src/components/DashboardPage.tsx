// src/components/DashboardPage.tsx
import React from 'react';
import { useAuth } from '../AuthContext';

export const DashboardPage: React.FC = () => {
  const { logout } = useAuth();

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100 font-sans">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Bienvenido al Dashboard</h1>
        <p className="text-lg text-gray-700 mb-8">¡Has iniciado sesión exitosamente!</p>
        <p className="text-sm text-gray-600 mb-8">Esta es la página principal de la aplicación después de la autenticación.</p>
        <button
          onClick={logout}
          className="px-6 py-3 bg-red-600 text-white font-semibold rounded-lg shadow-md hover:bg-red-700 transition"
        >
          Cerrar Sesión
        </button>
      </div>
    </div>
  );
};
