const moment = require('moment-timezone');
const QRCode = require('qrcode');
const prisma = require('../config/prisma');
const { SCAN_WINDOWS, TIMEZONE } = require('../config/constants');
const { v4: uuidv4 } = require('uuid');
const logger = require('../config/logger');



/**
 * POST /api/qr/fixed
 * Get or Create Fixed QR for a Shift
 * Body: { shift: 'AM' | 'PM' }
 */
async function getOrCreateFixedQR(req, res) {
    try {
        const { shift } = req.body;
        if (!['AM', 'PM'].includes(shift)) {
            return res.status(400).json({ error: 'INVALID_SHIFT', message: 'Shift must be AM or PM' });
        }

        const location = await prisma.location.findFirst({ where: { isActive: true } });
        if (!location) return res.status(404).json({ error: 'NO_LOCATION' });

        // Find existing fixed QR
        let qr = await prisma.qRCode.findFirst({
            where: {
                isFixed: true,
                shift: shift,
                qrType: 'IN' // Dummy type used for storage
            }
        });

        if (!qr) {
            // Create permanent QR
            qr = await prisma.qRCode.create({
                data: {
                    qrToken: uuidv4(),
                    qrDate: new Date(), // Dummy
                    qrType: 'IN',
                    shift: shift,
                    locationId: location.id,
                    validFrom: new Date(),
                    validUntil: new Date(new Date().setFullYear(2099)), // Far future
                    isFixed: true
                }
            });
        }

        const qrDataUrl = await QRCode.toDataURL(qr.qrToken, { width: 400 });

        res.json({
            success: true,
            shift: shift,
            qr_token: qr.qrToken,
            qr_data_url: qrDataUrl
        });

    } catch (error) {
        logger.error('Error in getOrCreateFixedQR', { error: error.message, stack: error.stack, shift: req.body?.shift });
        res.status(500).json({ error: 'INTERNAL_SERVER_ERROR' });
    }
}

// Helper
function getDayName(dayOfWeek) {
    const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    return days[dayOfWeek];
}

module.exports = {
    getOrCreateFixedQR
};
