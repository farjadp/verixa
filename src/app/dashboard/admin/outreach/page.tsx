import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/authOptions";
import { getOutreachDashboard } from "@/actions/outreach.actions";
import OutreachDashboardClient from "./OutreachDashboardClient";

export const dynamic = "force-dynamic";

export default async function AdminOutreachPage() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as { role?: string }).role !== "ADMIN") redirect("/login");
  const data = await getOutreachDashboard();
  return <OutreachDashboardClient initial={data} />;
}
