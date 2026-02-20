/**
 * Configuración de Sentry para monitoring y error tracking
 *
 * Para activar Sentry:
 * 1. Crear cuenta en https://sentry.io
 * 2. Crear proyecto "asistencia-backend"
 * 3. Copiar DSN y agregarlo a .env: SENTRY_DSN=https://...
 * 4. Descomentar líneas en server.js
 */

const Sentry = require("@sentry/node");

let nodeProfilingIntegration;
try {
    nodeProfilingIntegration = require("@sentry/profiling-node").nodeProfilingIntegration;
} catch (e) {
    console.log('ℹ️  @sentry/profiling-node no disponible (bindings nativos no compilados)');
}

/**
 * Inicializar Sentry
 * Solo se activa si SENTRY_DSN está configurado
 */
function initSentry() {
    const dsn = process.env.SENTRY_DSN;

    if (!dsn) {
        console.log('ℹ️  Sentry no configurado (SENTRY_DSN no existe)');
        return { enabled: false };
    }

    try {
        Sentry.init({
            dsn,
            environment: process.env.NODE_ENV || 'development',

            // Performance Monitoring
            tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0, // 10% en prod, 100% en dev

            // Profiling
            profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
            integrations: nodeProfilingIntegration
                ? [nodeProfilingIntegration()]
                : [],

            // Configuración adicional
            beforeSend(event) {
                // No enviar errores de validación (400)
                if (event.exception && event.exception.values) {
                    const firstException = event.exception.values[0];
                    if (firstException.type === 'VALIDATION_ERROR') {
                        return null; // No enviar a Sentry
                    }
                }
                return event;
            },
        });

        console.log('✅ Sentry inicializado correctamente');
        return { enabled: true };
    } catch (error) {
        console.error('❌ Error inicializando Sentry:', error.message);
        return { enabled: false };
    }
}

module.exports = {
    Sentry,
    initSentry
};
