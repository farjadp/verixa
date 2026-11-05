import { describe, expect, it } from "vitest";
import nextConfig from "../../next.config";

describe("legacy unsubscribe redirect", () => {
  it("sends /unsubscribe?token=... to the API with a temporary redirect, but not the status page", async () => {
    const rules = (await nextConfig.redirects?.()) ?? [];
    const rule = rules.find((r) => r.source === "/unsubscribe");
    expect(rule).toMatchObject({ destination: "/api/unsubscribe", permanent: false });
    expect(rule?.has).toEqual([{ type: "query", key: "token" }]);
  });
});
