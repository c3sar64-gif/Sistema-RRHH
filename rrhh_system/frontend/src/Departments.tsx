import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './App.css'; // Re-use some basic styling

interface Departamento {
  id: number;
  nombre: string;
}

function Departments() {
  const [departments, setDepartments] = useState<Departamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Form state
  const [editingDepartment, setEditingDepartment] = useState<Departamento | null>(null);
  const [departmentName, setDepartmentName] = useState('');

  // Pagination State
  const [count, setCount] = useState(0);
  const [nextUrl, setNextUrl] = useState<string | null>(null);
  const [prevUrl, setPrevUrl] = useState<string | null>(null);

  const fetchDepartments = useCallback(async (url: string = 'http://127.0.0.1:8000/api/departamentos/') => {
    setLoading(true);
    try {
      const response = await axios.get(url);
      setDepartments(response.data.results);
      setCount(response.data.count);
      setNextUrl(response.data.next);
      setPrevUrl(response.data.previous);
      setError('');
    } catch (err) {
      setError('Failed to load departments.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!departmentName.trim()) {
      setError('Department name cannot be empty.');
      return;
    }

    const endpoint = editingDepartment
      ? `http://127.0.0.1:8000/api/departamentos/${editingDepartment.id}/`
      : 'http://127.0.0.1:8000/api/departamentos/';
    
    const method = editingDepartment ? 'put' : 'post';

    try {
      await axios[method](endpoint, { nombre: departmentName });
      setDepartmentName('');
      setEditingDepartment(null);
      fetchDepartments(); // Refetch the first page
    } catch (err) {
      setError(`Failed to ${editingDepartment ? 'update' : 'create'} department.`);
      console.error(err);
    }
  };

  const handleEdit = (department: Departamento) => {
    setEditingDepartment(department);
    setDepartmentName(department.nombre);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this department? This might affect employees in it.')) {
      try {
        await axios.delete(`http://127.0.0.1:8000/api/departamentos/${id}/`);
        fetchDepartments(); // Refetch the first page
      } catch (err) {
        setError('Failed to delete department.');
        console.error(err);
      }
    }
  };

  const cancelEdit = () => {
    setEditingDepartment(null);
    setDepartmentName('');
  }

  const PaginationControls = (
    <div className="pagination-controls">
        <span>Total: {count}</span>
        <button onClick={() => fetchDepartments(prevUrl!)} disabled={!prevUrl}>Previous</button>
        <button onClick={() => fetchDepartments(nextUrl!)} disabled={!nextUrl}>Next</button>
    </div>
  );

  if (loading && departments.length === 0) { // Only show full-page loader on initial load
    return <div>Loading departments...</div>;
  }

  return (
    <div>
      <h2>{editingDepartment ? 'Edit Department' : 'Create New Department'}</h2>
      <form onSubmit={handleSubmit} style={{ marginBottom: '20px' }}>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <input
          type="text"
          value={departmentName}
          onChange={(e) => setDepartmentName(e.target.value)}
          placeholder="Department name"
          required
        />
        <button type="submit">{editingDepartment ? 'Update' : 'Create'}</button>
        {editingDepartment && <button type="button" onClick={cancelEdit} style={{ marginLeft: '10px' }}>Cancel</button>}
      </form>

      {PaginationControls}
      {loading && <p>Loading...</p>}
      <table>
        <thead>
          <tr>
            <th>Department Name</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {departments.map(dep => (
            <tr key={dep.id}>
              <td>{dep.nombre}</td>
              <td className="actions-cell">
                <button onClick={() => handleEdit(dep)} className="edit-button">Edit</button>
                <button onClick={() => handleDelete(dep.id)} className="delete-button">Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {PaginationControls}
    </div>
  );
}

export default Departments;