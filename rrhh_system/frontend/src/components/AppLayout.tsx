// src/components/AppLayout.tsx
import React, { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../AuthContext';

// Íconos simples para el menú
const BriefcaseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>;
const OfficeBuildingIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m-1 4h1m5-4h1m-1 4h1m-1-4h1" /></svg>;
const ShieldCheckIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 20.944A12.02 12.02 0 0012 23v-4.944c1.121-1.258 2.583-2.152 4.226-2.617l1.392-1.392a3.027 3.027 0 000-4.275z" /></svg>;
const UsersIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M15 21a6 6 0 00-9-5.197m0 0A10.004 10.004 0 0012 13c1.25 0 2.447.29 3.5.803" /></svg>;
const LogoutIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>;
const ClockIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const MenuIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>;

export const AppLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const navLinkClasses = "flex items-center px-4 py-2 mt-2 text-gray-100 hover:bg-gray-700 rounded-md";
  const activeNavLinkClasses = "bg-gray-700";

  const isAdmin = user?.is_superuser || user?.groups.some(g => g.name === 'Admin');
  const isRRHH = user?.groups.some(g => g.name === 'RRHH');
  // const isEncargado = user?.groups.some(g => g.name === 'Encargado');

  const canManageCore = isAdmin || isRRHH;

  const closeSidebar = () => setIsSidebarOpen(false);

  return (
    <div className="flex h-screen bg-gray-200 font-sans print:block print:h-auto print:overflow-visible print:bg-white overflow-hidden">

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 w-full bg-gray-800 text-white z-20 flex items-center justify-between p-4 shadow-md h-16">
        <h1 className="text-xl font-bold">RRHH Rolón</h1>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-1 focus:outline-none">
          <MenuIcon />
        </button>
      </div>

      {/* Overlay for mobile */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
          onClick={closeSidebar}
        ></div>
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-30 w-64 bg-gray-800 print:hidden transform transition-transform duration-300 ease-in-out
        md:relative md:translate-x-0 md:flex flex-col
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center justify-center h-20 shadow-md">
          <h1 className="text-2xl font-bold text-white">Recursos Humanos</h1>
        </div>
        <div className="flex flex-col flex-grow p-4 overflow-y-auto">
          <nav className="flex-grow">
            {canManageCore && (
              <>
                <NavLink to="/empleados" onClick={closeSidebar} className={({ isActive }) => `${navLinkClasses} ${isActive ? activeNavLinkClasses : ''}`}>
                  <UsersIcon />
                  <span className="mx-4">Empleados</span>
                </NavLink>
                <NavLink to="/departamentos" onClick={closeSidebar} className={({ isActive }) => `${navLinkClasses} ${isActive ? activeNavLinkClasses : ''}`}>
                  <OfficeBuildingIcon />
                  <span className="mx-4">Departamentos</span>
                </NavLink>
                <NavLink to="/cargos" onClick={closeSidebar} className={({ isActive }) => `${navLinkClasses} ${isActive ? activeNavLinkClasses : ''}`}>
                  <BriefcaseIcon />
                  <span className="mx-4">Cargos</span>
                </NavLink>
              </>
            )}
            <NavLink to="/permisos" onClick={closeSidebar} className={({ isActive }) => `${navLinkClasses} ${isActive ? activeNavLinkClasses : ''}`}>
              <ClockIcon />
              <span className="mx-4">Permisos</span>
            </NavLink>
            {/* Restrict Horas Extras visibility */}
            {(isAdmin || isRRHH || (user?.empleado_nombre && ['Alcira Fuentes Marcusi', 'Esteban Martinez Manuel'].includes(user.empleado_nombre))) && (
              <NavLink to="/horas-extras" onClick={closeSidebar} className={({ isActive }) => `${navLinkClasses} ${isActive ? activeNavLinkClasses : ''}`}>
                <ClockIcon />
                <span className="mx-4">Horas Extras</span>
              </NavLink>
            )}
            {(isAdmin || isRRHH) && (
              <>
                <NavLink to="/vacaciones" onClick={closeSidebar} className={({ isActive }) => `${navLinkClasses} ${isActive ? activeNavLinkClasses : ''}`}>
                  <ClockIcon />
                  <span className="mx-4">Vacaciones</span>
                </NavLink>
                <NavLink to="/cumpleanos" onClick={closeSidebar} className={({ isActive }) => `${navLinkClasses} ${isActive ? activeNavLinkClasses : ''}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 15.546c-.523 0-1.046.151-1.5.454a2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.701 2.701 0 00-1.5-.454M9 6v2m3-2v2m3-2v2M9 3h.01M12 3h.01M15 3h.01M21 21v-7a2 2 0 00-2-2H5a2 2 0 00-2 2v7h18zm-3-9v-2a2 2 0 00-2-2H8a2 2 0 00-2 2v2h12z" />
                  </svg>
                  <span className="mx-4">Cumpleaños</span>
                </NavLink>
              </>
            )}

            {/* Reportes: Admin y RRHH */}
            {(isAdmin || isRRHH) && (
              <>
                <hr className="my-4 border-gray-600" />
                <NavLink to="/reportes" onClick={closeSidebar} className={({ isActive }) => `${navLinkClasses} ${isActive ? activeNavLinkClasses : ''}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="mx-4">Reportes</span>
                </NavLink>
              </>
            )}

            {/* Admin-only Link: Usuarios */}
            {isAdmin && (
              <NavLink to="/admin-usuarios" onClick={closeSidebar} className={({ isActive }) => `${navLinkClasses} ${isActive ? activeNavLinkClasses : ''}`}>
                <ShieldCheckIcon />
                <span className="mx-4">Administrar Usuarios</span>
              </NavLink>
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
      <div className="flex flex-col flex-grow print:block print:h-auto print:overflow-visible pt-16 md:pt-0 h-screen overflow-hidden">
        <main className="flex-grow p-4 md:p-6 print:p-0 print:block print:h-auto print:overflow-visible overflow-y-auto">
          {/* Outlet para renderizar las páginas anidadas */}
          <Outlet />
        </main>
      </div>
    </div >
  );
};
