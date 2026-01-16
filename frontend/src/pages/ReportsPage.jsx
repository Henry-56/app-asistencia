import { useState, useEffect } from 'react';
import api from '../lib/axios';
import toast from 'react-hot-toast';
import moment from 'moment';

export default function ReportsPage() {
    const [loading, setLoading] = useState(false);
    const [records, setRecords] = useState([]);
    const [filters, setFilters] = useState({
        start_date: moment().subtract(30, 'days').format('YYYY-MM-DD'),
        end_date: moment().format('YYYY-MM-DD'),
        user_id: ''
    });

    useEffect(() => {
        fetchRecords();
    }, []);

    const fetchRecords = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams(filters);
            const { data } = await api.get(`/attendance/admin/all?${params.toString()}`);
            setRecords(data.records);
        } catch (error) {
            console.error(error);
            toast.error('Error al cargar reporte');
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (e) => {
        setFilters({ ...filters, [e.target.name]: e.target.value });
    };

    const exportCSV = () => {
        if (!records.length) return toast.error('No hay datos para exportar');

        const headers = ['Fecha', 'Empleado', 'Código', 'Rol', 'Turno', 'Entrada', 'Salida', 'Estado', 'Tardanza (min)', 'Descuento (S/)', 'Sede'];
        const rows = records.map(r => [
            r.date,
            r.employee,
            r.code,
            r.role,
            r.shift,
            r.check_in,
            r.check_out,
            r.status,
            r.late_minutes,
            r.discount.toFixed(2),
            r.location
        ]);

        const csvContent = "data:text/csv;charset=utf-8,"
            + [headers.join(','), ...rows.map(e => e.join(','))].join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `asistencias_${moment().format('YYYY-MM-DD')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-800">Reporte de Asistencias</h1>
                <button
                    onClick={exportCSV}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-semibold"
                >
                    📥 Exportar CSV
                </button>
            </div>

            {/* Filtros */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-wrap gap-4 items-end">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Desde</label>
                    <input
                        type="date"
                        name="start_date"
                        value={filters.start_date}
                        onChange={handleFilterChange}
                        className="border rounded-lg px-3 py-2 w-40"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Hasta</label>
                    <input
                        type="date"
                        name="end_date"
                        value={filters.end_date}
                        onChange={handleFilterChange}
                        className="border rounded-lg px-3 py-2 w-40"
                    />
                </div>
                <button
                    onClick={fetchRecords}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
                >
                    Filtrar
                </button>
            </div>

            {/* Tabla */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="px-6 py-3 font-semibold text-gray-700">Fecha</th>
                                <th className="px-6 py-3 font-semibold text-gray-700">Empleado</th>
                                <th className="px-6 py-3 font-semibold text-gray-700">Turno</th>
                                <th className="px-6 py-3 font-semibold text-gray-700">Entrada/Salida</th>
                                <th className="px-6 py-3 font-semibold text-gray-700">Estado</th>
                                <th className="px-6 py-3 font-semibold text-gray-700">Desc.</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="text-center py-8 text-gray-500">Cargando datos...</td>
                                </tr>
                            ) : records.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="text-center py-8 text-gray-500">No se encontraron registros</td>
                                </tr>
                            ) : (
                                records.map((record) => (
                                    <tr key={record.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 text-gray-600 whitespace-nowrap">{record.date}</td>
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-gray-900">{record.employee}</div>
                                            <div className="text-xs text-gray-500">{record.role} - {record.code}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded text-xs font-semibold ${record.shift === 'AM' ? 'bg-orange-100 text-orange-700' : 'bg-indigo-100 text-indigo-700'
                                                }`}>
                                                {record.shift}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">
                                            <div>IN: {record.check_in}</div>
                                            <div>OUT: {record.check_out}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${record.status === 'PRESENTE' ? 'bg-green-100 text-green-700' :
                                                    record.status === 'TARDE' ? 'bg-yellow-100 text-yellow-700' :
                                                        'bg-red-100 text-red-700'
                                                }`}>
                                                {record.status}
                                            </span>
                                            {record.late_minutes > 0 && (
                                                <div className="text-xs text-red-500 mt-1">+{record.late_minutes} min</div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 font-mono font-medium text-red-600">
                                            {record.discount > 0 ? `S/ ${record.discount.toFixed(2)}` : '-'}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
