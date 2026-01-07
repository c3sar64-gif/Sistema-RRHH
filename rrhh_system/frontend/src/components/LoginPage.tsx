// src/components/LoginPage.tsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../AuthContext';
import { UserIcon, LockIcon, EyeIcon, EyeSlashIcon } from './icons';

export const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  const { token, setToken } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Si el usuario ya está logueado, redirigir al dashboard
    if (token) {
      navigate('/dashboard', { replace: true });
    }
  }, [token, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await axios.post('http://127.0.0.1:8000/api-token-auth/', {
        username: username,
        password: password,
      });
      
      // Guardar el token en el contexto. El contexto y el router se encargarán del resto.
      setToken(response.data.token);

    } catch (err: any) {
      if (err.response && err.response.data) {
        setError(err.response.data.non_field_errors?.join(', ') || 'Error al iniciar sesión. Verifica tus credenciales.');
      } else {
        setError('No se pudo conectar con el servidor. ¿Está el backend en ejecución?');
      }
      console.error('Login error:', err);
      setLoading(false); // Asegurarse de parar la carga en caso de error
    }
    // No es necesario setLoading(false) en caso de éxito, porque el componente se desmontará.
  };

  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      <div 
        className="hidden md:flex w-1/2 bg-cover bg-center relative"
        style={{ backgroundImage: "url('/images/Background.png')" }}
      >
        <div className="absolute inset-0 bg-black opacity-60"></div>
        <div className="relative z-10 flex flex-col justify-center items-center text-white text-center p-12">
          <h1 className="text-5xl font-bold mb-4 tracking-tight">Sistema de Recursos Humanos</h1>
          <p className="text-xl font-light">Avicola Rolon</p>
        </div>
      </div>

      <div className="w-full md:w-1/2 flex flex-col justify-center items-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          <img src="/images/Logo Avicola Rolon.png" alt="Logo Avicola Rolon" className="w-40 h-auto mx-auto mb-6" />

          <div className="bg-white p-8 rounded-xl shadow-lg">
            <h2 className="text-2xl font-bold text-gray-800 mb-2 text-center">Bienvenido de Nuevo</h2>
            <p className="text-gray-600 mb-6 text-center">Por favor, ingresa tus datos para iniciar sesión.</p>

            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative mb-4" role="alert">
                <span className="block sm:inline">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="mb-5">
                <label className="block mb-2 text-sm font-medium text-gray-700" htmlFor="username">
                  Usuario
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <UserIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 pl-10 text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition"
                    placeholder="p. ej., juan.perez"
                    required
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="block mb-2 text-sm font-medium text-gray-700" htmlFor="password">
                  Contraseña
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <LockIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 pl-10 text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 flex items-center pr-3"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="h-6 w-6 text-gray-500" />
                    ) : (
                      <EyeIcon className="h-6 w-6 text-gray-500" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <input id="remember-me" type="checkbox" className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                  <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                    Recuérdame
                  </label>
                </div>
                <Link to="/recuperar-contrasena" className="text-sm text-indigo-600 hover:text-indigo-500 hover:underline">
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>

              <button
                type="submit"
                className="w-full rounded-lg bg-indigo-600 px-5 py-3 text-center text-base font-semibold text-white shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-300 transition-transform duration-150 ease-in-out hover:scale-[1.01] disabled:opacity-75 disabled:cursor-not-allowed"
                disabled={loading}
              >
                {loading ? 'Iniciando...' : 'Iniciar Sesión'}
              </button>
            </form>
            
          </div>
        </div>
      </div>
    </div>
  );
};