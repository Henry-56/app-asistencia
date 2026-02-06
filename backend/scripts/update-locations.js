/**
 * Script para actualizar locations con radiusMeters realistas
 * Ejecutar: node scripts/update-locations.js
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateLocations() {
    try {
        console.log('🔍 Buscando locations existentes...');

        const locations = await prisma.location.findMany();

        if (locations.length === 0) {
            console.log('⚠️  No hay locations en la base de datos.');
            console.log('💡 Creando location de ejemplo en Lima Centro...');

            // Crear location de ejemplo si no existe ninguna
            const newLocation = await prisma.location.create({
                data: {
                    name: 'Oficina Principal - Lima',
                    address: 'Centro de Lima, Perú',
                    latitude: -12.0464,  // Plaza Mayor de Lima
                    longitude: -77.0428,
                    radiusMeters: 100,   // 100 metros de tolerancia
                    isActive: true
                }
            });

            console.log('✅ Location creada:', newLocation.name);
            console.log(`   ID: ${newLocation.id}`);
            console.log(`   Coordenadas: (${newLocation.latitude}, ${newLocation.longitude})`);
            console.log(`   Radio: ${newLocation.radiusMeters}m`);
        } else {
            console.log(`📍 Encontradas ${locations.length} location(s)`);
            console.log('\n🔧 Actualizando radiusMeters a 100m...\n');

            for (const location of locations) {
                const updated = await prisma.location.update({
                    where: { id: location.id },
                    data: { radiusMeters: 100 }
                });

                console.log(`✅ ${updated.name}`);
                console.log(`   ID: ${updated.id}`);
                console.log(`   Radio: ${location.radiusMeters}m → ${updated.radiusMeters}m`);
                console.log(`   Coordenadas: (${updated.latitude}, ${updated.longitude})`);
                console.log('');
            }
        }

        console.log('✅ Actualización completada exitosamente');

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

updateLocations();
