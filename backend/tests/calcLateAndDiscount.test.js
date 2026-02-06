/**
 * Tests unitarios para cálculo de descuentos
 * CRÍTICO: Estos tests protegen la lógica de negocio más importante
 */

const calcLateAndDiscount = require('../src/utils/calcLateAndDiscount');
const moment = require('moment-timezone');

describe('Cálculo de Descuentos por Tardanza', () => {
    const TIMEZONE = 'America/Lima';

    test('0 minutos tarde = Sin descuento', () => {
        const checkIn = moment.tz('2026-02-06 09:00', TIMEZONE);
        const result = calcLateAndDiscount('AM', checkIn, 'COLABORADOR', '09:00');

        expect(result.lateMinutes).toBe(0);
        expect(result.discountAmount).toBe(0);
        expect(result.status).toBe('PRESENTE');
    });

    test('9 minutos tarde (tolerancia) = Sin descuento', () => {
        const checkIn = moment.tz('2026-02-06 09:09', TIMEZONE);
        const result = calcLateAndDiscount('AM', checkIn, 'COLABORADOR', '09:00');

        expect(result.lateMinutes).toBe(9);
        expect(result.discountAmount).toBe(0);
        expect(result.status).toBe('PRESENTE');
    });

    test('15 min tarde = S/5.00 (TIER_1)', () => {
        const checkIn = moment.tz('2026-02-06 09:15', TIMEZONE);
        const result = calcLateAndDiscount('AM', checkIn, 'COLABORADOR', '09:00');

        expect(result.lateMinutes).toBe(15);
        expect(result.discountAmount).toBe(5.00);
        expect(result.status).toBe('TARDE');
    });

    test('25 min tarde = S/10.00 (TIER_2)', () => {
        const checkIn = moment.tz('2026-02-06 09:25', TIMEZONE);
        const result = calcLateAndDiscount('AM', checkIn, 'COLABORADOR', '09:00');

        expect(result.lateMinutes).toBe(25);
        expect(result.discountAmount).toBe(10.00);
        expect(result.status).toBe('TARDE');
    });

    test('35 min tarde = S/13.00 (TIER_3)', () => {
        const checkIn = moment.tz('2026-02-06 09:35', TIMEZONE);
        const result = calcLateAndDiscount('AM', checkIn, 'COLABORADOR', '09:00');

        expect(result.lateMinutes).toBe(35);
        expect(result.discountAmount).toBe(13.00);
        expect(result.status).toBe('TARDE');
    });

    test('65 min tarde = S/23.00 (TIER_4)', () => {
        const checkIn = moment.tz('2026-02-06 10:05', TIMEZONE);
        const result = calcLateAndDiscount('AM', checkIn, 'COLABORADOR', '09:00');

        expect(result.lateMinutes).toBe(65);
        expect(result.discountAmount).toBe(23.00);
        expect(result.status).toBe('TARDE');
    });

    test('PRACTICANTE - Usa misma lógica que COLABORADOR', () => {
        const checkIn = moment.tz('2026-02-06 09:25', TIMEZONE);
        const result = calcLateAndDiscount('AM', checkIn, 'PRACTICANTE', '09:00');

        expect(result.lateMinutes).toBe(25);
        expect(result.discountAmount).toBe(10.00);
        expect(result.status).toBe('TARDE');
    });
});
