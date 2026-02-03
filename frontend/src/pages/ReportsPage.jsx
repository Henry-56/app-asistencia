import { useState, useEffect } from 'react';
import api from '../lib/axios';
import toast from 'react-hot-toast';
import moment from 'moment';
import 'moment-timezone';
import * as XLSX from 'xlsx';
import {
    ListFilter, Grid, Users, Search, ShieldCheck, X,
    Calendar as CalIcon, BarChart3, Clock, User, Download, Filter,
    ChevronLeft, ChevronRight, List, AlertCircle, CheckCircle,
    XCircle, FileText, Briefcase
} from 'lucide-react';

export default function ReportsPage() {
    // --- STATE: GLOBAL ---
    const [viewMode, setViewMode] = useState('calendar'); // 'calendar' | 'list'

    // --- STATE: CALENDAR ---
    const [currentMonth, setCurrentMonth] = useState(moment());
    const [stats, setStats] = useState({});
    const [loadingStats, setLoadingStats] = useState(false);
    const [selectedDate, setSelectedDate] = useState(null);
    const [dayDetails, setDayDetails] = useState([]);
    const [loadingDetails, setLoadingDetails] = useState(false);

    // --- STATE: LIST FILTER ---
    const [users, setUsers] = useState([]);
    const [filters, setFilters] = useState({
        startDate: moment().startOf('month').format('YYYY-MM-DD'),
        endDate: moment().endOf('month').format('YYYY-MM-DD'),
        userId: ''
    });
    const [listData, setListData] = useState([]);
    const [listTotals, setListTotals] = useState({ attempts: 0, lates: 0, discounts: 0 });
    const [loadingList, setLoadingList] = useState(false);
    // --- STATE: JUSTIFY MODAL ---
    const [justifyModalOpen, setJustifyModalOpen] = useState(false);
    const [recordToJustify, setRecordToJustify] = useState(null);
    const [justificationReason, setJustificationReason] = useState('');
    const [justifying, setJustifying] = useState(false);

    useEffect(() => {
        fetchRangeStats();
        fetchUsers();
    }, [currentMonth]);

    // Initial fetch for list when switching to list mode
    useEffect(() => {
        if (viewMode === 'list') {
            fetchFilteredList();
        }
    }, [viewMode]);

    const fetchUsers = async () => {
        try {
            const { data } = await api.get('/auth/users');
            setUsers(data);
        } catch (error) {
            console.error('Error users:', error);
        }
    };

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
            console.error('Error details:', error);
            toast.error('Error al cargar día');
        } finally {
            setLoadingDetails(false);
        }
    };

    const fetchFilteredList = async () => {
        setLoadingList(true);
        try {
            const query = new URLSearchParams({
                start_date: filters.startDate,
                end_date: filters.endDate,
                ...(filters.userId && { user_id: filters.userId })
            }).toString();

            const { data } = await api.get(`/attendance/admin/all?${query}`);

            if (data.success) {
                setListData(data.records);

                // Calculate Totals
                const totals = data.records.reduce((acc, curr) => ({
                    attempts: acc.attempts + 1,
                    lates: acc.lates + (curr.late_minutes > 0 ? 1 : 0),
                    discounts: acc.discounts + (parseFloat(curr.discount) || 0)
                }), { attempts: 0, lates: 0, discounts: 0 });

                setListTotals(totals);
            }
        } catch (error) {
            console.error('Error list:', error);
            toast.error('Error al generar reporte');
        } finally {
            setLoadingList(false);
        }
    };

    const handleMonthChange = (direction) => {
        setCurrentMonth(prev => prev.clone().add(direction, 'months'));
        setSelectedDate(null);
    };

    const startJustify = (record) => {
        setRecordToJustify(record);
        setJustificationReason('');
        setJustifyModalOpen(true);
    };

    const submitJustification = async () => {
        if (!justificationReason.trim()) return toast.error('Debes ingresar un motivo');

        setJustifying(true);
        try {
            await api.post('/attendance/justify', {
                attendanceId: recordToJustify.id,
                reason: justificationReason
            });

            toast.success('Justificación aplicada');
            setJustifyModalOpen(false);

            // Refresh current view
            if (viewMode === 'list') fetchFilteredList();
            else if (selectedDate) fetchDayDetails(selectedDate);

        } catch (error) {
            console.error(error);
            toast.error('Error al justificar');
        } finally {
            setJustifying(false);
        }
    };

    const exportXLSX = (dataToExport, filename) => {
        if (!dataToExport.length) return toast.error('No hay datos para exportar');

        // Prepare data for Excel
        const rows = dataToExport.map(r => ({
            'Fecha': r.date || moment(r.check_in).format('YYYY-MM-DD'),
            'Empleado': r.employee || r.fullName,
            'Rol': r.role,
            'Turno': r.shift,
            'Estado': r.status,
            'Entrada': r.check_in ? (r.check_in.includes('T') ? moment(r.check_in).format('HH:mm:ss') : r.check_in) : '-',
            'Salida': r.check_out ? (r.check_out.includes('T') ? moment(r.check_out).format('HH:mm:ss') : r.check_out) : '-',
            'Tardanza (min)': r.late_minutes || 0,
            'Descuento (S/)': r.discount || 0,
            'Ubicación': r.location || '-'
        }));

        const worksheet = XLSX.utils.json_to_sheet(rows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Asistencia");

        // Generate buffer
        XLSX.writeFile(workbook, `${filename}.xlsx`);
    };

    // --- CALENDAR GRID HELPER ---
    const startOfMonth = currentMonth.clone().startOf('month');
    const startDaySun = startOfMonth.day();
    const daysInMonth = currentMonth.daysInMonth();
    const calendarDays = Array(startDaySun).fill(null).concat(
        Array.from({ length: daysInMonth }, (_, i) => startOfMonth.clone().date(i + 1).format('YYYY-MM-DD'))
    );

    return (
        <div className="space-y-6">

            {/* --- HEADER & CONTROLS --- */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl shadow-sm">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <CalIcon className="h-6 w-6 text-indigo-600" />
                        Reportes de Asistencia
                    </h1>
                    <p className="text-sm text-gray-500">Consulta y exporta historiales</p>
                </div>

                <div className="flex bg-gray-100 p-1 rounded-lg">
                    <button
                        onClick={() => setViewMode('calendar')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all ${viewMode === 'calendar' ? 'bg-white shadow text-indigo-600 font-semibold' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <Grid className="h-4 w-4" /> Calendario
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow text-indigo-600 font-semibold' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <ListFilter className="h-4 w-4" /> Detallado
                    </button>
                </div>
            </div>

            {/* --- CONTENT --- */}
            {viewMode === 'calendar' ? (
                !selectedDate ? (
                    // VIEW: CALENDAR GRID
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
                            <div className="text-center py-20 text-gray-400 animate-pulse">Cargando calendario...</div>
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
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                ) : (
                    // VIEW: DAY DETAILS
                    <div className="bg-white rounded-xl shadow p-6">
                        <div className="flex justify-between items-center mb-6 pb-4 border-b">
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => setSelectedDate(null)}
                                    className="p-2 hover:bg-gray-100 rounded-full text-gray-500"
                                >
                                    <ChevronLeft className="h-5 w-5" />
                                </button>
                                <div>
                                    <h2 className="text-xl font-bold text-gray-800">
                                        Detalle del {moment(selectedDate).format('LL')}
                                    </h2>
                                    <p className="text-sm text-gray-500">Vista diaria</p>
                                </div>
                            </div>
                            <button
                                onClick={() => exportXLSX(dayDetails, `asistencia_${selectedDate}`)}
                                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-semibold text-sm"
                            >
                                <Download className="h-4 w-4" /> Excel
                            </button>
                        </div>

                        {loadingDetails ? (
                            <div className="text-center py-20 text-gray-400">Cargando...</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-50 border-b">
                                        <tr>
                                            <th className="px-6 py-3 font-semibold text-gray-700">Empleado</th>
                                            <th className="px-6 py-3 font-semibold text-gray-700">Turno</th>
                                            <th className="px-6 py-3 font-semibold text-gray-700">Entrada</th>
                                            <th className="px-6 py-3 font-semibold text-gray-700">Estado</th>
                                            <th className="px-6 py-3 font-semibold text-gray-700 text-right">Multa</th>
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
                                                    <div className="flex items-center gap-2">
                                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${record.status === 'PRESENTE' ? 'bg-green-100 text-green-700' :
                                                            record.status === 'TARDE' ? 'bg-yellow-100 text-yellow-700' :
                                                                record.status === 'JUSTIFICADO' ? 'bg-blue-100 text-blue-700' :
                                                                    record.status === 'PENDIENTE' ? 'bg-gray-100 text-gray-600' :
                                                                        'bg-red-100 text-red-700'
                                                            }`}>
                                                            {record.status}
                                                        </span>
                                                        {record.isJustified && (
                                                            <ShieldCheck className="w-4 h-4 text-blue-600" />
                                                        )}
                                                    </div>
                                                    {record.late_minutes > 0 && <span className="ml-2 text-xs text-red-500">+{record.late_minutes}m</span>}
                                                </td>
                                                <td className="px-6 py-4 text-right font-medium text-red-600 flex justify-end items-center gap-2">
                                                    <span>{record.discount > 0 ? `S/ ${parseFloat(record.discount).toFixed(2)}` : record.status === 'JUSTIFICADO' ? 'S/ 0.00' : '-'}</span>
                                                    {(record.discount > 0 || record.status === 'FALTA') && !record.isJustified && (
                                                        <button
                                                            onClick={() => startJustify(record)}
                                                            className="p-1 hover:bg-gray-100 rounded-full text-gray-400 hover:text-indigo-600 transition-colors"
                                                            title="Justificar"
                                                        >
                                                            <ShieldCheck className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )
            ) : (
                // VIEW: LIST / ADVANCED FILTERS
                <div className="space-y-6">
                    {/* Filters */}
                    <div className="bg-white p-6 rounded-xl shadow-sm">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Inicio</label>
                                <input
                                    type="date"
                                    value={filters.startDate}
                                    onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                                    className="w-full border rounded-lg px-3 py-2"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Fin</label>
                                <input
                                    type="date"
                                    value={filters.endDate}
                                    onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                                    className="w-full border rounded-lg px-3 py-2"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Usuario</label>
                                <select
                                    value={filters.userId}
                                    onChange={(e) => setFilters(prev => ({ ...prev, userId: e.target.value }))}
                                    className="w-full border rounded-lg px-3 py-2"
                                >
                                    <option value="">Todos los usuarios</option>
                                    {users.map(u => (
                                        <option key={u.id} value={u.id}>{u.fullName}</option>
                                    ))}
                                </select>
                            </div>
                            <button
                                onClick={fetchFilteredList}
                                className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-indigo-700 flex items-center justify-center gap-2"
                            >
                                <Search className="h-4 w-4" /> Filtrar
                            </button>
                        </div>
                    </div>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-blue-500">
                            <p className="text-gray-500 text-sm">Registros Encontrados</p>
                            <p className="text-2xl font-bold text-gray-800">{listTotals.attempts}</p>
                        </div>
                        <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-yellow-500">
                            <p className="text-gray-500 text-sm">Total Tardanzas</p>
                            <p className="text-2xl font-bold text-gray-800">{listTotals.lates}</p>
                        </div>
                        <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-red-500">
                            <p className="text-gray-500 text-sm">Total Descuentos</p>
                            <p className="text-2xl font-bold text-red-600">S/ {listTotals.discounts.toFixed(2)}</p>
                        </div>
                    </div>

                    {/* Results Table */}
                    <div className="bg-white rounded-xl shadow p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-gray-700">Resultados del Reporte</h3>
                            <button
                                onClick={() => exportXLSX(listData, `reporte_general_${filters.startDate}_${filters.endDate}`)}
                                className="text-green-600 hover:bg-green-50 px-3 py-1 rounded-lg border border-green-200 flex items-center gap-2 text-sm font-medium"
                            >
                                <Download className="h-4 w-4" /> Exportar a Excel
                            </button>
                        </div>

                        {loadingList ? (
                            <div className="py-20 text-center text-gray-500">Generando reporte...</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-50 border-b">
                                        <tr>
                                            <th className="px-4 py-3 font-semibold text-gray-700">Fecha</th>
                                            <th className="px-4 py-3 font-semibold text-gray-700">Empleado</th>
                                            <th className="px-4 py-3 font-semibold text-gray-700">Turno</th>
                                            <th className="px-4 py-3 font-semibold text-gray-700">Entrada</th>
                                            <th className="px-4 py-3 font-semibold text-gray-700">Salida</th>
                                            <th className="px-4 py-3 font-semibold text-gray-700">Estado</th>
                                            <th className="px-4 py-3 font-semibold text-gray-700 text-right">Multa</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {listData.map((record, idx) => (
                                            <tr key={idx} className="hover:bg-gray-50">
                                                <td className="px-4 py-3 text-gray-600">{record.date}</td>
                                                <td className="px-4 py-3">
                                                    <div className="font-medium text-gray-900">{record.employee}</div>
                                                    <div className="text-xs text-gray-400">{record.role}</div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${record.shift === 'AM' ? 'bg-orange-100 text-orange-700' : 'bg-indigo-100 text-indigo-700'}`}>
                                                        {record.shift}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 font-mono text-gray-600">{record.check_in}</td>
                                                <td className="px-4 py-3 font-mono text-gray-600">{record.check_out}</td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${record.status === 'PRESENTE' ? 'bg-green-100 text-green-700' :
                                                            record.status === 'TARDE' ? 'bg-yellow-100 text-yellow-700' :
                                                                record.status === 'JUSTIFICADO' ? 'bg-blue-100 text-blue-700' :
                                                                    'bg-red-100 text-red-700'
                                                            }`}>
                                                            {record.status}
                                                        </span>
                                                        {record.isJustified && <ShieldCheck className="w-4 h-4 text-blue-600" />}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-right font-medium text-red-600 flex justify-end items-center gap-2">
                                                    <span>{record.discount > 0 ? `S/ ${record.discount.toFixed(2)}` : record.status === 'JUSTIFICADO' ? 'S/ 0.00' : '-'}</span>
                                                    {(record.discount > 0 || record.status === 'FALTA') && !record.isJustified && (
                                                        <button
                                                            onClick={() => startJustify(record)}
                                                            className="p-1 hover:bg-gray-100 rounded-full text-gray-400 hover:text-indigo-600 transition-colors"
                                                            title="Justificar"
                                                        >
                                                            <ShieldCheck className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                        {listData.length === 0 && (
                                            <tr>
                                                <td colSpan="7" className="text-center py-8 text-gray-500">
                                                    No se encontraron registros en este rango.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}
            {/* --- JUSTIFY MODAL --- */}
            {justifyModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="bg-gray-50 px-6 py-4 border-b flex justify-between items-center">
                            <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                <ShieldCheck className="text-indigo-600" />
                                Justificar Asistencia
                            </h3>
                            <button onClick={() => setJustifyModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-800">
                                <p>Estás a punto de justificar una <strong>{recordToJustify?.status}</strong>.</p>
                                <p>Esto eliminará la multa de <strong>S/ {parseFloat(recordToJustify?.discount || 0).toFixed(2)}</strong>.</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Motivo de la justificación
                                </label>
                                <textarea
                                    value={justificationReason}
                                    onChange={(e) => setJustificationReason(e.target.value)}
                                    placeholder="Ej: Cita médica, Licencia por salud..."
                                    className="w-full border rounded-lg px-3 py-2 h-24 focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                                />
                            </div>

                            <button
                                onClick={submitJustification}
                                disabled={justifying}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {justifying ? 'Procesando...' : 'Confirmar Justificación'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
