const express = require('express');
const attendanceController = require('../controllers/attendanceController');
const { authenticate, authorize } = require('../middleware/auth');
const { scanLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// Escanear QR (con rate limiting estricto)
router.post('/scan', authenticate, scanLimiter, attendanceController.scanQR);

// Obtener mis registros
router.get('/my-records', authenticate, attendanceController.getMyRecords);

// Justificar asistencia (Admin)
router.post('/justify', authenticate, authorize('ADMIN'), attendanceController.justifyAttendance);

// Obtener todos los registros (Reporte Admin)
router.get('/admin/all', authenticate, authorize('ADMIN'), attendanceController.getAllRecords);

module.exports = router;
