const express = require('express');
const authController = require('../controllers/authController');
const { authenticate, authorize } = require('../middleware/auth');
const { loginLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// Registro de usuario
router.post('/register', authController.register);

// Login (con rate limiting)
router.post('/login', loginLimiter, authController.login);

// Obtener perfil (requiere autenticación)
router.get('/me', authenticate, authController.getMe);

// Obtener lista de usuarios (Admin)
router.get('/users', authenticate, authorize('ADMIN'), authController.getAllUsers);

module.exports = router;
