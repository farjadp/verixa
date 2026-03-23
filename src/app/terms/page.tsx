import { ShieldAlert } from "lucide-react";

export const metadata = {
  title: "Terms of Service | Verixa",
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#F5F7FA] py-20 font-sans">
      <div className="max-w-4xl mx-auto px-6 lg:px-8 mb-16">
        <div className="flex items-center gap-3 text-[#0F2A44] font-bold tracking-widest uppercase text-sm mb-4">
          <ShieldAlert className="w-5 h-5" />
          <span>Legal Infrastructure</span>
        </div>
        <h1 className="text-4xl lg:text-5xl font-black text-[#0F2A44] tracking-tight mb-6 font-serif">
          Terms of Service
        </h1>
        <p className="text-xl text-gray-500 font-medium">
          Verixa platform operating agreements and user obligations.
        </p>
      </div>

      <div className="max-w-4xl mx-auto px-6 lg:px-8">
        <div className="bg-white rounded-[2rem] shadow-xl shadow-gray-200/50 border border-gray-100 p-8 lg:p-14 text-gray-600 min-h-[400px] flex items-center justify-center">
          <p className="text-center font-bold text-gray-400">Section details pending legal review. Check back soon.</p>
        </div>
      </div>
    </main>
  );
}
