import React, { useState, useEffect } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
// @ts-ignore
import 'moment/locale/es';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import axios from 'axios';
import { useAuth } from '../AuthContext';

moment.locale('es');
const localizer = momentLocalizer(moment);

interface Employee {
    id: number;
    nombres: string;
    apellido_paterno: string;
    apellido_materno: string;
    fecha_nacimiento: string;
}

const CumpleanosPage: React.FC = () => {
    const { token } = useAuth();
    const [events, setEvents] = useState<any[]>([]);
    const [currentDate, setCurrentDate] = useState(new Date());

    useEffect(() => {
        const fetchEmployees = async () => {
            try {
                const response = await axios.get('http://127.0.0.1:8000/api/empleados/?no_pagination=true', {
                    headers: { 'Authorization': `Token ${token}` }
                });

                if (Array.isArray(response.data)) {
                    const generatedEvents: any[] = [];
                    const today = moment().startOf('day');
                    const currentYear = today.year();

                    // Retrieve employees and filter those with birth date
                    const employees = response.data.filter((e: Employee) => e.fecha_nacimiento);

                    employees.forEach((emp: Employee) => {
                        // Generate events for +/- 5 years to support scrolling
                        for (let offset = -5; offset <= 5; offset++) {
                            const year = currentYear + offset;

                            // Construct the birthday date for the specific year
                            // Note: month is 0-indexed in moment if setting manually, 
                            // but here we can just set year if we parse correctly.
                            // Easier: create a moment object from the string, then set year.
                            const eventDate = moment(emp.fecha_nacimiento).year(year);

                            // Status Logic
                            let color = '#3B82F6'; // Default Blue (Future > 7 days)

                            if (eventDate.isSame(today, 'day')) {
                                color = '#10B981'; // Green (Today)
                            } else if (eventDate.isBefore(today, 'day')) {
                                color = '#EF4444'; // Red (Passed)
                            } else {
                                const diffDays = eventDate.diff(today, 'days');
                                if (diffDays <= 7) {
                                    color = '#F59E0B'; // Orange (Next 7 days)
                                }
                            }

                            generatedEvents.push({
                                title: `🎂 ${emp.nombres} ${emp.apellido_paterno}`,
                                start: eventDate.toDate(),
                                end: eventDate.toDate(), // Single day event
                                resource: emp,
                                color: color,
                                allDay: true
                            });
                        }
                    });

                    setEvents(generatedEvents);
                }
            } catch (error) {
                console.error("Error fetching employees for birthdays", error);
            }
        };

        fetchEmployees();
    }, [token]);

    const eventStyleGetter = (event: any) => {
        return {
            style: {
                backgroundColor: event.color,
                color: 'white',
                borderRadius: '5px',
                display: 'block',
                border: 'none'
            }
        };
    };

    const handleNavigate = (date: Date) => {
        setCurrentDate(date);
    };

    return (
        <div className="h-screen flex flex-col bg-gray-100 p-6">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Calendario de Cumpleaños</h1>
            <div className="flex-grow bg-white p-4 rounded-lg shadow overflow-hidden">
                <Calendar
                    localizer={localizer}
                    events={events}
                    date={currentDate}
                    onNavigate={handleNavigate}
                    startAccessor="start"
                    endAccessor="end"
                    style={{ height: '100%' }}
                    messages={{ next: "Siguiente", previous: "Anterior", today: "Hoy", month: "Mes", week: "Semana", day: "Día" }}
                    eventPropGetter={eventStyleGetter}
                    views={['month', 'agenda']} // Only month and agenda make sense for birthdays
                />
            </div>
            {/* Legend */}
            <div className="mt-4 flex space-x-6 text-sm font-semibold bg-white p-4 rounded-lg shadow">
                <div className="flex items-center"><span className="w-4 h-4 bg-green-500 rounded-full mr-2"></span> Hoy</div>
                <div className="flex items-center"><span className="w-4 h-4 bg-orange-400 rounded-full mr-2"></span> Próximos 7 días</div>
                <div className="flex items-center"><span className="w-4 h-4 bg-blue-500 rounded-full mr-2"></span> Futuro</div>
                <div className="flex items-center"><span className="w-4 h-4 bg-red-500 rounded-full mr-2"></span> Pasado</div>
            </div>
        </div>
    );
};

export default CumpleanosPage;
