import { CheckCircle2, ArrowRight } from "lucide-react";
import Link from "next/link";
import { stripe } from "@/lib/stripe";

export const metadata = { title: "Upgrade Successful" };

export default async function UpgradeSuccessPage({ searchParams }: { searchParams: { session_id?: string } }) {
  let isSuccess = false;
  
  if (searchParams.session_id) {
    try {
      const session = await stripe.checkout.sessions.retrieve(searchParams.session_id);
      if (session.payment_status === "paid") {
        isSuccess = true;
      }
    } catch (e) {
      console.error("Error retrieving Stripe session:", e);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
        <CheckCircle2 className="w-10 h-10 text-green-600" />
      </div>
      <h1 className="text-3xl font-black text-[#0F2A44] mb-4">
        {isSuccess ? "Upgrade Successful!" : "Processing Upgrade..."}
      </h1>
      <p className="text-gray-500 mb-8 max-w-md mx-auto">
        {isSuccess 
          ? "Welcome to your new plan. Your enhanced visibility, analytics, and booking features are now immediately active." 
          : "We received your payment and are currently activating your new plan. Please check back in a few minutes."}
      </p>
      <Link href="/dashboard" className="bg-[#0F2A44] text-white px-8 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-black transition-colors">
        Return to Dashboard <ArrowRight className="w-5 h-5" />
      </Link>
    </div>
  );
}
