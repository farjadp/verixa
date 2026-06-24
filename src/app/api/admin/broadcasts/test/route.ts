import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Resend } from "resend";
import { authOptions } from "@/lib/authOptions";
import { buildExactEmailPayload, buildPlainTextEmail } from "@/lib/emailTemplate";
import { buildUnsubscribeUrl } from "@/lib/unsubscribe";

const resend = new Resend(process.env.RESEND_API_KEY || "re_missing_api_key");
const senderEmail =
  process.env.RESEND_BROADCAST_FROM_EMAIL ||
  process.env.RESEND_FROM_EMAIL ||
  "notifications@getverixa.com";
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function buildBroadcastHeaders(unsubscribeUrl: string) {
  return {
    "List-Unsubscribe": `<${unsubscribeUrl}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Unauthorized: Admin access required" }, { status: 401 });
    }

    const body = await request.json();
    const targetEmail = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const subject = typeof body?.subject === "string" ? body.subject.trim() : "";
    const htmlContent = typeof body?.htmlContent === "string" ? body.htmlContent.trim() : "";

    if (!emailPattern.test(targetEmail)) {
      return NextResponse.json({ success: false, error: "Please enter a valid test email address." }, { status: 400 });
    }
    if (!subject) {
      return NextResponse.json({ success: false, error: "Subject is required." }, { status: 400 });
    }
    if (!htmlContent) {
      return NextResponse.json({ success: false, error: "Email body is required." }, { status: 400 });
    }
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ success: false, error: "RESEND_API_KEY is not configured on the server." }, { status: 500 });
    }

    const emailPayload = await buildExactEmailPayload(htmlContent);
    const result = await resend.emails.send({
      from: `Verixa Network <${senderEmail}>`,
      to: [targetEmail],
      subject: `[TEST] ${subject}`,
      html: emailPayload.html,
      text: buildPlainTextEmail(emailPayload.html, buildUnsubscribeUrl(targetEmail)),
      headers: buildBroadcastHeaders(buildUnsubscribeUrl(targetEmail)),
      attachments: emailPayload.attachments,
    });

    if (result.error) {
      console.error("[Broadcast Test Email API] Resend API error:", result.error);
      return NextResponse.json({ success: false, error: result.error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[Broadcast Test Email API] Failed:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Test email failed on the server." },
      { status: 500 }
    );
  }
}
