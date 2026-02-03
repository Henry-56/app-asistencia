import { useState, useEffect } from 'react';
import api from '../lib/axios';
import { toast } from 'react-hot-toast';
import { User, Calendar as CalendarIcon, X, Check, Save } from 'lucide-react';

export default function UsersPage() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [scheduleMap, setScheduleMap] = useState({}); // { dayIso: { AM: { isActive: bool, start: '09:00', end: '13:00' }, ... } }
    const [savingSchedule, setSavingSchedule] = useState(false);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const { data } = await api.get('/auth/users');
            setUsers(data);
        } catch (error) {
            console.error('Error fetching users:', error);
            toast.error('Error al cargar usuarios');
        } finally {
            setLoading(false);
        }
    };

    const openScheduleModal = async (user) => {
        setEditingUser(user);
        setScheduleModalOpen(true);
        // Initialize with all false but default times
        const initial = {};
        for (let i = 1; i <= 6; i++) {
            initial[i] = {
                AM: { isActive: false, start: '09:00', end: '13:00' },
                PM: { isActive: false, start: '14:00', end: '18:00' }
            };
        }
        setScheduleMap(initial);

        try {
            const { data } = await api.get(`/users/${user.id}/schedule`);
            if (data.success) {
                const map = JSON.parse(JSON.stringify(initial)); // Deep copy
                data.data.forEach(item => {
                    if (map[item.dayOfWeek] && map[item.dayOfWeek][item.shift]) {
                        map[item.dayOfWeek][item.shift] = {
                            isActive: item.isActive,
                            start: item.startTime || (item.shift === 'AM' ? '09:00' : '14:00'),
                            end: item.endTime || (item.shift === 'AM' ? '13:00' : '18:00')
                        };
                    }
                });
                setScheduleMap(map);
            }
        } catch (error) {
            console.error('Error fetching schedule:', error);
            toast.error('Error al cargar horario');
        }
    };

    const toggleShift = (day, shift) => {
        setScheduleMap(prev => ({
            ...prev,
            [day]: {
                ...prev[day],
                [shift]: {
                    ...prev[day][shift],
                    isActive: !prev[day][shift].isActive
                }
            }
        }));
    };

    const updateTime = (day, shift, field, value) => {
        setScheduleMap(prev => ({
            ...prev,
            [day]: {
                ...prev[day],
                [shift]: {
                    ...prev[day][shift],
                    [field]: value
                }
            }
        }));
    };

    const toggleDay = (day) => {
        const current = scheduleMap[day];
        const allActive = current.AM.isActive && (day === 6 ? true : current.PM.isActive);

        setScheduleMap(prev => {
            const newState = { ...prev[day] };
            newState.AM = { ...newState.AM, isActive: !allActive };
            if (day !== 6) {
                newState.PM = { ...newState.PM, isActive: !allActive };
            }
            return {
                ...prev,
                [day]: newState
            };
        });
    };

    const saveSchedule = async () => {
        if (!editingUser) return;
        setSavingSchedule(true);
        try {
            // Convert map to array
            const scheduleArray = [];
            Object.entries(scheduleMap).forEach(([day, shifts]) => {
                const dayInt = parseInt(day);
                if (shifts.AM.isActive) {
                    scheduleArray.push({
                        dayOfWeek: dayInt,
                        shift: 'AM',
                        isActive: true,
                        startTime: shifts.AM.start,
                        endTime: shifts.AM.end
                    });
                }
                if (shifts.PM.isActive) {
                    scheduleArray.push({
                        dayOfWeek: dayInt,
                        shift: 'PM',
                        isActive: true,
                        startTime: shifts.PM.start,
                        endTime: shifts.PM.end
                    });
                }
            });

            await api.put(`/users/${editingUser.id}/schedule`, { schedule: scheduleArray });
            toast.success('Horario actualizado');
            setScheduleModalOpen(false);
        } catch (error) {
            console.error('Error saving schedule:', error);
            toast.error('Error al guardar horario');
        } finally {
            setSavingSchedule(false);
        }
    };

    const DAYS = [
        { id: 1, name: 'Lunes' },
        { id: 2, name: 'Martes' },
        { id: 3, name: 'Miércoles' },
        { id: 4, name: 'Jueves' },
        { id: 5, name: 'Viernes' },
        { id: 6, name: 'Sábado' },
    ];

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <User className="h-6 w-6 text-indigo-600" />
                Gestión de Usuarios
            </h2>

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Empleado</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rol</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Login Code</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {users.map((user) => (
                            <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                        <div className="h-10 w-10 flex-shrink-0">
                                            <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                                                {user.fullName.charAt(0)}
                                            </div>
                                        </div>
                                        <div className="ml-4">
                                            <div className="text-sm font-medium text-gray-900">{user.fullName}</div>
                                            <div className="text-xs text-gray-500">{user.employeeCode}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                        ${user.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' :
                                            user.role === 'PRACTICANTE' ? 'bg-blue-100 text-blue-800' :
                                                'bg-green-100 text-green-800'}`}>
                                        {user.role}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                        ${user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        {user.isActive ? 'Activo' : 'Inactivo'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                                    {user.loginCode}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button
                                        onClick={() => openScheduleModal(user)}
                                        className="text-indigo-600 hover:text-indigo-900 flex items-center justify-end gap-1 ml-auto"
                                    >
                                        <CalendarIcon className="h-4 w-4" />
                                        Horario
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Schedule Modal */}
            {scheduleModalOpen && editingUser && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-lg w-full overflow-hidden">
                        <div className="bg-indigo-600 px-6 py-4 flex justify-between items-center text-white">
                            <h3 className="text-lg font-bold">Horario Semanal (Editable)</h3>
                            <button onClick={() => setScheduleModalOpen(false)} className="hover:bg-indigo-700 p-1 rounded">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="p-6">
                            <p className="text-gray-600 mb-4">
                                Configura los turnos para <span className="font-semibold">{editingUser.fullName}</span>.
                            </p>

                            <div className="border rounded-lg overflow-hidden">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-2 font-medium text-gray-700">Día</th>
                                            <th className="px-4 py-2 font-medium text-gray-700 text-center">Mañana</th>
                                            <th className="px-4 py-2 font-medium text-gray-700 text-center">Tarde</th>
                                            <th className="px-4 py-2 font-medium text-gray-700 text-center">Todo</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {DAYS.map((day) => (
                                            <tr key={day.id} className="hover:bg-gray-50">
                                                <td className="px-4 py-2 font-medium text-gray-900 align-top pt-4">{day.name}</td>
                                                {['AM', 'PM'].map(shift => {
                                                    if (day.id === 6 && shift === 'PM') return <td key="PM" className="px-4 py-2 text-center align-top pt-4"><span className="text-gray-300">-</span></td>;

                                                    const isActive = scheduleMap[day.id]?.[shift]?.isActive;

                                                    return (
                                                        <td key={shift} className="px-4 py-2">
                                                            <div className="flex flex-col items-center gap-2">
                                                                <button
                                                                    onClick={() => toggleShift(day.id, shift)}
                                                                    className={`w-6 h-6 rounded border flex items-center justify-center transition-colors ${isActive
                                                                        ? 'bg-blue-600 border-blue-600 text-white'
                                                                        : 'border-gray-300 text-transparent hover:border-blue-400'
                                                                        }`}
                                                                >
                                                                    <Check className="h-4 w-4" />
                                                                </button>

                                                                {isActive && (
                                                                    <div className="flex flex-col gap-1 mt-1">
                                                                        <input
                                                                            type="time"
                                                                            className="text-xs border rounded px-1 py-0.5 w-20 text-center"
                                                                            value={scheduleMap[day.id][shift].start}
                                                                            onChange={(e) => updateTime(day.id, shift, 'start', e.target.value)}
                                                                        />
                                                                        <input
                                                                            type="time"
                                                                            className="text-xs border rounded px-1 py-0.5 w-20 text-center"
                                                                            value={scheduleMap[day.id][shift].end}
                                                                            onChange={(e) => updateTime(day.id, shift, 'end', e.target.value)}
                                                                        />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </td>
                                                    );
                                                })}
                                                <td className="px-4 py-2 text-center align-top pt-4">
                                                    <button
                                                        onClick={() => toggleDay(day.id)}
                                                        className="text-xs text-blue-600 hover:underline"
                                                    >
                                                        Full
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="mt-6 flex justify-end gap-3">
                                <button
                                    onClick={() => setScheduleModalOpen(false)}
                                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={saveSchedule}
                                    disabled={savingSchedule}
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2 disabled:opacity-50"
                                >
                                    {savingSchedule ? 'Guardando...' : (
                                        <>
                                            <Save className="h-4 w-4" />
                                            Guardar Horario
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
