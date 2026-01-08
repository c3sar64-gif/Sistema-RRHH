// src/pages/EmployeePage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../AuthContext';
import { SearchableSelect } from '../components/SearchableSelect'; // Importar SearchableSelect

interface Employee {
  id: number;
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string;
  ci: string;
  cargo_nombre: string;
  departamento_nombre: string;
  celular: string;
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Eliminar searchTerm y debouncedSearchTerm, ya no son necesarios para la búsqueda directa aquí
  const [selectedEmployee, setSelectedEmployee] = useState<SelectOption | null>(null); // Nuevo estado para el empleado seleccionado

  const fetchEmployees = useCallback(async () => {
    try {
      setLoading(true);
      // Ahora siempre traemos todos los empleados o una lista completa para el SearchableSelect
      const url = 'http://127.0.0.1:8000/api/empleados/'; // Obtener todos los empleados
      
      const response = await axios.get(url, {
        headers: { 'Authorization': `Token ${token}` }
      });
      if (response.data && Array.isArray(response.data)) {
        setEmployees(response.data);
      } else {
        setEmployees([]);
      }
    } catch (err) {
      setError('No se pudo cargar la lista de empleados.');
    } finally {
      setLoading(false);
    }
  }, [token]); // token como única dependencia, ya no depende de debouncedSearchTerm

  useEffect(() => { fetchEmployees(); }, [fetchEmployees]);

  // Manejador para cuando se selecciona un empleado del SearchableSelect
  const handleEmployeeSelect = (employeeOption: SelectOption | null) => {
    setSelectedEmployee(employeeOption);
    if (employeeOption) {
      navigate(`/empleados/ver/${employeeOption.id}`); // Navegar al detalle del empleado seleccionado
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este empleado?')) {
      try {
        await axios.delete(`http://127.0.0.1:8000/api/empleados/${id}/`, { // Corregir la URL del backend
          headers: { 'Authorization': `Token ${token}` }
        });
        fetchEmployees(); // Actualizar lista
      } catch (err) {
        setError('No se pudo eliminar el empleado.');
      }
    }
  };

  if (loading) return <div>Cargando empleados...</div>;
  if (error) return <div className="text-red-500 bg-red-100 p-4 rounded-lg">{error}</div>;

  // Mapear los empleados a un formato compatible con SearchableSelect
  const employeeOptions: SelectOption[] = employees.map(emp => ({
    id: emp.id,
    nombre: `${emp.nombres} ${emp.apellido_paterno} ${emp.apellido_materno}`
  }));

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Gestión de Empleados</h1>
        <button onClick={() => navigate('/empleados/nuevo')} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 font-semibold shadow-md">
          Crear Nuevo Empleado
        </button>
      </div>

      {/* Barra de búsqueda con SearchableSelect */}
      <div className="mb-6">
        <SearchableSelect
          options={employeeOptions}
          selected={selectedEmployee}
          onChange={handleEmployeeSelect}
          label="Buscar empleado"
        />
      </div>
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre Completo</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">CI</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cargo</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Departamento</th>
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
      </div>
    </div>
  );
};