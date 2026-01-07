// src/pages/DepartmentPage.tsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../AuthContext';
import { Modal } from '../components/Modal';

interface Department {
  id: number;
  nombre: string;
}

export const DepartmentPage: React.FC = () => {
  const { token } = useAuth();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [departmentName, setDepartmentName] = useState('');

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://127.0.0.1:8000/api/departamentos/', {
        headers: { 'Authorization': `Token ${token}` }
      });
      if (response.data && Array.isArray(response.data)) {
        setDepartments(response.data);
      } else {
        setDepartments([]);
      }
    } catch (err) {
      setError('No se pudo cargar la lista de departamentos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDepartments(); }, [token]);

  const openModal = (dept: Department | null) => {
    setEditingDepartment(dept);
    setDepartmentName(dept ? dept.nombre : '');
    setIsModalOpen(true);
    setError(null);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingDepartment(null);
    setDepartmentName('');
    setError(null);
  };

  const handleSubmit = async () => {
    const url = editingDepartment 
      ? `http://127.0.0.1:8000/api/departamentos/${editingDepartment.id}/`
      : 'http://127.0.0.1:8000/api/departamentos/';
    
    const method = editingDepartment ? 'put' : 'post';

    try {
      await axios({
        method: method,
        url: url,
        data: { nombre: departmentName },
        headers: { 'Authorization': `Token ${token}` }
      });
      closeModal();
      fetchDepartments(); // Refresh list
    } catch (err: any) {
      setError(`Error al guardar: ${err.response?.data?.nombre || 'El nombre no puede estar vacío.'}`);
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este departamento?')) {
      try {
        await axios.delete(`http://127.0.0.1:8000/api/departamentos/${id}/`, {
          headers: { 'Authorization': `Token ${token}` }
        });
        fetchDepartments(); // Refresh list
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
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre del Departamento</th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {departments.map((dept) => (
                        <tr key={dept.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{dept.nombre}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-right">
                                <button onClick={() => openModal(dept)} className="text-indigo-600 hover:text-indigo-900 mr-4">Editar</button>
                                <button onClick={() => handleDelete(dept.id)} className="text-red-600 hover:text-red-900">Eliminar</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
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