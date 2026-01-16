const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getAdminCode() {
    try {
        const admin = await prisma.user.findFirst({
            where: { role: 'ADMIN' }
        });

        if (admin) {
            console.log('\n======================');
            console.log('CÓDIGO DE ADMINISTRADOR');
            console.log('======================');
            console.log(`Nombre: ${admin.fullName}`);
            console.log(`Email: ${admin.email}`);
            console.log(`Código de acceso: ${admin.loginCode}`);
            console.log(`Código de empleado: ${admin.employeeCode}`);
            console.log('======================\n');
        } else {
            console.log('No se encontró usuario administrador. Ejecuta: npm run seed');
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

getAdminCode();
