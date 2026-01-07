// src/components/NotFoundPage.tsx
import React from 'react';
import { Link } from 'react-router-dom';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100 font-sans">
      <h1 className="text-6xl font-bold text-indigo-600 mb-4">404</h1>
      <h2 className="text-3xl font-semibold text-gray-800 mb-2">Página No Encontrada</h2>
      <p className="text-lg text-gray-700 mb-8">Lo sentimos, la página que buscas no existe.</p>
      <Link to="/" className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 transition">
        Volver al Inicio
      </Link>
    </div>
  );
};
