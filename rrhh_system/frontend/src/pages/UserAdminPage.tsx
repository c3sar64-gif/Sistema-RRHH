// src/pages/UserAdminPage.tsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../AuthContext';
import { Modal } from '../components/Modal';

interface ApiUser {
  id: number;
  username: string;
  email: string;
  groups: { name: string }[];
  empleado_id: number | null;
  empleado_nombre: string | null;
}

interface SimpleEmployee {
  id: number;
  nombres: string;
  apellido_paterno: string;
  apellido_materno?: string;
}

export const UserAdminPage: React.FC = () => {
  const { token } = useAuth();
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [employees, setEmployees] = useState<SimpleEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for Edit Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<ApiUser | null>(null);
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [selectedEmail, setSelectedEmail] = useState('');

  // State for Create Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newUser, setNewUser] = useState({ username: '', email: '', password: '', role: 'Empleado' });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [usersResponse, employeesResponse] = await Promise.all([
        axios.get('http://127.0.0.1:8000/api/users/', { headers: { 'Authorization': `Token ${token}` } }),
        axios.get('http://127.0.0.1:8000/api/empleados/?no_pagination=true', { headers: { 'Authorization': `Token ${token}` } })
      ]);

      if (usersResponse.data && Array.isArray(usersResponse.data.results)) {
        setUsers(usersResponse.data.results);
      } else {
        setUsers([]);
      }

      const empData = employeesResponse.data.results || employeesResponse.data;
      setEmployees(empData);

    } catch (err) {
      setError('No se pudo cargar la lista de usuarios. ¿Tienes permisos de Administrador?');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [token]);

  const handleDelete = async (userId: number) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este usuario?')) {
      try {
        await axios.delete(`http://127.0.0.1:8000/api/users/${userId}/`, {
          headers: { 'Authorization': `Token ${token}` }
        });
        setUsers(users.filter(user => user.id !== userId));
      } catch (err) { setError('No se pudo eliminar el usuario.'); }
    }
  };

  const openEditModal = (user: ApiUser) => {
    setEditingUser(user);
    setSelectedRole(user.groups[0]?.name || 'Empleado');
    setSelectedEmployeeId(user.empleado_id ? user.empleado_id.toString() : '');
    setSelectedEmail(user.email || '');
    setIsEditModalOpen(true);
  };

  const handleUserUpdate = async () => {
    if (!editingUser) return;
    try {
      const payload: any = {
        role: selectedRole,
        email: selectedEmail
      };
      if (selectedEmployeeId) {
        payload.empleado_id = parseInt(selectedEmployeeId);
      } else {
        payload.empleado_id = "";
      }

      const response = await axios.patch(`http://127.0.0.1:8000/api/users/${editingUser.id}/`, payload, {
        headers: { 'Authorization': `Token ${token}` }
      });
      setUsers(users.map(user => user.id === editingUser.id ? response.data : user));
      setIsEditModalOpen(false);
    } catch (err: any) {
      setError(`Error al actualizar: ${err.response?.data?.error || JSON.stringify(err.response?.data) || 'Error desconocido'}`);
    }
  };

  const handleCreateUser = async () => {
    try {
      await axios.post('http://127.0.0.1:8000/api/register/', newUser, {
        headers: { 'Authorization': `Token ${token}` }
      });
      setIsCreateModalOpen(false);
      setNewUser({ username: '', email: '', password: '', role: 'Empleado' }); // Reset form
      fetchData(); // Refresh list
    } catch (err: any) {
      const errorData = err.response?.data;
      const errorMsg = [errorData?.username, errorData?.email, errorData?.password].filter(Boolean).join(' ');
      setError(`Error al crear usuario: ${errorMsg || 'Datos inválidos.'}`);
    }
  };

  const handleCreateFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setNewUser({
      ...newUser,
      [e.target.name]: e.target.value
    });
  }

  if (loading) return <div>Cargando usuarios...</div>;
  if (error) return <div className="text-red-500 bg-red-100 p-4 rounded-lg">{error}</div>;

  const inputStyles = "block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2.5";

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Administración de Usuarios</h1>
        <button onClick={() => setIsCreateModalOpen(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 font-semibold shadow-md">
          Crear Nuevo Usuario
        </button>
      </div>
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Empleado Vinculado</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Roles</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.username}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.empleado_nombre ? (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        {user.empleado_nombre}
                      </span>
                    ) : <span className="text-gray-400 italic">No vinculado</span>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                      {user.groups.map(g => g.name).join(', ') || 'Empleado'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button onClick={() => openEditModal(user)} className="text-indigo-600 hover:text-indigo-900 mr-4">Editar</button>
                    <button onClick={() => handleDelete(user.id)} className="text-red-600 hover:text-red-900">Eliminar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)}>
        {editingUser && (
          <div className="w-96">
            <h2 className="text-2xl font-bold mb-6">Editar Usuario {editingUser.username}</h2>

            <div className="mb-4">
              <label htmlFor="email-edit" className="block text-sm font-medium text-gray-700 mb-2">Correo Electrónico</label>
              <input
                type="email"
                id="email-edit"
                value={selectedEmail}
                onChange={(e) => setSelectedEmail(e.target.value)}
                className={inputStyles}
              />
            </div>

            <div className="mb-4">
              <label htmlFor="role-select" className="block text-sm font-medium text-gray-700 mb-2">Rol de Sistema</label>
              <select
                id="role-select"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className={inputStyles}
              >
                <option>Empleado</option>
                <option>Jefe de Departamento</option>
                <option>RRHH</option>
                <option>Admin</option>
                <option>Porteria</option>
              </select>
            </div>

            <div className="mb-4">
              <label htmlFor="employee-select" className="block text-sm font-medium text-gray-700 mb-2">Vincular a Empleado</label>
              <select
                id="employee-select"
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                className={inputStyles}
              >
                <option value="">-- Sin vincular --</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.nombres} {emp.apellido_paterno} {emp.apellido_materno || ''}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">Selecciona el empleado que corresponde a este usuario.</p>
            </div>

            <div className="flex justify-end mt-8">
              <button onClick={() => setIsEditModalOpen(false)} className="mr-3 px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 font-semibold">Cancelar</button>
              <button onClick={handleUserUpdate} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 font-semibold">Guardar Cambios</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Create Modal */}
      <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)}>
        <div>
          <h2 className="text-2xl font-bold mb-6">Crear Nuevo Usuario</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Nombre de Usuario</label>
              <input type="text" name="username" value={newUser.username} onChange={handleCreateFormChange} className={inputStyles} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Correo Electrónico</label>
              <input type="email" name="email" value={newUser.email} onChange={handleCreateFormChange} className={inputStyles} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Contraseña</label>
              <input type="password" name="password" value={newUser.password} onChange={handleCreateFormChange} className={inputStyles} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Rol</label>
              <select name="role" value={newUser.role} onChange={handleCreateFormChange} className={inputStyles}>
                <option>Empleado</option>
                <option>RRHH</option>
                <option>Admin</option>
                <option>Jefe de Departamento</option>
                <option>Porteria</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end mt-8">
            <button onClick={() => setIsCreateModalOpen(false)} className="mr-3 px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 font-semibold">Cancelar</button>
            <button onClick={handleCreateUser} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 font-semibold">Crear Usuario</button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
