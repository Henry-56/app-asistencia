const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkLocation() {
    const locations = await prisma.location.findMany();
    console.log(JSON.stringify(locations, null, 2));
    await prisma.$disconnect();
}

checkLocation();
