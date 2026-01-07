import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './App.css'; // Re-use some basic styling

interface Cargo {
  id: number;
  nombre: string;
}

function Cargos() {
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Form state
  const [editingCargo, setEditingCargo] = useState<Cargo | null>(null);
  const [cargoName, setCargoName] = useState('');
  
  // Pagination State
  const [count, setCount] = useState(0);
  const [nextUrl, setNextUrl] = useState<string | null>(null);
  const [prevUrl, setPrevUrl] = useState<string | null>(null);

  const fetchCargos = useCallback(async (url: string = 'http://127.0.0.1:8000/api/cargos/') => {
    setLoading(true);
    try {
      const response = await axios.get(url);
      setCargos(response.data.results);
      setCount(response.data.count);
      setNextUrl(response.data.next);
      setPrevUrl(response.data.previous);
      setError('');
    } catch (err) {
      setError('Failed to load positions.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCargos();
  }, [fetchCargos]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!cargoName.trim()) {
      setError('Position name cannot be empty.');
      return;
    }

    const endpoint = editingCargo
      ? `http://127.0.0.1:8000/api/cargos/${editingCargo.id}/`
      : 'http://127.0.0.1:8000/api/cargos/';
    
    const method = editingCargo ? 'put' : 'post';

    try {
      await axios[method](endpoint, { nombre: cargoName });
      setCargoName('');
      setEditingCargo(null);
      fetchCargos(); // Refetch the first page
    } catch (err) {
      setError(`Failed to ${editingCargo ? 'update' : 'create'} position.`);
      console.error(err);
    }
  };

  const handleEdit = (cargo: Cargo) => {
    setEditingCargo(cargo);
    setCargoName(cargo.nombre);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this position? This might affect employees with this role.')) {
      try {
        await axios.delete(`http://127.0.0.1:8000/api/cargos/${id}/`);
        fetchCargos(); // Refetch the first page
      } catch (err) {
        setError('Failed to delete position.');
        console.error(err);
      }
    }
  };

  const cancelEdit = () => {
    setEditingCargo(null);
    setCargoName('');
  }

  const PaginationControls = (
    <div className="pagination-controls">
        <span>Total: {count}</span>
        <button onClick={() => fetchCargos(prevUrl!)} disabled={!prevUrl}>Previous</button>
        <button onClick={() => fetchCargos(nextUrl!)} disabled={!nextUrl}>Next</button>
    </div>
  );

  if (loading && cargos.length === 0) {
    return <div>Loading positions...</div>;
  }

  return (
    <div>
      <h2>{editingCargo ? 'Edit Position' : 'Create New Position'}</h2>
      <form onSubmit={handleSubmit} style={{ marginBottom: '20px' }}>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <input
          type="text"
          value={cargoName}
          onChange={(e) => setCargoName(e.target.value)}
          placeholder="Position name"
          required
        />
        <button type="submit">{editingCargo ? 'Update' : 'Create'}</button>
        {editingCargo && <button type="button" onClick={cancelEdit} style={{ marginLeft: '10px' }}>Cancel</button>}
      </form>
      
      {PaginationControls}
      {loading && <p>Loading...</p>}
      <table>
        <thead>
          <tr>
            <th>Position Name</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {cargos.map(cargo => (
            <tr key={cargo.id}>
              <td>{cargo.nombre}</td>
              <td className="actions-cell">
                <button onClick={() => handleEdit(cargo)} className="edit-button">Edit</button>
                <button onClick={() => handleDelete(cargo.id)} className="delete-button">Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {PaginationControls}
    </div>
  );
}

export default Cargos;