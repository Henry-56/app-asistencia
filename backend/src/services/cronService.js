/**
 * Servicio CRON para marcar faltas automáticas
 * Se ejecuta diariamente después de las ventanas de escaneo
 */

const moment = require('moment-timezone');
const prisma = require('../config/prisma');
const { TIMEZONE, COLABORADOR_DISCOUNTS } = require('../config/constants');
const logger = require('../config/logger');

/**
 * Marca faltas automáticas para usuarios que no registraron asistencia
 * @param {string} shift - 'AM' o 'PM'
 */
async function markDailyAbsences(shift) {
    try {
        const today = moment.tz(TIMEZONE).format('YYYY-MM-DD');
        const dayOfWeek = moment.tz(TIMEZONE).day(); // 0=Domingo, 1=Lunes, ...

        logger.info(`CRON: Iniciando marcación de faltas ${shift}`, { date: today, dayOfWeek });

        // 1. Obtener usuarios con horario activo para hoy y este turno
        const usersWithSchedule = await prisma.userSchedule.findMany({
            where: {
                dayOfWeek: dayOfWeek,
                shift: shift,
                isActive: true,
                user: {
                    isActive: true
                }
            },
            include: {
                user: true
            }
        });

        logger.info(`CRON: Encontrados ${usersWithSchedule.length} usuarios con horario ${shift}`);

        let absencesMarked = 0;

        // 2. Para cada usuario, verificar si ya tiene registro de hoy
        for (const schedule of usersWithSchedule) {
            const userId = schedule.userId;
            const user = schedule.user;

            // Verificar si ya tiene registro para hoy en este turno
            const existingRecord = await prisma.attendanceRecord.findFirst({
                where: {
                    userId: userId,
                    attendanceDate: today,
                    shift: shift
                }
            });

            // Si no tiene registro, crear uno con status FALTA
            if (!existingRecord) {
                const discountAmount = user.role === 'COLABORADOR'
                    ? COLABORADOR_DISCOUNTS.ABSENCE
                    : 0;

                await prisma.attendanceRecord.create({
                    data: {
                        userId: userId,
                        attendanceDate: today,
                        shift: shift,
                        status: 'FALTA',
                        lateMinutes: 0,
                        discountAmount: discountAmount,
                        isJustified: false
                    }
                });

                // Registrar en audit log
                await prisma.auditLog.create({
                    data: {
                        userId: userId,
                        action: 'AUTO_ABSENCE',
                        reason: `Marcado automáticamente como falta - Sin registro en turno ${shift}`,
                        metadata: {
                            date: today,
                            shift: shift,
                            discount: discountAmount
                        }
                    }
                });

                absencesMarked++;
                logger.info(`CRON: Falta marcada automáticamente`, {
                    userId,
                    userName: user.fullName,
                    shift,
                    discount: discountAmount
                });
            }
        }

        logger.info(`CRON: Completado - ${absencesMarked} faltas marcadas para ${shift}`, {
            date: today,
            shift,
            totalUsers: usersWithSchedule.length,
            absencesMarked
        });

        return {
            success: true,
            date: today,
            shift,
            totalUsers: usersWithSchedule.length,
            absencesMarked
        };

    } catch (error) {
        logger.error('CRON: Error marcando faltas automáticas', {
            error: error.message,
            stack: error.stack,
            shift
        });
        throw error;
    }
}

module.exports = {
    markDailyAbsences
};
