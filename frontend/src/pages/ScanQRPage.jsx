import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import api from '../lib/axios';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';

export default function ScanQRPage() {
    const [scanning, setScanning] = useState(false);
    const [location, setLocation] = useState(null);
    const locationRef = useRef(null);
    const [lastScan, setLastScan] = useState(null);
    const [permissionGranted, setPermissionGranted] = useState(false);
    const { user, logout } = useAuthStore();
    const scannerRef = useRef(null);

    // Limpieza al desmontar
    useEffect(() => {
        return () => {
            if (scannerRef.current && scannerRef.current.isScanning) {
                scannerRef.current.stop().catch(err => console.error("Error stopping scanner cleanup", err));
            }
        };
    }, []);

    const startProcess = async () => {
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
            console.log('Solicitando ubicación...');
            if (!('geolocation' in navigator)) {
                toast.error('Geolocalización no soportada');
                return reject('Geolocalización no soportada');
            }

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    console.log('Ubicación obtenida:', position.coords);
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
        console.log('Iniciando Html5Qrcode...');

        if (!document.getElementById('reader')) {
            console.error("Elemento 'reader' no encontrado");
            toast.error("Error de inicialización de video");
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
            console.log("Cámara iniciada correctamente");

        } catch (err) {
            console.error("Error al iniciar cámara:", err);
            toast.error("No se pudo iniciar la cámara. Verifica permisos.");
            setScanning(false);
        }
    };

    const onScanSuccess = async (decodedText) => {
        console.log("QR Detectado:", decodedText);

        const currentLocation = locationRef.current;

        if (!currentLocation) {
            console.warn("Escaneo ignorado: Ubicación no disponible (Ref es null)");
            requestLocation().catch(console.error);
            toast.error("Validando ubicación...", { id: 'gps-wait' });
            return;
        }

        if (lastScan === decodedText) {
            console.log("Escaneo ignorado: Código duplicado reciente");
            return;
        }

        console.log("Procesando QR...", { qr: decodedText, location: currentLocation });
        setLastScan(decodedText);
        toast.loading("Procesando asistencia...", { id: 'processing-scan' });

        if (scannerRef.current) {
            try {
                scannerRef.current.pause();
            } catch (e) { console.error("Error pausando", e); }
        }

        try {
            const { data } = await api.post('/attendance/scan', {
                qr_token: decodedText,
                latitude: currentLocation.latitude,
                longitude: currentLocation.longitude,
                accuracy_m: currentLocation.accuracy,
            });

            console.log("Respuesta backend:", data);
            toast.dismiss('processing-scan');
            toast.success(data.message, { duration: 5000 });

            if (data.data.late_minutes > 0) {
                toast(`Tardanza: ${data.data.late_minutes} min | Descuento: S/ ${data.data.discount_amount}`, {
                    icon: '⚠️',
                    duration: 8000,
                });
            }

            await stopScanning();

        } catch (error) {
            console.error("Error API Scan:", error);
            toast.dismiss('processing-scan');

            let errorMsg = 'Error al registrar asistencia';

            if (error.response) {
                // Mensajes específicos basados en el error del backend
                const { status, data } = error.response;

                if (status === 410) {
                    // Usar mensaje del backend si existe, o fallback
                    errorMsg = data.message || '⌛ El QR ha expirado o está fuera de horario.';
                } else if (status === 403) {
                    if (data.error === 'LOCATION_OUT_OF_RANGE') {
                        errorMsg = `📍 Estás muy lejos de la sede (${data.distance_meters}m). Acércate más.`;
                    } else {
                        errorMsg = data.message || 'Acceso denegado';
                    }
                } else if (status === 409) {
                    errorMsg = data.message || 'Ya registraste asistencia hoy.';
                } else if (status === 422) {
                    errorMsg = data.message || 'Señal GPS insuficiente. Sal a un lugar abierto.';
                } else {
                    errorMsg = data.message || data.error || `Error del servidor (${status})`;
                }
            } else if (error.request) {
                errorMsg = 'Error de conexión. Verifica tu internet.';
            }

            toast.error(errorMsg, { duration: 6000 });

            setLastScan(null);

            if (scannerRef.current) {
                try {
                    scannerRef.current.resume();
                } catch (e) {
                    console.error("Error reanudando", e);
                }
            }
        }
    };

    const onScanError = (errorMessage) => {
        // Ignorar errores de frame vacios
    };

    const stopScanning = async () => {
        if (scannerRef.current) {
            try {
                if (scannerRef.current.isScanning) {
                    await scannerRef.current.stop();
                }
                scannerRef.current.clear();
            } catch (err) {
                console.error("Error stopping scanner", err);
            }
        }
        setScanning(false);
        setLastScan(null);
        setPermissionGranted(false);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 p-6">
            <div className="max-w-md mx-auto">
                {/* Header */}
                <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-bold text-gray-800">{user?.fullName}</h2>
                            <p className="text-sm text-gray-600">{user?.employeeCode}</p>
                        </div>
                        <button
                            onClick={logout}
                            className="text-red-600 hover:text-red-700 font-semibold"
                        >
                            Salir
                        </button>
                    </div>
                </div>

                {/* Scanner Section */}
                <div className="bg-white rounded-2xl shadow-2xl p-6">
                    <h1 className="text-2xl font-bold text-center mb-6 text-gray-800">
                        Escanear QR
                    </h1>

                    {!scanning ? (
                        <div className="text-center">
                            <div className="w-32 h-32 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
                                <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                                </svg>
                            </div>

                            <button
                                onClick={startProcess}
                                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition transform hover:scale-105"
                            >
                                Iniciar Escaneo
                            </button>
                            <p className="text-sm text-gray-600 mt-4">
                                Se usarán permisos de cámara y ubicación
                            </p>
                        </div>
                    ) : (
                        <div>
                            <div id="reader" className="w-full rounded-lg overflow-hidden border-2 border-gray-200 bg-black min-h-[300px]"></div>

                            {location && (
                                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-center">
                                    <p className="text-sm text-green-800">
                                        📍 Ubicación: OK (±{Math.round(location.accuracy)}m)
                                    </p>
                                    {!permissionGranted && <p className="text-xs text-blue-600">Iniciando cámara...</p>}
                                </div>
                            )}

                            <button
                                onClick={stopScanning}
                                className="w-full mt-4 bg-red-500 text-white py-3 rounded-lg font-semibold hover:bg-red-600 transition"
                            >
                                Cancelar
                            </button>
                        </div>
                    )}
                </div>

                {/* Instrucciones */}
                <div className="mt-6 bg-white/90 backdrop-blur rounded-xl p-4">
                    <h3 className="font-semibold text-gray-800 mb-2">📋 Instrucciones:</h3>
                    <ul className="text-sm text-gray-700 space-y-1">
                        <li>• Mantén el celular estable</li>
                        <li>• Asegura buena iluminación en el QR</li>
                        <li>• Distancia recomendada: 20-30cm</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
