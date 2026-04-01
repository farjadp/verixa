import { AlertCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";

export const metadata = { title: "Upgrade Cancelled" };

export default function UpgradeCancelPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
        <AlertCircle className="w-10 h-10 text-gray-500" />
      </div>
      <h1 className="text-3xl font-black text-[#0F2A44] mb-4">Upgrade Cancelled</h1>
      <p className="text-gray-500 mb-8 max-w-md mx-auto">
        Your payment process was cancelled and you haven't been charged. Feel free to upgrade whenever you're ready to unlock priority indexing and advanced tools.
      </p>
      <div className="flex gap-4">
        <Link href="/dashboard/billing" className="bg-[#0F2A44] text-white px-8 py-3 rounded-xl font-bold hover:bg-black transition-colors">
          Try Again
        </Link>
        <Link href="/dashboard" className="bg-white text-[#0F2A44] border-2 border-gray-200 px-8 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors">
          <ArrowLeft className="w-5 h-5" /> Dashboard
        </Link>
      </div>
    </div>
  );
}
