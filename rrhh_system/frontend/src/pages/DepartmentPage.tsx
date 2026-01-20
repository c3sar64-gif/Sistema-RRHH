// src/pages/DepartmentPage.tsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../AuthContext';
import { Modal } from '../components/Modal';
import { SearchableSelect } from '../components/SearchableSelect';
import { API_URL } from '../config';

interface Department {
  id: number;
  nombre: string;
  jefe_departamento: number | null;
  jefe_departamento_info: {
    nombres: string;
    apellido_paterno: string;
    apellido_materno: string;
  } | null;
}

interface EmpleadoSimple {
  id: number;
  nombre: string;
}

export const DepartmentPage: React.FC = () => {
  const { token } = useAuth();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [allDepartmentsForSelect, setAllDepartmentsForSelect] = useState<EmpleadoSimple[]>([]); // New state for SearchableSelect options
  const [jefes, setJefes] = useState<EmpleadoSimple[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState<EmpleadoSimple | null>(null); // Search term is now a selected option
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [departmentName, setDepartmentName] = useState('');
  const [jefeId, setJefeId] = useState<number | null>(null);

  // Effect to populate allDepartmentsForSelect (for the searchable dropdown)
  useEffect(() => {
    const fetchAllDepartments = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/departamentos/?no_pagination=true`, {
          headers: { 'Authorization': `Token ${token}` }
        });
        if (response.data && Array.isArray(response.data)) {
          setAllDepartmentsForSelect(response.data);
        }
      } catch (err) {
        console.error('Error fetching all departments for select:', err);
      }
    };
    fetchAllDepartments();
  }, [token]);


  useEffect(() => {
    // If a search term (selected department) is present, use its name for filtering
    const term = searchTerm ? searchTerm.nombre : '';
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(term);
      setCurrentPage(1); // Reset to first page on new search
    }, 500); // 500ms debounce delay

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm]); // Depend on searchTerm (the selected option)

  const fetchDepartments = async (page: number, search: string) => {
    try {
      setLoading(true);
      const [deptosRes, empleadosRes] = await Promise.all([
        axios.get(`${API_URL}/api/departamentos/?page=${page}&search=${search}`, {
          headers: { 'Authorization': `Token ${token}` },
        }),
        axios.get(`${API_URL}/api/empleados/?no_pagination=true`, { // Fetch all employees for the dropdown
          headers: { 'Authorization': `Token ${token}` },
        }),
      ]);

      if (deptosRes.data && Array.isArray(deptosRes.data.results)) {
        setDepartments(deptosRes.data.results);
        setTotalPages(Math.ceil(deptosRes.data.count / 10));
      } else {
        setDepartments([]);
        setTotalPages(1);
      }

      if (empleadosRes.data && Array.isArray(empleadosRes.data)) {
        const jefesData = empleadosRes.data.map((e: any) => ({
          ...e,
          nombre: `${e.nombres} ${e.apellido_paterno} ${e.apellido_materno || ''}`.trim()
        }));
        setJefes(jefesData);
      } else {
        setJefes([]);
      }

    } catch (err) {
      setError('No se pudo cargar la lista de departamentos o empleados.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDepartments(currentPage, debouncedSearchTerm); }, [token, currentPage, debouncedSearchTerm]);

  const openModal = (dept: Department | null) => {
    setEditingDepartment(dept);
    setDepartmentName(dept ? dept.nombre : '');
    setJefeId(dept ? dept.jefe_departamento : null);
    setIsModalOpen(true);
    setError(null);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingDepartment(null);
    setDepartmentName('');
    setJefeId(null);
    setError(null);
  };

  const handleSubmit = async () => {
    const url = editingDepartment
      ? `${API_URL}/api/departamentos/${editingDepartment.id}/`
      : `${API_URL}/api/departamentos/`;

    const method = editingDepartment ? 'put' : 'post';
    const data = {
      nombre: departmentName,
      jefe_departamento: jefeId
    };

    try {
      await axios({
        method: method,
        url: url,
        data: data,
        headers: { 'Authorization': `Token ${token}` }
      });
      closeModal();
      fetchDepartments(currentPage, debouncedSearchTerm); // Refresh list
    } catch (err: any) {
      setError(`Error al guardar: ${JSON.stringify(err.response?.data)}`);
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este departamento?')) {
      try {
        await axios.delete(`${API_URL}/api/departamentos/${id}/`, {
          headers: { 'Authorization': `Token ${token}` }
        });
        fetchDepartments(currentPage, debouncedSearchTerm); // Refresh list
      } catch (err) {
        setError('No se pudo eliminar el departamento. Es posible que esté en uso por algún empleado.');
      }
    }
  };

  if (loading) return <div>Cargando departamentos...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Gestión de Departamentos</h1>
        <button onClick={() => openModal(null)} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 font-semibold shadow-md">
          Crear Nuevo Departamento
        </button>
      </div>

      <div className="mb-4">
        <SearchableSelect
          options={allDepartmentsForSelect}
          selected={searchTerm} // Now selected is the actual search term
          onChange={(option) => setSearchTerm(option as EmpleadoSimple | null)}
          label="Buscar departamentos"
        />
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md">

        {/* Vista Escritorio (Tabla) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre del Departamento</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Jefe de Departamento</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {departments.map((dept) => (
                <tr key={dept.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{dept.nombre}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{dept.jefe_departamento_info ? `${dept.jefe_departamento_info.nombres} ${dept.jefe_departamento_info.apellido_paterno} ${dept.jefe_departamento_info.apellido_materno || ''}`.trim() : 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-right">
                    <button onClick={() => openModal(dept)} className="text-indigo-600 hover:text-indigo-900 mr-4">Editar</button>
                    <button onClick={() => handleDelete(dept.id)} className="text-red-600 hover:text-red-900">Eliminar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Vista Móvil (Tarjetas) */}
        <div className="md:hidden grid grid-cols-1 gap-4">
          {departments.map((dept) => (
            <div key={dept.id} className="bg-gray-50 p-4 rounded-lg border border-gray-200 shadow-sm flex flex-col gap-2">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{dept.nombre}</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    <span className="font-semibold">Jefe:</span> {dept.jefe_departamento_info ? `${dept.jefe_departamento_info.nombres} ${dept.jefe_departamento_info.apellido_paterno}` : 'N/A'}
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-2 border-t border-gray-200 pt-2">
                <button onClick={() => openModal(dept)} className="text-indigo-600 font-medium text-sm">Editar</button>
                <button onClick={() => handleDelete(dept.id)} className="text-red-600 font-medium text-sm">Eliminar</button>
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

      <Modal isOpen={isModalOpen} onClose={closeModal}>
        <div>
          <h2 className="text-2xl font-bold mb-6">{editingDepartment ? 'Editar Departamento' : 'Crear Nuevo Departamento'}</h2>
          {error && <div className="text-red-500 bg-red-100 p-3 rounded-lg mb-4">{error}</div>}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Nombre del Departamento</label>
              <input
                type="text"
                value={departmentName}
                onChange={(e) => setDepartmentName(e.target.value)}
                className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2.5"
              />
            </div>
            <div>
              <SearchableSelect
                label="Jefe de Departamento"
                options={jefes}
                selected={jefes.find(j => j.id === jefeId) || null}
                onChange={(option) => setJefeId(option ? option.id : null)}
              />
            </div>
          </div>
          <div className="flex justify-end mt-8">
            <button onClick={closeModal} className="mr-3 px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 font-semibold">Cancelar</button>
            <button onClick={handleSubmit} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 font-semibold">Guardar</button>
          </div>
        </div>
      </Modal>
    </div>
  );
};