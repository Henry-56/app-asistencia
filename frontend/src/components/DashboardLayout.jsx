import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export default function DashboardLayout() {
    const location = useLocation();
    const { user, logout } = useAuthStore();

    const navItems = [
        { path: '/dashboard', label: 'Inicio', icon: '🏠' },
        { path: '/dashboard/qr-generator', label: 'Generar QR', icon: '📱' },
        { path: '/dashboard/users', label: 'Usuarios', icon: '👥' },
        { path: '/dashboard/reports', label: 'Reportes', icon: '📊' },
    ];

    const isActive = (path) => {
        if (path === '/dashboard') {
            return location.pathname === '/dashboard';
        }
        return location.pathname.startsWith(path);
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Sidebar */}
            <div className="fixed inset-y-0 left-0 w-64 bg-gradient-to-b from-blue-600 to-indigo-700 shadow-xl">
                <div className="p-6">
                    <h1 className="text-white text-2xl font-bold">Sistema Asistencias</h1>
                    <p className="text-blue-100 text-sm mt-1">Panel Admin</p>
                </div>

                <nav className="mt-6">
                    {navItems.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`flex items-center px-6 py-3 text-white transition ${isActive(item.path)
                                ? 'bg-white/20 border-r-4 border-white font-semibold'
                                : 'hover:bg-white/10'
                                }`}
                        >
                            <span className="mr-3 text-xl">{item.icon}</span>
                            {item.label}
                        </Link>
                    ))}
                </nav>

                <div className="absolute bottom-0 w-full p-6 border-t border-white/20">
                    <div className="text-white mb-3">
                        <p className="font-semibold">{user?.fullName}</p>
                        <p className="text-sm text-blue-100">{user?.employeeCode}</p>
                    </div>
                    <button
                        onClick={logout}
                        className="w-full bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg font-semibold transition"
                    >
                        Cerrar Sesión
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="ml-64 min-h-screen">
                <div className="bg-white shadow-sm border-b">
                    <div className="px-8 py-4">
                        <h2 className="text-2xl font-bold text-gray-800">
                            {navItems.find((item) => isActive(item.path))?.label || 'Dashboard'}
                        </h2>
                    </div>
                </div>

                <div className="p-8">
                    <Outlet />
                </div>
            </div>
        </div>
    );
}
