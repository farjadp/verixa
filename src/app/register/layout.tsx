// Metadata-only layout: the page is a client component and cannot export metadata.
// Auth and utility pages stay out of search results (robots.txt allows the fetch so this is seen).
import type { Metadata } from "next";
import { noindexMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = noindexMetadata("Create an Account");

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
