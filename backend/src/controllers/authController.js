const authService = require('../services/authService');
const { PrismaClient } = require('@prisma/client');
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
        console.error('Error en register:', error);
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

        res.status(200).json({
            success: true,
            token: result.token,
            user: result.user,
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
        console.error('Error en login:', error);
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
        console.error('Error en getMe:', error);
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
        console.error('Error en getAllUsers:', error);
        res.status(500).json({ error: 'INTERNAL_SERVER_ERROR', details: error.message });
    }
}

module.exports = {
    register,
    login,
    getMe,
    getAllUsers,
};
