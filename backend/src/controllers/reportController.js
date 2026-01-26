const moment = require('moment-timezone');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { TIMEZONE } = require('../config/constants');

/**
 * GET /api/reports/range
 * Params: start, end, locationId (optional)
 * Returns daily stats: { date: 'YYYY-MM-DD', present: 5, late: 2, absent: 1 }
 */
async function getRangeStats(req, res) {
    try {
        const { start, end, locationId } = req.query;

        if (!start || !end) {
            return res.status(400).json({ error: 'MISSING_DATES', message: 'Start and End dates are required' });
        }

        const startDate = moment.tz(start, TIMEZONE).startOf('day');
        const endDate = moment.tz(end, TIMEZONE).endOf('day');
        const daysDiff = endDate.diff(startDate, 'days') + 1;

        if (daysDiff > 31) {
            return res.status(400).json({ error: 'RANGE_TOO_LONG', message: 'Max 31 days' });
        }

        // 1. Get Users (Active)
        const users = await prisma.user.findMany({
            where: { isActive: true },
            include: { schedules: true } // Preload schedules
        });

        // 2. Get Attendances
        const attendances = await prisma.attendanceRecord.findMany({
            where: {
                attendanceDate: {
                    gte: startDate.toDate(),
                    lte: endDate.toDate()
                }
            }
        });

        const stats = [];
        let currentDate = startDate.clone();

        for (let i = 0; i < daysDiff; i++) {
            const dateStr = currentDate.format('YYYY-MM-DD');
            const dayOfWeekIso = currentDate.isoWeekday(); // 1=Mon

            let presentCount = 0;
            let lateCount = 0;
            let absentCount = 0;

            for (const user of users) {
                // Determine scheduled shifts for this user on this day
                // schedules stores dayOfWeek (1=Mon)
                const userShifts = user.schedules.filter(s => s.dayOfWeek === dayOfWeekIso && s.isActive);

                // For each scheduled shift, check if there is an attendance record
                for (const shift of userShifts) {
                    const record = attendances.find(a =>
                        a.userId === user.id &&
                        moment(a.attendanceDate).tz(TIMEZONE).format('YYYY-MM-DD') === dateStr &&
                        a.shift === shift.shift
                    );

                    if (record) {
                        if (record.status === 'PRESENTE') presentCount++;
                        if (record.status === 'TARDE') lateCount++;
                        if (record.status === 'FALTA') absentCount++; // Explicit failure
                    } else {
                        // No record, but scheduled = Absent
                        // (Unless future date? But reports are typically past/present)
                        if (currentDate.isSameOrBefore(moment.tz(TIMEZONE))) {
                            absentCount++;
                        }
                    }
                }
            }

            stats.push({
                date: dateStr,
                present: presentCount,
                late: lateCount,
                absent: absentCount
            });

            currentDate.add(1, 'days');
        }

        res.json({ success: true, data: stats });

    } catch (error) {
        console.error('Error in getRangeStats:', error);
        res.status(500).json({ error: 'INTERNAL_SERVER_ERROR' });
    }
}

/**
 * GET /api/reports/day
 * Params: date, locationId (optional)
 * Returns breakdown of all users for that day.
 */
async function getDailyDetail(req, res) {
    try {
        const { date, locationId } = req.query;
        if (!date) return res.status(400).json({ error: 'MISSING_DATE' });

        const targetDate = moment.tz(date, TIMEZONE);
        const dateStr = targetDate.format('YYYY-MM-DD');
        const dayOfWeekIso = targetDate.isoWeekday();

        // 1. Get Users/Schedules
        const users = await prisma.user.findMany({
            where: { isActive: true },
            include: { schedules: true },
            orderBy: { fullName: 'asc' }
        });

        // 2. Get Attendances
        const attendances = await prisma.attendanceRecord.findMany({
            where: {
                attendanceDate: {
                    gte: targetDate.startOf('day').toDate(),
                    lte: targetDate.endOf('day').toDate()
                }
            },
            include: { qr: { include: { location: true } } }
        });

        const report = [];

        for (const user of users) {
            const userShifts = user.schedules.filter(s => s.dayOfWeek === dayOfWeekIso && s.isActive);

            // If no shifts, usually we don't list them, or list as "Descanso"?
            // Prompt says: "Lista de usuarios con su estado ... breakdown AM/PM si aplica".
            // Let's just output rows for each SCHEDULED shift + any extra attendance (unexpected).

            // Track processed shifts
            const processedShifts = new Set();

            // Add Scheduled Rows
            for (const s of userShifts) {
                processedShifts.add(s.shift);
                const record = attendances.find(a => a.userId === user.id && a.shift === s.shift);

                let status = 'FALTA';
                let info = {};

                if (record) {
                    status = record.status;
                    info = {
                        first_name: user.fullName, // Adjust as needed
                        check_in: record.checkInTime,
                        late_minutes: record.lateMinutes,
                        discount: record.discountAmount,
                        location: record.qr?.location?.name
                    };
                } else {
                    // Verify if it's future
                    if (moment().tz(TIMEZONE).isBefore(targetDate.startOf('day'))) {
                        status = 'PENDIENTE';
                    }
                }

                report.push({
                    userId: user.id,
                    fullName: user.fullName,
                    role: user.role,
                    shift: s.shift,
                    status,
                    ...info
                });
            }

            // Check records for non-scheduled shifts (e.g. came on Saturday PM)
            const extraRecords = attendances.filter(a => a.userId === user.id && !processedShifts.has(a.shift));
            for (const record of extraRecords) {
                report.push({
                    userId: user.id,
                    fullName: user.fullName,
                    role: user.role,
                    shift: record.shift,
                    status: record.status, // e.g. Presente (Extra)
                    extra: true,
                    check_in: record.checkInTime,
                    late_minutes: record.lateMinutes,
                    discount: record.discountAmount,
                    location: record.qr?.location?.name
                });
            }
        }

        res.json({ success: true, data: report });

    } catch (error) {
        console.error('Error in getDailyDetail:', error);
        res.status(500).json({ error: 'INTERNAL_SERVER_ERROR' });
    }
}

module.exports = {
    getRangeStats,
    getDailyDetail
};
