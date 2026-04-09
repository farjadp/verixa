import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const keys = ["linkedin_access_token", "facebook_page_token", "twitter_api_key"];
  const settings = await prisma.platformSetting.findMany({
    where: { key: { in: keys } },
  });
  console.log("Tokens present:", settings.map(s => s.key));
}
main().catch(console.error).finally(() => prisma.$disconnect());
