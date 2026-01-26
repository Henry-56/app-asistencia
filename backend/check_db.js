const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    console.log('Checking for Admin user...');
    const admin = await prisma.user.findUnique({
        where: { loginCode: '03TF' }
    });
    console.log('Admin found:', admin);

    console.log('Checking all users:');
    const all = await prisma.user.findMany();
    all.forEach(u => console.log(`${u.fullName} - ${u.loginCode} - ${u.role}`));
}

check()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
