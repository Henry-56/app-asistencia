import { useState, useEffect } from 'react';
import api from '../lib/axios';
import toast from 'react-hot-toast';

export default function DashboardHome() {
    const [stats, setStats] = useState({
        usersCount: '-',
        presentToday: '-',
        lateToday: '-'
    });

    const [newUser, setNewUser] = useState({
        full_name: '',
        email: '',
        role: 'COLABORADOR',
    });
    const [loading, setLoading] = useState(false);
    const [generatedCode, setGeneratedCode] = useState(null);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const { data } = await api.get('/reports/dashboard-stats');
            if (data.success) {
                setStats(data.data);
            }
        } catch (error) {
            console.error('Error fetching dashboard stats:', error);
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { data } = await api.post('/auth/register', newUser);
            setGeneratedCode(data.data);
            toast.success('Usuario creado exitosamente');
            setNewUser({ full_name: '', email: '', role: 'COLABORADOR' });
            fetchStats(); // Update stats
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error al crear usuario');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-xl shadow-md">
                    <div className="flex items-center">
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                            <span className="text-2xl">👥</span>
                        </div>
                        <div>
                            <p className="text-gray-600 text-sm">Total Usuarios</p>
                            <p className="text-2xl font-bold text-gray-800">{stats.usersCount}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-md">
                    <div className="flex items-center">
                        <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mr-4">
                            <span className="text-2xl">✅</span>
                        </div>
                        <div>
                            <p className="text-gray-600 text-sm">Asistencias Hoy</p>
                            <p className="text-2xl font-bold text-gray-800">{stats.presentToday}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-md">
                    <div className="flex items-center">
                        <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mr-4">
                            <span className="text-2xl">⏰</span>
                        </div>
                        <div>
                            <p className="text-gray-600 text-sm">Tardanzas Hoy</p>
                            <p className="text-2xl font-bold text-gray-800">{stats.lateToday}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Registro Rápido */}
            <div className="bg-white rounded-xl shadow-md p-6 mb-8">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Registro Rápido de Usuario</h2>

                <form onSubmit={handleRegister} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <input
                        type="text"
                        placeholder="Nombre completo"
                        value={newUser.full_name}
                        onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                        className="px-4 py-2 border rounded-lg"
                        required
                    />
                    <input
                        type="email"
                        placeholder="Email (opcional)"
                        value={newUser.email}
                        onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                        className="px-4 py-2 border rounded-lg"
                    />
                    <select
                        value={newUser.role}
                        onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                        className="px-4 py-2 border rounded-lg"
                    >
                        <option value="COLABORADOR">Colaborador</option>
                        <option value="PRACTICANTE">Practicante</option>
                    </select>
                    <button
                        type="submit"
                        disabled={loading}
                        className="bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
                    >
                        {loading ? 'Creando...' : 'Crear Usuario'}
                    </button>
                </form>

                {generatedCode && (
                    <div className="mt-4 p-4 bg-green-50 border-2 border-green-500 rounded-lg">
                        <p className="text-green-800 font-semibold mb-2">
                            ¡Usuario creado! Código de acceso:
                        </p>
                        <div className="flex items-center justify-center gap-4">
                            <span className="text-4xl font-bold text-green-700 tracking-widest">
                                {generatedCode.login_code}
                            </span>
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(generatedCode.login_code);
                                    toast.success('Código copiado');
                                }}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                            >
                                Copiar
                            </button>
                        </div>
                        <p className="text-sm text-green-700 mt-2">
                            Employee Code: {generatedCode.employee_code}
                        </p>
                    </div>
                )}
            </div>

            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
                <h3 className="font-semibold text-gray-800 mb-3">📋 Accesos Rápidos</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <a href="/dashboard/qr-generator" className="bg-white p-4 rounded-lg shadow hover:shadow-md transition text-center">
                        <span className="text-2xl mb-2 block">📱</span>
                        <span className="text-sm font-medium text-gray-700">Generar QR</span>
                    </a>
                    <a href="/dashboard/users" className="bg-white p-4 rounded-lg shadow hover:shadow-md transition text-center">
                        <span className="text-2xl mb-2 block">👥</span>
                        <span className="text-sm font-medium text-gray-700">Usuarios</span>
                    </a>
                    <div className="bg-white p-4 rounded-lg shadow hover:shadow-md transition text-center cursor-pointer">
                        <span className="text-2xl mb-2 block">📊</span>
                        <span className="text-sm font-medium text-gray-700">Reportes</span>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow hover:shadow-md transition text-center cursor-pointer">
                        <span className="text-2xl mb-2 block">⚙️</span>
                        <span className="text-sm font-medium text-gray-700">Configuración</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
