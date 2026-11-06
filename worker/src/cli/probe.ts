import { loadConfig } from "../config";
import { linkedinProbeChecks } from "../adapters/linkedin";
import { openContext } from "../browser";
import { runProbe } from "../probe";

/** Read-only selector check against the founder's logged-in session. Prints a pass/fail table. */
async function main(): Promise<void> {
  const site = process.argv[2];
  if (site !== "linkedin") {
    console.error("usage: npm run probe -- linkedin");
    process.exit(1);
  }
  const cfg = loadConfig(process.env);
  const ctx = await openContext(cfg.profileDir);
  try {
    const page = ctx.pages()[0] ?? (await ctx.newPage());
    const { ok, text } = await runProbe(linkedinProbeChecks(page));
    console.log(text);
    process.exitCode = ok ? 0 : 2;
  } finally {
    await ctx.close();
  }
}

main().catch((e) => {
  console.error((e as Error).message);
  process.exit(1);
});
