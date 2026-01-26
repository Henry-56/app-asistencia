const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const prac = await prisma.user.findFirst({ where: { role: 'PRACTICANTE' } });
    const colab = await prisma.user.findFirst({ where: { role: 'COLABORADOR' } });
    const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });

    console.log(`CODE_ADMIN=${admin?.loginCode || ''}`);
    console.log(`CODE_PRAC=${prac?.loginCode || ''}`);
    console.log(`CODE_COLAB=${colab?.loginCode || ''}`);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
