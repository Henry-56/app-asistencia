const express = require('express');
const scheduleController = require('../controllers/scheduleController');
const { authenticate, authorize } = require('../middleware/auth');
const router = express.Router();

// Get Schedule (Admin)
router.get('/:userId/schedule', authenticate, authorize('ADMIN'), scheduleController.getSchedule);

// Update Schedule (Admin)
router.put('/:userId/schedule', authenticate, authorize('ADMIN'), scheduleController.updateSchedule);

module.exports = router;
