// ============================================================================
// Hardware Source: src/app/layout.tsx
// Route: App Shell
// Version: 1.0.0 — 2026-04-08
// Why: Global document shell for site-wide metadata, fonts, and platform settings provider.
// Domain: Global App Shell
// Env / Identity: React Server Component
// Owner: Verixa Web
// Notes: Keep the shell lean; any failure here can affect the entire app tree, so DB reads need safe fallbacks.
// Critical Path: Every route depends on this shell for metadata and platform settings hydration.
// Primary Dependencies: Prisma settings table, global fonts, PlatformProvider, site asset routes.
// Failure Strategy: Default to static metadata and empty settings when DB reads fail.
// ============================================================================
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { cache } from "react";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

import { prisma } from "@/lib/prisma";
import { isDatabaseUnavailable, markDatabaseUnavailable } from "@/lib/db-availability";
import { PlatformProvider } from "@/components/providers/PlatformProvider";
import { PageViewTracker } from "@/components/analytics/PageViewTracker";
import { getSiteUrl } from "@/lib/content-pipeline/seo";

// Extracted fetching so we can reuse it
const getGlobalSettings = cache(async function getGlobalSettings() {
  let settings: Record<string, string> = {};
  if (isDatabaseUnavailable()) return settings;
  try {
    const raw = await prisma.platformSetting.findMany();
    settings = raw.reduce((acc, curr) => ({
      ...acc,
      [curr.key]: curr.value
    }), {} as Record<string, string>);
  } catch (error) {
    markDatabaseUnavailable(error);
    // build time fallback
  }
  return settings;
});

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getGlobalSettings();

  const siteName = settings.siteName || "Verixa";
  const defaultDesc = "Find and compare licensed Canadian immigration consultants (RCICs). Every profile is checked against the CICC public register.";
  const title = settings.seoTitle || "Verixa | Find a Licensed Canadian Immigration Consultant (RCIC)";
  const description = settings.seoDescription || defaultDesc;

  const baseUrl = getSiteUrl();
  // Admin-uploaded share image if set, else the generated 1200×630 card (src/app/og-default.png).
  const shareImage = settings.seoImage ? `${baseUrl}/api/assets/logo?type=seo` : `${baseUrl}/og-default.png`;

  return {
    metadataBase: new URL(baseUrl),
    applicationName: siteName,
    title: {
      default: title,
      // Page titles must NOT include the brand; this template appends it once.
      template: `%s | ${siteName}`,
    },
    description: description,
    openGraph: {
      type: "website",
      locale: "en_CA",
      title: title,
      description: description,
      siteName: siteName,
      images: [settings.seoImage ? { url: shareImage, alt: siteName } : { url: shareImage, width: 1200, height: 630, alt: siteName }],
    },
    twitter: {
      card: "summary_large_image",
      title: title,
      description: description,
      images: [shareImage],
    },
    formatDetection: { telephone: false, email: false, address: false },
    icons: settings.favicon ? {
      icon: `${baseUrl}/api/assets/logo?type=favicon`
    } : {
      icon: [
        { url: '/favicon-96x96.png', sizes: '96x96', type: 'image/png' },
        { url: '/favicon.svg', type: 'image/svg+xml' },
      ],
      shortcut: '/favicon.ico',
      apple: '/apple-touch-icon.png',
    },
    manifest: '/site.webmanifest'
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const settings = await getGlobalSettings();
  
  // Do not send massive base64 strings down to the client payload to prevent HTML bloat/crashing
  delete settings.headerLogo;
  delete settings.footerLogo;
  delete settings.favicon;
  delete settings.seoImage;

  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans bg-white">
        <PageViewTracker />
        <PlatformProvider settings={settings}>
          {children}
        </PlatformProvider>
      </body>
    </html>
  );
}
