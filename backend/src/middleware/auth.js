const { verifyToken } = require('../services/authService');

/**
 * Middleware de autenticación
 */
function authenticate(req, res, next) {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'NO_TOKEN_PROVIDED' });
        }

        const token = authHeader.substring(7);
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
