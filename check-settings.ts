import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const keys = await prisma.platformSetting.findMany();
  console.log("ALL PLATFORM SETTINGS DB KEYS:", keys.map(k => k.key));
}
main().catch(console.error).finally(() => prisma.$disconnect());
