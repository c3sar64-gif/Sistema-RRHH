// src/pages/PermisosPage.tsx
import React, { useState, useEffect, ChangeEvent } from 'react';
import axios from 'axios';
import { useAuth } from '../AuthContext';
import { Modal } from '../components/Modal';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { SearchableSelect } from '../components/SearchableSelect';

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
export const PermisosPage: React.FC = () => {
    const { token, user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [permisos, setPermisos] = useState<Permiso[]>([]);
    const [calendarEvents, setCalendarEvents] = useState([]);
    
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

    const isAdminOrHR = user?.is_superuser || user?.groups.some(g => ['Admin', 'RRHH', 'Encargado'].includes(g.name));

    const fetchData = async () => {
        setLoading(true);
        try {
            const [permisosRes, departmentsRes, jefesRes, employeesRes] = await Promise.all([
                axios.get('http://127.0.0.1:8000/api/permisos/', { headers: { 'Authorization': `Token ${token}` } }),
                axios.get('http://127.0.0.1:8000/api/departamentos/?no_pagination=true', { headers: { 'Authorization': `Token ${token}` } }),
                axios.get('http://127.0.0.1:8000/api/jefes-departamento/', { headers: { 'Authorization': `Token ${token}` } }),
                axios.get('http://127.0.0.1:8000/api/empleados/?no_pagination=true', { headers: { 'Authorization': `Token ${token}` } }),
            ]);

            const fetchedPermisos = permisosRes.data.results || permisosRes.data;
            setPermisos(fetchedPermisos);

            const events = fetchedPermisos.map((p: Permiso) => ({
                id: p.id,
                title: `${p.empleado_info.nombres} ${p.empleado_info.apellido_paterno} - ${p.tipo_permiso}`,
                start: moment(`${p.fecha_solicitud} ${p.hora_salida}`).toDate(),
                end: moment(`${p.fecha_solicitud} ${p.hora_regreso}`).toDate(),
                resource: p,
            }));
            setCalendarEvents(events);

            setAllDepartments(departmentsRes.data);
            setAllJefes(jefesRes.data);
            setAllEmployees(employeesRes.data.results || employeesRes.data);
        } catch (err) {
            setError('Error al cargar los datos.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [token]);
    
    useEffect(() => {
        if (selectedJefe) {
            const managedDepts = allDepartments.filter(d => d.jefe_departamento === selectedJefe);
            setFilteredDepartamentos(managedDepts);
        } else {
            setFilteredDepartamentos(allDepartments);
        }
        setSelectedDepartamento(null);
        setFormState(p => ({...p, empleado: null}));
    }, [selectedJefe, allDepartments]);

    useEffect(() => {
        if (selectedDepartamento) {
            const deptEmployees = allEmployees.filter(e => e.departamento === selectedDepartamento);
            setFilteredEmpleados(deptEmployees);
        } else {
            setFilteredEmpleados([]);
        }
        setFormState(p => ({...p, empleado: null}));
    }, [selectedDepartamento, allEmployees]);

    const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setFormState(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        let dataToSubmit = { ...formState };
        if (!isAdminOrHR) {
            if (!user?.empleado?.id) {
                setFormErrors({ general: "Tu usuario no está vinculado a un perfil de empleado."});
                return;
            }
            dataToSubmit.empleado = user.empleado.id;
        } else {
            if (!formState.empleado) {
                 setFormErrors({ general: "Debes seleccionar un empleado."});
                return;
            }
        }
        
        try {
            await axios.post('http://127.0.0.1:8000/api/permisos/', dataToSubmit, { headers: { 'Authorization': `Token ${token}` } });
            alert('Permiso creado con éxito!');
            setIsModalOpen(false);
            fetchData();
        } catch (err: any) {
            setFormErrors({ general: `Error al crear el permiso: ${JSON.stringify(err.response?.data)}` });
        }
    };
    
    const inputStyles = "mt-1 block w-full rounded-md border-gray-300 shadow-md p-2.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500";
    
    const eventPropGetter = (event) => {
        const status = event.resource.estado;
        let className = 'text-white p-1 text-xs rounded ';
        switch (status) {
            case 'aprobado':
                className += 'bg-green-500';
                break;
            case 'pendiente':
                className += 'bg-yellow-500';
                break;
            case 'anulado':
            case 'rechazado':
                className += 'bg-red-500';
                break;
            default:
                className += 'bg-gray-500';
        }
        return { className };
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Calendario de Permisos</h1>
                <button onClick={() => setIsModalOpen(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 font-semibold shadow-md">
                    Registrar Permiso
                </button>
            </div>
            
            {loading ? <div>Cargando...</div> : error ? <div className="text-red-500 bg-red-100 p-4 rounded-lg">{error}</div> : (
                <div className="bg-white p-6 rounded-lg shadow-md" style={{ height: '70vh' }}>
                    <Calendar
                        localizer={localizer}
                        events={calendarEvents}
                        startAccessor="start"
                        endAccessor="end"
                        style={{ height: '100%' }}
                        views={['month', 'week', 'day', 'agenda']}
                        defaultView="week" // Changed default view to week
                        popup
                        messages={{
                            next: "Sig",
                            previous: "Ant",
                            today: "Hoy",
                            month: "Mes",
                            week: "Semana",
                            day: "Día",
                            agenda: "Agenda",
                        }}
                        eventPropGetter={eventPropGetter}
                    />
                </div>
            )}

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
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
                            />
                                </div>
                                <div>
                                    <label>Departamento a Cargo</label>
                                    <SearchableSelect options={filteredDepartamentos.map(d => ({id: d.id, nombre: d.nombre}))} onChange={option => setSelectedDepartamento(option?.id || null)} selected={selectedDepartamento ? {id: selectedDepartamento, nombre: allDepartments.find(d => d.id === selectedDepartamento)?.nombre || ''} : null} disabled={!selectedJefe} />
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
                                                                onChange={option => setFormState(p => ({...p, empleado: option?.id || null}))}
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
            </Modal>
        </div>
    );
};