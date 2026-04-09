import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { prisma } from './src/lib/prisma';

async function main() {
  const jobs = await prisma.socialJob.findMany({
    orderBy: { createdAt: 'desc' },
    take: 3,
    select: {
      id: true,
      linkedinStatus: true,
      linkedinPostId: true,
      twitterStatus: true,
      twitterPostId: true,
      publishError: true,
    }
  });
  console.log("SOCIAL JOBS:", JSON.stringify(jobs, null, 2));

  const settings = await prisma.platformSetting.findMany({
    where: {
      key: { in: ["linkedin_org_id", "facebook_page_id", "facebook_page_name"] }
    }
  });
  console.log("PLATFORM SETTINGS:", JSON.stringify(settings, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
