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

interface PeriodoVacacion {
    id: number;
    fecha_inicio: string;
    fecha_fin: string | null;
    activo: boolean;
}

const VacacionesPage: React.FC = () => {
    const { token, user } = useAuth();
    const navigate = useNavigate();
    const [events, setEvents] = useState<any[]>([]);
    const [solicitudes, setSolicitudes] = useState<SolicitudVacacion[]>([]);
    const [periodoActivo, setPeriodoActivo] = useState<PeriodoVacacion | null>(null);

    const [showModal, setShowModal] = useState(false);
    const [showListModal, setShowListModal] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<any>(null);

    // Form States
    const [fechaInicio, setFechaInicio] = useState(moment().format('YYYY-MM-DD'));
    const [fechaFin, setFechaFin] = useState(moment().format('YYYY-MM-DD'));
    const [esMedioDia, setEsMedioDia] = useState(false);
    const [observacion, setObservacion] = useState('');
    const [periodoInicioCalculo, setPeriodoInicioCalculo] = useState<string>('');
    const [fechaIngresoVigente, setFechaIngresoVigente] = useState<string | null>(null);
    const [aniosTrabajados, setAniosTrabajados] = useState<string | null>(null);
    const [vacacionCumplida, setVacacionCumplida] = useState<number | null>(null);
    const [vacacionGuardada, setVacacionGuardada] = useState<number | null>(null);
    const [diasCalculados, setDiasCalculados] = useState<number>(0);

    // Closure Modal States
    const [showClosureModal, setShowClosureModal] = useState(false);
    const [diasGuardar, setDiasGuardar] = useState<number>(0);
    const [diasPagar, setDiasPagar] = useState<number>(0);
    const [nuevaFechaIngreso, setNuevaFechaIngreso] = useState<string>(moment().format('YYYY-MM-DD'));
    const [gestionNombre, setGestionNombre] = useState<string>('');

    // const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState<number | string>(''); // Removed unused
    // const [empleados, setEmpleados] = useState<any[]>([]); // Removed unused

    // SearchableSelect states
    const [employeeOptions, setEmployeeOptions] = useState<SelectOption[]>([]);
    const [selectedEmployeeOption, setSelectedEmployeeOption] = useState<SelectOption | null>(null);

    const [saldoActual, setSaldoActual] = useState<number | null>(null);
    // searchTerm removed as it's handled by SearchableSelect internal query or we just need the option

    // Permissions
    const canManage = user?.is_superuser || user?.groups.some(g => ['Admin', 'RRHH', 'Jefe de Departamento'].includes(g.name));
    const isJefe = user?.groups.some(g => g.name === 'Jefe de Departamento');
    // Using isJefe explicitly if needed, but it's already in canManage.
    // To satisfy linter if it complained:
    const canDoSensitiveActions = canManage || isJefe;

    useEffect(() => {
        fetchData();
        if (canManage) {
            fetchEmpleados();
        } else if (user?.empleado_id) {
            fetchSaldo(user.empleado_id);
        }
    }, [token]);

    // Fetch balance when employee selected changes
    useEffect(() => {
        if (selectedEmployeeOption) {
            fetchSaldo(selectedEmployeeOption.id);
        } else if (!canManage && user?.empleado_id) {
            fetchSaldo(user.empleado_id);
        } else {
            setSaldoActual(null);
            setFechaIngresoVigente(null);
            setAniosTrabajados(null);
            setVacacionCumplida(null);
            setVacacionGuardada(null);
        }
    }, [selectedEmployeeOption]);

    const fetchSaldo = async (empId: number) => {
        try {
            const res = await axios.get(`http://127.0.0.1:8000/api/vacaciones-periodos/saldo/?empleado_id=${empId}`, {
                headers: { Authorization: `Token ${token}` }
            });
            setSaldoActual(res.data.saldo);
            if (res.data.periodo_inicio) {
                setPeriodoInicioCalculo(res.data.periodo_inicio);
            }
            setFechaIngresoVigente(res.data.fecha_ingreso_vigente);
            setAniosTrabajados(res.data.anios_trabajados);
            setVacacionCumplida(res.data.vacacion_cumplida);
            setVacacionGuardada(res.data.saldo_guardadas);
        } catch (error) {
            console.error("Error fetching saldo", error);
            setSaldoActual(0);
            setFechaIngresoVigente(null);
            setAniosTrabajados(null);
            setVacacionCumplida(null);
            setVacacionGuardada(null);
        }
    };

    useEffect(() => {
        fetchData();
        if (canManage) {
            fetchEmpleados();
        }
    }, [token]);

    useEffect(() => {
        calculateDays();
    }, [fechaInicio, fechaFin, esMedioDia]);

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
            if (curr.day() !== 0) { // Exclude Sundays (0)
                count += 1; // All other days including Saturday count as 1
            }
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
                id: sol.id,
                title: `${sol.empleado_info.nombres} ${sol.empleado_info.apellido_paterno} - ${sol.dias_calculados} días`,
                start: new Date(sol.fecha_inicio + 'T00:00:00'),
                end: new Date(sol.fecha_fin + 'T23:59:59'),
                allDay: true,
                resource: sol,
                status: sol.estado
            }));
            setEvents(mappedEvents);

            // Fetch Periodo (Just for basic info, maybe show in header)
            const resPeriodos = await axios.get('http://127.0.0.1:8000/api/vacaciones-periodos/?no_pagination=true', {
                headers: { Authorization: `Token ${token}` }
            });
            if (resPeriodos.data && resPeriodos.data.length > 0) {
                setPeriodoActivo(resPeriodos.data[0]); // Show latest
            }

        } catch (error) {
            console.error("Error fetching data", error);
        }
    };

    const fetchEmpleados = async () => {
        try {
            const response = await axios.get('http://127.0.0.1:8000/api/empleados/?no_pagination=true', {
                headers: { Authorization: `Token ${token}` }
            });
            const data = response.data.results || response.data;
            // setEmpleados(data);
            if (Array.isArray(data)) {
                const options = data.map((emp: any) => ({
                    id: emp.id,
                    nombre: `${emp.nombres} ${emp.apellido_paterno} ${emp.apellido_materno || ''}`.trim()
                }));
                setEmployeeOptions(options);
            }
        } catch (error) {
            console.error("Error fetching empleados", error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (diasCalculados <= 0) {
            alert("La cantidad de días debe ser mayor a 0.");
            return;
        }

        const payload = {
            empleado: canManage && selectedEmployeeOption ? selectedEmployeeOption.id : user?.empleado_id,
            fecha_inicio: fechaInicio,
            fecha_fin: fechaFin,
            es_medio_dia: esMedioDia,
            observacion: observacion
        };

        try {
            await axios.post('http://127.0.0.1:8000/api/vacaciones-solicitudes/', payload, {
                headers: { Authorization: `Token ${token}` }
            });
            alert("Solicitud creada.");
            setShowModal(false);
            resetForm();
            fetchData();
            if (payload.empleado) fetchSaldo(Number(payload.empleado));
        } catch (error: any) {
            alert("Error al crear solicitud: " + JSON.stringify(error.response?.data));
        }
    };

    const handleAction = async (id: number, action: 'anular', comentario: string = '') => {
        if (!window.confirm(`¿Estás seguro de anular esta solicitud? Esta acción no se puede deshacer.`)) return;
        try {
            await axios.post(`http://127.0.0.1:8000/api/vacaciones-solicitudes/${id}/${action}/`, { comentario }, {
                headers: { Authorization: `Token ${token}` }
            });
            fetchData();
            // Refresh balance if needed
            if (solicitudes.find(s => s.id === id)?.empleado) {
                fetchSaldo(solicitudes.find(s => s.id === id)!.empleado);
            }
            setShowListModal(false);
            setSelectedEvent(null);
        } catch (error) {
            console.error("Error action", error);
            alert("Error al procesar la acción.");
        }
    };

    const handleCerrarCiclo = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedEmployeeOption) return;

        const payload = {
            empleado_id: selectedEmployeeOption.id,
            dias_guardar: diasGuardar,
            dias_pagar: diasPagar,
            nueva_fecha_ingreso: nuevaFechaIngreso,
            gestion_nombre: gestionNombre
        };

        try {
            await axios.post('http://127.0.0.1:8000/api/vacaciones-periodos/cerrar_ciclo/', payload, {
                headers: { Authorization: `Token ${token}` }
            });
            alert("Ciclo cerrado exitosamente.");
            setShowClosureModal(false);
            if (selectedEmployeeOption) fetchSaldo(selectedEmployeeOption.id);
            fetchData();
        } catch (error: any) {
            alert("Error al cerrar ciclo: " + JSON.stringify(error.response?.data));
        }
    };

    const resetForm = () => {
        setFechaInicio(moment().format('YYYY-MM-DD'));
        setFechaFin(moment().format('YYYY-MM-DD'));
        setEsMedioDia(false);
        setObservacion('');
        if (canManage) {
            setSelectedEmployeeOption(null);
        }
        setFechaIngresoVigente(null);
        setAniosTrabajados(null);
        setVacacionCumplida(null);
        setVacacionGuardada(null);
        setSaldoActual(canManage ? null : saldoActual);

        // Reset closure states
        setDiasGuardar(0);
        setDiasPagar(0);
        setGestionNombre('');
    };



    const eventStyleGetter = (event: any) => {
        let backgroundColor = '#3174ad';
        if (event.status === 'aprobado') backgroundColor = '#28a745'; // Green
        if (event.status === 'anulado') backgroundColor = '#6c757d'; // Gray

        let color = 'white';

        return {
            style: {
                backgroundColor,
                color,
                borderRadius: '5px',
                display: 'block'
            }
        };
    };

    return (
        <div className="h-screen flex flex-col bg-gray-100 p-6 overflow-hidden">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Calendario de Vacaciones</h1>
                <div className="space-x-4">
                    {periodoInicioCalculo ? (
                        <span className="text-sm text-gray-600 mr-4 font-semibold">
                            Periodo Vigente: {periodoInicioCalculo} - Presente
                        </span>
                    ) : (periodoActivo && (
                        <span className="text-sm text-gray-600 mr-4">
                            Periodo Activo: {periodoActivo.fecha_inicio} - {periodoActivo.fecha_fin || 'Presente'}
                        </span>
                    ))}
                    {canManage && (
                        <button
                            onClick={() => navigate('/vacaciones-guardadas')}
                            className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition shadow mr-4"
                        >
                            Vacaciones Guardadas
                        </button>
                    )}
                    <button
                        onClick={() => { resetForm(); setShowModal(true); }}
                        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition shadow"
                    >
                        + Nueva Solicitud
                    </button>
                    <button
                        onClick={() => setShowListModal(true)}
                        className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition shadow"
                    >
                        Ver Lista
                    </button>
                    {canDoSensitiveActions && selectedEmployeeOption && (
                        <button
                            onClick={() => {
                                setDiasGuardar(0);
                                setDiasPagar(0);
                                setGestionNombre(`Gestión ${moment(fechaIngresoVigente).year()}-${moment().year()}`);
                                setShowClosureModal(true);
                            }}
                            className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition shadow"
                        >
                            Cerrar Ciclo / Liquidar
                        </button>
                    )}
                </div>
            </div>

            <div className="flex-grow bg-white p-4 rounded-lg shadow overflow-hidden">
                <Calendar
                    localizer={localizer}
                    events={events}
                    startAccessor="start"
                    endAccessor="end"
                    style={{ height: '100%' }}
                    messages={{
                        next: "Siguiente",
                        previous: "Anterior",
                        today: "Hoy",
                        month: "Mes",
                        week: "Semana",
                        day: "Día"
                    }}
                    eventPropGetter={eventStyleGetter}
                    onSelectEvent={(event) => {
                        setSelectedEvent(event.resource);
                        setShowListModal(true);
                    }}
                />
            </div>

            {/* Modal Nueva Solicitud */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
                    <div className="bg-white p-6 rounded-lg w-full max-w-lg shadow-xl">
                        <h2 className="text-xl font-bold mb-4 text-gray-800">Solicitar Vacaciones</h2>
                        <form onSubmit={handleSubmit}>

                            {canManage && (
                                <div className="mb-4">
                                    <SearchableSelect
                                        options={employeeOptions}
                                        selected={selectedEmployeeOption}
                                        onChange={(option) => setSelectedEmployeeOption(option)}
                                        label="Empleado"
                                    />
                                </div>
                            )}

                            {(!!fechaIngresoVigente || !!aniosTrabajados) && (
                                <div className="mb-4 bg-gray-50 p-3 rounded border border-gray-200 grid grid-cols-2 gap-2 text-sm">
                                    {fechaIngresoVigente && (
                                        <p className="text-gray-600">
                                            <strong>Ingreso:</strong> {fechaIngresoVigente}
                                        </p>
                                    )}
                                    {aniosTrabajados && (
                                        <p className="text-gray-600">
                                            <strong>Antigüedad:</strong> {aniosTrabajados}
                                        </p>
                                    )}
                                    {vacacionCumplida !== null && (
                                        <p className="text-blue-600 font-bold border-t border-gray-100 mt-1 pt-1">
                                            Vacación Cumplida: <span className="text-lg">{vacacionCumplida}</span>
                                        </p>
                                    )}
                                    {vacacionGuardada !== null && (
                                        <p className="text-indigo-600 font-bold border-t border-gray-100 mt-1 pt-1">
                                            Vacaciones Guardadas: <span className="text-lg">{vacacionGuardada}</span>
                                        </p>
                                    )}
                                </div>
                            )}

                            {saldoActual !== null && (
                                <div className="mb-4 grid grid-cols-2 gap-4">
                                    <div className="p-3 bg-green-50 rounded border border-green-200">
                                        <p className="text-sm text-green-800">Saldo Actual</p>
                                        <p className="text-xl font-bold text-green-900">{saldoActual} días</p>
                                    </div>
                                    <div className="p-3 bg-indigo-50 rounded border border-indigo-200">
                                        <p className="text-sm text-indigo-800">Saldo Final (Est.)</p>
                                        <p className="text-xl font-bold text-indigo-900">
                                            {(saldoActual - diasCalculados).toFixed(1)} días
                                        </p>
                                    </div>
                                </div>
                            )}

                            <div className="flex space-x-4 mb-4">
                                <div className="w-1/2">
                                    <label className="block text-gray-700 text-sm font-bold mb-2">Desde</label>
                                    <input
                                        type="date"
                                        value={fechaInicio}
                                        onChange={e => setFechaInicio(e.target.value)}
                                        className="w-full border rounded px-3 py-2"
                                        required
                                    />
                                </div>
                                <div className="w-1/2">
                                    <label className="block text-gray-700 text-sm font-bold mb-2">Hasta</label>
                                    <input
                                        type="date"
                                        value={fechaFin}
                                        onChange={e => setFechaFin(e.target.value)}
                                        className="w-full border rounded px-3 py-2"
                                        required
                                        disabled={esMedioDia} // Disabled if half-day
                                    />
                                </div>
                            </div>

                            <div className="mb-4">
                                <label className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        checked={esMedioDia}
                                        onChange={e => {
                                            setEsMedioDia(e.target.checked);
                                            if (e.target.checked) setFechaFin(fechaInicio); // Force same day
                                        }}
                                        className="form-checkbox h-5 w-5 text-blue-600"
                                    />
                                    <span className="text-gray-700 font-bold">Es Media Jornada (0.5 días)</span>
                                </label>
                            </div>

                            <div className="mb-4 p-3 bg-blue-50 rounded border border-blue-200">
                                <p className="text-blue-800 font-semibold">
                                    Días calculados a descontar: <span className="text-2xl ml-2">{diasCalculados}</span>
                                </p>
                            </div>

                            <div className="mb-4">
                                <label className="block text-gray-700 text-sm font-bold mb-2">Observación</label>
                                <textarea
                                    value={observacion}
                                    onChange={e => setObservacion(e.target.value)}
                                    className="w-full border rounded px-3 py-2"
                                    rows={3}
                                ></textarea>
                            </div>

                            <div className="flex justify-end space-x-2">
                                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400 text-gray-800">Cancelar</button>
                                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Guardar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Lista / Detalle */}
            {showListModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
                    <div className="bg-white p-6 rounded-lg w-full max-w-4xl shadow-xl h-3/4 flex flex-col">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-gray-800">
                                {selectedEvent ? 'Detalle de Solicitud' : 'Listado de Vacaciones'}
                            </h2>
                            <button onClick={() => { setShowListModal(false); setSelectedEvent(null); }} className="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
                        </div>

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
                                        {selectedEvent.comentario_aprobador && (
                                            <p className="col-span-2"><strong>Comentario Aprobador:</strong> {selectedEvent.comentario_aprobador}</p>
                                        )}
                                    </div>

                                    {/* Action to Anular (Only if not already anular) */}
                                    {selectedEvent.estado !== 'anulado' && (
                                        <div className="mt-6 flex space-x-4 border-t pt-4">
                                            <button
                                                onClick={() => handleAction(selectedEvent.id, 'anular')}
                                                className="flex-1 bg-red-600 text-white py-2 rounded hover:bg-red-700"
                                            >
                                                Anular Solicitud
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Empleado</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fechas</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Días</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acción</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {solicitudes.map(sol => (
                                            <tr key={sol.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedEvent(sol)}>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {sol.empleado_info.nombres} {sol.empleado_info.apellido_paterno}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {sol.fecha_inicio} - {sol.fecha_fin}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {sol.dias_calculados} {sol.es_medio_dia ? '(0.5)' : ''}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                                 ${sol.estado === 'aprobado' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                                        {sol.estado}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 hover:text-blue-900">
                                                    Ver Detalle
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Cerrar Ciclo */}
            {showClosureModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
                    <div className="bg-white p-6 rounded-lg w-full max-w-lg shadow-xl">
                        <h2 className="text-xl font-bold mb-4 text-gray-800">Cerrar Ciclo de Vacaciones</h2>
                        <p className="mb-4 text-sm text-gray-600">
                            Estás cerrando el periodo para <strong>{selectedEmployeeOption?.nombre}</strong>.
                            El saldo actual acumulado es de <strong>{saldoActual} días</strong>.
                        </p>

                        <form onSubmit={handleCerrarCiclo} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold mb-1">Nombre de la Gestión / Motivo</label>
                                <input
                                    type="text"
                                    value={gestionNombre}
                                    onChange={e => setGestionNombre(e.target.value)}
                                    placeholder="Ej: Gestion 2023-2024"
                                    className="w-full border rounded px-3 py-2"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold mb-1 text-indigo-700">Días a Guardar</label>
                                    <input
                                        type="number"
                                        step="0.5"
                                        value={diasGuardar}
                                        onChange={e => setDiasGuardar(Number(e.target.value))}
                                        className="w-full border rounded px-3 py-2 border-indigo-200"
                                        required
                                    />
                                    <p className="text-xs text-indigo-500 mt-1">Se sumarán al banco de días guardados.</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold mb-1 text-red-700">Días a Pagar</label>
                                    <input
                                        type="number"
                                        step="0.5"
                                        value={diasPagar}
                                        onChange={e => setDiasPagar(Number(e.target.value))}
                                        className="w-full border rounded px-3 py-2 border-red-200"
                                        required
                                    />
                                    <p className="text-xs text-red-500 mt-1">Se registrarán como liquidados/pagados.</p>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold mb-1">Nueva Fecha de Ingreso Vigente</label>
                                <input
                                    type="date"
                                    value={nuevaFechaIngreso}
                                    onChange={e => setNuevaFechaIngreso(e.target.value)}
                                    className="w-full border rounded px-3 py-2"
                                    required
                                />
                                <p className="text-xs text-gray-500 mt-1">A partir de esta fecha empezará el nuevo cálculo de antigüedad y ley.</p>
                            </div>

                            <div className="pt-4 border-t flex justify-between items-center">
                                <div className="text-sm font-bold">
                                    Total Liquidado: {(diasGuardar + diasPagar).toFixed(1)} / {saldoActual} días
                                </div>
                                <div className="space-x-2">
                                    <button type="button" onClick={() => setShowClosureModal(false)} className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400">Cancelar</button>
                                    <button type="submit" className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">Confirmar Cierre</button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VacacionesPage;
