
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCodes() {
    try {
        const users = await prisma.user.findMany({
            select: {
                fullName: true,
                role: true,
                loginCode: true,
                employeeCode: true
            }
        });
        console.log('--- LOGIN CODES ---');
        console.log(users.map(u => `${u.role}: ${u.loginCode} (${u.fullName})`).join('\n'));
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

checkCodes();
