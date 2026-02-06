/**
 * Esquemas de validación Zod para módulo de autenticación
 */

const { z } = require('zod');

// Schema para registro de usuario
const registerSchema = z.object({
    full_name: z.string()
        .min(2, 'Nombre muy corto (mínimo 2 caracteres)')
        .max(100, 'Nombre muy largo (máximo 100 caracteres)')
        .trim(),
    email: z.string()
        .email('Email inválido')
        .optional()
        .nullable(),
    role: z.enum(['ADMIN', 'COLABORADOR', 'PRACTICANTE'], {
        errorMap: () => ({ message: 'Rol debe ser ADMIN, COLABORADOR o PRACTICANTE' })
    }).optional()
});

// Schema para login
const loginSchema = z.object({
    login_code: z.string()
        .length(4, 'Código de login debe tener exactamente 4 caracteres')
        .regex(/^[A-Z0-9]{4}$/, 'Código debe contener solo letras mayúsculas y números')
});

module.exports = {
    registerSchema,
    loginSchema
};
