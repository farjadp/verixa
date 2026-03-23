import { AlertTriangle } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata = {
  title: "Disclaimer | Verixa",
};

export default function DisclaimerPage() {
  return (
    <main className="min-h-screen bg-[#F5F7FA] font-sans">
      <Header />
      <div className="pt-32 pb-20">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 mb-16">
        <div className="flex items-center gap-3 text-amber-500 font-bold tracking-widest uppercase text-sm mb-4">
          <AlertTriangle className="w-5 h-5" />
          <span>Platform Advisory</span>
        </div>
        <h1 className="text-4xl lg:text-5xl font-black text-[#0F2A44] tracking-tight mb-6 font-serif">
          Legal Disclaimer
        </h1>
        <p className="text-xl text-gray-500 font-medium">
          Verixa platform operational boundaries and liability limitation.
        </p>
      </div>

      <div className="max-w-4xl mx-auto px-6 lg:px-8">
        <div className="bg-white rounded-[2rem] shadow-xl shadow-gray-200/50 border border-gray-100 p-8 lg:p-14 text-gray-600 min-h-[400px] flex flex-col justify-center space-y-6">
          <div className="bg-amber-50 border border-amber-100 p-6 rounded-2xl">
            <h3 className="text-lg font-bold text-amber-900 mb-2">Not Legal Advice</h3>
            <p className="text-[15px] text-amber-800 font-medium leading-relaxed">
              Verixa is an independent directory and technology platform and is not affiliated with the College of Immigration and Citizenship Consultants (CICC) or the Government of Canada. Information provided on this platform does not constitute legal or immigration advice. Users must independently verify the standing of any professional before engaging their services.
            </p>
          </div>
        </div>
      </div>
      </div>
      <Footer />
    </main>
  );
}
