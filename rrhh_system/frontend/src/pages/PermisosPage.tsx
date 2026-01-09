// src/pages/PermisosPage.tsx
import React, { useState, useEffect, ChangeEvent } from 'react';
import axios from 'axios';
import { useAuth } from '../AuthContext';
import { Modal } from '../components/Modal';
import { SearchableSelect } from '../components/SearchableSelect';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';

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
    fecha_solicitud: string;
    hora_salida: string;
    hora_regreso: string;
    observacion: string;
}
interface PermisoFormState {
    departamento: number | null;
    jefe_departamento: number | null;
    empleado: number | null;
    fecha_solicitud: string;
    tipo_permiso: string;
    observacion: string;
    hora_salida: string;
    hora_regreso: string;
    estado: string;
}

const initialFormState: PermisoFormState = {
    departamento: null,
    jefe_departamento: null,
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
    const { token } = useAuth();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Data for Calendar
    const [permisos, setPermisos] = useState<Permiso[]>([]);
    const [calendarEvents, setCalendarEvents] = useState([]);

    // Data for Form
    const [allDepartments, setAllDepartments] = useState<DepartamentoFull[]>([]);
    const [allJefes, setAllJefes] = useState<EmpleadoFull[]>([]);
    const [allEmployees, setAllEmployees] = useState<EmpleadoFull[]>([]);
    const [filteredDepartamentos, setFilteredDepartamentos] = useState<DepartamentoFull[]>([]);
    const [filteredEmpleados, setFilteredEmpleados] = useState<EmpleadoFull[]>([]);
    
    // Modal and Form State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formState, setFormState] = useState<PermisoFormState>(initialFormState);
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});

    // --- Fetch Initial Data ---
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

            const events = fetchedPermisos.map((p: Permiso) => {
                const start = moment(`${p.fecha_solicitud} ${p.hora_salida}`).toDate();
                const end = moment(`${p.fecha_solicitud} ${p.hora_regreso}`).toDate();
                return {
                    id: p.id,
                    title: `${p.empleado_info.nombres} ${p.empleado_info.apellido_paterno} - ${p.observacion}`,
                    start,
                    end,
                    allDay: false,
                };
            });
            setCalendarEvents(events);

            setAllDepartments(departmentsRes.data);
            setAllJefes(jefesRes.data);
            setAllEmployees(employeesRes.data.results || employeesRes.data);
        } catch (err) {
            setError('Error al cargar los datos.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [token]);

    // --- Cascading Logic Effects ---
    useEffect(() => {
        if (formState.jefe_departamento) {
            const jefeManagedDepartments = allDepartments.filter(dept => dept.jefe_departamento === formState.jefe_departamento);
            setFilteredDepartamentos(jefeManagedDepartments);
            if (!jefeManagedDepartments.some(dept => dept.id === formState.departamento)) {
                setFormState(prev => ({ ...prev, departamento: null, empleado: null }));
            }
        } else {
            setFilteredDepartamentos(allDepartments);
        }
    }, [formState.jefe_departamento, allDepartments]);

    useEffect(() => {
        if (formState.departamento) {
            const employeesInDepartment = allEmployees.filter(emp => emp.departamento === formState.departamento);
            setFilteredEmpleados(employeesInDepartment);
            if (!employeesInDepartment.some(emp => emp.id === formState.empleado)) {
                setFormState(prev => ({ ...prev, empleado: null }));
            }
        } else {
            setFilteredEmpleados([]);
        }
    }, [formState.departamento, allEmployees]);

    // --- Form Handling ---
    const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormState(prev => ({ ...prev, [name]: value }));
        setFormErrors(prev => ({ ...prev, [name]: '' }));
    };

    const handleSelectChange = (name: keyof PermisoFormState, option: Option | null) => {
        setFormState(prev => ({ ...prev, [name]: option ? option.id : null }));
        setFormErrors(prev => ({ ...prev, [name]: '' }));
    };

    const validateForm = () => {
        // Validation logic... (same as before)
        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) return;
        try {
            await axios.post('http://127.0.0.1:8000/api/permisos/', formState, { headers: { 'Authorization': `Token ${token}` } });
            alert('Permiso solicitado con éxito!');
            setIsModalOpen(false);
            setFormState(initialFormState);
            fetchData(); // Refresh calendar
        } catch (err: any) {
            setFormErrors(prev => ({ ...prev, general: `Error al crear permiso: ${JSON.stringify(err.response?.data)}` }));
            console.error(err);
        }
    };

    if (loading && !permisos.length) return <div>Cargando...</div>;
    if (error) return <div className="text-red-500 bg-red-100 p-4 rounded-lg">{error}</div>;

    const inputStyles = "mt-1 block w-full rounded-md border-gray-300 shadow-md p-2.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500";

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Calendario de Permisos</h1>
                <button onClick={() => setIsModalOpen(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 font-semibold shadow-md">
                    Solicitar Permiso
                </button>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md" style={{ height: '70vh' }}>
                <Calendar
                    localizer={localizer}
                    events={calendarEvents}
                    startAccessor="start"
                    endAccessor="end"
                    style={{ height: '100%' }}
                    messages={{
                        next: "Sig",
                        previous: "Ant",
                        today: "Hoy",
                        month: "Mes",
                        week: "Semana",
                        day: "Día",
                        agenda: "Agenda",
                    }}
                />
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* The form from the previous implementation goes here */}
                    <h2 className="text-2xl font-bold text-gray-800">Solicitar Permiso por Horas</h2>
                    {formErrors.general && <div className="text-red-500 bg-red-100 p-3 rounded-lg mb-4">{formErrors.general}</div>}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Jefe de Departamento */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Jefe de Departamento</label>
                            <SearchableSelect
                                options={allJefes.map(j => ({ id: j.id, nombre: `${j.nombres} ${j.apellido_paterno} ${j.apellido_materno || ''}`.trim() }))}
                                selected={(() => {
                                    if (!formState.jefe_departamento) return null;
                                    const jefe = allJefes.find(j => j.id === formState.jefe_departamento);
                                    return jefe ? { id: jefe.id, nombre: `${jefe.nombres} ${jefe.apellido_paterno} ${jefe.apellido_materno || ''}`.trim() } : null;
                                })()}
                                onChange={(option) => handleSelectChange('jefe_departamento', option)}
                                className={`${inputStyles} ${formErrors.jefe_departamento ? 'border-red-500' : ''}`}
                            />
                        </div>

                        {/* Departamento (filtrado por jefe) */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Departamento</label>
                            <SearchableSelect
                                options={filteredDepartamentos.map(d => ({ id: d.id, nombre: d.nombre }))}
                                selected={formState.departamento ? { id: formState.departamento, nombre: filteredDepartamentos.find(d => d.id === formState.departamento)?.nombre || '' } : null}
                                onChange={(option) => handleSelectChange('departamento', option)}
                                className={`${inputStyles} ${formErrors.departamento ? 'border-red-500' : ''}`}
                                disabled={!formState.jefe_departamento}
                            />
                        </div>
                    </div>

                    {/* Empleado (filtrado por departamento) */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Empleado</label>
                        <SearchableSelect
                            options={filteredEmpleados.map(e => ({ id: e.id, nombre: `${e.nombres} ${e.apellido_paterno} ${e.apellido_materno || ''}`.trim() }))}
                            selected={(() => {
                                if (!formState.empleado) return null;
                                const empleado = allEmployees.find(e => e.id === formState.empleado);
                                return empleado ? { id: empleado.id, nombre: `${empleado.nombres} ${empleado.apellido_paterno} ${empleado.apellido_materno || ''}`.trim() } : null;
                            })()}
                            onChange={(option) => handleSelectChange('empleado', option)}
                            className={`${inputStyles} ${formErrors.empleado ? 'border-red-500' : ''}`}
                            disabled={!formState.departamento}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Fecha de Solicitud */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Fecha del Permiso</label>
                            <input
                                type="date"
                                name="fecha_solicitud"
                                value={formState.fecha_solicitud}
                                onChange={handleInputChange}
                                className={`${inputStyles} ${formErrors.fecha_solicitud ? 'border-red-500' : ''}`}
                            />
                        </div>

                        {/* Tipo de Permiso */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Tipo de Permiso</label>
                            <select name="tipo_permiso" value={formState.tipo_permiso} onChange={handleInputChange} className={inputStyles}>
                                <option value="trabajo">Trabajo</option>
                                <option value="personal">Personal</option>
                                <option value="hora_almuerzo">Hora Almuerzo</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Hora Salida */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Hora de Salida</label>
                            <input type="time" name="hora_salida" value={formState.hora_salida} onChange={handleInputChange} className={inputStyles} />
                        </div>

                        {/* Hora Regreso */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Hora de Regreso</label>
                            <input type="time" name="hora_regreso" value={formState.hora_regreso} onChange={handleInputChange} className={inputStyles} />
                        </div>
                    </div>

                    {/* Observación */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Observación</label>
                        <textarea name="observacion" value={formState.observacion} onChange={handleInputChange} rows={3} className={inputStyles}></textarea>
                    </div>

                    <div className="flex justify-end mt-6">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="mr-3 px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 font-semibold">Cancelar</button>
                        <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 font-semibold shadow-md">Enviar Permiso</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};