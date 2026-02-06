const express = require('express');
const authController = require('../controllers/authController');
const { authenticate, authorize } = require('../middleware/auth');
const { loginLimiter } = require('../middleware/rateLimiter');
const validate = require('../middleware/validate');
const { registerSchema, loginSchema } = require('../schemas/auth.schema');

const router = express.Router();

// Registro de usuario (con validación)
router.post('/register', validate(registerSchema), authController.register);

// Login (con rate limiting + validación)
router.post('/login', loginLimiter, validate(loginSchema), authController.login);

// Obtener perfil (requiere autenticación)
router.get('/me', authenticate, authController.getMe);

// Logout (requiere autenticación)
router.post('/logout', authenticate, authController.logout);

// Obtener lista de usuarios (Admin)
router.get('/users', authenticate, authorize('ADMIN'), authController.getAllUsers);

module.exports = router;
