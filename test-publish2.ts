import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const jobId = "cmnhswbz4000c4c5zpyvq3pl4";
  const job = await prisma.socialJob.findUnique({
    where: { id: jobId },
    include: { blogPost: true } // blogPost is correctly matched based on schema
  });
  
  if (!job) {
    console.log("Job not found");
    return;
  }
  
  // LinkedIn Test
  const dbToken = await prisma.platformSetting.findUnique({ where: { key: "linkedin_access_token" } });
  const accessToken = dbToken?.value || process.env.LINKEDIN_ACCESS_TOKEN;
  const orgId = (await prisma.platformSetting.findUnique({ where: { key: "linkedin_org_id" } }))?.value
    || process.env.LINKEDIN_ORGANIZATION_ID;

  if (!accessToken) {
    console.log("LINKEDIN: NO ACCESS TOKEN");
  } else if (!orgId) {
    console.log("LINKEDIN: NO ORG ID");
  } else {
    console.log("LINKEDIN: HAS BOTH");
  }
  
  // Facebook Test
  const fbToken = await prisma.platformSetting.findUnique({ where: { key: "facebook_page_token" } });
  const fbPageId = await prisma.platformSetting.findUnique({ where: { key: "facebook_page_id" } });
  
  if (!fbToken?.value || !fbPageId?.value) {
    console.log("FACEBOOK: NOT CONNECTED");
  } else {
    console.log("FACEBOOK: CONNECTED");
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
