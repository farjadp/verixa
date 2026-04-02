import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const jobs = await prisma.socialJob.findMany({
    orderBy: { createdAt: "desc" },
    take: 1,
  });
  console.log("LinkedIn Status:", jobs[0].linkedinStatus);
  console.log("LinkedIn Error:", jobs[0].publishError);
}
main().catch(console.error).finally(() => prisma.$disconnect());
