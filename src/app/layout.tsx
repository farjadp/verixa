import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

import { prisma } from "@/lib/prisma";

export async function generateMetadata(): Promise<Metadata> {
  let settings: Record<string, string> = {};
  
  try {
    const raw = await prisma.platformSetting.findMany();
    settings = raw.reduce((acc, curr) => ({
      ...acc,
      [curr.key]: curr.value
    }), {} as Record<string, string>);
  } catch(e) {
    // Will safely fallback if db isn't available during build time
  }
  
  const siteName = settings.siteName || "Verixa";
  const defaultDesc = "Find, verify, and choose licensed immigration consultants (RCICs) in Canada.";
  const title = settings.seoTitle || "Verixa | Trusted Immigration Consultants";
  const description = settings.seoDescription || defaultDesc;

  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://www.getverixa.com"),
    title: {
      default: title,
      template: `%s | ${siteName}`,
    },
    description: description,
    openGraph: {
      title: title,
      description: description,
      siteName: siteName,
      images: settings.seoImage ? [{ url: settings.seoImage }] : [],
    },
    icons: settings.favicon ? {
      icon: settings.favicon
    } : undefined
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans bg-white">
        {children}
      </body>
    </html>
  );
}
