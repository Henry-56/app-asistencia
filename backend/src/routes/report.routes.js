const express = require('express');
const reportController = require('../controllers/reportController');
const { authenticate, authorize } = require('../middleware/auth');
const router = express.Router();

router.get('/range', authenticate, authorize('ADMIN'), reportController.getRangeStats);
router.get('/day', authenticate, authorize('ADMIN'), reportController.getDailyDetail);

module.exports = router;
