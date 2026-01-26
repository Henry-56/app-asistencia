const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * GET /api/users/:userId/schedule
 */
async function getSchedule(req, res) {
    try {
        const { userId } = req.params;

        const schedule = await prisma.userSchedule.findMany({
            where: { userId, isActive: true },
            orderBy: [{ dayOfWeek: 'asc' }, { shift: 'asc' }]
        });

        res.json({
            success: true,
            data: schedule
        });
    } catch (error) {
        console.error('Error getting schedule:', error);
        res.status(500).json({ error: 'INTERNAL_SERVER_ERROR' });
    }
}

/**
 * PUT /api/users/:userId/schedule
 * Body: { schedule: [{ dayOfWeek: 1, shift: 'AM', isActive: true }, ...] }
 * This will replace/upsert the schedule.
 */
async function updateSchedule(req, res) {
    try {
        const { userId } = req.params;
        const { schedule } = req.body; // Array of schedule items

        if (!Array.isArray(schedule)) {
            return res.status(400).json({ error: 'INVALID_FORMAT', message: 'Schedule must be an array' });
        }

        // Transaction to update: upsert items
        // Strategy: We can delete all previous for user and insert new, OR upsert.
        // Delete and recreate is safer for "full replacement" logic.

        await prisma.$transaction(async (tx) => {
            // Option 1: Delete all and create valid ones
            await tx.userSchedule.deleteMany({
                where: { userId }
            });

            if (schedule.length > 0) {
                await tx.userSchedule.createMany({
                    data: schedule.map(item => ({
                        userId,
                        dayOfWeek: item.dayOfWeek,
                        shift: item.shift,
                        isActive: item.isActive ?? true
                    }))
                });
            }
        });

        res.json({ success: true, message: 'Schedule updated successfully' });

    } catch (error) {
        console.error('Error updating schedule:', error);
        res.status(500).json({ error: 'INTERNAL_SERVER_ERROR' });
    }
}

module.exports = {
    getSchedule,
    updateSchedule
};
