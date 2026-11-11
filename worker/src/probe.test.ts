import { describe, expect, it } from "vitest";
import { runProbe } from "./probe";

describe("runProbe", () => {
  it("passes, fails and prints a table", async () => {
    const r = await runProbe([
      { name: "logged in", run: async () => "feed ok" },
      { name: "search", run: async () => { throw new Error("no results region"); } },
    ]);
    expect(r.ok).toBe(false);
    expect(r.rows.map((x) => x.status)).toEqual(["PASS", "FAIL"]);
    expect(r.text).toContain("PASS");
    expect(r.text).toContain("no results region");
    expect(r.text).toContain("logged in");
  });

  it("is ok when everything passes", async () => {
    expect((await runProbe([{ name: "a", run: async () => {} }])).ok).toBe(true);
  });

  it("skips the rest after a checkpoint", async () => {
    const r = await runProbe([
      { name: "a", run: async () => { throw Object.assign(new Error("authwall"), { name: "CheckpointError" }); } },
      { name: "b", run: async () => "never" },
    ]);
    expect(r.rows.map((x) => x.status)).toEqual(["FAIL", "SKIP"]);
    expect(r.ok).toBe(false);
  });
});
