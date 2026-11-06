import { createInterface } from "node:readline/promises";
import { loadConfig } from "../config";
import { openContext, visit } from "../browser";

const SITES = { linkedin: "https://www.linkedin.com/login", x: "https://x.com/i/flow/login" } as const;

/** Opens the site in the worker's Chrome profile so the founder can sign in by hand. No credentials are read or stored by this code. */
async function main(): Promise<void> {
  const site = process.argv[2];
  if (site !== "linkedin" && site !== "x") {
    console.error("usage: npm run login -- linkedin|x");
    process.exit(1);
  }
  const cfg = loadConfig(process.env);
  const ctx = await openContext(cfg.profileDir);
  try {
    const page = ctx.pages()[0] ?? (await ctx.newPage());
    await visit(page, SITES[site]);
    console.log(`Sign in to ${site} in the Chrome window (including any 2FA). Press Enter here when you are on your home feed.`);
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    await rl.question("");
    rl.close();
  } finally {
    await ctx.close();
  }
  console.log("Session saved in the profile directory.");
}

main().catch((e) => {
  console.error((e as Error).message);
  process.exit(1);
});
