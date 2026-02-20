const authService = require('../services/authService');
const { PrismaClient } = require('@prisma/client');
const logger = require('../config/logger');
const prisma = new PrismaClient();

/**
 * POST /api/auth/register
 * Registrar nuevo usuario - retorna loginCode único
 */
async function register(req, res) {
    try {
        const { email, full_name, role } = req.body;

        // Validación básica
        if (!full_name) {
            return res.status(400).json({
                error: 'MISSING_FIELDS',
                message: 'Nombre completo es requerido'
            });
        }

        if (role && !['COLABORADOR', 'PRACTICANTE', 'ADMIN'].includes(role)) {
            return res.status(400).json({
                error: 'INVALID_ROLE',
                message: 'Rol debe ser COLABORADOR, PRACTICANTE o ADMIN'
            });
        }

        const user = await authService.register({
            email: email || null,
            fullName: full_name,
            role: role || 'COLABORADOR',
        });

        res.status(201).json({
            success: true,
            message: '¡Registro exitoso! Guarde su código de acceso.',
            data: {
                employee_code: user.employeeCode,
                login_code: user.loginCode, // Código de 4 dígitos para login
                full_name: user.fullName,
                role: user.role,
            },
        });
    } catch (error) {
        logger.error('Error en register', { error: error.message, stack: error.stack });
        res.status(500).json({ error: 'INTERNAL_SERVER_ERROR' });
    }
}

/**
 * POST /api/auth/login
 * Iniciar sesión con loginCode (4 caracteres)
 */
async function login(req, res) {
    try {
        const { login_code } = req.body;

        if (!login_code) {
            return res.status(400).json({
                error: 'MISSING_CODE',
                message: 'Código de acceso es requerido'
            });
        }

        if (login_code.length !== 4) {
            return res.status(400).json({
                error: 'INVALID_CODE_LENGTH',
                message: 'El código debe tener 4 caracteres'
            });
        }

        const result = await authService.login(login_code);

        // Enviar token como httpOnly cookie en lugar de en el body
        const isProduction = process.env.NODE_ENV === 'production';
        res.cookie('auth_token', result.token, {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? 'none' : 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 días
        });

        res.status(200).json({
            success: true,
            user: result.user,
            // NO enviar token en body por seguridad
        });
    } catch (error) {
        if (error.message === 'INVALID_CODE') {
            return res.status(401).json({
                error: 'INVALID_CODE',
                message: 'Código de acceso inválido'
            });
        }
        if (error.message === 'USER_INACTIVE') {
            return res.status(403).json({
                error: 'USER_INACTIVE',
                message: 'Usuario inactivo'
            });
        }
        logger.error('Error en login', { error: error.message, stack: error.stack });
        res.status(500).json({ error: 'INTERNAL_SERVER_ERROR' });
    }
}

/**
 * GET /api/auth/me
 * Obtener perfil del usuario autenticado
 */
async function getMe(req, res) {
    try {
        const user = await authService.getProfile(req.user.userId);

        res.status(200).json({
            success: true,
            user,
        });
    } catch (error) {
        if (error.message === 'USER_NOT_FOUND') {
            return res.status(404).json({ error: 'USER_NOT_FOUND' });
        }
        logger.error('Error en getMe', { error: error.message, stack: error.stack, userId: req.user?.userId });
        res.status(500).json({ error: 'INTERNAL_SERVER_ERROR' });
    }
}

/**
 * GET /api/auth/users
 * Obtener lista de usuarios (Admin)
 */
async function getAllUsers(req, res) {

    try {
        const users = await prisma.user.findMany({
            orderBy: { fullName: 'asc' },
            select: {
                id: true,
                fullName: true,
                email: true,
                role: true,
                isActive: true,
                employeeCode: true,
                loginCode: true,
            },
        });


        res.status(200).json(users);
    } catch (error) {
        logger.error('Error en getAllUsers', { error: error.message, stack: error.stack });
        res.status(500).json({ error: 'INTERNAL_SERVER_ERROR', details: error.message });
    }
}

/**
 * POST /api/auth/logout
 * Logout con invalidación de cookie y auditoría
 */
async function logout(req, res) {
    try {
        const userId = req.user.userId;

        // Registrar logout en audit logs
        await prisma.auditLog.create({
            data: {
                userId,
                action: 'LOGOUT',
                reason: 'User logout',
                metadata: {
                    timestamp: new Date().toISOString(),
                    ip: req.ip
                }
            }
        });

        // Invalidar cookie
        const isProduction = process.env.NODE_ENV === 'production';
        res.clearCookie('auth_token', {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? 'none' : 'strict'
        });

        logger.info('Logout exitoso', { userId });
        res.status(200).json({ success: true, message: 'Logout exitoso' });
    } catch (error) {
        logger.error('Error en logout', { error: error.message, stack: error.stack });
        res.status(500).json({ error: 'INTERNAL_SERVER_ERROR' });
    }
}

module.exports = {
    register,
    login,
    getMe,
    getAllUsers,
    logout,
};
