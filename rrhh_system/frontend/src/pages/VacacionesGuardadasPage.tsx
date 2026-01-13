import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../AuthContext';
import { SearchableSelect } from '../components/SearchableSelect';

interface SelectOption {
    id: number;
    nombre: string;
}

interface VacacionGuardada {
    id: number;
    empleado: number;
    empleado_nombre: string;
    dias: string;
    gestion: string;
    fecha_creacion: string;
    departamento_nombre?: string;
    contrato_nombre?: string;
}

const VacacionesGuardadasPage: React.FC = () => {
    const { token } = useAuth();
    const [employeeOptions, setEmployeeOptions] = useState<SelectOption[]>([]);
    const [selectedEmployeeOption, setSelectedEmployeeOption] = useState<SelectOption | null>(null);
    const [saldoGuardado, setSaldoGuardado] = useState<string>('');
    const [gestion, setGestion] = useState<string>('');
    const [listaGuardadas, setListaGuardadas] = useState<VacacionGuardada[]>([]);
    const [loading, setLoading] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);

    useEffect(() => {
        fetchEmpleados();
        fetchGuardadas();
    }, [token]);

    const fetchEmpleados = async () => {
        try {
            const response = await axios.get('http://127.0.0.1:8000/api/empleados/?no_pagination=true', {
                headers: { Authorization: `Token ${token}` }
            });
            const data = response.data.results || response.data;
            if (Array.isArray(data)) {
                const options = data.map((emp: any) => ({
                    id: emp.id,
                    nombre: `${emp.nombres} ${emp.apellido_paterno} ${emp.apellido_materno || ''}`.trim()
                }));
                // Sort by name
                options.sort((a: SelectOption, b: SelectOption) => a.nombre.localeCompare(b.nombre));
                setEmployeeOptions(options);
            }
        } catch (error) {
            console.error("Error fetching empleados", error);
        }
    };

    const fetchGuardadas = async () => {
        try {
            setLoading(true);
            const response = await axios.get('http://127.0.0.1:8000/api/vacaciones-guardadas/', {
                headers: { Authorization: `Token ${token}` }
            });
            const data = response.data.results || response.data;
            setListaGuardadas(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Error fetching guardadas", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!selectedEmployeeOption && !editingId) {
            alert("Seleccione un empleado.");
            return;
        }
        if (saldoGuardado === '' || isNaN(Number(saldoGuardado))) {
            alert("Ingrese una cantidad de días válida.");
            return;
        }

        const payload = {
            empleado: selectedEmployeeOption?.id,
            dias: saldoGuardado,
            gestion: gestion
        };

        try {
            if (editingId) {
                // For edit, we might not change employee, so payload might need adjustment if logic requires.
                // But usually we just update dias/gestion.
                // Assuming employee can't be changed on edit easily without reselections, or we strictly follow ID.
                // Let's just update dias and gestion for Edit.
                await axios.patch(`http://127.0.0.1:8000/api/vacaciones-guardadas/${editingId}/`, {
                    dias: saldoGuardado,
                    gestion: gestion
                }, {
                    headers: { Authorization: `Token ${token}` }
                });
                alert("Registro actualizado.");
            } else {
                await axios.post('http://127.0.0.1:8000/api/vacaciones-guardadas/', payload, {
                    headers: { Authorization: `Token ${token}` }
                });
                alert("Vacaciones guardadas registradas.");
            }

            resetForm();
            fetchGuardadas();
        } catch (error) {
            console.error("Error saving vacaciones guardadas", error);
            alert("Error al guardar.");
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm("¿Seguro que desea eliminar este registro?")) return;
        try {
            await axios.delete(`http://127.0.0.1:8000/api/vacaciones-guardadas/${id}/`, {
                headers: { Authorization: `Token ${token}` }
            });
            fetchGuardadas();
        } catch (error) {
            console.error("Error deleting", error);
            alert("Error al eliminar.");
        }
    }

    const handleEdit = (item: VacacionGuardada) => {
        setEditingId(item.id);
        const empOption = employeeOptions.find(opt => opt.id === item.empleado) || { id: item.empleado, nombre: item.empleado_nombre };
        setSelectedEmployeeOption(empOption);
        setSaldoGuardado(item.dias);
        setGestion(item.gestion || '');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const resetForm = () => {
        setEditingId(null);
        setSelectedEmployeeOption(null);
        setSaldoGuardado('');
        setGestion('');
    }

    return (
        <div className="min-h-screen bg-gray-100 p-6">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Gestión de Vacaciones Guardadas</h1>

            <div className="bg-white p-6 rounded-lg shadow-md mb-8">
                <h2 className="text-xl font-semibold mb-4 text-gray-700">{editingId ? 'Editar Registro' : 'Nueva Asignación'}</h2>
                <div className="flex flex-col md:flex-row gap-4 items-end">
                    <div className="w-full md:w-1/3">
                        <SearchableSelect
                            label="Empleado"
                            options={employeeOptions}
                            selected={selectedEmployeeOption}
                            onChange={(option) => setSelectedEmployeeOption(option)}
                            disabled={!!editingId} // Disable employee change on edit to be safe/simple
                        />
                    </div>
                    <div className="w-full md:w-1/5">
                        <label className="block text-gray-700 text-sm font-bold mb-2">Días</label>
                        <input
                            type="number"
                            step="0.5"
                            value={saldoGuardado}
                            onChange={(e) => setSaldoGuardado(e.target.value)}
                            className="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="Ej. 15.0"
                        />
                    </div>
                    <div className="w-full md:w-1/4">
                        <label className="block text-gray-700 text-sm font-bold mb-2">Gestión / Motivo</label>
                        <input
                            type="text"
                            value={gestion}
                            onChange={(e) => setGestion(e.target.value)}
                            className="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="Ej. 2022-2023"
                        />
                    </div>
                    <div className="w-full md:w-auto pb-1 flex gap-2">
                        <button
                            onClick={handleSave}
                            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition shadow font-semibold"
                        >
                            {editingId ? 'Actualizar' : 'Guardar'}
                        </button>
                        {editingId && (
                            <button
                                onClick={resetForm}
                                className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 transition shadow"
                            >
                                Cancelar
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="p-4 bg-gray-50 border-b">
                    <h2 className="text-lg font-semibold text-gray-700">Historial de Vacaciones Guardadas</h2>
                </div>
                {loading ? (
                    <div className="p-8 text-center text-gray-500">Cargando...</div>
                ) : listaGuardadas.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">No hay registros.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Empleado</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contrato Origen</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Días</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gestión / Motivo</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha Registro</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {listaGuardadas.map((item) => (
                                    <tr key={item.id} className="hover:bg-gray-50 transition">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {item.empleado_nombre}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 italic">
                                            {item.contrato_nombre || 'N/A'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                                {item.dias}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {item.gestion || '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {item.fecha_creacion}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button
                                                onClick={() => handleEdit(item)}
                                                className="text-indigo-600 hover:text-indigo-900 mr-4"
                                            >
                                                Editar
                                            </button>
                                            <button
                                                onClick={() => handleDelete(item.id)}
                                                className="text-red-600 hover:text-red-900"
                                            >
                                                Eliminar
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VacacionesGuardadasPage;
