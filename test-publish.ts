import { publishToLinkedIn, publishToFacebook } from "./src/actions/publish.actions";
import * as actions from "./src/actions/publish.actions";
import { PrismaClient } from "@prisma/client";

async function main() {
  actions.verifyAdmin = async () => {}; // Bypass authorization

  const res1 = await publishToLinkedIn("cmnhswbz4000c4c5zpyvq3pl4");
  console.log("LINKEDIN RESULT:", res1);
  
  const res2 = await publishToFacebook("cmnhswbz4000c4c5zpyvq3pl4");
  console.log("FACEBOOK RESULT:", res2);
}
main().catch(console.error);
