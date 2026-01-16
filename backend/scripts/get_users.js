const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const admin = await prisma.user.findFirst({
        where: { role: 'ADMIN' }
    });
    console.log('CODIGO_ADMIN_FINAL: ' + admin.loginCode);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
