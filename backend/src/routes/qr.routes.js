const express = require('express');
const qrController = require('../controllers/qrController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Solo admins pueden generar QRs
router.post('/generate-today', authenticate, authorize('ADMIN'), qrController.generateToday);

// Todos pueden ver los QRs de hoy
router.get('/today', authenticate, qrController.getToday);

// Obtener/Crear QR Fijo
router.post('/fixed', authenticate, authorize('ADMIN'), qrController.getOrCreateFixedQR);

module.exports = router;
