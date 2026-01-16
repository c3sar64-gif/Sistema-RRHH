import React, { useState, useEffect } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'moment/locale/es';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { SearchableSelect } from '../components/SearchableSelect';

interface SelectOption {
    id: number;
    nombre: string;
}

moment.locale('es');
const localizer = momentLocalizer(moment);

interface SolicitudVacacion {
    id: number;
    empleado: number;
    empleado_info: {
        nombres: string;
        apellido_paterno: string;
        apellido_materno: string;
    };
    contrato_identificador: string;
    fecha_solicitud: string;
    fecha_inicio: string;
    fecha_fin: string;
    dias_calculados: string;
    es_medio_dia: boolean;
    estado: 'pendiente' | 'aprobado' | 'rechazado' | 'anulado';
    observacion: string;
    comentario_aprobador: string;
    aprobador_info: any;
}

const VacacionesPage: React.FC = () => {
    const { token, user } = useAuth();
    const navigate = useNavigate();
    const [events, setEvents] = useState<any[]>([]);
    const [solicitudes, setSolicitudes] = useState<SolicitudVacacion[]>([]);

    const [showModal, setShowModal] = useState(false);
    const [showListModal, setShowListModal] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<any>(null);

    // Form States
    const [fechaInicio, setFechaInicio] = useState(moment().format('YYYY-MM-DD'));
    const [fechaFin, setFechaFin] = useState(moment().format('YYYY-MM-DD'));
    const [esMedioDia, setEsMedioDia] = useState(false);
    const [observacion, setObservacion] = useState('');
    const [fechaIngresoVigente, setFechaIngresoVigente] = useState<string | null>(null);
    const [vacacionGuardada, setVacacionGuardada] = useState<number | null>(null);
    const [antiguedadDetalle, setAntiguedadDetalle] = useState<string | null>(null);
    const [vacacionPorLey, setVacacionPorLey] = useState<number | null>(null);
    const [saldoActual, setSaldoActual] = useState<number | null>(null);
    const [saldoGuardadas, setSaldoGuardadas] = useState<number>(0);
    const [saldoLey, setSaldoLey] = useState<number>(0);
    const [diasCalculados, setDiasCalculados] = useState<number>(0);

    const [employeeOptions, setEmployeeOptions] = useState<SelectOption[]>([]);
    const [selectedEmployeeOption, setSelectedEmployeeOption] = useState<SelectOption | null>(null);
    const [historial, setHistorial] = useState<any[]>([]);
    const [showLiquidarModal, setShowLiquidarModal] = useState(false);
    const [nuevaFecha, setNuevaFecha] = useState(moment().format('YYYY-MM-DD'));
    const [diasPagar, setDiasPagar] = useState<number>(0);
    const [diasGuardar, setDiasGuardar] = useState<number>(0);
    const [currentDate, setCurrentDate] = useState(new Date());

    const canManage = user?.is_superuser || user?.groups.some(g => ['Admin', 'RRHH', 'Jefe de Departamento'].includes(g.name));

    const [searchTerm, setSearchTerm] = useState('');
    const [searchEmployeeGlobal, setSearchEmployeeGlobal] = useState<SelectOption | null>(null);
    const [filteredHistorial, setFilteredHistorial] = useState<any[]>([]);
    const [loadingHistorial, setLoadingHistorial] = useState(false);

    useEffect(() => {
        fetchData();
        if (canManage) {
            fetchEmpleados();
        } else if (user?.empleado_id) {
            fetchSaldo(user.empleado_id);
        }
    }, [token]);

    useEffect(() => {
        if (selectedEmployeeOption) {
            fetchSaldo(selectedEmployeeOption.id);
        } else {
            setSaldoActual(null);
            setFechaIngresoVigente(null);
            setVacacionGuardada(null);
            setHistorial([]); // Clear when deselected
        }
    }, [selectedEmployeeOption]);

    useEffect(() => {
        calculateDays();
    }, [fechaInicio, fechaFin, esMedioDia]);

    // Filter Logic
    // React to Search Term changes with Debounce
    useEffect(() => {
        if (!showListModal) return;

        // If an employee is explicitly selected via dropdown, we just filter locally
        if (selectedEmployeeOption) {
            if (!searchTerm) {
                setFilteredHistorial(historial);
            } else {
                const lower = searchTerm.toLowerCase();
                setFilteredHistorial(historial.filter(h =>
                    (h.incidencia && h.incidencia.toLowerCase().includes(lower)) ||
                    (h.contrato && h.contrato.toLowerCase().includes(lower))
                ));
            }
            return;
        }

        // If Global Mode (no specific employee selected)
        if (searchEmployeeGlobal) {
            setLoadingHistorial(true);
            axios.get(`http://127.0.0.1:8000/api/vacaciones-solicitudes/saldo/?empleado_id=${searchEmployeeGlobal.id}`, {
                headers: { Authorization: `Token ${token}` }
            }).then(res => {
                const hist = (res.data.historial || []).map((h: any) => ({
                    ...h,
                    empleado_nombre: searchEmployeeGlobal.nombre
                }));
                // Sort ASC (Oldest first)
                hist.sort((a: any, b: any) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

                setHistorial(hist);
                setFilteredHistorial(hist);
            }).catch(err => {
                console.error(err);
                setHistorial([]);
                setFilteredHistorial([]);
            }).finally(() => setLoadingHistorial(false));
        } else {
            // If no employee selected in global filter, show empty or maybe all?
            // Original logic showed nothing if no search term. I'll keep that.
            setHistorial([]);
            setFilteredHistorial([]);
        }
    }, [searchTerm, showListModal, selectedEmployeeOption, searchEmployeeGlobal]);

    // Modal Open Logic
    useEffect(() => {
        if (showListModal) {
            if (!selectedEmployeeOption) {
                // Start clean
                setHistorial([]);
                setFilteredHistorial([]);
                setSearchTerm('');
            } else {
                // Ensure ASC sort for consistency
                const sorted = [...historial].sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
                if (JSON.stringify(sorted) !== JSON.stringify(historial)) {
                    setHistorial(sorted);
                    setFilteredHistorial(sorted);
                } else {
                    setFilteredHistorial(historial);
                }
            }
        }
    }, [showListModal]);



    const fetchSaldo = async (empId: number) => {
        try {
            const res = await axios.get(`http://127.0.0.1:8000/api/vacaciones-solicitudes/saldo/?empleado_id=${empId}`, {
                headers: { Authorization: `Token ${token}` }
            });
            setSaldoActual(res.data.saldo);

            // Default sort ASC (Oldest first)
            let hist = res.data.historial || [];
            hist.sort((a: any, b: any) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

            setHistorial(hist);
            setSaldoGuardadas(res.data.saldo_guardadas);
            setSaldoLey(res.data.saldo_ley);
            setFechaIngresoVigente(res.data.fecha_ingreso_vigente);
            setVacacionGuardada(res.data.dias_ganados);
            setAntiguedadDetalle(res.data.antiguedad_detalle);
            setVacacionPorLey(res.data.vacacion_por_ley);
        } catch (error) {
            console.error("Error fetching saldo", error);
            setSaldoActual(0);
            setHistorial([]);
            setSaldoGuardadas(0);
            setSaldoLey(0);
            setFechaIngresoVigente(null);
            setVacacionGuardada(0);
            setAntiguedadDetalle(null);
            setVacacionPorLey(null);
        }
    };

    const fetchEmpleados = async () => {
        try {
            const res = await axios.get('http://127.0.0.1:8000/api/empleados/?no_pagination=true', {
                headers: { Authorization: `Token ${token}` }
            });
            const options = res.data.map((emp: any) => ({
                id: emp.id,
                nombre: `${emp.nombres} ${emp.apellido_paterno} ${emp.apellido_materno || ''}`
            }));
            setEmployeeOptions(options);
        } catch (error) {
            console.error("Error fetching empleados", error);
        }
    };

    const calculateDays = () => {
        if (esMedioDia) {
            setDiasCalculados(0.5);
            return;
        }
        const start = moment(fechaInicio);
        const end = moment(fechaFin);
        if (end.isBefore(start)) {
            setDiasCalculados(0);
            return;
        }
        let count = 0;
        let curr = start.clone();
        while (curr.isSameOrBefore(end)) {
            if (curr.day() !== 0) { count += 1; }
            curr.add(1, 'days');
        }
        setDiasCalculados(count);
    };

    const fetchData = async () => {
        try {
            const resSolicitudes = await axios.get('http://127.0.0.1:8000/api/vacaciones-solicitudes/?no_pagination=true', {
                headers: { Authorization: `Token ${token}` }
            });
            setSolicitudes(resSolicitudes.data);
            const mappedEvents = resSolicitudes.data.map((sol: SolicitudVacacion) => ({
                title: `${sol.empleado_info.nombres} ${sol.empleado_info.apellido_paterno} (${sol.dias_calculados}d)`,
                start: moment(sol.fecha_inicio).toDate(),
                end: moment(sol.fecha_fin).add(1, 'days').toDate(),
                resource: sol,
                status: sol.estado
            }));
            setEvents(mappedEvents);
        } catch (error) {
            console.error("Error fetching data", error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const empId = canManage ? selectedEmployeeOption?.id : user?.empleado_id;
        if (!empId) { alert("Debe seleccionar un empleado."); return; }

        try {
            await axios.post('http://127.0.0.1:8000/api/vacaciones-solicitudes/', {
                empleado: empId,
                fecha_inicio: fechaInicio,
                fecha_fin: fechaFin,
                es_medio_dia: esMedioDia,
                observacion: observacion,
                estado: 'aprobado'
            }, { headers: { Authorization: `Token ${token}` } });
            setShowModal(false);
            fetchData();
            fetchSaldo(Number(empId));
            resetForm();
        } catch (error: any) {
            alert(error.response?.data?.error || "Error al guardar solicitud.");
        }
    };

    const handleLiquidar = async (e: React.FormEvent) => {
        e.preventDefault();
        const empId = selectedEmployeeOption?.id;
        if (!empId) { alert("Debe seleccionar un empleado."); return; }
        if (!window.confirm("¿Confirmar liquidación? Se creará un nuevo ciclo y se registrarán los pagos/traspasos.")) return;

        try {
            await axios.post('http://127.0.0.1:8000/api/vacaciones-solicitudes/liquidar/', {
                empleado_id: empId,
                nueva_fecha: nuevaFecha,
                dias_pagar: diasPagar,
                dias_guardar: diasGuardar
            }, { headers: { Authorization: `Token ${token}` } });
            setShowLiquidarModal(false);
            fetchData();
            fetchSaldo(Number(empId));
            alert("Liquidación exitosa y nuevo ciclo iniciado.");
        } catch (error: any) {
            alert(error.response?.data?.error || "Error al procesar liquidación.");
        }
    };

    const handleAction = async (id: number, action: string) => {
        if (!window.confirm(`¿Está seguro de ${action} esta solicitud?`)) return;
        try {
            await axios.post(`http://127.0.0.1:8000/api/vacaciones-solicitudes/${id}/${action}/`, {}, {
                headers: { Authorization: `Token ${token}` }
            });
            fetchData();
            if (selectedEvent) setSelectedEvent(null);
            setShowListModal(false);
        } catch (error: any) {
            alert(error.response?.data?.error || `Error al ${action} solicitud.`);
        }
    };

    const resetForm = () => {
        setFechaInicio(moment().format('YYYY-MM-DD'));
        setFechaFin(moment().format('YYYY-MM-DD'));
        setEsMedioDia(false);
        setObservacion('');
        setSelectedEmployeeOption(null);
        setSaldoActual(null);
        setFechaIngresoVigente(null);
        setVacacionGuardada(null);
        setAntiguedadDetalle(null);
        setVacacionPorLey(null);
    };

    const eventStyleGetter = (event: any) => {
        let backgroundColor = '#3174ad';
        if (event.status === 'aprobado') backgroundColor = '#28a745';
        if (event.status === 'anulado') backgroundColor = '#6c757d';
        return { style: { backgroundColor, color: 'white', borderRadius: '5px', display: 'block' } };
    };

    return (
        <div className="h-screen flex flex-col bg-gray-100 p-6 overflow-hidden">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Calendario de Vacaciones</h1>
                <div className="space-x-4">
                    {fechaIngresoVigente && (
                        <span className="text-sm text-gray-600 mr-4 font-semibold">
                            Ingreso Vigente: {fechaIngresoVigente}
                        </span>
                    )}
                    {canManage && (
                        <button onClick={() => navigate('/vacaciones-guardadas')} className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition shadow mr-4">
                            Vacaciones Guardadas
                        </button>
                    )}
                    {canManage && (
                        <button onClick={() => setShowLiquidarModal(true)} className="bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700 transition shadow mr-4">
                            🔄 Renovar / Liquidar
                        </button>
                    )}
                    <button onClick={() => { resetForm(); setShowModal(true); }} className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition shadow">
                        + Nueva Solicitud
                    </button>
                    <button onClick={() => setShowListModal(true)} className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition shadow">
                        Ver Lista
                    </button>
                </div>
            </div>

            <div className="flex-grow bg-white p-4 rounded-lg shadow overflow-hidden">
                <Calendar
                    localizer={localizer}
                    events={events}
                    date={currentDate}
                    onNavigate={(date) => setCurrentDate(date)}
                    startAccessor="start"
                    endAccessor="end"
                    style={{ height: '100%' }}
                    messages={{ next: "Siguiente", previous: "Anterior", today: "Hoy", month: "Mes", week: "Semana", day: "Día" }}
                    eventPropGetter={eventStyleGetter}
                    onSelectEvent={(event) => { setSelectedEvent(event.resource); setShowListModal(true); }}
                />
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
                    <div className="bg-white p-6 rounded-lg w-full max-w-lg shadow-xl">
                        <h2 className="text-xl font-bold mb-4 text-gray-800">Solicitar Vacaciones</h2>
                        <form onSubmit={handleSubmit}>
                            {canManage && (
                                <div className="mb-4">
                                    <SearchableSelect options={employeeOptions} selected={selectedEmployeeOption} onChange={(o) => setSelectedEmployeeOption(o)} label="Empleado" />
                                </div>
                            )}

                            {fechaIngresoVigente && (
                                <div className="mb-4 bg-gray-50 p-3 rounded border border-gray-200 text-sm space-y-1">
                                    <p className="text-gray-600"><strong>Ingreso Vigente:</strong> {fechaIngresoVigente}</p>
                                    {antiguedadDetalle && (
                                        <p className="text-gray-600"><strong>Antigüedad:</strong> {antiguedadDetalle}</p>
                                    )}
                                    {/* Hiding summary blocks as requested
                                   {vacacionPorLey !== null && (
                                        <p className="text-blue-600 font-bold">
                                            Vacación por Ley: <span className="text-lg">{vacacionPorLey} días</span>
                                        </p>
                                    )}
                                    {vacacionGuardada !== null && (
                                        <p className="text-indigo-600 font-bold border-t border-gray-100 mt-1 pt-1 text-xs">
                                            Vacaciones Guardadas: <span className="text-sm font-bold">{vacacionGuardada}</span>
                                        </p>
                                    )}
                                    */}
                                </div>
                            )}

                            {saldoActual !== null && (
                                <div className="mb-4 space-y-3">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-3 bg-indigo-50 rounded border border-indigo-100">
                                            <p className="text-[10px] uppercase tracking-wider text-indigo-500 font-bold">Guardadas Actual</p>
                                            <p className="text-lg font-bold text-indigo-700">{saldoGuardadas || 0} d</p>
                                        </div>
                                        <div className="p-3 bg-blue-50 rounded border border-blue-100">
                                            <p className="text-[10px] uppercase tracking-wider text-blue-500 font-bold">Por Ley Actual</p>
                                            <p className="text-lg font-bold text-blue-700">{saldoLey || 0} d</p>
                                        </div>
                                    </div>

                                    <div className="p-3 bg-blue-50 rounded border border-blue-100 flex justify-between items-center">
                                        <div className="flex flex-col">
                                            <p className="text-xs uppercase tracking-wider text-blue-600 font-bold">Saldo Actual Total</p>
                                            <p className="text-xs text-blue-400 font-normal">(Guardadas + Ley acumulada)</p>
                                        </div>
                                        <p className="text-2xl font-black text-blue-800">{saldoActual} <span className="text-sm font-normal">días</span></p>
                                    </div>

                                    {diasCalculados > 0 && (
                                        <div className="bg-orange-50 p-3 rounded border border-orange-200 text-sm">
                                            <p className="font-bold text-orange-800 mb-1">Proyección de Consumo:</p>
                                            <div className="flex justify-between text-xs text-orange-700">
                                                <span>De Guardadas:</span>
                                                <span className="font-bold">-{Math.min(diasCalculados, saldoGuardadas)} días</span>
                                            </div>
                                            {diasCalculados > saldoGuardadas && (
                                                <div className="flex justify-between text-xs text-orange-700">
                                                    <span>De Vacación por Ley:</span>
                                                    <span className="font-bold">-{diasCalculados - Math.min(diasCalculados, saldoGuardadas)} días</span>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <div className="p-3 bg-green-50 rounded border border-green-200 flex justify-between items-center">
                                        <div>
                                            <p className="text-sm text-green-800 font-bold">Saldo Total Final</p>
                                            <p className="text-xs text-green-600 italic">Guardadas + Ley - Consumo</p>
                                        </div>
                                        <p className="text-2xl font-black text-green-900">{(saldoActual - diasCalculados).toFixed(1)} <span className="text-sm font-normal">días</span></p>
                                    </div>
                                </div>
                            )}

                            <div className="flex space-x-4 mb-4">
                                <div className="w-1/2">
                                    <label className="block text-gray-700 text-sm font-bold mb-2">Desde</label>
                                    <input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} className="w-full border rounded px-3 py-2" required />
                                </div>
                                <div className="w-1/2">
                                    <label className="block text-gray-700 text-sm font-bold mb-2">Hasta</label>
                                    <input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)} className="w-full border rounded px-3 py-2" required disabled={esMedioDia} />
                                </div>
                            </div>

                            <div className="mb-4">
                                <label className="flex items-center space-x-2">
                                    <input type="checkbox" checked={esMedioDia} onChange={e => { setEsMedioDia(e.target.checked); if (e.target.checked) setFechaFin(fechaInicio); }} className="form-checkbox h-5 w-5 text-blue-600" />
                                    <span className="text-gray-700 font-bold">Es Media Jornada (0.5 días)</span>
                                </label>
                            </div>

                            <div className="mb-4 p-3 bg-blue-50 rounded border border-blue-200">
                                <p className="text-blue-800 font-semibold">Días calculados a descontar: <span className="text-2xl ml-2">{diasCalculados}</span></p>
                            </div>

                            <div className="mb-4">
                                <label className="block text-gray-700 text-sm font-bold mb-2">Observación</label>
                                <textarea value={observacion} onChange={e => setObservacion(e.target.value)} className="w-full border rounded px-3 py-2" rows={3}></textarea>
                            </div>

                            <div className="flex justify-end space-x-2">
                                <button type="button" onClick={() => { setShowModal(false); resetForm(); }} className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400 text-gray-800">Cancelar</button>
                                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Guardar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showListModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
                    <div className="bg-white p-6 rounded-lg w-full max-w-5xl shadow-xl h-3/4 flex flex-col">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-gray-800">
                                {selectedEvent ? 'Detalle de Solicitud' : (selectedEmployeeOption ? `Historial: ${selectedEmployeeOption.nombre}` : 'Listado Global de Vacaciones')}
                            </h2>
                            <button onClick={() => { setShowListModal(false); setSelectedEvent(null); setSearchTerm(''); }} className="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
                        </div>

                        {!selectedEvent && (
                            <div className="mb-4">
                                {selectedEmployeeOption ? (
                                    <input
                                        type="text"
                                        placeholder="🔍 Buscar por contrato o detalle..."
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                        className="w-full border rounded px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                ) : (
                                    <SearchableSelect
                                        options={employeeOptions}
                                        selected={searchEmployeeGlobal}
                                        onChange={(o) => setSearchEmployeeGlobal(o)}
                                        label="🔍 Buscar empleado..."
                                    />
                                )}
                            </div>
                        )}

                        <div className="flex-grow overflow-auto p-2">
                            {selectedEvent ? (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <p><strong>Empleado:</strong> {selectedEvent.empleado_info.nombres} {selectedEvent.empleado_info.apellido_paterno}</p>
                                        <p><strong>Estado:</strong> <span className={`px-2 py-1 rounded text-white text-sm ${selectedEvent.estado === 'aprobado' ? 'bg-green-500' : 'bg-gray-500'}`}>{selectedEvent.estado}</span></p>
                                        <p><strong>Desde:</strong> {selectedEvent.fecha_inicio}</p>
                                        <p><strong>Hasta:</strong> {selectedEvent.fecha_fin}</p>
                                        <p><strong>Días:</strong> {selectedEvent.dias_calculados}</p>
                                        <p><strong>Medio Día:</strong> {selectedEvent.es_medio_dia ? 'Sí' : 'No'}</p>
                                        <p className="col-span-2"><strong>Observación:</strong> {selectedEvent.observacion || 'Ninguna'}</p>
                                    </div>
                                    {selectedEvent.estado !== 'anulado' && (
                                        <div className="mt-6 flex space-x-4 border-t pt-4">
                                            <button onClick={() => handleAction(selectedEvent.id, 'anular')} className="flex-1 bg-red-600 text-white py-2 rounded hover:bg-red-700">Anular Solicitud</button>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50 sticky top-0 z-10">
                                            <tr>
                                                {!selectedEmployeeOption && <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Empleado</th>}
                                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Fecha</th>
                                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Contrato</th>
                                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Incidencia</th>
                                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Tipo</th>
                                                <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase">Días</th>
                                                <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase bg-blue-50">Saldo Ant.</th>
                                                <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase bg-green-50">Saldo Act.</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {loadingHistorial ? (
                                                <tr><td colSpan={8} className="px-6 py-10 text-center text-gray-500">Cargando historial global...</td></tr>
                                            ) : filteredHistorial.map((entry, idx) => (
                                                <tr key={idx} className="hover:bg-gray-50">
                                                    {!selectedEmployeeOption && <td className="px-4 py-3 text-xs font-bold text-gray-700">{entry.empleado_nombre}</td>}
                                                    <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-900">{entry.fecha}</td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-xs text-mono text-gray-500">{entry.contrato}</td>
                                                    <td className="px-4 py-3 text-xs text-gray-500 truncate max-w-[200px]" title={entry.incidencia}>
                                                        {entry.incidencia}
                                                        {entry.desglose && entry.desglose !== '0.0' && (
                                                            <div className="text-[10px] text-orange-600 font-semibold italic mt-1">
                                                                ({entry.desglose})
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-xs">
                                                        <span className={`px-2 py-0.5 rounded-full font-semibold ${entry.tipo === 'Consumo' ? 'bg-red-50 text-red-700' :
                                                            entry.tipo === 'Leyes Sociales' ? 'bg-blue-50 text-blue-700' : 'bg-gray-50 text-gray-700'
                                                            }`}>
                                                            {entry.tipo}
                                                        </span>
                                                    </td>
                                                    <td className={`px-4 py-3 text-center text-sm font-bold ${entry.dias < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                        {entry.dias > 0 ? `+${entry.dias}` : entry.dias}
                                                    </td>
                                                    <td className="px-4 py-3 text-center text-xs text-gray-400 font-mono">{entry.saldo_anterior}</td>
                                                    <td className="px-4 py-3 text-center text-sm font-black text-gray-900 bg-gray-50 font-mono">{entry.saldo_actual}</td>
                                                </tr>
                                            ))}
                                            {!loadingHistorial && filteredHistorial.length === 0 && (
                                                <tr>
                                                    <td colSpan={8} className="px-6 py-10 text-center text-gray-400 italic">No hay registros coincidentes.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {showLiquidarModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
                    <div className="bg-white p-6 rounded-lg w-full max-w-md shadow-xl border-t-4 border-orange-500">
                        <h2 className="text-xl font-bold mb-2 text-gray-800 flex items-center">
                            <span className="mr-2">🔄</span> Liquidación y Renovación
                        </h2>
                        <form onSubmit={handleLiquidar}>
                            <div className="mb-4">
                                <SearchableSelect options={employeeOptions} selected={selectedEmployeeOption} onChange={(o) => setSelectedEmployeeOption(o)} label="Seleccionar Empleado" />
                            </div>

                            {saldoActual !== null && (
                                <div className="mb-4 bg-orange-50 p-3 rounded border border-orange-200">
                                    <p className="text-sm font-bold text-orange-800">Saldo a favor actual: <span className="text-xl ml-2">{saldoActual} d</span></p>
                                </div>
                            )}

                            <div className="mb-4">
                                <label className="block text-gray-700 text-sm font-bold mb-2">Fecha de Renovación (Nuevo ciclo)</label>
                                <input type="date" value={nuevaFecha} onChange={e => setNuevaFecha(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" required />
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Pagar (Efectivo)</label>
                                    <input type="number" step="0.5" value={diasPagar} onChange={e => setDiasPagar(Number(e.target.value))} className="w-full border rounded px-3 py-2 text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Guardar (Traspaso)</label>
                                    <input type="number" step="0.5" value={diasGuardar} onChange={e => setDiasGuardar(Number(e.target.value))} className="w-full border rounded px-3 py-2 text-sm" />
                                </div>
                            </div>

                            <div className="flex justify-end space-x-2 pt-2 border-t">
                                <button type="button" onClick={() => setShowLiquidarModal(false)} className="px-4 py-2 bg-gray-200 rounded text-gray-700 hover:bg-gray-300">Cancelar</button>
                                <button type="submit" className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 font-bold disabled:opacity-50" disabled={!selectedEmployeeOption}>Procesar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div >
    );
};

export default VacacionesPage;
