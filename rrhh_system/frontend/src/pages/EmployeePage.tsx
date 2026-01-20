// src/pages/EmployeePage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../AuthContext';
import { SearchableSelect } from '../components/SearchableSelect'; // Importar SearchableSelect
import { API_URL } from '../config';

interface Employee {
  id: number;
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string;
  ci: string;
  cargo_nombre: string;
  departamento_nombre: string;
  celular: string;
  estado: string; // Add estado
}

// Interfaz para el formato de opciones de SearchableSelect
interface SelectOption {
  id: number;
  nombre: string;
}

export const EmployeePage: React.FC = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [allEmployeesForSelect, setAllEmployeesForSelect] = useState<SelectOption[]>([]); // New state for SearchableSelect options
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState<SelectOption | null>(null); // Search term is now a selected option
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  // Effect to populate allEmployeesForSelect (for the searchable dropdown)
  useEffect(() => {
    const fetchAllEmployees = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/empleados/?no_pagination=true`, {
          headers: { 'Authorization': `Token ${token}` }
        });
        if (response.data && Array.isArray(response.data)) {
          const options = response.data.map((emp: Employee) => ({
            id: emp.id,
            nombre: `${emp.nombres} ${emp.apellido_paterno} ${emp.apellido_materno}`
          }));
          setAllEmployeesForSelect(options);
        }
      } catch (err) {
        console.error('Error fetching all employees for select:', err);
      }
    };
    fetchAllEmployees();
  }, [token]);


  useEffect(() => {
    // If a search term (selected employee) is present, use its name for filtering
    const term = searchTerm ? searchTerm.nombre : '';
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(term);
      setCurrentPage(1); // Reset to first page on new search
    }, 500); // 500ms debounce delay

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm]); // Depend on searchTerm (the selected option)

  const fetchEmployees = useCallback(async (page: number, search: string) => {
    try {
      setLoading(true);
      const url = `${API_URL}/api/empleados/?page=${page}&search=${search}`;

      const response = await axios.get(url, {
        headers: { 'Authorization': `Token ${token}` }
      });

      if (response.data && Array.isArray(response.data.results)) {
        setEmployees(response.data.results);
        setTotalPages(Math.ceil(response.data.count / 10)); // Assuming PAGE_SIZE is 10
      } else {
        setEmployees([]);
        setTotalPages(1);
      }
    } catch (err) {
      setError('No se pudo cargar la lista de empleados.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchEmployees(currentPage, debouncedSearchTerm);
  }, [fetchEmployees, currentPage, debouncedSearchTerm]);

  const handleDelete = async (id: number) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este empleado?')) {
      try {
        await axios.delete(`${API_URL}/api/empleados/${id}/`, {
          headers: { 'Authorization': `Token ${token}` }
        });
        fetchEmployees(currentPage, debouncedSearchTerm); // Refresh list on the current page
      } catch (err) {
        setError('No se pudo eliminar el empleado.');
      }
    }
  };

  if (loading) return <div>Cargando empleados...</div>;
  if (error) return <div className="text-red-500 bg-red-100 p-4 rounded-lg">{error}</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Gestión de Empleados</h1>
        <button onClick={() => navigate('/empleados/nuevo')} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 font-semibold shadow-md">
          Crear Nuevo Empleado
        </button>
      </div>

      {/* Barra de búsqueda con SearchableSelect */}
      <div className="mb-4">
        <SearchableSelect
          options={allEmployeesForSelect}
          selected={searchTerm} // Now selected is the actual search term
          onChange={(option) => setSearchTerm(option as SelectOption | null)}
          label="Buscar empleado por nombre o apellido"
        />
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md">

        {/* Vista Escritorio (Tabla) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre Completo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">CI</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cargo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Departamento</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {employees.map((emp) => (
                <tr key={emp.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {`${emp.nombres} ${emp.apellido_paterno} ${emp.apellido_materno}`}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{emp.ci}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{emp.cargo_nombre}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{emp.departamento_nombre}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${emp.estado === 'activo' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {emp.estado ? (emp.estado.charAt(0).toUpperCase() + emp.estado.slice(1)) : 'Activo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-right">
                    <button onClick={() => navigate(`/empleados/ver/${emp.id}`)} className="text-gray-600 hover:text-indigo-900 mr-4">Ver</button>
                    <button onClick={() => navigate(`/empleados/editar/${emp.id}`)} className="text-indigo-600 hover:text-indigo-900 mr-4">Editar</button>
                    <button onClick={() => handleDelete(emp.id)} className="text-red-600 hover:text-red-900">Eliminar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Vista Móvil (Tarjetas) */}
        <div className="md:hidden grid grid-cols-1 gap-4">
          {employees.map((emp) => (
            <div key={emp.id} className="bg-gray-50 p-4 rounded-lg border border-gray-200 shadow-sm flex flex-col gap-3">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{`${emp.nombres} ${emp.apellido_paterno}`}</h3>
                  <p className="text-sm text-gray-500">{emp.cargo_nombre}</p>
                </div>
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${emp.estado === 'activo' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {emp.estado ? (emp.estado.charAt(0).toUpperCase() + emp.estado.slice(1)) : 'Activo'}
                </span>
              </div>

              <div className="text-sm text-gray-600 space-y-1">
                <p><span className="font-semibold">CI:</span> {emp.ci}</p>
                <p><span className="font-semibold">Depto:</span> {emp.departamento_nombre}</p>
                <p><span className="font-semibold">Celular:</span> {emp.celular || 'N/A'}</p>
              </div>

              <div className="flex justify-end gap-3 mt-2 border-t border-gray-200 pt-2">
                <button onClick={() => navigate(`/empleados/ver/${emp.id}`)} className="text-gray-600 font-medium text-sm">Ver</button>
                <button onClick={() => navigate(`/empleados/editar/${emp.id}`)} className="text-indigo-600 font-medium text-sm">Editar</button>
                <button onClick={() => handleDelete(emp.id)} className="text-red-600 font-medium text-sm">Eliminar</button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex justify-between items-center">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md disabled:opacity-50 hover:shadow-md"
          >
            Anterior
          </button>
          <span>
            Página {currentPage} de {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md disabled:opacity-50 hover:shadow-md"
          >
            Siguiente
          </button>
        </div>
      </div>
    </div>
  );
};