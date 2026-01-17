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
    <div className="flex h-screen bg-gray-50 font-sans">
      {/* SECCIÓN IZQUIERDA (Diseño Visual) */}
      <div className="hidden md:flex w-1/2 relative bg-slate-900 overflow-hidden">
        {/* Imagen de fondo base
            opacity-30: MENOS OPACIDAD (fainter) como pedido. Antes era 60.
        */}
        <img
          src="/images/Background.png"
          alt="Background"
          className="absolute inset-0 w-full h-full object-cover object-[center_12%] scale-110 opacity-100 transition-all duration-700"
        />

        {/* Overlay de Gradiente - Azul oscuro profesional */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/95 via-indigo-900/80 to-slate-900/90 mix-blend-multiply" />

        {/* Contenido sobre el fondo */}
        <div className="relative z-10 w-full h-full flex flex-col p-12 lg:p-16 text-white">
          {/* Cabecera Pequeña */}
          <div className="flex-none">
            <h3 className="text-lg font-extrabold tracking-[0.2em] text-white">ROLON</h3>
            <p className="text-xs font-medium tracking-[0.3em] text-yellow-500 uppercase mt-1">Grupo Empresarial</p>
          </div>

          {/* Texto Principal */}
          <div className="flex flex-col justify-center mt-20">
            <h1 className="text-5xl lg:text-6xl font-bold leading-tight mb-8">
              Recursos Humanos<br />
              <span className="text-yellow-400 italic">RRHH</span>
            </h1>

            {/* Caja de texto con borde amarillo 
                    mt-96: Mantenemos el margen grande
                */}
            <div className="border-l-4 border-yellow-400 pl-6 py-4 bg-white/5 backdrop-blur-sm rounded-r-lg max-w-lg mt-96">
              <p className="text-lg text-gray-100 font-light leading-relaxed">
                Gestionando el motor de nuestra industria con tecnología de vanguardia y calidez humana.
              </p>
            </div>
          </div>

          {/* Pie de página pequeño - Empujado al fondo */}
          <div className="flex items-center gap-3 opacity-80 mt-auto">
            <div className="w-10 h-0.5 bg-yellow-400"></div>
            <p className="text-xs font-semibold tracking-widest uppercase">Avícola Rolon • Calidad desde el origen</p>
          </div>
        </div>
      </div>

      {/* SECCIÓN DERECHA (Formulario) */}
      <div className="w-full md:w-1/2 flex flex-col justify-center items-center p-8 sm:p-16 bg-white shadow-xl md:shadow-none z-20">
        <div className="w-full max-w-md">

          {/* Logo visible solo en móvil si es necesario. En desktop está a la izquierda. */}
          <div className="block md:hidden mb-8 text-center">
            <h3 className="text-xl font-bold tracking-widest text-indigo-900">ROLON</h3>
          </div>

          <div className="mb-10 flex flex-col items-center text-center">
            <img src="/images/Logo Avicola-Rolon.png" alt="Logo Avicola Rolon" className="h-40 mb-6" />
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Bienvenido de Nuevo</h2>
            <p className="text-gray-500">Por favor, ingresa tus credenciales para acceder a la plataforma.</p>
          </div>

          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded shadow-sm mb-6 flex items-start" role="alert">
              <div className="mr-2">⚠️</div>
              <span className="block sm:inline text-sm">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block mb-2 text-sm font-semibold text-gray-700" htmlFor="username">
                Usuario o Correo
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
                  className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-3 pl-10 text-gray-900 focus:bg-white focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition outline-none"
                  placeholder="p. ej. juan.perez"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-semibold text-gray-700" htmlFor="password">
                  Contraseña
                </label>
              </div>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <LockIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-3 pl-10 text-gray-900 focus:bg-white focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition outline-none"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 flex items-center pr-3 cursor-pointer text-gray-400 hover:text-gray-600"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-5 w-5" />
                  ) : (
                    <EyeIcon className="h-5 w-5" />
                  )}
                </button>
              </div>
              <div className="text-right mt-2">
                <Link to="/recuperar-contrasena" className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
            </div>

            <div className="flex items-center">
              <input
                id="remember-me"
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600 cursor-pointer"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-600 cursor-pointer select-none">
                Mantener sesión iniciada
              </label>
            </div>

            <button
              type="submit"
              className="w-full rounded-lg bg-indigo-600 px-5 py-4 text-center text-lg font-bold text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-100 transition-all duration-200 transform hover:-translate-y-0.5 disabled:opacity-75 disabled:cursor-not-allowed disabled:hover:transform-none"
              disabled={loading}
            >
              {loading ? 'Validando...' : 'Iniciar Sesión'}
            </button>
          </form>

        </div>
      </div>
    </div>
  );
};