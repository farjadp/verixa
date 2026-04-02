import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const keys = ["linkedin_access_token", "linkedin_org_id"];
  const settings = await prisma.platformSetting.findMany({
    where: { key: { in: keys } },
  });
  console.log(settings);
}
main().catch(console.error).finally(() => prisma.$disconnect());
