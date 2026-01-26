const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany({
        orderBy: { role: 'asc' }
    });
    console.log('--- ALL USERS ---');
    users.forEach(u => console.log(`[${u.role}] ${u.fullName}: ${u.loginCode}`));
    console.log('-----------------');
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
