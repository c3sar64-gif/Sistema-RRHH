// src/components/RegisterPage.tsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

export const RegisterPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== password2) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      // El rol ya no se envía, el backend asignará 'Empleado' por defecto.
      await axios.post('http://127.0.0.1:8000/api/register/', {
        username,
        password,
      });
      
      setSuccess('¡Usuario registrado exitosamente! Serás redirigido al login.');
      setTimeout(() => {
        navigate('/login');
      }, 2000);

    } catch (err: any) {
      if (err.response && err.response.data) {
        const errorMessages = Object.values(err.response.data).flat();
        setError(errorMessages.join(' ') || 'Ocurrió un error al registrar el usuario.');
      } else {
        setError('No se pudo conectar con el servidor. ¿Está el backend en ejecución?');
      }
      console.error('Registration error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-center items-center font-sans p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
            <h1 className="text-4xl font-bold">Crear una Cuenta</h1>
            <p className="text-gray-600 mt-2">Únete a nuestro sistema de gestión de RRHH.</p>
        </div>
        <div className="bg-white p-8 rounded-xl shadow-lg">
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative mb-4" role="alert">
                <span className="block sm:inline">{error}</span>
              </div>
            )}
            {success && (
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg relative mb-4" role="alert">
                <span className="block sm:inline">{success}</span>
              </div>
            )}
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700" htmlFor="username">
                    Nombre de Usuario
                  </label>
                  <input
                    type="text"
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition"
                    required
                  />
                </div>

                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700" htmlFor="password">
                    Contraseña
                  </label>
                  <input
                    type="password"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition"
                    required
                  />
                </div>

                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700" htmlFor="password2">
                    Confirmar Contraseña
                  </label>
                  <input
                    type="password"
                    id="password2"
                    value={password2}
                    onChange={(e) => setPassword2(e.target.value)}
                    className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition"
                    required
                  />
                </div>
              </div>
              
              <div className="mt-8">
                <button
                  type="submit"
                  className="w-full rounded-lg bg-indigo-600 px-5 py-3 text-center text-base font-semibold text-white shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-300 transition-transform duration-150 ease-in-out hover:scale-[1.01] disabled:opacity-75 disabled:cursor-not-allowed"
                  disabled={loading}
                >
                  {loading ? 'Registrando...' : 'Crear Cuenta'}
                </button>
              </div>
            </form>
            <p className="mt-6 text-center text-sm text-gray-600">
              ¿Ya tienes una cuenta?{' '}
              <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500 hover:underline">
                Inicia sesión aquí
              </Link>
            </p>
        </div>
      </div>
    </div>
  );
};