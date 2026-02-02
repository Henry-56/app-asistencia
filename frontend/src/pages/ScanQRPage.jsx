import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import api from '../lib/axios';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import { CheckCircle, XCircle, AlertTriangle, X } from 'lucide-react';
import moment from 'moment';
import 'moment-timezone';

export default function ScanQRPage() {
    const [scanning, setScanning] = useState(false);
    const [location, setLocation] = useState(null);
    const locationRef = useRef(null);
    const [permissionGranted, setPermissionGranted] = useState(false);
    const { user, logout } = useAuthStore();
    const scannerRef = useRef(null);
    const [scanResult, setScanResult] = useState(null); // { success, message, data }

    // Limpieza al desmontar
    useEffect(() => {
        return () => {
            if (scannerRef.current && scannerRef.current.isScanning) {
                scannerRef.current.stop().catch(err => console.error("Error stopping scanner cleanup", err));
            }
        };
    }, []);

    const startProcess = async () => {
        setScanResult(null);
        setScanning(true);
        setInitialLocation();
    };

    const setInitialLocation = async () => {
        try {
            await requestLocation();
            setTimeout(initScannerRaw, 500);
        } catch (error) {
            console.error(error);
            setScanning(false);
        }
    }

    const requestLocation = () => {
        return new Promise((resolve, reject) => {
            if (!('geolocation' in navigator)) {
                toast.error('Geolocalización no soportada');
                return reject('Geolocalización no soportada');
            }

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const locData = {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        accuracy: position.coords.accuracy,
                    };
                    setLocation(locData);
                    locationRef.current = locData;
                    resolve(position);
                },
                (error) => {
                    toast.error('Debes permitir la ubicación para validar que estás en la sede.');
                    reject(error);
                },
                { enableHighAccuracy: true, timeout: 10000 }
            );
        });
    };

    const initScannerRaw = async () => {
        if (!document.getElementById('reader')) {
            setScanning(false);
            return;
        }

        try {
            const html5QrCode = new Html5Qrcode("reader");
            scannerRef.current = html5QrCode;

            const config = {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0
            };

            await html5QrCode.start(
                { facingMode: "environment" },
                config,
                onScanSuccess,
                onScanError
            );

            setPermissionGranted(true);
        } catch (err) {
            console.error("Error al iniciar cámara:", err);
            toast.error("No se pudo iniciar la cámara. Verifica permisos.");
            setScanning(false);
        }
    };

    const onScanSuccess = async (decodedText) => {
        // Pausar inmediatamente para feedback
        if (scannerRef.current) {
            try {
                await scannerRef.current.stop();
                scannerRef.current.clear();
            } catch (e) { console.error("Error pausando", e); }
        }
        setScanning(false); // UI change

        const currentLocation = locationRef.current;
        if (!currentLocation) {
            setScanResult({
                success: false,
                title: 'Ubicación no encontrada',
                message: 'No se pudo obtener tu ubicación GPS. Intenta de nuevo.'
            });
            return;
        }

        toast.loading("Verificando...", { id: 'processing-scan' });

        try {
            const { data } = await api.post('/attendance/scan', {
                qr_token: decodedText,
                latitude: currentLocation.latitude,
                longitude: currentLocation.longitude,
                accuracy_m: currentLocation.accuracy,
            });

            toast.dismiss('processing-scan');

            // Set Success Result
            setScanResult({
                success: true,
                title: data.data.type === 'IN' ? '¡Entrada Registrada!' : '¡Salida Registrada!',
                message: data.message,
                data: data.data
            });

        } catch (error) {
            console.error("Error API Scan:", error);
            toast.dismiss('processing-scan');

            let errorMsg = 'Error al registrar asistencia';
            let title = 'Error';

            if (error.response) {
                const { status, data } = error.response;
                if (status === 410) {
                    if (data.error === 'OUT_OF_WINDOW') {
                        title = 'Fuera de Horario';
                    } else {
                        title = 'QR Expirado';
                    }
                    errorMsg = data.message || 'El código QR ya no es válido.';
                } else if (status === 403) {
                    title = 'Acceso Denegado';
                    if (data.error === 'LOCATION_OUT_OF_RANGE') {
                        errorMsg = `Estás fuera del rango permitido (${data.distance_meters} metros).`;
                    } else {
                        errorMsg = data.message;
                    }
                } else if (status === 409) {
                    title = 'Registro Duplicado';
                    errorMsg = data.message;
                } else {
                    errorMsg = data.message || `Error del servidor (${status})`;
                }
            } else {
                errorMsg = 'Error de conexión. Verifica tu internet.';
            }

            setScanResult({
                success: false,
                title,
                message: errorMsg
            });
        }
    };

    const onScanError = (errorMessage) => {
        // Ignorar errores de frame
    };

    const handleCloseModal = () => {
        setScanResult(null);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 p-6 flex flex-col items-center justify-center">

            {/* Main Card */}
            <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md">

                {/* Header Profile */}
                <div className="flex items-center justify-between mb-8 border-b pb-4">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">{user?.fullName}</h2>
                        <p className="text-sm text-gray-600">{user?.employeeCode}</p>
                    </div>
                    <button onClick={logout} className="text-red-600 font-semibold hover:bg-red-50 px-3 py-1 rounded">
                        Salir
                    </button>
                </div>

                {!scanning && !scanResult ? (
                    <div className="text-center py-8">
                        <div className="w-40 h-40 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-8 relative">
                            <div className="absolute inset-0 bg-blue-500 rounded-full opacity-10 animate-pulse"></div>
                            <svg className="w-20 h-20 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                            </svg>
                        </div>

                        <button
                            onClick={startProcess}
                            className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:bg-blue-700 transition transform hover:scale-[1.02]"
                        >
                            Escanear Asistencia
                        </button>
                    </div>
                ) : scanning ? (
                    <div>
                        <div className="relative rounded-xl overflow-hidden bg-black aspect-square">
                            <div id="reader" className="w-full h-full"></div>
                            <div className="absolute inset-0 border-2 border-white/30 pointer-events-none"></div>
                            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 border-2 border-green-400 rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] pointer-events-none"></div>
                        </div>

                        <div className="mt-4 text-center">
                            {location ? (
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    📍 GPS Activo
                                </span>
                            ) : (
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 animate-pulse">
                                    🛰️ Buscando GPS...
                                </span>
                            )}
                            <button onClick={() => setScanning(false)} className="block w-full mt-4 text-gray-500 hover:text-gray-700 py-2">
                                Cancelar
                            </button>
                        </div>
                    </div>
                ) : null}

                {/* RESULT MODAL (Inline) */}
                {scanResult && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all scale-100">

                            <div className={`p-6 text-center ${scanResult.success ? 'bg-green-50' : 'bg-red-50'}`}>
                                {scanResult.success ? (
                                    <CheckCircle className="w-20 h-20 mx-auto text-green-500 mb-2" />
                                ) : (
                                    <XCircle className="w-20 h-20 mx-auto text-red-500 mb-2" />
                                )}
                                <h3 className={`text-2xl font-bold ${scanResult.success ? 'text-green-700' : 'text-red-700'}`}>
                                    {scanResult.title}
                                </h3>
                            </div>

                            <div className="p-6">
                                <p className="text-gray-600 text-center text-lg mb-6">
                                    {scanResult.message}
                                </p>

                                {scanResult.success && scanResult.data && (
                                    <div className="bg-gray-50 rounded-xl p-4 mb-6 space-y-2 border border-gray-100">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500">Hora:</span>
                                            <span className="font-mono font-medium">{moment(scanResult.data.timestamp).format('h:mm A')}</span>
                                        </div>
                                        {scanResult.data.late_minutes > 0 && (
                                            <div className="flex justify-between text-sm text-yellow-700 bg-yellow-50 p-2 rounded">
                                                <span className="flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Tardanza:</span>
                                                <span className="font-bold">{scanResult.data.late_minutes} min</span>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <button
                                    onClick={handleCloseModal}
                                    className={`w-full py-3.5 rounded-xl font-bold text-white shadow-lg transition transform hover:scale-[1.02] ${scanResult.success ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                                        }`}
                                >
                                    {scanResult.success ? 'Aceptar' : 'Intentar de nuevo'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            </div>

            {!scanning && (
                <div className="mt-8 text-white/80 text-center text-sm">
                    <p>© 2026 Sistema de Asistencia</p>
                </div>
            )}
        </div>
    );
}
