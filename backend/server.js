require('dotenv').config();

// Inicializar Sentry PRIMERO (antes de require express)
const { Sentry, initSentry } = require('./src/config/sentry');
const sentryConfig = initSentry();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const { generalLimiter } = require('./src/middleware/rateLimiter');

// Importar CRON jobs (se iniciarán automáticamente)
require('./src/jobs/absence-marker');

const app = express();

// Trust proxy for Render/Heroku/etc (needed for express-rate-limit behind reverse proxy)
app.set('trust proxy', 1);

// Middleware
app.use(helmet());
app.use(compression());

// CORS seguro - Restringir a dominios específicos
const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',')
    : ['http://localhost:5173'];
app.use(cors({
    origin: allowedOrigins,
    credentials: true
}));

// Sentry request handler (debe ir antes de las rutas)
if (sentryConfig.enabled) {
    app.use(Sentry.Handlers.requestHandler());
    app.use(Sentry.Handlers.tracingHandler());
}

app.use(express.json());
app.use(cookieParser());
app.use(generalLimiter);

// Log de requests en desarrollo
if (process.env.NODE_ENV === 'development') {
    app.use((req, res, next) => {
        console.log(`${req.method} ${req.path}`);
        next();
    });
}

// Rutas
app.use('/api/auth', require('./src/routes/auth.routes'));

app.use('/api/qr', require('./src/routes/qr.routes'));
app.use('/api/attendance', require('./src/routes/attendance.routes'));
app.use('/api/users', require('./src/routes/user.routes'));
app.use('/api/reports', require('./src/routes/report.routes'));

// Ruta de health check
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Ruta raíz
app.get('/', (req, res) => {
    res.status(200).json({
        message: 'API de Sistema de Asistencias con QR',
        version: '1.0.0'
    });
});

// Manejo de rutas no encontradas
app.use((req, res) => {
    res.status(404).json({ error: 'NOT_FOUND', message: 'Ruta no encontrada' });
});

// Sentry error handler (debe ir antes del error handler custom)
if (sentryConfig.enabled) {
    app.use(Sentry.Handlers.errorHandler());
}

// Manejo global de errores
app.use((err, req, res, next) => {
    const logger = require('./src/config/logger');
    logger.error('Error no manejado', {
        error: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method
    });

    // NO exponer detalles internos en producción
    const message = process.env.NODE_ENV === 'production'
        ? 'Error interno del servidor'
        : err.message;

    res.status(500).json({ error: 'INTERNAL_SERVER_ERROR', message });
});

const PORT = process.env.PORT || 3000;

// Solo iniciar servidor si se ejecuta directamente (no en tests)
if (require.main === module) {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
        console.log(`📅 Zona horaria: America/Lima`);
        console.log(`🔒 Modo: ${process.env.NODE_ENV || 'development'}`);
    });
}

// Exportar app para tests
module.exports = app;
