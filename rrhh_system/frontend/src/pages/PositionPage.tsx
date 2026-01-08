// src/pages/PositionPage.tsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../AuthContext';
import { Modal } from '../components/Modal';
import { SearchableSelect } from '../components/SearchableSelect'; // Importar SearchableSelect

interface Position {
  id: number;
  nombre: string;
}

// Interfaz para el formato de opciones de SearchableSelect
interface SelectOption {
  id: number;
  nombre: string;
}

export const PositionPage: React.FC = () => {
  const { token } = useAuth();
  const [positions, setPositions] = useState<Position[]>([]);
  const [allPositionsForSelect, setAllPositionsForSelect] = useState<SelectOption[]>([]); // New state for SearchableSelect options
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState<SelectOption | null>(null); // Search term is now a selected option
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPosition, setEditingPosition] = useState<Position | null>(null);
  const [positionName, setPositionName] = useState('');

  // Effect to populate allPositionsForSelect (for the searchable dropdown)
  useEffect(() => {
    const fetchAllPositions = async () => {
      try {
        const response = await axios.get('http://127.0.0.1:8000/api/cargos/?no_pagination=true', {
          headers: { 'Authorization': `Token ${token}` }
        });
        if (response.data && Array.isArray(response.data)) {
          setAllPositionsForSelect(response.data);
        }
      } catch (err) {
        console.error('Error fetching all positions for select:', err);
      }
    };
    fetchAllPositions();
  }, [token]);

  useEffect(() => {
    // If a search term (selected position) is present, use its name for filtering
    const term = searchTerm ? searchTerm.nombre : '';
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(term);
      setCurrentPage(1); // Reset to first page on new search
    }, 500); // 500ms debounce delay

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm]); // Depend on searchTerm (the selected option)

  const fetchPositions = async (page: number, search: string) => {
    try {
      setLoading(true);
      const response = await axios.get(`http://127.0.0.1:8000/api/cargos/?page=${page}&search=${search}`, {
        headers: { 'Authorization': `Token ${token}` }
      });
      if (response.data && Array.isArray(response.data.results)) {
        setPositions(response.data.results);
        setTotalPages(Math.ceil(response.data.count / 10)); // Assuming PAGE_SIZE is 10
      } else {
        setPositions([]);
        setTotalPages(1);
      }
    } catch (err) {
      setError('No se pudo cargar la lista de cargos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPositions(currentPage, debouncedSearchTerm); }, [token, currentPage, debouncedSearchTerm]);

  const openModal = (pos: Position | null) => {
    setEditingPosition(pos);
    setPositionName(pos ? pos.nombre : '');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingPosition(null);
    setPositionName('');
    setError(null);
  };

  const handleSubmit = async () => {
    const url = editingPosition 
      ? `http://127.0.0.1:8000/api/cargos/${editingPosition.id}/`
      : 'http://127.0.0.1:8000/api/cargos/';
    
    const method = editingPosition ? 'put' : 'post';

    try {
      await axios({
        method: method,
        url: url,
        data: { nombre: positionName },
        headers: { 'Authorization': `Token ${token}` }
      });
      closeModal();
      fetchPositions(currentPage, debouncedSearchTerm); // Refresh list
    } catch (err: any) {
      setError(`Error al guardar el cargo: ${err.response?.data?.nombre || 'Error desconocido'}`);
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este cargo?')) {
      try {
        await axios.delete(`http://127.0.0.1:8000/api/cargos/${id}/`, {
          headers: { 'Authorization': `Token ${token}` }
        });
        fetchPositions(currentPage, debouncedSearchTerm); // Refresh list
      } catch (err) {
        setError('No se pudo eliminar el cargo.');
      }
    }
  };

  if (loading) return <div>Cargando cargos...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Gestión de Cargos</h1>
        <button onClick={() => openModal(null)} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 font-semibold shadow-md">
          Crear Nuevo Cargo
        </button>
      </div>

      <div className="mb-4">
        <SearchableSelect
          options={allPositionsForSelect}
          selected={searchTerm} // Now selected is the actual search term
          onChange={(option) => setSearchTerm(option as SelectOption | null)}
          label="Buscar cargos"
        />
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre del Cargo</th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {positions.map((pos) => (
                        <tr key={pos.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{pos.nombre}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-right">
                                <button onClick={() => openModal(pos)} className="text-indigo-600 hover:text-indigo-900 mr-4">Editar</button>
                                <button onClick={() => handleDelete(pos.id)} className="text-red-600 hover:text-red-900">Eliminar</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
        <div className="mt-4 flex justify-between items-center">
            <button 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} 
                disabled={currentPage === 1}
                className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md disabled:opacity-50"
            >
                Anterior
            </button>
            <span>
                Página {currentPage} de {totalPages}
            </span>
            <button 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} 
                disabled={currentPage === totalPages}
                className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md disabled:opacity-50"
            >
                Siguiente
            </button>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={closeModal}>
        <div>
            <h2 className="text-2xl font-bold mb-6">{editingPosition ? 'Editar Cargo' : 'Crear Nuevo Cargo'}</h2>
            {error && <div className="text-red-500 bg-red-100 p-3 rounded-lg mb-4">{error}</div>}
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Nombre del Cargo</label>
                    <input 
                      type="text" 
                      value={positionName} 
                      onChange={(e) => setPositionName(e.target.value)} 
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