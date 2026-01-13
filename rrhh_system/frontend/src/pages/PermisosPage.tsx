// src/pages/PermisosPage.tsx
import React, { useState, useEffect } from 'react';
import type { ChangeEvent } from 'react';
import axios from 'axios';
import { useAuth } from '../AuthContext';
import { Modal } from '../components/Modal';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import type { View } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { SearchableSelect } from '../components/SearchableSelect';
import './CalendarOverrides.css';

import 'moment/dist/locale/es'; // Import Spanish locale

// Set moment locale to Spanish globally
moment.locale('es');

// Initialize moment localizer
const localizer = momentLocalizer(moment);

// --- Interfaces ---
interface Option { id: number; nombre: string; }
interface EmpleadoFull { id: number; nombres: string; apellido_paterno: string; apellido_materno?: string; departamento?: number; }
interface DepartamentoFull { id: number; nombre: string; jefe_departamento?: number; }
interface Permiso {
    id: number;
    empleado: number;
    empleado_info: EmpleadoFull;
    aprobador_asignado: number;
    aprobador_asignado_info: EmpleadoFull;
    fecha_solicitud: string;
    tipo_permiso: string;
    observacion: string;
    hora_salida: string;
    hora_regreso: string;
    estado: string;
    comentario_aprobador?: string;
    fecha_aprobacion?: string;
    departamento_nombre?: string;
}

interface PermisoFormState {
    empleado: number | null;
    fecha_solicitud: string;
    tipo_permiso: string;
    observacion: string;
    hora_salida: string;
    hora_regreso: string;
    estado: string;
}

const initialFormState: PermisoFormState = {
    empleado: null,
    fecha_solicitud: new Date().toISOString().split('T')[0],
    tipo_permiso: 'trabajo',
    observacion: '',
    hora_salida: '',
    hora_regreso: '',
    estado: 'pendiente',
};

// --- Main Component ---
// Custom Date Header Component
const CustomDateHeader = ({ label, date }: { label: string, date: Date }) => {
    // Determine if the date is today using strict string comparison
    const isToday = moment(date).format('YYYY-MM-DD') === moment().format('YYYY-MM-DD');

    return (
        <div className="rbc-date-cell flex justify-center items-center py-1">
            <span
                className={`date-number-circle ${isToday ? 'today' : ''}`}
            >
                {label}
            </span>
        </div>
    );
};

export const PermisosPage: React.FC = () => {
    const { token, user } = useAuth();

    // Force Spanish locale on mount
    useEffect(() => {
        moment.locale('es');
    }, []);

    const formats = {
        monthHeaderFormat: (date: Date) => moment(date).format('MMMM YYYY'),
        weekdayFormat: (date: Date) => moment(date).format('dddd'), // Full weekday name
        dayFormat: (date: Date) => moment(date).format('DD ddd'),
        dayHeaderFormat: (date: Date) => moment(date).format('dddd DD MMM'),
    };

    // ... existing state ...
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [permisos, setPermisos] = useState<Permiso[]>([]);
    const [calendarEvents, setCalendarEvents] = useState<any[]>([]);

    const [allDepartments, setAllDepartments] = useState<DepartamentoFull[]>([]);
    const [allJefes, setAllJefes] = useState<EmpleadoFull[]>([]);
    const [allEmployees, setAllEmployees] = useState<EmpleadoFull[]>([]);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formState, setFormState] = useState<PermisoFormState>(initialFormState);
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});

    const [selectedJefe, setSelectedJefe] = useState<number | null>(null);
    const [selectedDepartamento, setSelectedDepartamento] = useState<number | null>(null);
    const [filteredDepartamentos, setFilteredDepartamentos] = useState<DepartamentoFull[]>([]);
    const [filteredEmpleados, setFilteredEmpleados] = useState<EmpleadoFull[]>([]);

    const [view, setView] = useState<View>('month');
    const [date, setDate] = useState(new Date());
    const [viewEvent, setViewEvent] = useState<Permiso | null>(null);

    const isAdminOrHR = user?.is_superuser || user?.groups.some(g => ['Admin', 'RRHH', 'Encargado', 'Jefe de Departamento'].includes(g.name));
    const isJefeDepto = user?.groups.some(g => g.name === 'Jefe de Departamento');
    const isPorteria = user?.groups.some(g => g.name === 'Porteria');
    const canViewAll = isAdminOrHR || isPorteria;

    const fetchData = async () => {
        setLoading(true);
        try {
            // Always fetch permises
            const permisosRes = await axios.get('http://127.0.0.1:8000/api/permisos/?no_pagination=true', { headers: { 'Authorization': `Token ${token}` } });

            const fetchedPermisos = permisosRes.data.results || permisosRes.data;
            setPermisos(fetchedPermisos);

            const events = fetchedPermisos.map((p: Permiso) => {
                // Ensure valid date formatting
                const start = moment(`${p.fecha_solicitud}T${p.hora_salida}`, "YYYY-MM-DDTHH:mm:ss").toDate();
                const end = moment(`${p.fecha_solicitud}T${p.hora_regreso}`, "YYYY-MM-DDTHH:mm:ss").toDate();
                return {
                    id: p.id,
                    title: `${p.empleado_info.nombres} ${p.empleado_info.apellido_paterno} - ${p.tipo_permiso}`,
                    start: start,
                    end: end,
                    resource: p,
                };
            });

            setCalendarEvents(events);

            // Conditional fetch for Admin/HR/Encargado/Porteria data
            if (canViewAll) {
                const [departmentsRes, jefesRes, employeesRes] = await Promise.all([
                    axios.get('http://127.0.0.1:8000/api/departamentos/?no_pagination=true', { headers: { 'Authorization': `Token ${token}` } }),
                    axios.get('http://127.0.0.1:8000/api/jefes-departamento/', { headers: { 'Authorization': `Token ${token}` } }),
                    axios.get('http://127.0.0.1:8000/api/empleados/?no_pagination=true', { headers: { 'Authorization': `Token ${token}` } }),
                ]);
                setAllDepartments(departmentsRes.data);
                setAllJefes(jefesRes.data);
                setAllEmployees(employeesRes.data.results || employeesRes.data);
            }

        } catch (err) {
            console.error(err);
            setError('Error al cargar los datos.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (token && user) {
            fetchData();
        }
    }, [token, user]);

    useEffect(() => {
        if (isPorteria) {
            setView('day');
        } else {
            setView('month');
        }
    }, [isPorteria]);

    // Auto-select Jefe for JefeDepto users
    useEffect(() => {
        if (isJefeDepto && user?.empleado_id && !selectedJefe) {
            setSelectedJefe(user.empleado_id);
        }
    }, [isJefeDepto, user, selectedJefe]);

    useEffect(() => {
        if (selectedJefe) {
            const managedDepts = allDepartments.filter(d => d.jefe_departamento === selectedJefe);
            setFilteredDepartamentos(managedDepts);

            // Auto-select department if only one exists for this Jefe
            if (managedDepts.length === 1) {
                setSelectedDepartamento(managedDepts[0].id);
            } else {
                if (selectedDepartamento && !managedDepts.find(d => d.id === selectedDepartamento)) {
                    setSelectedDepartamento(null);
                } else if (!selectedDepartamento) {
                    setSelectedDepartamento(null);
                }
            }
        } else {
            setFilteredDepartamentos(allDepartments);
            setSelectedDepartamento(null);
        }
        setFormState(p => ({ ...p, empleado: null }));
    }, [selectedJefe, allDepartments]);

    useEffect(() => {
        if (selectedDepartamento) {
            const deptEmployees = allEmployees.filter(e => e.departamento === selectedDepartamento);
            setFilteredEmpleados(deptEmployees);
        } else {
            setFilteredEmpleados([]);
        }
        setFormState(p => ({ ...p, empleado: null }));
    }, [selectedDepartamento, allEmployees]);

    const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setFormState(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        let dataToSubmit = { ...formState };
        if (!isAdminOrHR) {
            if (!user?.empleado_id) {
                setFormErrors({ general: "Tu usuario no está vinculado a un perfil de empleado." });
                return;
            }
            dataToSubmit.empleado = user.empleado_id;
        } else {
            if (!formState.empleado) {
                setFormErrors({ general: "Debes seleccionar un empleado." });
                return;
            }
        }

        try {
            await axios.post('http://127.0.0.1:8000/api/permisos/', dataToSubmit, { headers: { 'Authorization': `Token ${token}` } });
            alert('Permiso creado con éxito!');
            setIsModalOpen(false);
            setFormState(initialFormState);
            setSelectedJefe(null);
            setSelectedDepartamento(null);
            fetchData();
        } catch (err: any) {
            setFormErrors({ general: `Error al crear el permiso: ${JSON.stringify(err.response?.data)}` });
        }
    };

    const handleUpdateStatus = async (id: number, newStatus: string) => {
        try {
            await axios.patch(`http://127.0.0.1:8000/api/permisos/${id}/`, { estado: newStatus }, { headers: { 'Authorization': `Token ${token}` } });
            setPermisos(prev => prev.map(p => p.id === id ? { ...p, estado: newStatus } : p));
            setCalendarEvents(prev => prev.map(e => e.id === id ? { ...e, resource: { ...e.resource, estado: newStatus } } : e));

            if (viewEvent && viewEvent.id === id) {
                setViewEvent({ ...viewEvent, estado: newStatus });
            }
            alert(`Estado actualizado a: ${newStatus}`);
        } catch (err: any) {
            console.error(err);
            alert("Error al actualizar estado");
        }
    };

    const inputStyles = "mt-1 block w-full rounded-md border-gray-300 shadow-md p-2.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500";

    const eventPropGetter = (event: any) => {
        const status = event.resource.estado;
        let className = '';
        switch (status) {
            case 'aprobado':
                className = 'event-approved';
                break;
            case 'pendiente':
                className = 'event-pending';
                break;
            case 'anulado':
            case 'rechazado':
                className = 'event-cancelled';
                break;
            default:
                className = '';
        }
        return { className };
    };

    const MonthEvent = ({ event }: any) => {
        return (
            <div className="text-xs font-semibold truncate px-1">
                {event.title}
            </div>
        );
    };

    const TimeGridEvent = ({ event }: any) => {
        return (
            <div className="h-full w-full flex flex-col justify-start overflow-hidden">
                <div className="font-bold text-sm mb-1 truncate">{event.resource.empleado_info.nombres} {event.resource.empleado_info.apellido_paterno}</div>
                <div className="text-xs">
                    {moment(event.start).format('HH:mm')} - {moment(event.end).format('HH:mm')}
                </div>
            </div>
        );
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <div>
            {/* Printable Area - Hidden by default, visible on print */}
            <div className="hidden print:block printable-area bg-white p-8">
                {viewEvent && (
                    <div className="max-w-3xl mx-auto font-sans text-gray-900 border-2 border-gray-800 p-8">
                        {/* Header */}
                        <div className="text-center border-b-2 border-gray-800 pb-4 mb-6">
                            <h1 className="text-2xl font-bold uppercase">Papeleta de Permiso</h1>
                            <p className="text-sm text-gray-600 mt-1">Departamento de Recursos Humanos</p>
                        </div>

                        {/* Content Grid */}
                        <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm mb-12">
                            <div className="col-span-2 flex justify-between items-center mb-2">
                                <div>
                                    <span className="font-bold">N° de Permiso:</span>
                                    <span className="ml-2 font-mono text-lg">{viewEvent.id}</span>
                                </div>
                                <div>
                                    <span className="font-bold">Fecha Solicitud:</span>
                                    <span className="ml-2">{moment(viewEvent.fecha_solicitud).format('LL')}</span>
                                </div>
                            </div>

                            <div className="col-span-2 border-b border-gray-300 my-2"></div>

                            <div>
                                <span className="font-bold block text-gray-600 text-xs uppercase tracking-wider">Departamento</span>
                                <span className="text-base">{viewEvent.departamento_nombre || 'N/A'}</span>
                            </div>

                            <div>
                                <span className="font-bold block text-gray-600 text-xs uppercase tracking-wider">Empleado</span>
                                <span className="text-base">{viewEvent.empleado_info.nombres} {viewEvent.empleado_info.apellido_paterno} {viewEvent.empleado_info.apellido_materno || ''}</span>
                            </div>

                            <div>
                                <span className="font-bold block text-gray-600 text-xs uppercase tracking-wider">Motivo</span>
                                <span className="text-base capitalize">{viewEvent.tipo_permiso.replace('_', ' ')}</span>
                            </div>

                            <div>
                                <span className="font-bold block text-gray-600 text-xs uppercase tracking-wider">Observación</span>
                                <span className="text-base">{viewEvent.observacion || '-'}</span>
                            </div>

                            <div>
                                <span className="font-bold block text-gray-600 text-xs uppercase tracking-wider">Hora Salida</span>
                                <span className="text-base">{viewEvent.hora_salida.substring(0, 5)}</span>
                            </div>

                            <div>
                                <span className="font-bold block text-gray-600 text-xs uppercase tracking-wider">Hora Regreso</span>
                                <span className="text-base">{viewEvent.hora_regreso.substring(0, 5)}</span>
                            </div>
                        </div>

                        {/* Signatures */}
                        <div className="grid grid-cols-2 gap-16 mt-20 pt-10">
                            <div className="text-center">
                                <div className="border-t border-gray-800 w-full pt-2"></div>
                                <p className="font-bold">Firma Jefe de Departamento</p>
                                <p className="text-xs text-gray-500 mt-1">
                                    {viewEvent.aprobador_asignado_info ?
                                        `${viewEvent.aprobador_asignado_info.nombres} ${viewEvent.aprobador_asignado_info.apellido_paterno} ${viewEvent.aprobador_asignado_info.apellido_materno || ''}`.trim() :
                                        '______________________'}
                                </p>
                            </div>
                            <div className="text-center">
                                <div className="border-t border-gray-800 w-full pt-2"></div>
                                <p className="font-bold">Firma Empleado</p>
                                <p className="text-xs text-gray-500 mt-1">
                                    {viewEvent.empleado_info.nombres} {viewEvent.empleado_info.apellido_paterno} {viewEvent.empleado_info.apellido_materno || ''}
                                </p>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="mt-12 text-center text-xs text-gray-400">
                            <p>Este documento es constancia de la autorización del permiso solicitado.</p>
                            <p>Generado el: {moment().format('LLLL')}</p>
                        </div>
                    </div>
                )}
            </div>

            <div className="flex justify-between items-center mb-6 no-print">
                <h1 className="text-3xl font-bold text-gray-800">Permisos</h1>
                {!isPorteria && (
                    <button onClick={() => setIsModalOpen(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 font-semibold shadow-md">
                        Registrar Permiso
                    </button>
                )}
            </div>

            {loading ? <div>Cargando...</div> : error ? <div className="text-red-500 bg-red-100 p-4 rounded-lg">{error}</div> : (
                <div className="bg-white p-6 rounded-lg shadow-md no-print" style={{ height: '85vh' }}>
                    <Calendar
                        localizer={localizer}
                        events={calendarEvents}
                        startAccessor="start"
                        endAccessor="end"
                        style={{ height: '100%' }}
                        views={['month', 'week', 'day']}
                        view={view}
                        onView={setView}
                        date={date}
                        onNavigate={setDate}
                        popup
                        dayLayoutAlgorithm="no-overlap"
                        culture="es"
                        formats={formats}
                        selectable
                        onSelectSlot={(slotInfo) => {
                            setDate(slotInfo.start);
                            setView('day');
                        }}
                        onSelectEvent={(event) => setViewEvent(event.resource)}
                        components={{
                            month: { event: MonthEvent, dateHeader: CustomDateHeader },
                            week: { event: TimeGridEvent },
                            day: { event: TimeGridEvent },
                        }}
                        messages={{
                            next: "Siguiente",
                            previous: "Anterior",
                            today: "Hoy",
                            month: "Mes",
                            week: "Semana",
                            day: "Día",
                            date: "Fecha",
                            time: "Hora",
                            event: "Evento",
                            noEventsInRange: "Sin eventos en este rango",
                            showMore: total => `+ Ver más (${total})`
                        }}
                        eventPropGetter={eventPropGetter}
                    />
                </div>
            )}

            {/* Modal de Detalle de Permiso (Estilo Google Calendar Popover) */}
            <Modal isOpen={!!viewEvent} onClose={() => setViewEvent(null)}>
                {viewEvent && (
                    <div className="space-y-4 no-print">
                        <div className="flex justify-between items-start">
                            <h2 className="text-xl font-bold text-gray-800">{viewEvent.tipo_permiso.charAt(0).toUpperCase() + viewEvent.tipo_permiso.slice(1).replace('_', ' ')}</h2>
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${viewEvent.estado === 'aprobado' ? 'bg-green-100 text-green-800' :
                                viewEvent.estado === 'pendiente' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-red-100 text-red-800'
                                }`}>
                                {viewEvent.estado.toUpperCase()}
                            </span>
                        </div>

                        <div className="border-t border-gray-100 pt-3">
                            <div className="grid grid-cols-1 gap-3 text-sm text-gray-600">
                                <div className="flex items-center">
                                    <span className="font-semibold w-24">Empleado:</span>
                                    <span>{viewEvent.empleado_info.nombres} {viewEvent.empleado_info.apellido_paterno}</span>
                                </div>
                                <div className="flex items-center">
                                    <span className="font-semibold w-24">Fecha:</span>
                                    <span>{moment(viewEvent.fecha_solicitud).format('LL')}</span>
                                </div>
                                <div className="flex items-center">
                                    <span className="font-semibold w-24">Depto:</span>
                                    <span>{viewEvent.departamento_nombre || (allDepartments.find(d => d.id === viewEvent.empleado_info.departamento)?.nombre) || '-'}</span>
                                </div>
                                <div className="flex items-center">
                                    <span className="font-semibold w-24">Horario:</span>
                                    <span>{viewEvent.hora_salida.substring(0, 5)} - {viewEvent.hora_regreso.substring(0, 5)}</span>
                                </div>

                                {viewEvent.observacion && (
                                    <div className="mt-2">
                                        <p className="font-semibold mb-1">Motivo/Observación:</p>
                                        <p className="bg-gray-50 p-2 rounded text-gray-700">{viewEvent.observacion}</p>
                                    </div>
                                )}

                                {viewEvent.comentario_aprobador && (
                                    <div className="mt-2">
                                        <p className="font-semibold mb-1">Comentario Aprobador:</p>
                                        <p className="bg-gray-50 p-2 rounded text-gray-700 italic">"{viewEvent.comentario_aprobador}"</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-4 border-t border-gray-100 mt-4">
                            {viewEvent.estado === 'aprobado' && (
                                <button
                                    onClick={handlePrint}
                                    className="px-6 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 font-medium text-sm flex items-center gap-2"
                                    title="Imprimir"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                    </svg>
                                    Imprimir
                                </button>
                            )}

                            {isAdminOrHR && viewEvent.estado !== 'aprobado' && (
                                <button
                                    onClick={() => handleUpdateStatus(viewEvent.id, 'aprobado')}
                                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium text-sm shadow-sm"
                                >
                                    Aprobar
                                </button>
                            )}
                            {isAdminOrHR && viewEvent.estado !== 'rechazado' && viewEvent.estado !== 'anulado' && (
                                <button
                                    onClick={() => handleUpdateStatus(viewEvent.id, 'anulado')}
                                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 font-medium text-sm shadow-sm"
                                >
                                    Anular
                                </button>
                            )}
                            {isAdminOrHR && viewEvent.estado !== 'pendiente' && (
                                <button
                                    onClick={() => handleUpdateStatus(viewEvent.id, 'pendiente')}
                                    className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 font-medium text-sm shadow-sm"
                                >
                                    Poner Pendiente
                                </button>
                            )}
                            <button
                                onClick={() => setViewEvent(null)}
                                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 font-medium text-sm"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
                <div className="no-print">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <h2 className="text-2xl font-bold text-gray-800">Registrar Permiso por Horas</h2>
                        {formErrors.general && <div className="text-red-500 bg-red-100 p-3 rounded-lg mb-4">{formErrors.general}</div>}

                        {isAdminOrHR && (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label>Jefe de Departamento</label>
                                        <SearchableSelect
                                            options={allJefes.map(j => ({ id: j.id, nombre: `${j.nombres} ${j.apellido_paterno} ${j.apellido_materno || ''}`.trim() }))}
                                            selected={(() => {
                                                if (!selectedJefe) return null;
                                                const jefe = allJefes.find(j => j.id === selectedJefe);
                                                return jefe ? { id: jefe.id, nombre: `${jefe.nombres} ${jefe.apellido_paterno} ${jefe.apellido_materno || ''}`.trim() } : null;
                                            })()}
                                            onChange={option => setSelectedJefe(option?.id || null)}
                                            disabled={isJefeDepto}
                                        />
                                    </div>
                                    <div>
                                        <label>Departamento a Cargo</label>
                                        <SearchableSelect options={filteredDepartamentos.map(d => ({ id: d.id, nombre: d.nombre }))} onChange={option => setSelectedDepartamento(option?.id || null)} selected={selectedDepartamento ? { id: selectedDepartamento, nombre: allDepartments.find(d => d.id === selectedDepartamento)?.nombre || '' } : null} disabled={!selectedJefe || (isJefeDepto && filteredDepartamentos.length === 1)} />
                                    </div>
                                </div>
                                <div>
                                    <label>Empleado</label>
                                    <SearchableSelect
                                        options={filteredEmpleados.map(e => ({ id: e.id, nombre: `${e.nombres} ${e.apellido_paterno} ${e.apellido_materno || ''}`.trim() }))}
                                        selected={(() => {
                                            if (!formState.empleado) return null;
                                            const empleado = allEmployees.find(e => e.id === formState.empleado);
                                            return empleado ? { id: empleado.id, nombre: `${empleado.nombres} ${empleado.apellido_paterno} ${empleado.apellido_materno || ''}`.trim() } : null;
                                        })()}
                                        onChange={option => setFormState(p => ({ ...p, empleado: option?.id || null }))}
                                        disabled={!selectedDepartamento}
                                    />
                                </div>
                                <div>
                                    <label>Estado</label>
                                    <select name="estado" value={formState.estado} onChange={handleInputChange} className={inputStyles}>
                                        <option value="pendiente">Pendiente</option>
                                        <option value="aprobado">Aprobado</option>
                                        <option value="anulado">Anulado</option>
                                    </select>
                                </div>
                            </>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label>Fecha del Permiso</label>
                                <input type="date" name="fecha_solicitud" value={formState.fecha_solicitud} onChange={handleInputChange} className={inputStyles} />
                            </div>
                            <div>
                                <label>Tipo de Permiso</label>
                                <select name="tipo_permiso" value={formState.tipo_permiso} onChange={handleInputChange} className={inputStyles}>
                                    <option value="trabajo">Trabajo</option>
                                    <option value="personal">Personal</option>
                                    <option value="hora_almuerzo">Hora Almuerzo</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label>Hora de Salida</label>
                                <input type="time" name="hora_salida" value={formState.hora_salida} onChange={handleInputChange} className={inputStyles} />
                            </div>
                            <div>
                                <label>Hora de Regreso</label>
                                <input type="time" name="hora_regreso" value={formState.hora_regreso} onChange={handleInputChange} className={inputStyles} />
                            </div>
                        </div>

                        <div>
                            <label>Observación</label>
                            <textarea name="observacion" value={formState.observacion} onChange={handleInputChange} rows={3} className={inputStyles}></textarea>
                        </div>

                        <div className="flex justify-end mt-6">
                            <button type="button" onClick={() => setIsModalOpen(false)} className="mr-3 px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 font-semibold">Cancelar</button>
                            <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 font-semibold">Registrar Permiso</button>
                        </div>
                    </form>
                </div>
            </Modal>
        </div>
    );
};