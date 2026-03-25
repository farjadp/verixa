import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { redirect } from "next/navigation";
import { getEnrichments, getEnrichmentJobs } from "@/actions/enrichment.actions";
import EnrichmentDashboardClient from "./EnrichmentDashboardClient";

export default async function AdminEnrichmentPage() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "ADMIN") {
    redirect("/login");
  }

  const enrichments = await getEnrichments();
  const jobs = await getEnrichmentJobs();

  return <EnrichmentDashboardClient initialEnrichments={enrichments} initialJobs={jobs} />;
}
