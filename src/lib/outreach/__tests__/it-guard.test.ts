import { describe, expect, it } from "vitest";
import { findLiveConflict, hostsInEnvText, normalizeHost } from "./it-guard";

describe("normalizeHost", () => {
  it("lowercases and strips -pooler so pooled and direct hosts of one endpoint compare equal", () => {
    expect(normalizeHost("postgresql://u:p@EP-cool-123-pooler.us-east-2.aws.neon.tech/db?sslmode=require")).toBe("ep-cool-123.us-east-2.aws.neon.tech");
    expect(normalizeHost("postgres://u:p@ep-cool-123.us-east-2.aws.neon.tech/db")).toBe("ep-cool-123.us-east-2.aws.neon.tech");
  });
  it("returns empty for garbage", () => expect(normalizeHost("not a url")).toBe(""));
});

describe("hostsInEnvText", () => {
  it("finds postgres URLs under any variable name, with export, quotes and comments around", () => {
    const text = [
      'DATABASE_URL="postgresql://u:p@ep-a-pooler.x.neon.tech/db"',
      "export DIRECT_URL='postgres://u:p@ep-a.x.neon.tech/db'",
      "POSTGRES_URL_NON_POOLING=postgresql://u:p@ep-b.x.neon.tech/db",
      "DATABASE_URL_UNPOOLED=postgresql://u:p@ep-c.x.neon.tech/db",
      "# DATABASE_URL=postgresql://u:p@ep-commented.x.neon.tech/db",
      "OTHER=https://example.com",
    ].join("\n");
    expect(hostsInEnvText(text).sort()).toEqual(["ep-a.x.neon.tech", "ep-a.x.neon.tech", "ep-b.x.neon.tech", "ep-c.x.neon.tech"].sort());
  });
});

describe("findLiveConflict", () => {
  const live = { ".env": 'DATABASE_URL="postgresql://u:p@ep-live-pooler.x.neon.tech/db"\nDIRECT_URL="postgresql://u:p@ep-live.x.neon.tech/db"' };
  it("passes for a different endpoint", () => {
    expect(findLiveConflict(["postgresql://u:p@ep-branch-pooler.x.neon.tech/db", "postgresql://u:p@ep-branch.x.neon.tech/db"], live, {})).toBeNull();
  });
  it("refuses the live host even via its pooler or direct twin", () => {
    expect(findLiveConflict(["postgresql://u:p@ep-live-pooler.x.neon.tech/db"], live, {})).toMatch(/\.env/);
    expect(findLiveConflict(["postgresql://u:p@ep-branch.x.neon.tech/db", "postgresql://u:p@ep-live.x.neon.tech/db"], live, {})).not.toBeNull();
  });
  it("also checks the live variables present in process.env, except OUTREACH_IT_*", () => {
    const env = { POSTGRES_URL: "postgresql://u:p@ep-envlive.x.neon.tech/db", OUTREACH_IT_DATABASE_URL: "postgresql://u:p@ep-branch.x.neon.tech/db" };
    expect(findLiveConflict(["postgresql://u:p@ep-envlive-pooler.x.neon.tech/db"], {}, env)).toMatch(/POSTGRES_URL/);
    expect(findLiveConflict(["postgresql://u:p@ep-branch.x.neon.tech/db"], {}, env)).toBeNull();
  });
  it("refuses an unparseable target", () => {
    expect(findLiveConflict(["nonsense"], {}, {})).toMatch(/parse/);
  });
});
