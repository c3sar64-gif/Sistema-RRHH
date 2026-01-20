import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../AuthContext';
import { SearchableSelect } from '../components/SearchableSelect';
import { API_URL } from '../config';

interface SelectOption {
    id: number;
    nombre: string;
}

interface LedgerItem {
    id: number;
    uniq_key: string;
    type: 'guardada' | 'solicitud';
    empleado: number;
    empleado_nombre: string;
    fecha: string;
    detalle: string;
    dias: number; // Remaining days (or active days)
    dias_originales?: number;
    original_item: any;
}

const VacacionesGuardadasPage: React.FC = () => {
    const { token } = useAuth();
    const [employeeOptions, setEmployeeOptions] = useState<SelectOption[]>([]);
    const [selectedEmployeeOption, setSelectedEmployeeOption] = useState<SelectOption | null>(null);
    const [saldoGuardado, setSaldoGuardado] = useState<string>('');
    const [fecha, setFecha] = useState<string>(new Date().toISOString().split('T')[0]);
    const [gestion, setGestion] = useState<string>('');
    const [ledgerItems, setLedgerItems] = useState<LedgerItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);

    useEffect(() => {
        fetchEmpleados();
        fetchLedgerData();
    }, [token]);

    const fetchEmpleados = async () => {
        try {
            const response = await axios.get(`${API_URL}/api/empleados/?no_pagination=true`, {
                headers: { Authorization: `Token ${token}` }
            });
            const data = response.data.results || response.data;
            if (Array.isArray(data)) {
                const options = data.map((emp: any) => ({
                    id: emp.id,
                    nombre: `${emp.nombres} ${emp.apellido_paterno} ${emp.apellido_materno || ''}`.trim()
                }));
                options.sort((a: SelectOption, b: SelectOption) => a.nombre.localeCompare(b.nombre));
                setEmployeeOptions(options);
            }
        } catch (error) {
            console.error("Error fetching empleados", error);
        }
    };

    const fetchLedgerData = async () => {
        try {
            setLoading(true);

            // 1. Fetch Employees for dropdown (needed for filtering/manual entry)
            const resEmp = await axios.get(`${API_URL}/api/empleados/?no_pagination=true`, {
                headers: { Authorization: `Token ${token}` }
            });
            const emps = resEmp.data.results || resEmp.data;

            if (Array.isArray(emps)) {
                const options = emps.map((emp: any) => ({
                    id: emp.id,
                    nombre: `${emp.nombres} ${emp.apellido_paterno} ${emp.apellido_materno || ''}`.trim()
                }));
                options.sort((a, b) => a.nombre.localeCompare(b.nombre));
                setEmployeeOptions(options);
            }

            // 2. Fetch Optimized Global Ledger (Single Request)
            const resLedger = await axios.get(`${API_URL}/api/vacaciones-solicitudes/global_ledger/`, {
                headers: { Authorization: `Token ${token}` }
            });

            // Backend already performed calculation and filtering
            setLedgerItems(resLedger.data);

        } catch (error) {
            console.error("Error fetching ledger data", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!selectedEmployeeOption && !editingId) { alert("Seleccione un empleado."); return; }
        if (saldoGuardado === '' || isNaN(Number(saldoGuardado))) { alert("Ingrese una cantidad de días válida."); return; }

        const payload = {
            empleado: selectedEmployeeOption?.id,
            dias: saldoGuardado,
            fecha: fecha,
            gestion: gestion
        };

        try {
            if (editingId) {
                await axios.patch(`${API_URL}/api/vacaciones-guardadas/${editingId}/`, payload, {
                    headers: { Authorization: `Token ${token}` }
                });
                alert("Registro actualizado.");
            } else {
                await axios.post(`${API_URL}/api/vacaciones-guardadas/`, payload, {
                    headers: { Authorization: `Token ${token}` }
                });
                alert("Vacaciones guardadas registradas.");
            }
            resetForm();
            fetchLedgerData();
        } catch (error) {
            console.error("Error saving vacaciones guardadas", error);
            alert("Error al guardar.");
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm("¿Seguro que desea eliminar este registro manual?")) return;
        try {
            await axios.delete(`${API_URL}/api/vacaciones-guardadas/${id}/`, {
                headers: { Authorization: `Token ${token}` }
            });
            fetchLedgerData();
        } catch (error) {
            console.error("Error deleting", error);
            alert("Error al eliminar.");
        }
    }

    const handleEdit = (item: LedgerItem) => {
        if (item.type !== 'guardada') return;
        setEditingId(item.id);
        const g = item.original_item;
        const empOption = employeeOptions.find(opt => opt.id === g.empleado) || { id: g.empleado, nombre: g.empleado_nombre };
        setSelectedEmployeeOption(empOption);
        setSaldoGuardado(g.dias);
        setFecha(g.fecha || g.fecha_creacion);
        setGestion(g.gestion || '');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const resetForm = () => {
        setEditingId(null);
        setSelectedEmployeeOption(null);
        setSaldoGuardado('');
        setFecha(new Date().toISOString().split('T')[0]);
        setGestion('');
    }

    return (
        <div className="min-h-screen bg-gray-100 p-6">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Gestión de Vacaciones Guardadas (Ledger Global)</h1>

            <div className="bg-white p-6 rounded-lg shadow-md mb-8">
                <h2 className="text-xl font-semibold mb-4 text-gray-700">{editingId ? 'Editar Manualmente' : 'Nuevo Abono / Ajuste Manual'}</h2>
                <div className="flex flex-col md:flex-row gap-4 items-end">
                    <div className="w-full md:w-1/3">
                        <SearchableSelect
                            label="Empleado"
                            options={employeeOptions}
                            selected={selectedEmployeeOption}
                            onChange={(option) => setSelectedEmployeeOption(option)}
                            disabled={!!editingId}
                        />
                    </div>
                    <div className="w-full md:w-1/5">
                        <label className="block text-gray-700 text-sm font-bold mb-2">Días (+/-)</label>
                        <input
                            type="number"
                            step="0.5"
                            value={saldoGuardado}
                            onChange={(e) => setSaldoGuardado(e.target.value)}
                            className="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="Ej. 15.0 o -5"
                        />
                    </div>
                    <div className="w-full md:w-1/5">
                        <label className="block text-gray-700 text-sm font-bold mb-2">Fecha Mov.</label>
                        <input
                            type="date"
                            value={fecha}
                            onChange={(e) => setFecha(e.target.value)}
                            className="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                    <div className="w-full md:w-1/4">
                        <label className="block text-gray-700 text-sm font-bold mb-2">Detalle / Motivo</label>
                        <input
                            type="text"
                            value={gestion}
                            onChange={(e) => setGestion(e.target.value)}
                            className="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="Ej. 2022-2023"
                        />
                    </div>
                    <div className="w-full md:w-auto pb-1 flex gap-2">
                        <button onClick={handleSave} className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition shadow font-semibold">
                            {editingId ? 'Actualizar' : 'Guardar'}
                        </button>
                        {editingId && (
                            <button onClick={resetForm} className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 transition shadow">
                                Cancelar
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-gray-700">Vacaciones Guardadas Vigentes</h2>
                </div>
                {loading ? (
                    <div className="p-8 text-center text-gray-500">Cargando...</div>
                ) : ledgerItems.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">No hay registros vigentes.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50 sticky top-0">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Empleado</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Detalle</th>
                                    <th className="px-6 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wider bg-blue-50">Días</th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {ledgerItems.map((item) => (
                                    <tr key={item.uniq_key} className="hover:bg-gray-50 transition">
                                        <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-gray-800">
                                            {item.empleado_nombre}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                                            {item.fecha}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-600">
                                            {item.detalle}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-black font-mono text-blue-900 bg-blue-50">
                                            {item.dias.toFixed(1)}
                                            {item.dias_originales && item.dias !== item.dias_originales && (
                                                <span className="text-[10px] text-gray-400 block font-normal">
                                                    (Orig: {item.dias_originales})
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center text-xs font-medium">
                                            <button onClick={() => handleEdit(item)} className="text-indigo-600 hover:text-indigo-900 mr-3">Editar</button>
                                            <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:text-red-900">Eliminar</button>
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
