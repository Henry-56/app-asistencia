/**
 * Middleware de validación usando Zod
 * Valida el body de las requests contra un schema
 */

const logger = require('../config/logger');

/**
 * Crea un middleware de validación para un schema de Zod
 * @param {ZodSchema} schema - Schema de Zod para validar
 * @returns {Function} Middleware de Express
 */
function validate(schema) {
    return (req, res, next) => {
        try {
            // Parsear y validar el body con el schema
            const validated = schema.parse(req.body);

            // Reemplazar req.body con datos validados y sanitizados
            req.body = validated;

            next();
        } catch (error) {
            // Error de validación de Zod
            if (error.name === 'ZodError') {
                logger.warn('Validation error', {
                    path: req.path,
                    method: req.method,
                    errors: error.errors,
                    body: req.body
                });

                return res.status(400).json({
                    error: 'VALIDATION_ERROR',
                    message: 'Datos de entrada inválidos',
                    details: error.errors.map(err => ({
                        field: err.path.join('.'),
                        message: err.message
                    }))
                });
            }

            // Otro tipo de error
            logger.error('Unexpected validation error', {
                error: error.message,
                stack: error.stack
            });

            return res.status(500).json({
                error: 'INTERNAL_SERVER_ERROR',
                message: 'Error al validar datos'
            });
        }
    };
}

module.exports = validate;
