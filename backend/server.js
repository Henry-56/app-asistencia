require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { generalLimiter } = require('./src/middleware/rateLimiter');

// Importar CRON jobs (se iniciarán automáticamente)
// require('./src/jobs/absence-marker');

const app = express();

// Middleware
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());
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

// Manejo global de errores
app.use((err, req, res, next) => {
    console.error('Error no manejado:', err);
    res.status(500).json({ error: 'INTERNAL_SERVER_ERROR', message: err.message });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
    console.log(`📅 Zona horaria: America/Lima`);
    console.log(`🔒 Modo: ${process.env.NODE_ENV || 'development'}`);
});
