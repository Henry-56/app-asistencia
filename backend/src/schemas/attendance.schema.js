/**
 * Esquemas de validación Zod para módulo de asistencias
 */

const { z } = require('zod');

// Schema para escaneo de QR
const scanQRSchema = z.object({
    qr_token: z.string().uuid('Token QR debe ser un UUID válido'),
    latitude: z.number()
        .min(-90, 'Latitud debe estar entre -90 y 90')
        .max(90, 'Latitud debe estar entre -90 y 90'),
    longitude: z.number()
        .min(-180, 'Longitud debe estar entre -180 y 180')
        .max(180, 'Longitud debe estar entre -180 y 180'),
    accuracy_m: z.number()
        .positive('Accuracy debe ser un número positivo')
        .max(1000, 'Accuracy GPS demasiado bajo (>1km)')
});

// Schema para justificación de asistencia
const justifySchema = z.object({
    recordId: z.number()
        .int('ID de registro debe ser un número entero')
        .positive('ID de registro debe ser positivo'),
    justificationReason: z.string()
        .min(5, 'Razón de justificación muy corta (mínimo 5 caracteres)')
        .max(500, 'Razón de justificación muy larga (máximo 500 caracteres)')
        .trim()
});

module.exports = {
    scanQRSchema,
    justifySchema
};
