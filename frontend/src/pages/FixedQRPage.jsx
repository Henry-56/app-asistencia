import { useState, useEffect } from 'react';
import api from '../lib/axios';
import { toast } from 'react-hot-toast';
import { QrCode, Printer } from 'lucide-react';

export default function FixedQRPage() {
    const [qrCodes, setQrCodes] = useState({ AM: null, PM: null });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchFixedQRs();
    }, []);

    const fetchFixedQRs = async () => {
        setLoading(true);
        try {
            // Fetch AM
            const amRes = await api.post('/qr/fixed', { shift: 'AM' });
            // Fetch PM
            const pmRes = await api.post('/qr/fixed', { shift: 'PM' });

            if (amRes.data.success && pmRes.data.success) {
                setQrCodes({
                    AM: amRes.data,
                    PM: pmRes.data
                });
            }
        } catch (error) {
            console.error(error);
            toast.error('Error al generar QRs fijos');
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-6 no-print">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <QrCode className="h-6 w-6 text-indigo-600" />
                    QRs Fijos (Anuales)
                </h2>
                <button
                    onClick={handlePrint}
                    className="bg-gray-800 hover:bg-gray-900 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                >
                    <Printer className="h-4 w-4" />
                    Imprimir
                </button>
            </div>

            <div className="grid md:grid-cols-2 gap-8 print:block print:space-y-8">
                {/* QR MAÑANA */}
                {qrCodes.AM && (
                    <div className="bg-white p-8 rounded-xl shadow-lg border-2 border-orange-100 flex flex-col items-center text-center print:border-4 print:border-black print:break-inside-avoid">
                        <h3 className="text-3xl font-black text-orange-600 mb-2 uppercase tracking-wider">Turno Mañana</h3>
                        <p className="text-gray-500 mb-6">Escanea para registrar Entrada/Salida</p>

                        <div className="bg-white p-4 rounded-lg border-2 border-gray-100 mb-4">
                            <img src={qrCodes.AM.qr_data_url} alt="QR AM" className="w-64 h-64 object-contain" />
                        </div>

                        <div className="mt-4 text-sm text-gray-400 font-mono">
                            {qrCodes.AM.qr_token.slice(0, 8)}...
                        </div>
                    </div>
                )}

                {/* QR TARDE */}
                {qrCodes.PM && (
                    <div className="bg-white p-8 rounded-xl shadow-lg border-2 border-indigo-100 flex flex-col items-center text-center print:border-4 print:border-black print:break-inside-avoid">
                        <h3 className="text-3xl font-black text-indigo-600 mb-2 uppercase tracking-wider">Turno Tarde</h3>
                        <p className="text-gray-500 mb-6">Escanea para registrar Entrada/Salida</p>

                        <div className="bg-white p-4 rounded-lg border-2 border-gray-100 mb-4">
                            <img src={qrCodes.PM.qr_data_url} alt="QR PM" className="w-64 h-64 object-contain" />
                        </div>

                        <div className="mt-4 text-sm text-gray-400 font-mono">
                            {qrCodes.PM.qr_token.slice(0, 8)}...
                        </div>
                    </div>
                )}
            </div>

            <style>{`
                @media print {
                    .no-print { display: none; }
                    body { background: white; }
                    .print\\:block { display: block; }
                    .print\\:space-y-8 > * + * { margin-top: 2rem; }
                    .print\\:border-4 { border-width: 4px; }
                    .print\\:border-black { border-color: black; }
                    .print\\:break-inside-avoid { break-inside: avoid; }
                }
            `}</style>
        </div>
    );
}
