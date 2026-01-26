const express = require('express');
const qrController = require('../controllers/qrController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Obtener/Crear QR Fijo
router.post('/fixed', authenticate, authorize('ADMIN'), qrController.getOrCreateFixedQR);

module.exports = router;
