const { verifyToken } = require('../services/authService');

/**
 * Middleware de autenticación
 */
function authenticate(req, res, next) {
    try {
        // Leer token desde cookie (preferido) o header Authorization (fallback)
        const token = req.cookies.auth_token ||
                      (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.substring(7) : null);

        if (!token) {
            return res.status(401).json({ error: 'NO_TOKEN_PROVIDED' });
        }

        const decoded = verifyToken(token);

        req.user = decoded; // { userId, email, role }
        next();
    } catch (error) {
        return res.status(401).json({ error: 'INVALID_TOKEN' });
    }
}

/**
 * Middleware de autorización por rol
 */
function authorize(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'UNAUTHORIZED' });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ error: 'FORBIDDEN' });
        }

        next();
    };
}

module.exports = {
    authenticate,
    authorize,
};
