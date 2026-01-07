// src/components/AppLayout.tsx
import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../AuthContext';

// Íconos simples para el menú
const BriefcaseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>;
const OfficeBuildingIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m-1 4h1m5-4h1m-1 4h1m-1-4h1" /></svg>;
const ShieldCheckIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 20.944A12.02 12.02 0 0012 23v-4.944c1.121-1.258 2.583-2.152 4.226-2.617l1.392-1.392a3.027 3.027 0 000-4.275z" /></svg>;
const UsersIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M15 21a6 6 0 00-9-5.197m0 0A10.004 10.004 0 0012 13c1.25 0 2.447.29 3.5.803" /></svg>;
const LogoutIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>;

export const AppLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navLinkClasses = "flex items-center px-4 py-2 mt-2 text-gray-100 hover:bg-gray-700 rounded-md";
  const activeNavLinkClasses = "bg-gray-700";

  const isAdmin = user?.is_superuser || user?.groups.some(group => group.name === 'Admin');

  return (
    <div className="flex h-screen bg-gray-200 font-sans">
      {/* Sidebar */}
      <div className="hidden md:flex flex-col w-64 bg-gray-800">
        <div className="flex items-center justify-center h-20 shadow-md">
          <h1 className="text-2xl font-bold text-white">RRHH System</h1>
        </div>
        <div className="flex flex-col flex-grow p-4">
          <nav className="flex-grow">
            <NavLink to="/empleados" className={({ isActive }) => `${navLinkClasses} ${isActive ? activeNavLinkClasses : ''}`}>
              <UsersIcon />
              <span className="mx-4">Empleados</span>
            </NavLink>
            <NavLink to="/departamentos" className={({ isActive }) => `${navLinkClasses} ${isActive ? activeNavLinkClasses : ''}`}>
              <OfficeBuildingIcon />
              <span className="mx-4">Departamentos</span>
            </NavLink>
            <NavLink to="/cargos" className={({ isActive }) => `${navLinkClasses} ${isActive ? activeNavLinkClasses : ''}`}>
              <BriefcaseIcon />
              <span className="mx-4">Cargos</span>
            </NavLink>
            
            {/* Admin-only Link */}
            {isAdmin && (
              <>
                <hr className="my-4 border-gray-600" />
                <NavLink to="/admin-usuarios" className={({ isActive }) => `${navLinkClasses} ${isActive ? activeNavLinkClasses : ''}`}>
                  <ShieldCheckIcon />
                  <span className="mx-4">Administrar Usuarios</span>
                </NavLink>
              </>
            )}
          </nav>
          <div className="p-4">
            <button
              onClick={logout}
              className="flex items-center justify-center w-full px-4 py-2 text-red-400 border border-red-400 rounded-md hover:bg-red-400 hover:text-white transition"
            >
              <LogoutIcon />
              <span className="mx-2">Cerrar Sesión</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col flex-grow">
        <main className="flex-grow p-6">
          {/* Outlet para renderizar las páginas anidadas */}
          <Outlet />
        </main>
      </div>
    </div>
  );
};
