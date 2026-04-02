import { PrismaClient } from "@prisma/client";
import { publishToFacebook } from "./src/actions/publish.actions";
import * as actions from "./src/actions/publish.actions";

const prisma = new PrismaClient();

async function main() {
  actions.verifyAdmin = async () => {}; 
  await publishToFacebook("cmnhswbz4000c4c5zpyvq3pl4");
  
  const job = await prisma.socialJob.findUnique({
    where: { id: "cmnhswbz4000c4c5zpyvq3pl4" }
  });
  console.log("FACEBOOK STATUS:", job.facebookStatus);
}
main().catch(console.error).finally(() => prisma.$disconnect());
