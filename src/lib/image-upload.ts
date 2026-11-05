// Identify uploaded images from their bytes, never from the client-supplied
// filename or Content-Type (both are attacker-controlled).

export type SniffedImage = { mimeType: "image/png" | "image/jpeg" | "image/webp"; ext: "png" | "jpg" | "webp" };

export const MAX_PROFILE_IMAGE_BYTES = 5 * 1024 * 1024;

export function sniffImage(bytes: Uint8Array): SniffedImage | null {
  if (bytes.length < 12) return null;
  const b = bytes;
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) {
    return { mimeType: "image/png", ext: "png" };
  }
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { mimeType: "image/jpeg", ext: "jpg" };
  const ascii = (from: number, to: number) => String.fromCharCode(...b.slice(from, to));
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return { mimeType: "image/webp", ext: "webp" };
  return null;
}
