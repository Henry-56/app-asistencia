const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Genera un código único de 4 caracteres alfanuméricos (mayúsculas)
 */
function generateLoginCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 4; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

/**
 * Genera un código único verificando que no exista en la BD
 */
async function generateUniqueLoginCode() {
    let code;
    let isUnique = false;

    while (!isUnique) {
        code = generateLoginCode();
        const existing = await prisma.user.findUnique({
            where: { loginCode: code },
        });
        if (!existing) {
            isUnique = true;
        }
    }

    return code;
}

/**
 * Registrar nuevo usuario
 */
async function register(data) {
    const { email, fullName, role } = data;

    // Generar loginCode único
    const loginCode = await generateUniqueLoginCode();

    // Generar employee_code único (EMP-YYYY-XXXX)
    const year = new Date().getFullYear();
    const count = await prisma.user.count();
    const employeeCode = `EMP-${year}-${String(count + 1).padStart(4, '0')}`;

    // Crear usuario
    const user = await prisma.user.create({
        data: {
            email: email || null,
            fullName,
            role,
            employeeCode,
            loginCode,
        },
        select: {
            id: true,
            employeeCode: true,
            loginCode: true,
            email: true,
            fullName: true,
            role: true,
        },
    });

    return user;
}

/**
 * Login de usuario usando loginCode
 */
async function login(loginCode) {
    // Buscar usuario por loginCode
    const user = await prisma.user.findUnique({
        where: { loginCode: loginCode.toUpperCase() },
    });

    if (!user) {
        throw new Error('INVALID_CODE');
    }

    if (!user.isActive) {
        throw new Error('USER_INACTIVE');
    }

    // Generar JWT
    const jwt = require('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-in-production';
    const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

    const token = jwt.sign(
        {
            userId: user.id,
            loginCode: user.loginCode,
            role: user.role,
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );

    return {
        token,
        user: {
            id: user.id,
            employeeCode: user.employeeCode,
            loginCode: user.loginCode,
            email: user.email,
            fullName: user.fullName,
            role: user.role,
        },
    };
}

/**
 * Verificar token JWT
 */
function verifyToken(token) {
    const jwt = require('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-in-production';

    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        throw new Error('INVALID_TOKEN');
    }
}

/**
 * Obtener perfil del usuario
 */
async function getProfile(userId) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            employeeCode: true,
            loginCode: true,
            email: true,
            fullName: true,
            role: true,
            isActive: true,
            createdAt: true,
        },
    });

    if (!user) {
        throw new Error('USER_NOT_FOUND');
    }

    return user;
}

module.exports = {
    register,
    login,
    verifyToken,
    getProfile,
    generateUniqueLoginCode,
};
