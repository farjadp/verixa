import { NextResponse } from "next/server";
import { generateBackup } from "@/actions/backup.actions";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  
  // Vercel Cron sends a Bearer token matching CRON_SECRET automatically
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized Scheduled Trigger", { status: 401 });
  }

  try {
    const result = await generateBackup(process.env.CRON_SECRET);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
