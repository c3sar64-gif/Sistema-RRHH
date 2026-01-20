import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../config';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await axios.post(`${API_URL}/api/password_reset/`, { email });
      setSuccess(`Si una cuenta con el correo ${email} existe, se ha enviado un enlace para recuperar la contraseña.`);
    } catch (err: any) {
      // Security best practice: Don't reveal if email exists or not, but for now we might want to debug
      // Django usually returns 200 even if email doesn't exist for security (unless custom view says otherwise)
      // Our custom view returns 400 if email is missing, 200 otherwise.
      // If network error:
      setError('Hubo un problema al conectar con el servidor. Inténtalo más tarde.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-center items-center font-sans p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold">Recuperar Contraseña</h1>
          <p className="text-gray-600 mt-2">Ingresa tu correo y te enviaremos un enlace de recuperación.</p>
        </div>
        <div className="bg-white p-8 rounded-xl shadow-lg">
          {success ? (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg relative mb-4 text-center">
              <span className="block">{success}</span>
              <Link to="/login" className="font-bold hover:underline mt-4 block">
                Volver a Inicio de Sesión
              </Link>
            </div>
          ) : (
            <>
              {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative mb-4 text-center">
                  <span className="block">{error}</span>
                </div>
              )}
              <form onSubmit={handleSubmit}>
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700" htmlFor="email">
                    Correo Electrónico
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition"
                    required
                    placeholder="tu@correo.com"
                  />
                </div>

                <div className="mt-8">
                  <button
                    type="submit"
                    className="w-full rounded-lg bg-indigo-600 px-5 py-3 text-center text-base font-semibold text-white shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-300 transition-transform duration-150 ease-in-out hover:scale-[1.01] disabled:opacity-75 disabled:cursor-not-allowed"
                    disabled={loading}
                  >
                    {loading ? 'Enviando...' : 'Enviar Enlace de Recuperación'}
                  </button>
                </div>
              </form>
            </>
          )}
          {!success && (
            <p className="mt-6 text-center text-sm text-gray-600">
              ¿Recordaste tu contraseña?{' '}
              <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500 hover:underline">
                Inicia sesión
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};