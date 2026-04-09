import { getFacebookAuthUrl, getLinkedInAuthUrl } from "./src/actions/publish.actions";

async function run() {
  const fb = await getFacebookAuthUrl();
  console.log("FB URL:", fb);

  const li = await getLinkedInAuthUrl();
  console.log("LI URL:", li);
}
run().catch(console.error);
