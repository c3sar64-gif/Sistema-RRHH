// src/AuthContext.tsx
import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import axios from 'axios';

// Definir la estructura del objeto de usuario
interface User {
  id: number;
  username: string;
  email: string;
  groups: { name: string }[];
  is_superuser: boolean;
}

interface AuthContextType {
  token: string | null;
  user: User | null;
  setToken: (token: string | null) => void;
  logout: () => void;
  loading: boolean; // Para saber si estamos cargando la info del usuario
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [token, setTokenState] = useState<string | null>(localStorage.getItem('authToken'));
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true); // Empezar en true para la carga inicial

  useEffect(() => {
    const fetchUser = async () => {
      if (token) {
        try {
          const response = await axios.get('http://127.0.0.1:8000/api/me/', {
            headers: {
              'Authorization': `Token ${token}`
            }
          });
          setUser(response.data);
        } catch (error) {
          // Si el token es inválido, lo limpiamos
          console.error("Invalid token, logging out.", error);
          setToken(null);
        }
      }
      setLoading(false);
    };

    fetchUser();
  }, [token]);

  const setToken = (newToken: string | null) => {
    setTokenState(newToken);
    if (newToken) {
      localStorage.setItem('authToken', newToken);
    } else {
      localStorage.removeItem('authToken');
      setUser(null); // Limpiar el usuario al limpiar el token
    }
  };

  const logout = () => {
    setToken(null);
  };

  // No renderizar la app hasta que se verifique el token
  if (loading) {
    return <div>Cargando...</div>; // O un spinner más elegante
  }

  return (
    <AuthContext.Provider value={{ token, user, setToken, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};