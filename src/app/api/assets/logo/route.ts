import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type"); // "header", "footer", "favicon", "seo"
  const ts = searchParams.get("ts"); // for cache busting
  
  let key = "";
  let defaultUrl = "";
  
  if (type === "header") {
    key = "headerLogo";
    defaultUrl = "/brand/Vertixa2.png";
  } else if (type === "footer") {
    key = "footerLogo";
    defaultUrl = "/brand/Vertixa3.png";
  } else if (type === "favicon") {
    key = "favicon";
    defaultUrl = "/favicon.ico";
  } else if (type === "seo") {
    key = "seoImage";
    // We don't have a default SEO image right now, but we can fallback to Verixa2
    defaultUrl = "/brand/Vertixa2.png";
  } else {
    // default to header
    key = "headerLogo";
    defaultUrl = "/brand/Vertixa2.png";
  }

  try {
    const setting = await prisma.platformSetting.findUnique({ where: { key } });
    
    if (!setting || !setting.value || !setting.value.startsWith("data:image/")) {
      return NextResponse.redirect(new URL(defaultUrl, request.url));
    }
    
    const matches = setting.value.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return NextResponse.redirect(new URL(defaultUrl, request.url));
    }
    
    const mimeType = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, "base64");
    
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": mimeType,
        "Cache-Control": "public, max-age=60, s-maxage=3600, stale-while-revalidate=86400",
      }
    });
  } catch (e) {
    console.error("Error serving dynamic asset:", e);
    return NextResponse.redirect(new URL(defaultUrl, request.url));
  }
}
