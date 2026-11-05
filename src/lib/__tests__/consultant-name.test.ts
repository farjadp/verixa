import { describe, it, expect } from "vitest";
import { initials, firstNameOf } from "@/components/consultant/ConsultantAvatar";

describe("consultant name helpers", () => {
  it("skips leading punctuation from the register", () => {
    expect(initials(". Naritpal Singh")).toBe("NS");
    expect(firstNameOf(". Naritpal Singh")).toBe("Naritpal");
  });
  it("handles normal and accented names", () => {
    expect(initials("Émilie Tremblay")).toBe("ÉT");
    expect(firstNameOf("Brandon David Kirk Miller")).toBe("Brandon");
  });
  it("never returns empty initials", () => expect(initials("...")).toBe("?"));
});
