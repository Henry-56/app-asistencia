const moment = require('moment-timezone');
const {
    SHIFT_START_TIMES,
    LATE_TOLERANCE_MINUTES,
    COLABORADOR_DISCOUNTS,
    PRACTICANTE_DISCOUNTS,
    TIMEZONE
} = require('../config/constants');

/**
 * Calcula los minutos de tardanza y el monto de descuento
 * @param {string} shift - 'AM' o 'PM'
 * @param {Date|moment.Moment} checkInTime - Hora de entrada
 * @param {string} role - 'COLABORADOR' o 'PRACTICANTE'
 * @returns {{ lateMinutes: number, discountAmount: number, status: string }}
 */
function calcLateAndDiscount(shift, checkInTime, role) {
    const checkInMoment = moment(checkInTime).tz(TIMEZONE);

    // Obtener hora de inicio oficial del turno
    const shiftStartTime = SHIFT_START_TIMES[shift];
    const startMoment = moment.tz(
        `${checkInMoment.format('YYYY-MM-DD')} ${shiftStartTime}`,
        TIMEZONE
    );

    // Calcular diferencia en minutos
    const diffMinutes = checkInMoment.diff(startMoment, 'minutes');

    // Si llegó antes o exacto
    if (diffMinutes <= 0) {
        return {
            lateMinutes: 0,
            discountAmount: 0.00,
            status: 'PRESENTE',
        };
    }

    // Dentro de tolerancia
    if (diffMinutes <= LATE_TOLERANCE_MINUTES) {
        return {
            lateMinutes: diffMinutes,
            discountAmount: 0.00,
            status: 'PRESENTE',
        };
    }

    // Tardanza detectada
    let discountAmount = 0.00;

    if (role === 'PRACTICANTE') {
        discountAmount = PRACTICANTE_DISCOUNTS.ANY_LATE;
    } else if (role === 'COLABORADOR') {
        const { TIER_1, TIER_2, TIER_3, TIER_4 } = COLABORADOR_DISCOUNTS;

        if (diffMinutes >= TIER_1.minMinutes && diffMinutes <= TIER_1.maxMinutes) {
            discountAmount = TIER_1.amount;
        } else if (diffMinutes >= TIER_2.minMinutes && diffMinutes <= TIER_2.maxMinutes) {
            discountAmount = TIER_2.amount;
        } else if (diffMinutes >= TIER_3.minMinutes && diffMinutes <= TIER_3.maxMinutes) {
            discountAmount = TIER_3.amount;
        } else if (diffMinutes >= TIER_4.minMinutes) {
            discountAmount = TIER_4.amount;
        }
    }

    return {
        lateMinutes: diffMinutes,
        discountAmount,
        status: 'TARDE',
    };
}

module.exports = calcLateAndDiscount;
