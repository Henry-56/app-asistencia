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

        // 3. Obtener usuario
        const user = await prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user || !user.isActive) {
            await logAudit(userId, qr.id, 'SCAN_FAIL', 'USER_INACTIVE', latitude, longitude, accuracy_m, req);
            return res.status(403).json({ error: 'USER_INACTIVE', message: 'Usuario inactivo' });
        }

        // --- LÓGICA DE FECHA Y VALIDACIÓN ---
        let attendanceDate = qr.qrDate; // Default for dynamic
        let isExpired = false;
        const { SCAN_WINDOWS } = require('../config/constants'); // Import here to ensure we have latest

        // Determinar intención (IN o OUT) basado en si ya marcó entrada
        // Primero buscamos si existe registro para el día (si es fijo) o para la fecha del QR (si es dinámico)

        let targetDate = qr.qrDate; // Para dinámico
        if (qr.isFixed) {
            targetDate = serverTime.toDate(); // Para fijo es HOY
        }

        // Mapear DayOfWeek para Schedule (1=Lunes, 6=Sábado)
        // moment.isoWeekday(): 1=Monday... 7=Sunday
        const currentIsoDay = moment(targetDate).tz(TIMEZONE).isoWeekday();

        // Si es FIXED, validamos Horario del Usuario y Ventanas de Tiempo
        if (qr.isFixed) {
            // Validar Schedule
            const schedule = await prisma.userSchedule.findUnique({
                where: {
                    userId_dayOfWeek_shift: {
                        userId: userId,
                        dayOfWeek: currentIsoDay,
                        shift: qr.shift
                    }
                }
            });

            if (!schedule || !schedule.isActive) {
                await logAudit(userId, qr.id, 'SCAN_FAIL', 'SCHEDULE_MISMATCH', latitude, longitude, accuracy_m, req);
                return res.status(403).json({
                    error: 'SCHEDULE_MISMATCH',
                    message: 'No tiene turno programado para hoy en este horario.'
                });
            }

            // Validar Ventana de Tiempo (IN vs OUT)
            // Necesitamos saber si estamos intentando entrar o salir.
            // Check si ya tiene entrada
            const existingRecord = await prisma.attendanceRecord.findFirst({
                where: {
                    userId: userId,
                    attendanceDate: {
                        gte: moment(targetDate).tz(TIMEZONE).startOf('day').toDate(),
                        lte: moment(targetDate).tz(TIMEZONE).endOf('day').toDate(),
                    },
                    shift: qr.shift
                }
            });

            const actionType = existingRecord ? 'OUT' : 'IN';
            const windowKey = `${actionType}_${qr.shift}`; // IN_AM, OUT_AM, etc.
            const windowCfg = SCAN_WINDOWS[windowKey];

            if (!windowCfg) {
                // Should not happen if constants are correct
                isExpired = true;
            } else {
                const todayStr = moment(targetDate).tz(TIMEZONE).format('YYYY-MM-DD');
                // Parse window start/end
                const startWindow = moment.tz(`${todayStr} ${windowCfg.from}`, TIMEZONE);
                const endWindow = moment.tz(`${todayStr} ${windowCfg.until}`, TIMEZONE);

                if (!serverTime.isBetween(startWindow, endWindow, null, '[]')) {
                    // Fuera de ventana
                    // PERO: Si es fixed, tal vez solo queremos loguearlo y rechazar, no decir "Expired".
                    // "Expired" es 410. Fuera de ventana es 410 también en este código.
                    // Vamos a cambiar el mensaje para ser más claros.

                    // Comprobar si es demasiado TEMPRANO o demasiado TARDE
                    const isEarly = serverTime.isBefore(startWindow);

                    await logAudit(userId, qr.id, 'SCAN_FAIL', 'OUT_OF_WINDOW', latitude, longitude, accuracy_m, req);
                    return res.status(410).json({
                        error: 'OUT_OF_WINDOW',
                        message: isEarly
                            ? `Aún no es hora de marcar. Inicio: ${windowCfg.from}`
                            : `El horario de marcación ha terminado. Fin: ${windowCfg.until}`
                    });
                }
            }

            // Sobrescribir qrDate con fecha actual para el registro
            attendanceDate = targetDate;

            // Sobrescribir qrType para lógica posterior
            qr.qrType = actionType; // 'IN' or 'OUT'

        } else {
            // Lógica Legacy (Dinámico) - SOLO si NO es Fixed
            if (user.role === 'PRACTICANTE') {
                const serverDateStr = serverTime.format('YYYY-MM-DD');
                const qrDateStr = moment.utc(qr.qrDate).format('YYYY-MM-DD');
                const isSameDay = serverDateStr === qrDateStr;
                const validFromMoment = moment(qr.validFrom).tz(TIMEZONE);
                const isTooEarly = serverTime.isBefore(validFromMoment);

                if (!isSameDay || isTooEarly) {
                    isExpired = true;
                }
            } else {
                // Colaboradores / Admin (Dinámico)
                if (serverTime.isBefore(qr.validFrom) || serverTime.isAfter(qr.validUntil)) {
                    isExpired = true;
                }
            }
        }

        // Check universal expiration (only if determined expired above)
        if (isExpired) {
            await logAudit(userId, qr.id, 'SCAN_FAIL', 'QR_EXPIRED', latitude, longitude, accuracy_m, req);
            return res.status(410).json({
                error: 'QR_EXPIRED',
                message: 'Código QR expirado o inválido'
            });
        }

        // 5. Validar accuracy GPS
        if (accuracy_m > GPS_ACCURACY_THRESHOLD) {
            await logAudit(userId, qr.id, 'SCAN_FAIL', 'GPS_ACCURACY_TOO_LOW', latitude, longitude, accuracy_m, req);
            return res.status(422).json({
                error: 'GPS_ACCURACY_TOO_LOW',
                message: `Señal GPS insuficiente (${accuracy_m}m).`,
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

        const TEST_RADIUS = 50000; // Keep test radius
        if (distance > TEST_RADIUS) {
            await logAudit(userId, qr.id, 'SCAN_FAIL', 'LOCATION_OUT_OF_RANGE', latitude, longitude, accuracy_m, req);
            return res.status(403).json({
                error: 'LOCATION_OUT_OF_RANGE',
                message: 'Está fuera del área permitida',
                distance_meters: Math.round(distance),
                max_allowed: TEST_RADIUS
            });
        }

        // 7. Buscar o crear registro (Re-find to be sure)
        // Ensure date comparison ignores time for attendanceDate matches
        const startOfDay = moment(attendanceDate).tz(TIMEZONE).startOf('day').toDate();
        const endOfDay = moment(attendanceDate).tz(TIMEZONE).endOf('day').toDate();

        let attendance = await prisma.attendanceRecord.findFirst({
            where: {
                userId: userId,
                attendanceDate: {
                    gte: startOfDay,
                    lte: endOfDay
                },
                shift: qr.shift,
            },
        });

        // 8. Lógica IN/OUT
        if (qr.qrType === 'IN') {
            // Validar duplicado de entrada
            if (attendance && attendance.checkInTime) {
                await logAudit(userId, qr.id, 'SCAN_FAIL', 'DUPLICATE_CHECK_IN', latitude, longitude, accuracy_m, req);
                return res.status(409).json({
                    error: 'DUPLICATE_CHECK_IN',
                    message: 'Ya registró entrada en este turno'
                });
            }

            const { lateMinutes, discountAmount, status } = calcLateAndDiscount(
                qr.shift,
                serverTime,
                user.role
            );

            if (!attendance) {
                attendance = await prisma.attendanceRecord.create({
                    data: {
                        userId: userId,
                        qrId: qr.id,
                        attendanceDate: startOfDay, // Normalize to date only
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
                // Should not happen if attendance check above works
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
                    type: 'IN', // 'qr_type': 'IN' in payload
                    shift: qr.shift,
                    timestamp: attendance.checkInTime,
                    late_minutes: lateMinutes,
                    discount_amount: parseFloat(discountAmount),
                    status: status,
                },
            });

        } else if (qr.qrType === 'OUT') {
            if (!attendance || !attendance.checkInTime) {
                await logAudit(userId, qr.id, 'SCAN_FAIL', 'CHECK_IN_REQUIRED', latitude, longitude, accuracy_m, req);
                return res.status(400).json({
                    error: 'CHECK_IN_REQUIRED',
                    message: 'Debe registrar entrada antes de la salida'
                });
            }

            if (attendance.checkOutTime) {
                await logAudit(userId, qr.id, 'SCAN_FAIL', 'DUPLICATE_CHECK_OUT', latitude, longitude, accuracy_m, req);
                return res.status(409).json({
                    error: 'DUPLICATE_CHECK_OUT',
                    message: 'Ya registró salida en este turno'
                });
            }

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
                    type: 'OUT',
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
