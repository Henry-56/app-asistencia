/**
 * Constantes del sistema de asistencias
 */

module.exports = {
    // Horarios de inicio de turnos
    SHIFT_START_TIMES: {
        AM: '09:00',
        PM: '15:00',
    },

    // Ventanas de escaneo (desde - hasta)
    SCAN_WINDOWS: {
        IN_AM: { from: '05:00', until: '13:00' },   // Gran tolerancia para entrada AM
        OUT_AM: { from: '13:00', until: '16:00' },  // Salida AM desde 1 PM
        IN_PM: { from: '12:00', until: '19:00' },   // Solape para entrada PM
        OUT_PM: { from: '19:00', until: '23:59' },  // Salida PM desde 7 PM
    },

    // Tolerancia de tardanza (minutos)
    LATE_TOLERANCE_MINUTES: 9,

    // Descuentos para COLABORADORES (en soles)
    COLABORADOR_DISCOUNTS: {
        TIER_1: { minMinutes: 10, maxMinutes: 19, amount: 5.00 },   // 10-19 min
        TIER_2: { minMinutes: 20, maxMinutes: 29, amount: 10.00 },  // 20-29 min
        TIER_3: { minMinutes: 30, maxMinutes: 59, amount: 13.00 },  // 30-59 min
        TIER_4: { minMinutes: 60, maxMinutes: Infinity, amount: 23.00 }, // 1 hora+
        ABSENCE: 46.00, // Falta sin aviso
    },

    // Descuentos para PRACTICANTES (DEPRECATED - Usan lógica de Colaborador)
    PRACTICANTE_DISCOUNTS: {
        ANY_LATE: 5.00,
        ABSENCE: 46.00,       // Igualado a Colaborador implicita o explicitamente? Mejor mantenemos la estructura pero la logica usa la de arriba.
    },

    // Límite de accuracy GPS (metros)
    GPS_ACCURACY_THRESHOLD: parseInt(process.env.GPS_ACCURACY_THRESHOLD_M || '50', 10),

    // Zona horaria
    TIMEZONE: 'America/Lima',

    // Horarios de CRON para marcar faltas
    CRON_SCHEDULES: {
        MORNING_WEEKDAY: '15 10 * * 1-5',   // L-V a las 10:15
        AFTERNOON_WEEKDAY: '15 16 * * 1-5', // L-V a las 16:15
        SATURDAY_MORNING: '45 13 * * 6',    // Sábado a las 13:45
    },
};
