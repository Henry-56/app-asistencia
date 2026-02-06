/**
 * Tests para cálculo de distancia GPS (Haversine)
 * CRÍTICO: Valida que el geofencing funciona correctamente
 */

const haversineDistance = require('../src/utils/haversine');

describe('Cálculo de Distancia GPS (Haversine)', () => {
    test('Misma ubicación = 0 metros', () => {
        const distance = haversineDistance(-12.0464, -77.0428, -12.0464, -77.0428);
        expect(distance).toBeCloseTo(0, 1);
    });

    test('100m de distancia aproximada', () => {
        // Lima centro: -12.0464, -77.0428
        // ~111m al norte: -12.0474, -77.0428
        const distance = haversineDistance(-12.0464, -77.0428, -12.0474, -77.0428);
        expect(distance).toBeGreaterThan(100);
        expect(distance).toBeLessThan(150);
    });

    test('Distancia dentro de radio permitido (100m)', () => {
        const officeLocation = { lat: -12.0464, lng: -77.0428 };
        const userLocation = { lat: -12.0469, lng: -77.0428 }; // ~55m

        const distance = haversineDistance(
            officeLocation.lat,
            officeLocation.lng,
            userLocation.lat,
            userLocation.lng
        );

        expect(distance).toBeLessThan(100); // Dentro del radio
    });

    test('Distancia fuera de radio permitido (100m)', () => {
        const officeLocation = { lat: -12.0464, lng: -77.0428 };
        const userLocation = { lat: -12.0484, lng: -77.0428 }; // ~222m

        const distance = haversineDistance(
            officeLocation.lat,
            officeLocation.lng,
            userLocation.lat,
            userLocation.lng
        );

        expect(distance).toBeGreaterThan(100); // Fuera del radio
    });

    test('Distancia muy grande (diferentes ciudades)', () => {
        const lima = { lat: -12.0464, lng: -77.0428 };
        const tokyo = { lat: 35.6762, lng: 139.6503 };

        const distance = haversineDistance(lima.lat, lima.lng, tokyo.lat, tokyo.lng);
        expect(distance).toBeGreaterThan(10000000); // >10,000 km
    });
});
