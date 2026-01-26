import { useState, useEffect } from 'react';
import api from '../lib/axios';
import toast from 'react-hot-toast';
import moment from 'moment';
import { ChevronLeft, ChevronRight, Calendar as CalIcon, Download, Reply } from 'lucide-react';

export default function ReportsPage() {
    const [currentMonth, setCurrentMonth] = useState(moment());
    const [stats, setStats] = useState({}); // { '2025-01-26': { present: 1, ... } }
    const [loadingStats, setLoadingStats] = useState(false);

    const [selectedDate, setSelectedDate] = useState(null);
    const [dayDetails, setDayDetails] = useState([]);
    const [loadingDetails, setLoadingDetails] = useState(false);

    useEffect(() => {
        fetchRangeStats();
    }, [currentMonth]);

    const fetchRangeStats = async () => {
        setLoadingStats(true);
        try {
            const start = currentMonth.clone().startOf('month').format('YYYY-MM-DD');
            const end = currentMonth.clone().endOf('month').format('YYYY-MM-DD');
            const { data } = await api.get(`/reports/range?start=${start}&end=${end}`);

            if (data.success) {
                const map = {};
                data.data.forEach(item => {
                    map[item.date] = item;
                });
                setStats(map);
            }
        } catch (error) {
            console.error('Error fetching stats:', error);
            toast.error('Error al cargar calendario');
        } finally {
            setLoadingStats(false);
        }
    };

    const fetchDayDetails = async (date) => {
        setLoadingDetails(true);
        setSelectedDate(date);
        try {
            const { data } = await api.get(`/reports/day?date=${date}`);
            if (data.success) {
                setDayDetails(data.data);
            }
        } catch (error) {
            console.error('Error fetching details:', error);
            toast.error('Error al cargar detalles del día');
        } finally {
            setLoadingDetails(false);
        }
    };

    const handleMonthChange = (direction) => {
        setCurrentMonth(prev => prev.clone().add(direction, 'months'));
        setSelectedDate(null);
    };

    // Calendar Grid Logic
    const startOfMonth = currentMonth.clone().startOf('month');
    const endOfMonth = currentMonth.clone().endOf('month');
    const startDay = (startOfMonth.day() + 6) % 7; // Adjust simple logic so Monday=0 if needed, or stick to Sun=0.
    // Standard calendar usually starts Sunday (0).
    // Let's assume standard Sun-Sat (0-6).
    const startDaySun = startOfMonth.day();
    const daysInMonth = currentMonth.daysInMonth();

    // Create grid array
    const calendarDays = [];
    // Empty slots
    for (let i = 0; i < startDaySun; i++) {
        calendarDays.push(null);
    }
    // Days
    for (let i = 1; i <= daysInMonth; i++) {
        calendarDays.push(startOfMonth.clone().date(i).format('YYYY-MM-DD'));
    }

    const exportCSV = () => {
        if (!dayDetails.length) return toast.error('No hay datos para exportar');
        // ... CSV logic similar to before but for day details
        const headers = ['Empleado', 'Rol', 'Turno', 'Estado', 'Entrada', 'Tardanza', 'Descuento', 'Ubicación'];
        const rows = dayDetails.map(r => [
            r.fullName,
            r.role,
            r.shift,
            r.status,
            r.check_in ? moment(r.check_in).format('HH:mm:ss') : '-',
            r.late_minutes || 0,
            r.discount || 0,
            r.location || '-'
        ]);

        const csvContent = "data:text/csv;charset=utf-8,"
            + [headers.join(','), ...rows.map(e => e.join(','))].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `asistencia_${selectedDate}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <CalIcon className="h-6 w-6 text-indigo-600" />
                    Reporte de Asistencia
                </h1>
                {selectedDate && (
                    <button
                        onClick={exportCSV}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-semibold"
                    >
                        <Download className="h-4 w-4" /> Exportar CSV
                    </button>
                )}
            </div>

            {!selectedDate ? (
                // CALENDAR VIEW
                <div className="bg-white rounded-xl shadow p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-gray-700 capitalize">
                            {currentMonth.format('MMMM YYYY')}
                        </h2>
                        <div className="flex gap-2">
                            <button onClick={() => handleMonthChange(-1)} className="p-2 hover:bg-gray-100 rounded-full">
                                <ChevronLeft className="h-5 w-5" />
                            </button>
                            <button onClick={() => handleMonthChange(1)} className="p-2 hover:bg-gray-100 rounded-full">
                                <ChevronRight className="h-5 w-5" />
                            </button>
                        </div>
                    </div>

                    {loadingStats ? (
                        <div className="text-center py-20 text-gray-400">Cargando calendario...</div>
                    ) : (
                        <div className="grid grid-cols-7 gap-px bg-gray-200 border rounded-lg overflow-hidden">
                            {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(d => (
                                <div key={d} className="bg-gray-50 p-2 text-center text-xs font-semibold text-gray-500 uppercase">
                                    {d}
                                </div>
                            ))}

                            {calendarDays.map((dateStr, idx) => {
                                if (!dateStr) return <div key={`empty-${idx}`} className="bg-white h-32" />;

                                const dayData = stats[dateStr] || { present: 0, late: 0, absent: 0 };
                                const dateNum = moment(dateStr).date();
                                const isToday = dateStr === moment().format('YYYY-MM-DD');

                                return (
                                    <div
                                        key={dateStr}
                                        onClick={() => fetchDayDetails(dateStr)}
                                        className={`bg-white h-32 p-2 cursor-pointer transition-colors hover:bg-blue-50 relative group ${isToday ? 'bg-blue-50 ring-1 ring-blue-400 ring-inset' : ''}`}
                                    >
                                        <span className={`text-sm font-medium ${isToday ? 'text-blue-600' : 'text-gray-700'}`}>
                                            {dateNum}
                                        </span>

                                        <div className="mt-2 space-y-1">
                                            {dayData.present > 0 && (
                                                <div className="flex items-center justify-between text-xs px-2 py-1 bg-green-100 text-green-700 rounded-md">
                                                    <span>Presentes</span>
                                                    <span className="font-bold">{dayData.present}</span>
                                                </div>
                                            )}
                                            {dayData.late > 0 && (
                                                <div className="flex items-center justify-between text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded-md">
                                                    <span>Tardes</span>
                                                    <span className="font-bold">{dayData.late}</span>
                                                </div>
                                            )}
                                            {dayData.absent > 0 && (
                                                <div className="flex items-center justify-between text-xs px-2 py-1 bg-red-100 text-red-700 rounded-md">
                                                    <span>Faltas</span>
                                                    <span className="font-bold">{dayData.absent}</span>
                                                </div>
                                            )}
                                            {(dayData.present === 0 && dayData.late === 0 && dayData.absent === 0) && (
                                                <div className="text-xs text-gray-300 text-center mt-4">-</div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            ) : (
                // DETAIL VIEW
                <div className="bg-white rounded-xl shadow p-6">
                    <div className="flex justify-between items-center mb-6 pb-4 border-b">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => setSelectedDate(null)}
                                className="p-2 hover:bg-gray-100 rounded-full text-gray-500"
                            >
                                <Reply className="h-5 w-5" />
                            </button>
                            <div>
                                <h2 className="text-xl font-bold text-gray-800">
                                    Detalle del {moment(selectedDate).format('LL')}
                                </h2>
                                <p className="text-sm text-gray-500">Listado de asistencias y faltas calculadas</p>
                            </div>
                        </div>
                    </div>

                    {loadingDetails ? (
                        <div className="text-center py-20 text-gray-400">Cargando detalles...</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 border-b">
                                    <tr>
                                        <th className="px-6 py-3 font-semibold text-gray-700">Empleado</th>
                                        <th className="px-6 py-3 font-semibold text-gray-700">Turno</th>
                                        <th className="px-6 py-3 font-semibold text-gray-700">Hora Entrada</th>
                                        <th className="px-6 py-3 font-semibold text-gray-700">Estado</th>
                                        <th className="px-6 py-3 font-semibold text-gray-700 text-right">Multa/Desc.</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {dayDetails.map((record, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50">
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-gray-900">{record.fullName}</div>
                                                <div className="text-xs text-gray-500">{record.role}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded text-xs font-semibold ${record.shift === 'AM' ? 'bg-orange-100 text-orange-700' : 'bg-indigo-100 text-indigo-700'}`}>
                                                    {record.shift}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 font-mono text-gray-600">
                                                {record.check_in ? moment(record.check_in).tz('America/Lima').format('HH:mm:ss') : '-'}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${record.status === 'PRESENTE' ? 'bg-green-100 text-green-700' :
                                                        record.status === 'TARDE' ? 'bg-yellow-100 text-yellow-700' :
                                                            record.status === 'PENDIENTE' ? 'bg-gray-100 text-gray-600' :
                                                                'bg-red-100 text-red-700'
                                                    }`}>
                                                    {record.status}
                                                </span>
                                                {record.late_minutes > 0 && <span className="ml-2 text-xs text-red-500">+{record.late_minutes}m</span>}
                                            </td>
                                            <td className="px-6 py-4 text-right font-medium text-red-600">
                                                {record.discount > 0 ? `S/ ${parseFloat(record.discount).toFixed(2)}` : '-'}
                                            </td>
                                        </tr>
                                    ))}
                                    {dayDetails.length === 0 && (
                                        <tr>
                                            <td colSpan="5" className="text-center py-8 text-gray-500">
                                                No hay registros estimados para este día.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
