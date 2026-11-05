// ============================================================================
// Route: /dashboard/admin/content-pipeline
// Why: Control surface for the automated content agent team — queue, stage
//      status, draft review (approve/reject), auto-publish + channel switches,
//      and manual runs.
// Security: ADMIN only. Data is loaded through an action that calls requireAdmin().
// ============================================================================
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/permissions";
import { getContentPipelineDashboard } from "@/actions/content-pipeline.actions";
import ContentPipelineClient from "./ContentPipelineClient";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // manual runs execute inside a server action

export default async function ContentPipelinePage() {
  try {
    await requireAdmin();
  } catch {
    redirect("/login");
  }
  const data = await getContentPipelineDashboard();

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto min-h-screen bg-gray-50/50">
      <ContentPipelineClient data={data} />
    </div>
  );
}
