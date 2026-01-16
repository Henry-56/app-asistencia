const rateLimit = require('express-rate-limit');

/**
 * Rate limiter general
 */
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // Máximo 100 requests por ventana
    message: { error: 'TOO_MANY_REQUESTS', message: 'Demasiadas solicitudes, intente más tarde' },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * Rate limiter estricto para escaneo QR
 */
const scanLimiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10), // 1 minuto
    max: parseInt(process.env.RATE_LIMIT_MAX || '5', 10), // 5 requests
    message: { error: 'TOO_MANY_REQUESTS', message: 'Máximo 5 escaneos por minuto' },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.user?.userId || req.ip, // Por usuario autenticado
});

/**
 * Rate limiter para login
 */
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 10, // 10 intentos de login
    message: { error: 'TOO_MANY_REQUESTS', message: 'Demasiados intentos de login' },
    standardHeaders: true,
    legacyHeaders: false,
});

module.exports = {
    generalLimiter,
    scanLimiter,
    loginLimiter,
};
