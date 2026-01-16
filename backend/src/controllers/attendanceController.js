const moment = require('moment-timezone');
const prisma = require('../config/prisma');
const haversineDistance = require('../utils/haversine');
const calcLateAndDiscount = require('../utils/calcLateAndDiscount');
const { GPS_ACCURACY_THRESHOLD, TIMEZONE } = require('../config/constants');

/**
 * POST /api/attendance/scan
 * Escanear QR y registrar asistencia
 */
async function scanQR(req, res) {
    const { qr_token, latitude, longitude, accuracy_m } = req.body;
    const userId = req.user.userId;
    const serverTime = moment.tz(TIMEZONE);

    try {
        // 1. Validar datos requeridos
        if (!qr_token || latitude === undefined || longitude === undefined || accuracy_m === undefined) {
            await logAudit(userId, null, 'SCAN_FAIL', 'MISSING_FIELDS', latitude, longitude, accuracy_m, req);
            return res.status(400).json({
                error: 'MISSING_FIELDS',
                message: 'QR token, latitud, longitud y accuracy son requeridos'
            });
        }

        // 2. Validar QR existe
        const qr = await prisma.qRCode.findUnique({
            where: { qrToken: qr_token },
            include: { location: true },
        });

        if (!qr) {
            await logAudit(userId, null, 'SCAN_FAIL', 'INVALID_QR_TOKEN', latitude, longitude, accuracy_m, req);
            return res.status(400).json({ error: 'INVALID_QR_TOKEN', message: 'Código QR inválido' });
        }

        // 3. Obtener usuario (MOVIDO ANTES para validar reglas por rol)
        const user = await prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user || !user.isActive) {
            await logAudit(userId, qr.id, 'SCAN_FAIL', 'USER_INACTIVE', latitude, longitude, accuracy_m, req);
            return res.status(403).json({ error: 'USER_INACTIVE', message: 'Usuario inactivo' });
        }

        // 4. Validar ventana de escaneo (Reglas diferenciadas)
        let isExpired = false;

        if (user.role === 'PRACTICANTE') {
            // Practicantes: Pueden escanear todo el turno
            // FIX: Usar strings para comparar fechas y evitar problemas de timezone
            const serverDateStr = serverTime.format('YYYY-MM-DD');
            const qrDateStr = moment.utc(qr.qrDate).format('YYYY-MM-DD');

            const isSameDay = serverDateStr === qrDateStr;
            const validFromMoment = moment(qr.validFrom).tz(TIMEZONE);
            const isTooEarly = serverTime.isBefore(validFromMoment);

            console.log('=== DEBUG PRACTICANTE FIX ===');
            console.log('Server Date:', serverDateStr);
            console.log('QR Date:', qrDateStr);
            console.log('Is Same Day?', isSameDay);
            console.log('Is Too Early?', isTooEarly);
            console.log('=============================');

            if (!isSameDay || isTooEarly) {
                isExpired = true;
            }

        } else {
            // Colaboradores: Regla estricta (ValidFrom - ValidUntil)
            if (serverTime.isBefore(qr.validFrom) || serverTime.isAfter(qr.validUntil)) {
                isExpired = true;
            }
        }

        if (isExpired) {
            await logAudit(userId, qr.id, 'SCAN_FAIL', 'QR_EXPIRED', latitude, longitude, accuracy_m, req);
            return res.status(410).json({
                error: 'QR_EXPIRED',
                message: user.role === 'PRACTICANTE'
                    ? 'Código QR aún no válido para escanear'
                    : 'Código QR fuera de ventana de escaneo'
            });
        }

        // 5. Validar accuracy GPS
        if (accuracy_m > GPS_ACCURACY_THRESHOLD) {
            await logAudit(userId, qr.id, 'SCAN_FAIL', 'GPS_ACCURACY_TOO_LOW', latitude, longitude, accuracy_m, req);
            return res.status(422).json({
                error: 'GPS_ACCURACY_TOO_LOW',
                message: `Señal GPS insuficiente (${accuracy_m}m). Mejore su ubicación.`,
                accuracy: accuracy_m,
                threshold: GPS_ACCURACY_THRESHOLD
            });
        }

        // 6. Validar geofence
        const distance = haversineDistance(
            parseFloat(latitude),
            parseFloat(longitude),
            parseFloat(qr.location.latitude),
            parseFloat(qr.location.longitude)
        );

        // FIX: Forzando radio de 50km para pruebas desde PC
        const TEST_RADIUS = 50000;
        if (distance > TEST_RADIUS) {
            await logAudit(userId, qr.id, 'SCAN_FAIL', 'LOCATION_OUT_OF_RANGE', latitude, longitude, accuracy_m, req);
            return res.status(403).json({
                error: 'LOCATION_OUT_OF_RANGE',
                message: 'Está fuera del área permitida',
                distance_meters: Math.round(distance),
                max_allowed: TEST_RADIUS // Mostrar el radio de prueba
            });
        }

        // 7. Buscar o crear registro de asistencia
        let attendance = await prisma.attendanceRecord.findUnique({
            where: {
                userId_attendanceDate_shift: {
                    userId: userId,
                    attendanceDate: qr.qrDate,
                    shift: qr.shift,
                },
            },
        });

        // 8. Lógica según tipo de QR (IN o OUT)
        if (qr.qrType === 'IN') {
            // Validar duplicado de entrada
            if (attendance && attendance.checkInTime) {
                await logAudit(userId, qr.id, 'SCAN_FAIL', 'DUPLICATE_CHECK_IN', latitude, longitude, accuracy_m, req);
                return res.status(409).json({
                    error: 'DUPLICATE_CHECK_IN',
                    message: 'Ya registró entrada en este turno'
                });
            }

            // Calcular tardanza y descuento
            const { lateMinutes, discountAmount, status } = calcLateAndDiscount(
                qr.shift,
                serverTime,
                user.role
            );

            // Crear o actualizar registro
            if (!attendance) {
                attendance = await prisma.attendanceRecord.create({
                    data: {
                        userId: userId,
                        qrId: qr.id,
                        attendanceDate: qr.qrDate,
                        shift: qr.shift,
                        checkInTime: serverTime.toDate(),
                        checkInLat: parseFloat(latitude),
                        checkInLng: parseFloat(longitude),
                        checkInAccuracyM: parseFloat(accuracy_m),
                        lateMinutes,
                        discountAmount,
                        status,
                    },
                });
            } else {
                attendance = await prisma.attendanceRecord.update({
                    where: { id: attendance.id },
                    data: {
                        checkInTime: serverTime.toDate(),
                        checkInLat: parseFloat(latitude),
                        checkInLng: parseFloat(longitude),
                        checkInAccuracyM: parseFloat(accuracy_m),
                        lateMinutes,
                        discountAmount,
                        status,
                    },
                });
            }

            await logAudit(userId, qr.id, 'SCAN_SUCCESS', 'CHECK_IN', latitude, longitude, accuracy_m, req);

            return res.status(200).json({
                success: true,
                message: lateMinutes > 0 ? `Entrada registrada (${lateMinutes} min tarde)` : 'Entrada registrada exitosamente',
                data: {
                    attendance_id: attendance.id,
                    qr_type: 'IN',
                    shift: qr.shift,
                    timestamp: attendance.checkInTime,
                    late_minutes: lateMinutes,
                    discount_amount: parseFloat(discountAmount),
                    status: status,
                },
            });
        } else if (qr.qrType === 'OUT') {
            // Validar que existe check-in previo
            if (!attendance || !attendance.checkInTime) {
                await logAudit(userId, qr.id, 'SCAN_FAIL', 'CHECK_IN_REQUIRED', latitude, longitude, accuracy_m, req);
                return res.status(400).json({
                    error: 'CHECK_IN_REQUIRED',
                    message: 'Debe registrar entrada antes de la salida'
                });
            }

            // Validar no duplicar salida
            if (attendance.checkOutTime) {
                await logAudit(userId, qr.id, 'SCAN_FAIL', 'DUPLICATE_CHECK_OUT', latitude, longitude, accuracy_m, req);
                return res.status(409).json({
                    error: 'DUPLICATE_CHECK_OUT',
                    message: 'Ya registró salida en este turno'
                });
            }

            // Registrar salida
            attendance = await prisma.attendanceRecord.update({
                where: { id: attendance.id },
                data: {
                    checkOutTime: serverTime.toDate(),
                    checkOutLat: parseFloat(latitude),
                    checkOutLng: parseFloat(longitude),
                    checkOutAccuracyM: parseFloat(accuracy_m),
                },
            });

            await logAudit(userId, qr.id, 'SCAN_SUCCESS', 'CHECK_OUT', latitude, longitude, accuracy_m, req);

            return res.status(200).json({
                success: true,
                message: 'Salida registrada exitosamente',
                data: {
                    attendance_id: attendance.id,
                    qr_type: 'OUT',
                    shift: qr.shift,
                    timestamp: attendance.checkOutTime,
                },
            });
        }
    } catch (error) {
        console.error('Error en scanQR:', error);
        await logAudit(userId, null, 'SCAN_FAIL', 'SERVER_ERROR', latitude, longitude, accuracy_m, req);
        return res.status(500).json({ error: 'INTERNAL_SERVER_ERROR' });
    }
}

/**
 * GET /api/attendance/my-records
 * Obtener mis registros de asistencia
 */
async function getMyRecords(req, res) {
    try {
        const userId = req.user.userId;
        const { start_date, end_date, limit = 30 } = req.query;

        const where = { userId };

        if (start_date && end_date) {
            where.attendanceDate = {
                gte: new Date(start_date),
                lte: new Date(end_date),
            };
        }

        const records = await prisma.attendanceRecord.findMany({
            where,
            orderBy: { attendanceDate: 'desc' },
            take: parseInt(limit, 10),
            include: {
                qr: {
                    include: { location: true },
                },
            },
        });

        res.status(200).json({
            success: true,
            records,
        });
    } catch (error) {
        console.error('Error en getMyRecords:', error);
        res.status(500).json({ error: 'INTERNAL_SERVER_ERROR' });
    }
}

/**
 * GET /api/attendance/admin/all
 * Obtener historial completo de asistencias (Admin)
 */
async function getAllRecords(req, res) {
    try {
        const { start_date, end_date, user_id, limit = 1000 } = req.query;

        const where = {};

        if (start_date && end_date) {
            where.attendanceDate = {
                gte: new Date(start_date),
                lte: new Date(end_date),
            };
        }

        if (user_id) {
            where.userId = user_id;
        }

        const records = await prisma.attendanceRecord.findMany({
            where,
            orderBy: { attendanceDate: 'desc' },
            take: parseInt(limit, 10),
            include: {
                user: {
                    select: {
                        fullName: true,
                        employeeCode: true,
                        role: true,
                    }
                },
                qr: {
                    include: { location: true },
                },
            },
        });

        // Formatear para reporte
        const formattedRecords = records.map(record => ({
            id: record.id,
            employee: record.user.fullName,
            code: record.user.employeeCode,
            role: record.user.role,
            date: moment(record.attendanceDate).tz(TIMEZONE).format('YYYY-MM-DD'),
            shift: record.shift,
            check_in: record.checkInTime ? moment(record.checkInTime).tz(TIMEZONE).format('HH:mm:ss') : '-',
            check_out: record.checkOutTime ? moment(record.checkOutTime).tz(TIMEZONE).format('HH:mm:ss') : '-',
            late_minutes: record.lateMinutes,
            discount: parseFloat(record.discountAmount),
            status: record.status,
            location: record.qr?.location?.name || 'VIRTUAL/DESCONOCIDO'
        }));

        res.status(200).json({
            success: true,
            count: formattedRecords.length,
            records: formattedRecords,
        });
    } catch (error) {
        console.error('Error en getAllRecords:', error);
        res.status(500).json({ error: 'INTERNAL_SERVER_ERROR' });
    }
}

// Helper: Logging de auditoría
async function logAudit(userId, qrId, action, reason, lat, lng, accuracy, req) {
    try {
        await prisma.auditLog.create({
            data: {
                userId,
                qrId,
                action,
                reason,
                latitude: lat ? parseFloat(lat) : null,
                longitude: lng ? parseFloat(lng) : null,
                accuracyM: accuracy ? parseFloat(accuracy) : null,
                ipAddress: req.ip,
                userAgent: req.headers['user-agent'],
            },
        });
    } catch (error) {
        console.error('Error al crear audit log:', error);
    }
}

module.exports = {
    scanQR,
    getMyRecords,
    getAllRecords,
};
