import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../AuthContext';
import * as XLSX from 'xlsx';

const ReportsPage: React.FC = () => {
    const { token } = useAuth();
    const [activeTab, setActiveTab] = useState<'permisos' | 'vacaciones'>('permisos');

    // Filter States
    const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1); // 1-12
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

    // Data States
    const [permisos, setPermisos] = useState<any[]>([]);
    const [vacaciones, setVacaciones] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchData();
    }, [activeTab]);

    const fetchData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'permisos') {
                const response = await axios.get('http://127.0.0.1:8000/api/permisos/?no_pagination=true', {
                    headers: { 'Authorization': `Token ${token}` }
                });
                setPermisos(response.data);
            } else {
                const response = await axios.get('http://127.0.0.1:8000/api/vacaciones-solicitudes/?no_pagination=true', {
                    headers: { 'Authorization': `Token ${token}` }
                });
                setVacaciones(response.data);
            }
        } catch (error) {
            console.error("Error fetching reports data", error);
        } finally {
            setLoading(false);
        }
    };

    const getFilteredData = () => {
        const filterFn = (dateStr: string) => {
            if (!dateStr) return false;
            // dateStr format YYYY-MM-DD
            const [y, m] = dateStr.split('-');
            return parseInt(y) === selectedYear && parseInt(m) === selectedMonth;
        };

        if (activeTab === 'permisos') {
            return permisos.filter(p => filterFn(p.fecha_solicitud));
        } else {
            return vacaciones.filter(v => filterFn(v.fecha_inicio));
        }
    };

    const filteredData = getFilteredData();

    const exportToExcel = () => {
        const dataToExport = activeTab === 'permisos'
            ? filteredData.map((p: any) => ({
                Empleado: `${p.empleado_info.nombres} ${p.empleado_info.apellido_paterno}`,
                CI: p.empleado_info.ci,
                'Fecha Solicitud': p.fecha_solicitud,
                'Tipo Permiso': p.tipo_permiso,
                'Hora Salida': p.hora_salida,
                'Hora Regreso': p.hora_regreso,
                Observacion: p.observacion,
                Estado: p.estado
            }))
            : filteredData.map((v: any) => ({
                Empleado: `${v.empleado_info.nombres} ${v.empleado_info.apellido_paterno}`,
                CI: v.empleado_info.ci,
                'Tipo Vacacion': v.es_medio_dia ? 'Media Jornada' : 'Vacación Completa',
                'Fecha Inicio': v.fecha_inicio,
                'Fecha Fin': v.fecha_fin,
                'Días Calculados': v.dias_calculados,
                Estado: v.estado
            }));

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(dataToExport);
        XLSX.utils.book_append_sheet(wb, ws, activeTab === 'permisos' ? "Permisos" : "Vacaciones");
        XLSX.writeFile(wb, `Reporte_${activeTab}_${selectedYear}_${selectedMonth}.xlsx`);
    };

    return (
        <div className="p-6 bg-gray-100 min-h-screen">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Reportes</h1>

                <div className="flex space-x-4">
                    <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(Number(e.target.value))}
                        className="border rounded p-2 shadow-sm"
                    >
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                            <option key={m} value={m}>{new Date(0, m - 1).toLocaleString('es-ES', { month: 'long' })}</option>
                        ))}
                    </select>
                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                        className="border rounded p-2 shadow-sm"
                    >
                        {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                    <button
                        onClick={exportToExcel}
                        className="bg-green-600 text-white px-4 py-2 rounded shadow hover:bg-green-700 font-semibold flex items-center"
                    >
                        <span className="mr-2">📥</span> Descargar Excel
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex space-x-1 mb-6 bg-white p-1 rounded-lg shadow w-fit">
                <button
                    onClick={() => setActiveTab('permisos')}
                    className={`px-6 py-2 rounded-md font-semibold transition ${activeTab === 'permisos' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                    Permisos
                </button>
                <button
                    onClick={() => setActiveTab('vacaciones')}
                    className={`px-6 py-2 rounded-md font-semibold transition ${activeTab === 'vacaciones' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                    Vacaciones
                </button>
            </div>

            {/* Table Area */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                {loading ? (
                    <div className="p-10 text-center text-gray-500">Cargando datos...</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                {activeTab === 'permisos' ? (
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Empleado</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CI</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha Solicitud</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Salida</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Regreso</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Observación</th>
                                    </tr>
                                ) : (
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Empleado</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CI</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo Vacación</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha Inicio</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha Fin</th>
                                    </tr>
                                )}
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {activeTab === 'permisos' ? (
                                    filteredData.length === 0 ? <tr><td colSpan={7} className="px-6 py-4 text-center text-gray-500">No hay permisos registrados en este mes.</td></tr> :
                                        filteredData.map((p: any) => (
                                            <tr key={p.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                    {p.empleado_info.nombres} {p.empleado_info.apellido_paterno}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{p.empleado_info.ci}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{p.fecha_solicitud}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{p.tipo_permiso.replace('_', ' ')}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{p.hora_salida}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{p.hora_regreso}</td>
                                                <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate" title={p.observacion}>{p.observacion}</td>
                                            </tr>
                                        ))
                                ) : (
                                    filteredData.length === 0 ? <tr><td colSpan={5} className="px-6 py-4 text-center text-gray-500">No hay vacaciones registradas en este mes.</td></tr> :
                                        filteredData.map((v: any) => (
                                            <tr key={v.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                    {v.empleado_info.nombres} {v.empleado_info.apellido_paterno}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{v.empleado_info.ci}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {v.es_medio_dia ? <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-semibold">Media Jornada</span> : 'Vacación Completa'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{v.fecha_inicio}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{v.fecha_fin}</td>
                                            </tr>
                                        ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ReportsPage;
