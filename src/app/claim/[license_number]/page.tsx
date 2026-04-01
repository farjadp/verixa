import { getConsultantByLicense } from "@/lib/db";
import { notFound } from "next/navigation";
import { ShieldCheck, User, AlertCircle } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getCICCHint } from "@/actions/claim.actions";
import ClaimForm from "./ClaimForm";
import { Metadata } from "next";

export async function generateMetadata({
  params
}: {
  params: Promise<{ license_number: string }>
}): Promise<Metadata> {
  const { license_number } = await params;
  const data = getConsultantByLicense(license_number);
  return {
    title: data ? `Claim Profile — ${data.Full_Name} | Verixa` : "Claim Profile | Verixa",
  };
}

export default async function ClaimProfilePage({
  params
}: {
  params: Promise<{ license_number: string }>
}) {
  const { license_number } = await params;
  const data = getConsultantByLicense(license_number);
  if (!data) notFound();

  const isActive = data.Status?.toLowerCase()?.includes("active") || data.Status === "Yes";

  // Get masked CICC hints for UI
  const ciccHint = await getCICCHint(license_number);

  return (
    <div className="min-h-screen bg-[#F4F6F9] font-sans">
      <Header />

      <main className="max-w-xl mx-auto px-4 py-14">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-[#2FA4A9]/10 border border-[#2FA4A9]/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-6 h-6 text-[#2FA4A9]" />
          </div>
          <h1 className="text-3xl font-black font-serif text-[#0F172A] tracking-tight mb-2">Claim Your Profile</h1>
          <p className="text-gray-500 text-sm leading-relaxed">
            Verify your identity using your CICC-registered contact details.<br/>
            No unauthorized access is possible.
          </p>
        </div>

        {/* Profile snapshot */}
        <div className="bg-white border border-gray-100 rounded-3xl shadow-sm mb-6 overflow-hidden">
          <div className="bg-gradient-to-r from-[#0F2A44] to-[#163650] p-5 flex items-center gap-4">
            <div className="w-12 h-12 bg-white/10 border border-white/10 rounded-2xl flex items-center justify-center shrink-0">
              <User className="w-6 h-6 text-white/60" />
            </div>
            <div>
              <h2 className="text-white font-bold text-base">{data.Full_Name}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-white/50 text-xs font-mono">RCIC #{data.License_Number}</span>
                {isActive && (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 uppercase tracking-widest">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" /> Active
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* How it works */}
          <div className="p-5 border-b border-gray-50">
            <p className="text-[11px] font-black uppercase tracking-widest text-gray-400 mb-3">How Verification Works</p>
            <div className="space-y-2.5">
              {[
                { step: "1", text: "Enter the email on your CICC profile", match: "Instant badge if it matches" },
                { step: "2", text: "Optional: verify your CICC phone number", match: "+1 trust badge" },
                { step: "3", text: "Set a password for your Verixa account", match: "" },
              ].map(({ step, text, match }) => (
                <div key={step} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#0F2A44] text-white text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">{step}</div>
                  <div>
                    <p className="text-sm text-gray-700 font-medium">{text}</p>
                    {match && <p className="text-[11px] text-[#2FA4A9] font-semibold mt-0.5">{match}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Disclaimers */}
          <div className="p-5 space-y-2">
            <p className="flex items-start gap-2 text-xs text-gray-400">
              <ShieldCheck className="w-3.5 h-3.5 text-gray-300 shrink-0 mt-0.5" />
              This does not change your official CICC registry data.
            </p>
            <p className="flex items-start gap-2 text-xs text-gray-400">
              <AlertCircle className="w-3.5 h-3.5 text-gray-300 shrink-0 mt-0.5" />
              Verixa may request additional ID verification if a mismatch is detected.
            </p>
          </div>
        </div>

        {/* The multi-step form */}
        <div className="bg-white border border-gray-100 rounded-3xl shadow-sm p-6">
          <ClaimForm
            licenseNumber={license_number}
            fullName={data.Full_Name}
            ciccHint={ciccHint}
          />
        </div>

      </main>

      <Footer />
    </div>
  );
}
