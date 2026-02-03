const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Genera un código único de 4 caracteres alfanuméricos
 */
function generateLoginCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 4; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

async function generateUniqueLoginCode() {
    let code;
    let isUnique = false;

    while (!isUnique) {
        code = generateLoginCode();
        const existing = await prisma.user.findUnique({
            where: { loginCode: code },
        });
        if (!existing) {
            isUnique = true;
        }
    }

    return code;
}

async function main() {
    console.log('🌱 Iniciando seed de la base de datos...');

    // Limpiar datos existentes
    await prisma.auditLog.deleteMany();
    await prisma.attendanceRecord.deleteMany();
    await prisma.userSchedule.deleteMany(); // Added this
    await prisma.qRCode.deleteMany();
    await prisma.location.deleteMany();
    await prisma.user.deleteMany();

    console.log('🗑️  Datos existentes eliminados');

    // 1. Crear ubicación (sede)
    const location = await prisma.location.create({
        data: {
            name: 'Huancayo - Junín',
            address: 'Jr. Tarapacá 561, Residencial El Sahara Dept. 603, Huancayo, Junín',
            latitude: -12.065881,  // Coordenadas aproximadas de Huancayo centro
            longitude: -75.204376,
            radiusMeters: 100,
            isActive: true,
        },
    });

    console.log('📍 Sede creada:', location.name);

    // 2. Crear usuario administrador
    const adminLoginCode = 'ADM1'; // Friendly Code
    const admin = await prisma.user.create({
        data: {
            email: 'admin@empresa.com',
            loginCode: adminLoginCode,
            fullName: 'Administrador Sistema',
            employeeCode: 'EMP-2026-0001',
            role: 'ADMIN',
            isActive: true,
        },
    });

    console.log('👤 Admin creado');
    console.log(`   Código de acceso: ${adminLoginCode}`);

    // 3. Crear colaboradores de prueba
    const colaboradores = [];
    // User 1 Fixed
    const colab1 = await prisma.user.create({
        data: {
            email: `colaborador1@empresa.com`,
            loginCode: 'COL1', // Friendly Code
            fullName: `Colaborador Ejemplo 1`,
            employeeCode: `EMP-2026-0002`,
            role: 'COLABORADOR',
            isActive: true,
        },
    });
    colaboradores.push({ name: colab1.fullName, code: colab1.loginCode });

    for (let i = 2; i <= 5; i++) {
        const loginCode = await generateUniqueLoginCode();
        const user = await prisma.user.create({
            data: {
                email: `colaborador${i}@empresa.com`,
                loginCode: loginCode,
                fullName: `Colaborador Ejemplo ${i}`,
                employeeCode: `EMP-2026-${String(i + 1).padStart(4, '0')}`,
                role: 'COLABORADOR',
                isActive: true,
            },
        });
        colaboradores.push({ name: user.fullName, code: loginCode });
    }

    console.log(`👥 ${colaboradores.length} colaboradores creados`);
    colaboradores.forEach(c => console.log(`   ${c.name}: ${c.code}`));

    // 4. Crear practicantes de prueba
    const practicantes = [];
    // Practitioner 1 Fixed
    const prac1 = await prisma.user.create({
        data: {
            email: `practicante1@empresa.com`,
            loginCode: 'PRA1', // Friendly Code
            fullName: `Practicante Ejemplo 1`,
            employeeCode: `EMP-2026-0007`,
            role: 'PRACTICANTE',
            isActive: true,
        },
    });
    practicantes.push({ name: prac1.fullName, code: prac1.loginCode });

    for (let i = 2; i <= 3; i++) {
        const loginCode = await generateUniqueLoginCode();
        const user = await prisma.user.create({
            data: {
                email: `practicante${i}@empresa.com`,
                loginCode: loginCode,
                fullName: `Practicante Ejemplo ${i}`,
                employeeCode: `EMP-2026-${String(i + 6).padStart(4, '0')}`,
                role: 'PRACTICANTE',
                isActive: true,
            },
        });
        practicantes.push({ name: user.fullName, code: loginCode });
    }

    console.log(`🎓 ${practicantes.length} practicantes creados`);
    practicantes.forEach(p => console.log(`   ${p.name}: ${p.code}`));

    console.log('\n✅ Seed completado exitosamente!');
    console.log('\n📋 Códigos de acceso (4 dígitos):');
    console.log(`\nAdmin: ${adminLoginCode}`);
    console.log('\nColaboradores:');
    colaboradores.forEach(c => console.log(`  ${c.name}: ${c.code}`));
    console.log('\nPracticantes:');
    practicantes.forEach(p => console.log(`  ${p.name}: ${p.code}`));
    console.log('\n💡 Usa estos códigos de 4 dígitos para hacer login (sin email ni password)');
}

main()
    .catch((e) => {
        console.error('❌ Error en seed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
