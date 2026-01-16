const moment = require('moment-timezone');
const QRCode = require('qrcode');
const prisma = require('../config/prisma');
const { SCAN_WINDOWS, TIMEZONE } = require('../config/constants');

/**
 * POST /api/qr/generate-today
 * Genera los códigos QR para el día actual
 */
async function generateToday(req, res) {
    try {
        // Obtener la primera sede activa (solo hay una)
        const location = await prisma.location.findFirst({
            where: { isActive: true },
        });

        if (!location) {
            return res.status(404).json({
                error: 'LOCATION_NOT_FOUND',
                message: 'No hay sedes configuradas. Por favor contacta al administrador del sistema.'
            });
        }

        const today = moment.tz(TIMEZONE);
        const dayOfWeek = today.day(); // 0=Domingo, 1=Lunes, ..., 6=Sábado
        const dateStr = today.format('YYYY-MM-DD');

        // Domingo no es día laboral
        if (dayOfWeek === 0) {
            return res.status(400).json({
                error: 'NO_SHIFTS_ON_SUNDAY',
                message: 'No hay turnos los domingos'
            });
        }

        // Verificar si ya existen QRs para hoy
        const existingQRs = await prisma.qRCode.findMany({
            where: { qrDate: new Date(dateStr) },
        });

        if (existingQRs.length > 0) {
            // Si ya existen, retornarlos
            const qrCodesWithImages = await Promise.all(
                existingQRs.map(async (qr) => {
                    const qrDataUrl = await QRCode.toDataURL(qr.qrToken, { width: 300 });
                    return {
                        id: qr.id,
                        qr_token: qr.qrToken,
                        qr_type: qr.qrType,
                        shift: qr.shift,
                        valid_from: qr.validFrom,
                        valid_until: qr.validUntil,
                        qr_data_url: qrDataUrl,
                    };
                })
            );

            return res.status(200).json({
                success: true,
                date: dateStr,
                day_of_week: getDayName(dayOfWeek),
                message: 'QRs ya generados para hoy',
                qr_codes: qrCodesWithImages,
            });
        }

        // Generar QRs según el día
        const qrCodesToCreate = [];

        // Turno AM (siempre)
        qrCodesToCreate.push({
            qrType: 'IN',
            shift: 'AM',
            qrDate: new Date(dateStr),
            locationId: location.id,
            validFrom: moment.tz(`${dateStr} ${SCAN_WINDOWS.IN_AM.from}`, TIMEZONE).toDate(),
            validUntil: moment.tz(`${dateStr} ${SCAN_WINDOWS.IN_AM.until}`, TIMEZONE).toDate(),
        });

        qrCodesToCreate.push({
            qrType: 'OUT',
            shift: 'AM',
            qrDate: new Date(dateStr),
            locationId: location.id,
            validFrom: moment.tz(`${dateStr} ${SCAN_WINDOWS.OUT_AM.from}`, TIMEZONE).toDate(),
            validUntil: moment.tz(`${dateStr} ${SCAN_WINDOWS.OUT_AM.until}`, TIMEZONE).toDate(),
        });

        // Turno PM (solo lunes a viernes)
        if (dayOfWeek >= 1 && dayOfWeek <= 5) {
            qrCodesToCreate.push({
                qrType: 'IN',
                shift: 'PM',
                qrDate: new Date(dateStr),
                locationId: location.id,
                validFrom: moment.tz(`${dateStr} ${SCAN_WINDOWS.IN_PM.from}`, TIMEZONE).toDate(),
                validUntil: moment.tz(`${dateStr} ${SCAN_WINDOWS.IN_PM.until}`, TIMEZONE).toDate(),
            });

            qrCodesToCreate.push({
                qrType: 'OUT',
                shift: 'PM',
                qrDate: new Date(dateStr),
                locationId: location.id,
                validFrom: moment.tz(`${dateStr} ${SCAN_WINDOWS.OUT_PM.from}`, TIMEZONE).toDate(),
                validUntil: moment.tz(`${dateStr} ${SCAN_WINDOWS.OUT_PM.until}`, TIMEZONE).toDate(),
            });
        }

        // Crear QRs en la base de datos
        const createdQRs = [];
        for (const qrData of qrCodesToCreate) {
            const qr = await prisma.qRCode.create({ data: qrData });
            createdQRs.push(qr);
        }

        // Generar imágenes QR en base64
        const qrCodesWithImages = await Promise.all(
            createdQRs.map(async (qr) => {
                const qrDataUrl = await QRCode.toDataURL(qr.qrToken, { width: 300 });
                return {
                    id: qr.id,
                    qr_token: qr.qrToken,
                    qr_type: qr.qrType,
                    shift: qr.shift,
                    valid_from: qr.validFrom,
                    valid_until: qr.validUntil,
                    qr_data_url: qrDataUrl,
                };
            })
        );

        res.status(200).json({
            success: true,
            date: dateStr,
            day_of_week: getDayName(dayOfWeek),
            qr_codes: qrCodesWithImages,
        });
    } catch (error) {
        console.error('Error en generateToday:', error);
        res.status(500).json({ error: 'INTERNAL_SERVER_ERROR' });
    }
}

/**
 * GET /api/qr/today
 * Obtiene los QRs del día actual
 */
async function getToday(req, res) {
    try {
        const today = moment.tz(TIMEZONE).format('YYYY-MM-DD');

        const qrCodes = await prisma.qRCode.findMany({
            where: { qrDate: new Date(today) },
            include: { location: true },
        });

        const qrCodesWithImages = await Promise.all(
            qrCodes.map(async (qr) => {
                const qrDataUrl = await QRCode.toDataURL(qr.qrToken, { width: 300 });
                return {
                    id: qr.id,
                    qr_token: qr.qrToken,
                    qr_type: qr.qrType,
                    shift: qr.shift,
                    valid_from: qr.validFrom,
                    valid_until: qr.validUntil,
                    location: qr.location,
                    qr_data_url: qrDataUrl,
                };
            })
        );

        res.status(200).json({
            success: true,
            date: today,
            qr_codes: qrCodesWithImages,
        });
    } catch (error) {
        console.error('Error en getToday:', error);
        res.status(500).json({ error: 'INTERNAL_SERVER_ERROR' });
    }
}

// Helper
function getDayName(dayOfWeek) {
    const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    return days[dayOfWeek];
}

module.exports = {
    generateToday,
    getToday,
};
