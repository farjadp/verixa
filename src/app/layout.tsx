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
  const defaultDesc = "Find, verify, and choose licensed immigration consultants (RCICs) in Canada.";
  const title = settings.seoTitle || "Verixa | Trusted Immigration Consultants";
  const description = settings.seoDescription || defaultDesc;

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.getverixa.com";

  return {
    metadataBase: new URL(baseUrl),
    title: {
      default: title,
      template: `%s | ${siteName}`,
    },
    description: description,
    openGraph: {
      title: title,
      description: description,
      siteName: siteName,
      images: settings.seoImage ? [{ url: `${baseUrl}/api/assets/logo?type=seo` }] : [],
    },
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
