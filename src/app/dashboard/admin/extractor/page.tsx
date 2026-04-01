import { Metadata } from 'next';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { redirect } from "next/navigation";
import ExtractorClient from "./ExtractorClient";

export const metadata: Metadata = {
  title: 'Lead Extraction | Verixa Admin',
  description: 'Extract and analyze unified registry data streams.',
};

export default async function AdminExtractorPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    redirect("/login");
  }

  return <ExtractorClient />;
}
