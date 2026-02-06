const moment = require('moment-timezone');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { TIMEZONE } = require('../config/constants');
const logger = require('../config/logger');
const cache = require('../services/cache');

/**
 * GET /api/reports/range
 * Params: start, end, locationId (optional)
 * Returns daily stats: { date: 'YYYY-MM-DD', present: 5, late: 2, absent: 1 }
 */
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

        // Use UTC for DB querying to ensure we catch all records stored as 'YYYY-MM-DD 00:00:00 UTC'
        const startDateUtc = moment.utc(start).startOf('day');
        const endDateUtc = moment.utc(end).endOf('day');

        // Loop logic still uses Input Dates (which should be YYYY-MM-DD)
        // We'll iterate the requested range using Moment
        const viewStartDate = moment(start); // interpreted as local or strict YYYY-MM-DD
        const viewEndDate = moment(end);
        const daysDiff = viewEndDate.diff(viewStartDate, 'days') + 1;

        if (daysDiff > 31) {
            return res.status(400).json({ error: 'RANGE_TOO_LONG', message: 'Max 31 days' });
        }

        // 1. Get Users (Active)
        const users = await prisma.user.findMany({
            where: { isActive: true },
            include: { schedules: true }
        });

        // 2. Get Attendances (Range Query in UTC)
        const attendances = await prisma.attendanceRecord.findMany({
            where: {
                attendanceDate: {
                    gte: startDateUtc.toDate(),
                    lte: endDateUtc.toDate()
                }
            },
            select: {
                userId: true,
                attendanceDate: true,
                shift: true,
                status: true
            }
        });

        const stats = [];
        let currentDate = viewStartDate.clone();

        for (let i = 0; i < daysDiff; i++) {
            const dateStr = currentDate.format('YYYY-MM-DD');
            const dayOfWeekIso = currentDate.isoWeekday(); // 1=Mon

            // Filter records for this specific DATE (comparing against UTC date string)
            const dayRecords = attendances.filter(a =>
                moment.utc(a.attendanceDate).format('YYYY-MM-DD') === dateStr
            );

            // Count explicit statuses from actual records
            let presentCount = dayRecords.filter(r => r.status === 'PRESENTE').length;
            let lateCount = dayRecords.filter(r => r.status === 'TARDE').length;
            let explicitAbsentCount = dayRecords.filter(r => r.status === 'FALTA').length;

            // Calculate IMPLIED absences (Scheduled but no record)
            let impliedAbsentCount = 0;
            const isPastOrToday = currentDate.isSameOrBefore(moment().tz(TIMEZONE), 'day');

            if (isPastOrToday) {
                for (const user of users) {
                    const userShifts = user.schedules.filter(s => s.dayOfWeek === dayOfWeekIso && s.isActive);

                    for (const shift of userShifts) {
                        // Check if this specific schedule was fulfilled
                        const hasRecord = dayRecords.some(r => r.userId === user.id && r.shift === shift.shift);
                        if (!hasRecord) {
                            impliedAbsentCount++;
                        }
                    }
                }
            }

            stats.push({
                date: dateStr,
                present: presentCount,
                late: lateCount,
                absent: explicitAbsentCount + impliedAbsentCount
            });

            currentDate.add(1, 'days');
        }

        res.json({ success: true, data: stats });

    } catch (error) {
        logger.error('Error in getRangeStats', { error: error.message, stack: error.stack });
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

        // Logic date
        const targetDateStr = String(date);
        // We use UTC for DB query to match @db.Date storage
        const startUtc = moment.utc(targetDateStr).startOf('day');
        const endUtc = moment.utc(targetDateStr).endOf('day');

        // For shift calculation, we use the weekday of the provided date
        const targetMoment = moment(targetDateStr);
        const dayOfWeekIso = targetMoment.isoWeekday();

        // 1. Get Users
        const users = await prisma.user.findMany({
            where: { isActive: true },
            include: { schedules: true },
            orderBy: { fullName: 'asc' }
        });

        // 2. Get Attendances
        const attendances = await prisma.attendanceRecord.findMany({
            where: {
                attendanceDate: {
                    gte: startUtc.toDate(),
                    lte: endUtc.toDate()
                }
            },
            include: { qr: { include: { location: true } } }
        });

        const report = [];

        for (const user of users) {
            const userShifts = user.schedules.filter(s => s.dayOfWeek === dayOfWeekIso && s.isActive);
            const processedShifts = new Set();

            // Add Scheduled Rows
            for (const s of userShifts) {
                processedShifts.add(s.shift);
                // Since we filtered by date range, we just look for user/shift overlap
                // But strictly speaking, we might want to double check the date string if 'attendances' has extra junk,
                // though the DB query should prevent that.
                const record = attendances.find(a => a.userId === user.id && a.shift === s.shift);

                let status = 'FALTA';
                let info = {};

                if (record) {
                    status = record.status;
                    info = {
                        id: record.id, // Add ID
                        check_in: record.checkInTime,
                        late_minutes: record.lateMinutes,
                        discount: record.discountAmount,
                        location: record.qr?.location?.name
                    };
                } else {
                    // If future, PENDIENTE
                    if (targetMoment.isAfter(moment().tz(TIMEZONE), 'day')) {
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

            // Check EXTRA records (not in processedShifts)
            const extraRecords = attendances.filter(a => a.userId === user.id && !processedShifts.has(a.shift));
            for (const record of extraRecords) {
                report.push({
                    userId: user.id,
                    fullName: user.fullName,
                    role: user.role,
                    shift: record.shift,
                    status: record.status,
                    extra: true,
                    id: record.id, // Add ID
                    check_in: record.checkInTime,
                    late_minutes: record.lateMinutes,
                    discount: record.discountAmount,
                    location: record.qr?.location?.name
                });
            }
        }

        res.json({ success: true, data: report });

    } catch (error) {
        logger.error('Error in getDailyDetail', { error: error.message, stack: error.stack });
        res.status(500).json({ error: 'INTERNAL_SERVER_ERROR' });
    }
}

/**
 * GET /api/reports/dashboard-stats
 * Returns: { usersCount: 10, presentToday: 5, lateToday: 2 }
 */
async function getDashboardStats(req, res) {
    try {
        const todayStart = moment().tz(TIMEZONE).startOf('day').toDate();
        const todayEnd = moment().tz(TIMEZONE).endOf('day').toDate();

        // 1. Total Active Users
        const usersCount = await prisma.user.count({
            where: { isActive: true }
        });

        // 2. Attendance Stats for Today
        // We use checkInTime presence to count as "Asistencia"
        // 'TARDE' is a status, but also counts as attendance.
        const attendancesToday = await prisma.attendanceRecord.findMany({
            where: {
                attendanceDate: {
                    gte: todayStart,
                    lte: todayEnd
                }
            },
            select: { status: true }
        });

        const presentToday = attendancesToday.length;
        const lateToday = attendancesToday.filter(a => a.status === 'TARDE').length;

        res.json({
            success: true,
            data: {
                usersCount,
                presentToday,
                lateToday
            }
        });

    } catch (error) {
        logger.error('Error in getDashboardStats', { error: error.message, stack: error.stack });
        res.status(500).json({ error: 'INTERNAL_SERVER_ERROR' });
    }
}

module.exports = {
    getRangeStats,
    getDailyDetail,
    getDashboardStats
};
