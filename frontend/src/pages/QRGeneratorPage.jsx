import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import api from '../lib/axios';
import toast from 'react-hot-toast';

export default function QRGeneratorPage() {
    const [qrCodes, setQrCodes] = useState([]);
    const [loading, setLoading] = useState(false);

    const generateQRs = async () => {
        setLoading(true);
        try {
            const { data } = await api.post('/qr/generate-today');
            setQrCodes(data.qr_codes);
            toast.success(`${data.qr_codes.length} QRs generados para ${data.date}`);
        } catch (error) {
            const errorMsg = error.response?.data?.message || error.response?.data?.error || 'Error al generar QRs';
            toast.error(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    const loadTodayQRs = async () => {
        try {
            const { data } = await api.get('/qr/today');
            if (data.qr_codes.length > 0) {
                setQrCodes(data.qr_codes);
                toast.success(`${data.qr_codes.length} QRs cargados`);
            } else {
                toast('No hay QRs generados para hoy');
            }
        } catch (error) {
            toast.error('Error al cargar QRs');
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const getTypeLabel = (type) => type === 'IN' ? 'ENTRADA' : 'SALIDA';
    const getShiftLabel = (shift) => shift === 'AM' ? 'Mañana' : 'Tarde';

    return (
        <div className="max-w-7xl mx-auto p-6">
            <div className="flex justify-between items-center mb-6 print:hidden">
                <h1 className="text-3xl font-bold text-gray-800">Generador de QR</h1>
                <div className="space-x-3">
                    <button
                        onClick={loadTodayQRs}
                        className="px-6 py-3 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700 transition"
                    >
                        Cargar QRs de Hoy
                    </button>
                    <button
                        onClick={generateQRs}
                        disabled={loading}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 transition"
                    >
                        {loading ? 'Generando...' : 'Generar QRs Nuevos'}
                    </button>
                    {qrCodes.length > 0 && (
                        <button
                            onClick={handlePrint}
                            className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition"
                        >
                            Imprimir
                        </button>
                    )}
                </div>
            </div>

            {qrCodes.length > 0 && (
                <>
                    <div className="mb-4 print:hidden">
                        <p className="text-gray-600">
                            Fecha: <span className="font-semibold">{new Date(qrCodes[0].valid_from).toLocaleDateString('es-PE')}</span>
                            {' '} | Total: <span className="font-semibold">{qrCodes.length} códigos</span>
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 print:grid-cols-2">
                        {qrCodes.map((qr) => (
                            <div
                                key={qr.id}
                                className="bg-white p-8 rounded-2xl shadow-lg border-4 border-gray-200 text-center print:break-inside-avoid"
                            >
                                <div className="mb-4">
                                    <h2 className={`text-3xl font-bold mb-2 ${qr.qr_type === 'IN' ? 'text-green-600' : 'text-blue-600'}`}>
                                        {getTypeLabel(qr.qr_type)}
                                    </h2>
                                    <p className="text-xl text-gray-700">Turno {getShiftLabel(qr.shift)}</p>
                                </div>

                                <div className="flex justify-center mb-4">
                                    <QRCodeSVG
                                        value={qr.qr_token}
                                        size={280}
                                        level="H"
                                        includeMargin={true}
                                    />
                                </div>

                                <div className="text-sm text-gray-600 space-y-1">
                                    <p>
                                        <span className="font-semibold">Válido:</span>{' '}
                                        {new Date(qr.valid_from).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                                        {' - '}
                                        {new Date(qr.valid_until).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                    <p className="font-mono text-xs text-gray-400">{qr.qr_token}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {qrCodes.length === 0 && !loading && (
                <div className="text-center py-16">
                    <div className="w-32 h-32 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                        </svg>
                    </div>
                    <p className="text-gray-600">No hay QRs generados</p>
                    <p className="text-sm text-gray-500 mt-2">Haz clic en "Generar QRs Nuevos" para crear los códigos del día</p>
                </div>
            )}

            {/* Print Styles */}
            <style jsx>{`
        @media print {
          @page {
            size: A4;
            margin: 1cm;
          }
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
        }
      `}</style>
        </div>
    );
}
