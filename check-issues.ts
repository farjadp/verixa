import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const job = await prisma.socialJob.findFirst({
    orderBy: { updatedAt: "desc" },
  });
  console.log("JOB STATUS:", job?.status);
  console.log("LINKEDIN STATUS:", job?.linkedinStatus);
  console.log("FACEBOOK STATUS:", job?.facebookStatus);
  console.log("TWITTER STATUS:", job?.twitterStatus);
  console.log("PUBLISH ERROR:", job?.publishError);

  const tokens = await prisma.platformSetting.findMany();
  console.log("TOKENS:");
  tokens.forEach(t => console.log(t.key, t.value.substring(0,20)));
}
main().catch(console.error).finally(() => prisma.$disconnect());
