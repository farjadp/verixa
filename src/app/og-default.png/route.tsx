// Route: /og-default.png — 1200×630 default share card (Open Graph / X).
// The logo files in /public/Brand are ~3.3:1 and get cropped by social cards.
// Note: next/og (Satori) only understands inline style objects, so this file
// uses them instead of Tailwind classes.
import { ImageResponse } from "next/og";

export const dynamic = "force-static";

const NAVY = "#0F2A44";
const TEAL = "#2FA4A9";
const LIGHT_TEAL = "#6FD1D6";

export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: `linear-gradient(135deg, ${NAVY} 0%, ${NAVY} 60%, #14465a 100%)`,
          color: "#F5F7FA",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", fontSize: 44, fontWeight: 700, letterSpacing: -1 }}>
          <div style={{ width: 18, height: 18, borderRadius: 9, background: TEAL, marginRight: 18 }} />
          Verixa
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 68, fontWeight: 700, lineHeight: 1.08, letterSpacing: -2, maxWidth: 980 }}>
            Find a licensed Canadian immigration consultant
          </div>
          <div style={{ fontSize: 30, marginTop: 28, color: LIGHT_TEAL }}>
            Every RCIC profile checked against the CICC public register
          </div>
        </div>
        <div style={{ fontSize: 26, color: "#B8C4D1" }}>getverixa.com</div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
