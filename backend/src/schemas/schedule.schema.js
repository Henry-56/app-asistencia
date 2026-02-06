/**
 * Esquemas de validación Zod para módulo de horarios
 */

const { z } = require('zod');

// Schema para item de horario individual
const scheduleItemSchema = z.object({
    dayOfWeek: z.number()
        .int('Día de semana debe ser un número entero')
        .min(1, 'Día de semana debe ser entre 1 (Lunes) y 6 (Sábado)')
        .max(6, 'Día de semana debe ser entre 1 (Lunes) y 6 (Sábado)'),
    shift: z.enum(['AM', 'PM'], {
        errorMap: () => ({ message: 'Turno debe ser AM o PM' })
    }),
    isActive: z.boolean(),
    startTime: z.string()
        .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Hora de inicio debe tener formato HH:MM')
        .optional()
        .nullable(),
    endTime: z.string()
        .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Hora de fin debe tener formato HH:MM')
        .optional()
        .nullable()
});

// Schema para actualización de horario completo
const updateScheduleSchema = z.object({
    schedule: z.array(scheduleItemSchema)
        .min(1, 'Debe proporcionar al menos un horario')
        .max(12, 'Máximo 12 horarios permitidos (6 días x 2 turnos)')
});

module.exports = {
    scheduleItemSchema,
    updateScheduleSchema
};
