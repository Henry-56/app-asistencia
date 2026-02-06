/**
 * Script de verificación pre-producción
 * Verifica que todas las configuraciones críticas estén correctas
 */

const fs = require('fs');
const path = require('path');

// Cargar variables de entorno
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

console.log('\n🔍 VERIFICACIÓN DE CONFIGURACIÓN PARA PRODUCCIÓN\n');
console.log('=' .repeat(60));

let criticalIssues = 0;
let warnings = 0;

// 1. Verificar que existe .env
console.log('\n📄 1. Verificando archivo .env...');
const envPath = path.join(__dirname, '..', '.env');
if (!fs.existsSync(envPath)) {
    console.error('   ❌ CRÍTICO: No existe archivo .env');
    criticalIssues++;
} else {
    console.log('   ✅ Archivo .env existe');
}

// 2. Verificar variables de entorno requeridas
console.log('\n🔐 2. Verificando variables de entorno...');
const requiredVars = [
    'DATABASE_URL',
    'JWT_SECRET',
    'JWT_EXPIRES_IN',
    'CORS_ORIGIN',
    'NODE_ENV',
    'GPS_ACCURACY_THRESHOLD_M'
];

requiredVars.forEach(varName => {
    if (!process.env[varName]) {
        console.error(`   ❌ CRÍTICO: Falta variable ${varName}`);
        criticalIssues++;
    } else {
        console.log(`   ✅ ${varName} configurado`);
    }
});

// 3. Verificar JWT_SECRET seguro
console.log('\n🔑 3. Verificando seguridad de JWT_SECRET...');
const jwtSecret = process.env.JWT_SECRET;
if (jwtSecret) {
    if (jwtSecret.length < 32) {
        console.error('   ❌ CRÍTICO: JWT_SECRET muy corto (mínimo 32 caracteres)');
        criticalIssues++;
    } else if (jwtSecret.includes('secret') || jwtSecret.includes('production') || jwtSecret.includes('change')) {
        console.error('   ⚠️  ADVERTENCIA: JWT_SECRET parece ser un placeholder, genera uno único');
        warnings++;
    } else if (jwtSecret.length < 64) {
        console.warn('   ⚠️  ADVERTENCIA: JWT_SECRET podría ser más seguro (recomendado: 128 chars)');
        warnings++;
    } else {
        console.log(`   ✅ JWT_SECRET parece seguro (${jwtSecret.length} caracteres)`);
    }
}

// 4. Verificar CORS
console.log('\n🌐 4. Verificando configuración CORS...');
const corsOrigin = process.env.CORS_ORIGIN;
if (!corsOrigin) {
    console.error('   ❌ CRÍTICO: CORS_ORIGIN no configurado');
    criticalIssues++;
} else if (corsOrigin === '*') {
    console.error('   ❌ CRÍTICO: CORS_ORIGIN es "*" (permitir todos los orígenes es inseguro)');
    criticalIssues++;
} else if (!corsOrigin.startsWith('http')) {
    console.error('   ❌ CRÍTICO: CORS_ORIGIN debe empezar con http:// o https://');
    criticalIssues++;
} else if (corsOrigin.endsWith('/')) {
    console.warn('   ⚠️  ADVERTENCIA: CORS_ORIGIN no debe terminar con "/"');
    warnings++;
} else {
    console.log(`   ✅ CORS_ORIGIN configurado: ${corsOrigin}`);
}

// 5. Verificar GPS threshold
console.log('\n📍 5. Verificando GPS threshold...');
const gpsThreshold = parseInt(process.env.GPS_ACCURACY_THRESHOLD_M || '0');
if (gpsThreshold > 500) {
    console.error(`   ❌ CRÍTICO: GPS_ACCURACY_THRESHOLD_M muy alto (${gpsThreshold}m) - permite fraude geográfico`);
    criticalIssues++;
} else if (gpsThreshold < 20) {
    console.warn(`   ⚠️  ADVERTENCIA: GPS_ACCURACY_THRESHOLD_M muy bajo (${gpsThreshold}m) - puede causar falsos negativos`);
    warnings++;
} else {
    console.log(`   ✅ GPS_ACCURACY_THRESHOLD_M razonable: ${gpsThreshold}m`);
}

// 6. Verificar NODE_ENV
console.log('\n⚙️  6. Verificando NODE_ENV...');
if (process.env.NODE_ENV === 'production') {
    console.log('   ✅ NODE_ENV = production (correcto para deploy)');
} else {
    console.warn(`   ⚠️  ADVERTENCIA: NODE_ENV = "${process.env.NODE_ENV}" (debería ser "production" en deploy)`);
    warnings++;
}

// 7. Verificar que existe logger.js
console.log('\n📝 7. Verificando configuración de logging...');
const loggerPath = path.join(__dirname, '..', 'src', 'config', 'logger.js');
if (!fs.existsSync(loggerPath)) {
    console.error('   ❌ CRÍTICO: No existe src/config/logger.js');
    criticalIssues++;
} else {
    console.log('   ✅ Logger configurado');
}

// 8. Verificar carpeta logs existe
console.log('\n📁 8. Verificando carpeta logs...');
const logsPath = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsPath)) {
    console.log('   ℹ️  Carpeta logs no existe, creando...');
    try {
        fs.mkdirSync(logsPath, { recursive: true });
        console.log('   ✅ Carpeta logs creada');
    } catch (err) {
        console.error('   ❌ Error creando carpeta logs:', err.message);
        criticalIssues++;
    }
} else {
    console.log('   ✅ Carpeta logs existe');
}

// 9. Verificar conexión a BD (opcional, puede fallar si no está corriendo)
console.log('\n🗄️  9. Verificando conexión a base de datos...');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
    try {
        await prisma.$connect();
        console.log('   ✅ Conexión a base de datos exitosa');

        // Verificar que existen locations
        const locations = await prisma.location.findMany();
        if (locations.length === 0) {
            console.warn('   ⚠️  ADVERTENCIA: No hay locations configuradas');
            warnings++;
        } else {
            console.log(`   ✅ ${locations.length} location(s) encontrada(s)`);

            // Verificar radiusMeters
            locations.forEach(loc => {
                if (loc.radiusMeters > 1000) {
                    console.warn(`   ⚠️  ADVERTENCIA: Location "${loc.name}" tiene radio muy alto (${loc.radiusMeters}m)`);
                    warnings++;
                } else {
                    console.log(`   ✅ Location "${loc.name}": radio ${loc.radiusMeters}m`);
                }
            });
        }

        await prisma.$disconnect();
    } catch (error) {
        console.error('   ❌ Error conectando a BD:', error.message);
        console.log('   ℹ️  (Este error es esperado si la BD no está disponible localmente)');
    }

    // RESUMEN FINAL
    console.log('\n' + '='.repeat(60));
    console.log('\n📊 RESUMEN DE VERIFICACIÓN\n');

    if (criticalIssues === 0 && warnings === 0) {
        console.log('   🎉 ¡TODO PERFECTO! Listo para producción');
        console.log('\n   Próximos pasos:');
        console.log('   1. Configurar variables en Render/Vercel');
        console.log('   2. Desplegar backend a Render');
        console.log('   3. Desplegar frontend a Vercel');
        console.log('   4. Ejecutar verificación manual (PRE-LAUNCH-CHECKLIST.md)');
        process.exit(0);
    } else if (criticalIssues === 0) {
        console.log(`   ⚠️  ${warnings} advertencia(s) encontrada(s)`);
        console.log('\n   Puedes proceder con el deploy, pero revisa las advertencias.');
        process.exit(0);
    } else {
        console.log(`   ❌ ${criticalIssues} problema(s) CRÍTICO(S) encontrado(s)`);
        console.log(`   ⚠️  ${warnings} advertencia(s) encontrada(s)`);
        console.log('\n   NO DESPLEGAR hasta resolver los problemas críticos.');
        process.exit(1);
    }
})();
