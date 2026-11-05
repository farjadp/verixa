import { describe, it, expect } from "vitest";
import { sniffImage } from "@/lib/image-upload";

const bytes = (...values: (number | string)[]) =>
  new Uint8Array(values.flatMap((v) => (typeof v === "string" ? [...v].map((c) => c.charCodeAt(0)) : [v])).concat(Array(16).fill(0)));

describe("sniffImage", () => {
  it("detects PNG", () => expect(sniffImage(bytes(0x89, "PNG", 0x0d, 0x0a, 0x1a, 0x0a))?.mimeType).toBe("image/png"));
  it("detects JPEG", () => expect(sniffImage(bytes(0xff, 0xd8, 0xff, 0xe0))?.mimeType).toBe("image/jpeg"));
  it("detects WebP", () => expect(sniffImage(bytes("RIFF", 0, 0, 0, 0, "WEBP"))?.mimeType).toBe("image/webp"));
  it("rejects HTML disguised as an image", () => expect(sniffImage(bytes("<html><script>"))).toBeNull());
  it("rejects SVG", () => expect(sniffImage(bytes('<svg xmlns="http://www.w3.org/2000/svg">'))).toBeNull());
  it("rejects tiny buffers", () => expect(sniffImage(new Uint8Array([0xff, 0xd8]))).toBeNull());
});
