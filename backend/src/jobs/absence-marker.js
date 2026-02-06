/**
 * CRON Jobs para marcar faltas automáticas
 * Se ejecutan diariamente en horarios específicos
 */

const cron = require('node-cron');
const { markDailyAbsences } = require('../services/cronService');
const logger = require('../config/logger');

// Lunes a Viernes a las 10:15 AM (después de ventana AM que termina a las 10:00)
cron.schedule('15 10 * * 1-5', async () => {
    logger.info('🕐 CRON ejecutándose: Marcar faltas turno AM (L-V)');
    try {
        const result = await markDailyAbsences('AM');
        logger.info('🕐 CRON completado: Turno AM', result);
    } catch (error) {
        logger.error('🕐 CRON error: Turno AM', { error: error.message });
    }
}, {
    timezone: 'America/Lima'
});

// Lunes a Viernes a las 4:15 PM (después de ventana PM que termina a las 4:00)
cron.schedule('15 16 * * 1-5', async () => {
    logger.info('🕐 CRON ejecutándose: Marcar faltas turno PM (L-V)');
    try {
        const result = await markDailyAbsences('PM');
        logger.info('🕐 CRON completado: Turno PM', result);
    } catch (error) {
        logger.error('🕐 CRON error: Turno PM', { error: error.message });
    }
}, {
    timezone: 'America/Lima'
});

// Sábados a las 1:45 PM (después de ventana AM que termina a la 1:30)
cron.schedule('45 13 * * 6', async () => {
    logger.info('🕐 CRON ejecutándose: Marcar faltas sábado AM');
    try {
        const result = await markDailyAbsences('AM');
        logger.info('🕐 CRON completado: Sábado AM', result);
    } catch (error) {
        logger.error('🕐 CRON error: Sábado AM', { error: error.message });
    }
}, {
    timezone: 'America/Lima'
});

logger.info('✅ CRON Jobs inicializados correctamente');

module.exports = {}; // Export para que se ejecute al require
