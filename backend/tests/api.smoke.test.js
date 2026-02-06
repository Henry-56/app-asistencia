/**
 * Smoke tests de API
 * Verifican que los endpoints principales responden correctamente
 */

const request = require('supertest');
const app = require('../server');

describe('API Smoke Tests', () => {
    test('GET /health - Status OK', async () => {
        const res = await request(app).get('/health');

        expect(res.status).toBe(200);
        expect(res.body.status).toBe('OK');
        expect(res.body.timestamp).toBeDefined();
    });

    test('POST /api/auth/login - Sin credenciales = 400', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({});

        expect(res.status).toBe(400);
        expect(res.body.error).toBe('MISSING_CODE');
    });

    test('POST /api/auth/login - Código inválido = 401', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ login_code: 'ZZZZ' });

        expect(res.status).toBe(401);
        expect(res.body.error).toBe('INVALID_CODE');
    });

    test('POST /api/attendance/scan - Sin auth = 401', async () => {
        const res = await request(app)
            .post('/api/attendance/scan')
            .send({ qr_token: 'test' });

        expect(res.status).toBe(401);
        expect(res.body.error).toBe('NO_TOKEN_PROVIDED');
    });

    test('GET /api/auth/me - Sin auth = 401', async () => {
        const res = await request(app).get('/api/auth/me');

        expect(res.status).toBe(401);
    });
});
