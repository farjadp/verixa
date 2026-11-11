import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Tripwire: the only code allowed to type or press keys in a site is invite / sendMessage.
// If this fails after an edit, review that the new write is inside one of those methods and update the numbers.
function stripComments(s: string): string {
  return s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}
const src = (f: string) => stripComments(readFileSync(new URL(`./${f}`, import.meta.url), "utf8"));

function methodBody(code: string, name: string): string {
  const start = code.search(new RegExp(`\\b${name}\\(`));
  expect(start, `${name} exists`).toBeGreaterThan(-1);
  const open = code.indexOf("{", code.indexOf(")", start));
  let depth = 0;
  for (let i = open; i < code.length; i++) {
    if (code[i] === "{") depth++;
    if (code[i] === "}" && --depth === 0) return code.slice(open, i + 1);
  }
  throw new Error("unbalanced");
}

const WRITE = /\.(fill|type|press|pressSequentially|check|selectOption|setInputFiles|dragTo)\(|keyboard\./g;

describe("write actions are confined", () => {
  it("linkedin: fill/type/press only inside invite and sendMessage", () => {
    const code = src("linkedin.ts");
    const total = (code.match(WRITE) ?? []).length;
    const allowed = ["invite", "sendMessage"].reduce((n, m) => n + (methodBody(code, m).match(WRITE) ?? []).length, 0);
    expect(total).toBe(allowed);
    expect(total).toBe(2);
  });

  it("linkedin: the Send button is clicked only inside invite and sendMessage", () => {
    const code = src("linkedin.ts");
    const sendClicks = (s: string) => (s.match(/\bsend\.click\(/g) ?? []).length;
    expect(sendClicks(code)).toBe(sendClicks(methodBody(code, "invite")) + sendClicks(methodBody(code, "sendMessage")));
    expect(sendClicks(code)).toBe(2);
  });

  it("x: fill only inside sendMessage, Send clicked only there, invite unsupported", () => {
    const code = src("x.ts");
    const total = (code.match(WRITE) ?? []).length;
    expect(total).toBe((methodBody(code, "sendMessage").match(WRITE) ?? []).length);
    expect(total).toBe(1);
    expect((code.match(/\bsend\.click\(/g) ?? []).length).toBe(1);
    expect(methodBody(code, "sendMessage")).toContain("send.click(");
    expect(code).toContain("X has no connection invites");
  });

  it("x probe checks never write or click", () => {
    const code = src("x.ts");
    const probe = code.slice(code.indexOf("export function xProbeChecks"));
    expect(probe.match(WRITE)).toBeNull();
    expect(probe).not.toMatch(/\.click\(/);
  });

  it("linkedin probe checks never write", () => {
    const code = src("linkedin.ts");
    const probe = code.slice(code.indexOf("export function linkedinProbeChecks"));
    expect(probe.match(WRITE)).toBeNull();
    expect(probe).not.toMatch(/\.click\(/);
  });
});
