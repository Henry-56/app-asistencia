const express = require('express');
const attendanceController = require('../controllers/attendanceController');
const { authenticate, authorize } = require('../middleware/auth');
const { scanLimiter } = require('../middleware/rateLimiter');
const validate = require('../middleware/validate');
const { scanQRSchema, justifySchema } = require('../schemas/attendance.schema');

const router = express.Router();

// Escanear QR (con rate limiting estricto + validación)
router.post('/scan',
    authenticate,
    scanLimiter,
    validate(scanQRSchema),
    attendanceController.scanQR
);

// Obtener mis registros
router.get('/my-records', authenticate, attendanceController.getMyRecords);

// Justificar asistencia (Admin + validación)
router.post('/justify',
    authenticate,
    authorize('ADMIN'),
    validate(justifySchema),
    attendanceController.justifyAttendance
);

// Obtener todos los registros (Reporte Admin)
router.get('/admin/all', authenticate, authorize('ADMIN'), attendanceController.getAllRecords);

module.exports = router;
