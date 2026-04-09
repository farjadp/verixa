require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const logs = await prisma.systemLog.findMany({
    where: { action: { contains: "LINKEDIN" } },
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  console.log("LINKEDIN", JSON.stringify(logs, null, 2));
  
  const fbLogs = await prisma.systemLog.findMany({
    where: { action: { contains: "FACEBOOK" } },
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  console.log("FACEBOOK", JSON.stringify(fbLogs, null, 2));

  await prisma.$disconnect();
}
main();
