/**
 * Servicio de caché en memoria
 * Mejora performance de reportes y consultas frecuentes
 */

const NodeCache = require('node-cache');
const logger = require('../config/logger');

// Cache con TTL de 5 minutos por defecto
const cache = new NodeCache({
    stdTTL: 300, // 5 minutos
    checkperiod: 60, // Verificar cada 60 segundos
    useClones: false // No clonar objetos (mejor performance)
});

/**
 * Obtener valor del cache
 */
function get(key) {
    try {
        const value = cache.get(key);
        if (value !== undefined) {
            logger.debug('Cache HIT', { key });
            return value;
        }
        logger.debug('Cache MISS', { key });
        return null;
    } catch (error) {
        logger.error('Error obteniendo del cache', { key, error: error.message });
        return null;
    }
}

/**
 * Guardar valor en cache
 */
function set(key, value, ttl = 300) {
    try {
        cache.set(key, value, ttl);
        logger.debug('Cache SET', { key, ttl });
        return true;
    } catch (error) {
        logger.error('Error guardando en cache', { key, error: error.message });
        return false;
    }
}

/**
 * Eliminar clave específica
 */
function del(key) {
    try {
        cache.del(key);
        logger.debug('Cache DEL', { key });
        return true;
    } catch (error) {
        logger.error('Error eliminando del cache', { key, error: error.message });
        return false;
    }
}

/**
 * Invalidar cache por patrón (ej: "stats_*")
 */
function invalidate(pattern) {
    try {
        const keys = cache.keys();
        const matchingKeys = keys.filter(k => k.startsWith(pattern.replace('*', '')));

        if (matchingKeys.length > 0) {
            cache.del(matchingKeys);
            logger.info('Cache invalidado', { pattern, keysDeleted: matchingKeys.length });
        }

        return matchingKeys.length;
    } catch (error) {
        logger.error('Error invalidando cache', { pattern, error: error.message });
        return 0;
    }
}

/**
 * Limpiar todo el cache
 */
function flush() {
    try {
        cache.flushAll();
        logger.info('Cache completamente limpiado');
        return true;
    } catch (error) {
        logger.error('Error limpiando cache', { error: error.message });
        return false;
    }
}

/**
 * Obtener estadísticas del cache
 */
function stats() {
    return cache.getStats();
}

module.exports = {
    get,
    set,
    del,
    invalidate,
    flush,
    stats
};
