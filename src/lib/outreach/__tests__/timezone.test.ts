import { describe, expect, it } from "vitest";
import { timezoneForProvince } from "../timezone";

describe("timezoneForProvince", () => {
  it("maps codes and full names, case-insensitively", () => {
    expect(timezoneForProvince("BC", "Canada")).toBe("America/Vancouver");
    expect(timezoneForProvince("british columbia", null)).toBe("America/Vancouver");
    expect(timezoneForProvince("Alberta", "CA")).toBe("America/Edmonton");
    expect(timezoneForProvince("sk", null)).toBe("America/Regina");
    expect(timezoneForProvince("Manitoba", "canada")).toBe("America/Winnipeg");
    expect(timezoneForProvince("ON", "Canada")).toBe("America/Toronto");
    expect(timezoneForProvince("Quebec", null)).toBe("America/Toronto");
    expect(timezoneForProvince("NS", null)).toBe("America/Halifax");
    expect(timezoneForProvince("Prince Edward Island", null)).toBe("America/Halifax");
    expect(timezoneForProvince("NL", null)).toBe("America/St_Johns");
    expect(timezoneForProvince("Yukon", null)).toBe("America/Whitehorse");
    expect(timezoneForProvince("NT", null)).toBe("America/Yellowknife");
    expect(timezoneForProvince("Nunavut", null)).toBe("America/Iqaluit");
  });

  it("returns null for non-Canada, unknown or missing province", () => {
    expect(timezoneForProvince("ON", "United States")).toBeNull();
    expect(timezoneForProvince("CA", "USA")).toBeNull();
    expect(timezoneForProvince("Texas", null)).toBeNull();
    expect(timezoneForProvince(null, "Canada")).toBeNull();
    expect(timezoneForProvince("", null)).toBeNull();
  });
});
