// ============================================================================
// Hardware Source: src/app/disclaimer/page.tsx
// Route: /disclaimer
// Version: 1.0.0 — 2026-04-08
// Why: Legal/compliance route that defines policy boundaries, user obligations, and liability terms.
// Domain: Legal & Compliance
// Env / Identity: React Server Component
// Owner: Verixa Web
// Notes: Policy content page; changes should align with legal requirements and published policy versions.
// ============================================================================

import LegalPage from "@/components/legal/LegalPage";

export const metadata = {
  title: "Disclaimer | Verixa",
};

export default function DisclaimerPage() {
  return (
    <LegalPage
      current="/disclaimer" eyebrow="Legal" title="Legal Disclaimer"
      meta={<>Verixa platform operational boundaries and liability limitation.</>}
      bodyClassName="space-y-6"
    >
          <div className="bg-amber-50 border border-amber-100 p-6 rounded-2xl">
            <h3 className="text-lg font-bold text-amber-900 mb-2">Not Legal Advice</h3>
            <p className="text-[15px] text-amber-800 font-medium leading-relaxed">
              Verixa is an independent directory and technology platform and is not affiliated with the College of Immigration and Citizenship Consultants (CICC) or the Government of Canada. Information provided on this platform does not constitute legal or immigration advice. Users must independently verify the standing of any professional before engaging their services.
            </p>
          </div>
    </LegalPage>
  );
}
