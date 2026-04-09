import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
  const job = await prisma.socialJob.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { publishError: true, linkedinStatus: true, twitterStatus: true }
  });
  console.log(job);
}
run();
