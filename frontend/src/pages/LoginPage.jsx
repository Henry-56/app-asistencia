import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

export default function LoginPage() {
    const [step, setStep] = useState('select-role'); // select-role | login | register
    const [selectedRole, setSelectedRole] = useState(null);
    const [loginCode, setLoginCode] = useState('03TF');
    const [registerData, setRegisterData] = useState({
        full_name: 'Usuario Test',
        email: 'test@empresa.com',
    });
    const [showCodeModal, setShowCodeModal] = useState(false);
    const [generatedCode, setGeneratedCode] = useState({ login_code: '', employee_code: '' });
    const { login, register, loading } = useAuthStore();
    const navigate = useNavigate();

    const handleRoleSelect = (role) => {
        setSelectedRole(role);
        setStep('login');
    };

    const handleLogin = async (e) => {
        e.preventDefault();

        if (loginCode.length !== 4) {
            toast.error('El código debe tener 4 caracteres');
            return;
        }

        try {
            const user = await login(loginCode.toUpperCase());

            toast.success(`¡Bienvenido, ${user.fullName}!`);

            if (user.role === 'ADMIN') {
                navigate('/dashboard');
            } else {
                navigate('/scan');
            }
        } catch (error) {
            const errorMsg = error.response?.data?.message || 'Código inválido';
            toast.error(errorMsg);
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();

        if (!registerData.full_name.trim()) {
            toast.error('El nombre es requerido');
            return;
        }

        try {
            const result = await register({
                full_name: registerData.full_name,
                email: registerData.email || null,
                role: selectedRole,
            });

            // Guardar el código generado y mostrar modal
            setGeneratedCode({
                login_code: result.login_code,
                employee_code: result.employee_code
            });
            setShowCodeModal(true);

        } catch (error) {
            console.error('Error en registro:', error);
            const errorMsg = error.response?.data?.message || 'Error al registrarse. Intenta nuevamente.';
            toast.error(errorMsg);
        }
    };

    const handleCloseCodeModal = () => {
        setShowCodeModal(false);
        setRegisterData({ full_name: '', email: '' });
        setStep('login');
        toast.success(`Ahora ingresa con tu código: ${generatedCode.login_code}`, { duration: 8000 });
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        toast.success('Código copiado al portapapeles', { duration: 2000 });
    };

    const getRoleIcon = (role) => {
        if (role === 'ADMIN') return '👔';
        if (role === 'COLABORADOR') return '💼';
        return '🎓';
    };

    const getRoleName = (role) => {
        if (role === 'ADMIN') return 'Administrador';
        if (role === 'COLABORADOR') return 'Colaborador';
        return 'Practicante';
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 p-6">
            <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md">

                {/* STEP 1: Selección de Rol */}
                {step === 'select-role' && (
                    <>
                        <div className="text-center mb-8">
                            <div className="bg-gradient-to-r from-blue-600 to-purple-600 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                            </div>
                            <h1 className="text-3xl font-bold text-gray-800">
                                Sistema de Asistencias
                            </h1>
                            <p className="text-gray-600 mt-2">Selecciona tu tipo de usuario</p>
                        </div>

                        <div className="space-y-3">
                            <button
                                onClick={() => handleRoleSelect('ADMIN')}
                                className="w-full p-4 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition group"
                            >
                                <div className="flex items-center">
                                    <span className="text-3xl mr-4">👔</span>
                                    <div className="text-left">
                                        <p className="font-semibold text-gray-800 group-hover:text-blue-600">Administrador</p>
                                        <p className="text-sm text-gray-500">Gestión del sistema</p>
                                    </div>
                                </div>
                            </button>

                            <button
                                onClick={() => handleRoleSelect('COLABORADOR')}
                                className="w-full p-4 border-2 border-gray-200 rounded-xl hover:border-green-500 hover:bg-green-50 transition group"
                            >
                                <div className="flex items-center">
                                    <span className="text-3xl mr-4">💼</span>
                                    <div className="text-left">
                                        <p className="font-semibold text-gray-800 group-hover:text-green-600">Colaborador</p>
                                        <p className="text-sm text-gray-500">Registro de asistencias</p>
                                    </div>
                                </div>
                            </button>

                            <button
                                onClick={() => handleRoleSelect('PRACTICANTE')}
                                className="w-full p-4 border-2 border-gray-200 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition group"
                            >
                                <div className="flex items-center">
                                    <span className="text-3xl mr-4">🎓</span>
                                    <div className="text-left">
                                        <p className="font-semibold text-gray-800 group-hover:text-purple-600">Practicante</p>
                                        <p className="text-sm text-gray-500">Registro de asistencias</p>
                                    </div>
                                </div>
                            </button>
                        </div>
                    </>
                )}

                {/* STEP 2: Login */}
                {step === 'login' && (
                    <>
                        <button
                            onClick={() => {
                                setStep('select-role');
                                setSelectedRole(null);
                                setLoginCode('');
                            }}
                            className="mb-4 text-gray-600 hover:text-gray-800 flex items-center"
                        >
                            ← Volver
                        </button>

                        <div className="text-center mb-6">
                            <span className="text-5xl mb-3 block">{getRoleIcon(selectedRole)}</span>
                            <h2 className="text-2xl font-bold text-gray-800">{getRoleName(selectedRole)}</h2>
                            <p className="text-gray-600 text-sm mt-1">Ingresa tu código de acceso</p>
                        </div>

                        <form onSubmit={handleLogin} className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Código de Acceso (4 dígitos)
                                </label>
                                <input
                                    type="text"
                                    value={loginCode}
                                    onChange={(e) => setLoginCode(e.target.value.toUpperCase())}
                                    maxLength={4}
                                    placeholder="A5K9"
                                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-center text-2xl font-bold tracking-widest uppercase focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                                    required
                                    autoFocus
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading || loginCode.length !== 4}
                                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg hover:shadow-xl"
                            >
                                {loading ? 'Ingresando...' : 'Ingresar'}
                            </button>
                        </form>

                        {/* Opción de registro solo para Colaborador/Practicante */}
                        {selectedRole !== 'ADMIN' && (
                            <div className="mt-6 text-center">
                                <p className="text-sm text-gray-600 mb-3">
                                    ¿No tienes código?
                                </p>
                                <button
                                    onClick={() => setStep('register')}
                                    className="text-blue-600 font-semibold hover:text-blue-700"
                                >
                                    Regístrate aquí
                                </button>
                            </div>
                        )}

                        {selectedRole === 'ADMIN' && (
                            <div className="mt-6 text-center">
                                <p className="text-xs text-gray-500">
                                    Si no tienes código, contacta al administrador del sistema
                                </p>
                            </div>
                        )}
                    </>
                )}

                {/* STEP 3: Registro (solo Colaborador/Practicante) */}
                {step === 'register' && (
                    <>
                        <button
                            onClick={() => {
                                setStep('login');
                                setRegisterData({ full_name: '', email: '' });
                            }}
                            className="mb-4 text-gray-600 hover:text-gray-800 flex items-center"
                        >
                            ← Volver
                        </button>

                        <div className="text-center mb-6">
                            <span className="text-5xl mb-3 block">{getRoleIcon(selectedRole)}</span>
                            <h2 className="text-2xl font-bold text-gray-800">Crear Cuenta</h2>
                            <p className="text-gray-600 text-sm mt-1">{getRoleName(selectedRole)}</p>
                        </div>

                        <form onSubmit={handleRegister} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Nombre Completo *
                                </label>
                                <input
                                    type="text"
                                    value={registerData.full_name}
                                    onChange={(e) => setRegisterData({ ...registerData, full_name: e.target.value })}
                                    placeholder="Juan Pérez"
                                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                                    required
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Email (opcional)
                                </label>
                                <input
                                    type="email"
                                    value={registerData.email}
                                    onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                                    placeholder="juan@ejemplo.com"
                                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-gradient-to-r from-green-600 to-teal-600 text-white py-3 rounded-lg font-semibold hover:from-green-700 hover:to-teal-700 disabled:opacity-50 transition shadow-lg hover:shadow-xl"
                            >
                                {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
                            </button>
                        </form>

                        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <p className="text-sm text-blue-800">
                                <strong>📝 Importante:</strong> Al crear tu cuenta recibirás un código de acceso único de 4 dígitos. Guárdalo bien, lo necesitarás para ingresar al sistema.
                            </p>
                        </div>
                    </>
                )}
            </div>

            {/* Modal de Código Generado */}
            {showCodeModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 transform transition-all">
                        {/* Icono de éxito */}
                        <div className="flex justify-center mb-6">
                            <div className="bg-green-100 rounded-full p-4">
                                <svg className="w-16 h-16 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                </svg>
                            </div>
                        </div>

                        {/* Título */}
                        <h2 className="text-2xl font-bold text-center text-gray-800 mb-2">
                            ¡Registro Exitoso!
                        </h2>
                        <p className="text-center text-gray-600 mb-6">
                            Tu cuenta ha sido creada correctamente
                        </p>

                        {/* Código de acceso */}
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-6 mb-4">
                            <p className="text-sm text-gray-600 text-center mb-2">
                                🔑 Tu código de acceso es:
                            </p>
                            <div className="flex items-center justify-center gap-3">
                                <p className="text-5xl font-bold text-blue-600 tracking-widest font-mono">
                                    {generatedCode.login_code}
                                </p>
                                <button
                                    onClick={() => copyToClipboard(generatedCode.login_code)}
                                    className="p-2 hover:bg-blue-100 rounded-lg transition"
                                    title="Copiar código"
                                >
                                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* Employee Code */}
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-6">
                            <p className="text-xs text-gray-500 text-center mb-1">
                                Código de empleado:
                            </p>
                            <p className="text-sm font-semibold text-gray-700 text-center font-mono">
                                {generatedCode.employee_code}
                            </p>
                        </div>

                        {/* Advertencia */}
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6">
                            <div className="flex gap-2">
                                <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                                </svg>
                                <p className="text-sm text-amber-800">
                                    <strong>Importante:</strong> Guarda este código en un lugar seguro. Lo necesitarás para ingresar al sistema.
                                </p>
                            </div>
                        </div>

                        {/* Botón continuar */}
                        <button
                            onClick={handleCloseCodeModal}
                            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition shadow-lg hover:shadow-xl"
                        >
                            Continuar al Login
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
