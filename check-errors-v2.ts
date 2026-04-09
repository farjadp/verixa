import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function run() {
  const job = await prisma.socialJob.findFirst({
    orderBy: { updatedAt: "desc" },
  });
  console.log("JOB:", job?.id, "PUBLISHED AT:", job?.publishedAt);
  console.log("LINKEDIN STATUS:", job?.linkedinStatus);
  console.log("FACEBOOK STATUS:", job?.facebookStatus);
  console.log("TWITTER STATUS:", job?.twitterStatus);
  console.log("PUBLISH ERROR:", job?.publishError);

  const tokens = await prisma.platformSetting.findMany();
  console.log("TOKENS:");
  tokens.forEach(t => console.log(t.key, t.value.substring(0,20)));
}
run().catch(console.error).finally(() => prisma.$disconnect());
