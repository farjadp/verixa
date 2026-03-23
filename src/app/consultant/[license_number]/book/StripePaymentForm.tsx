"use client";

import { useState } from "react";
import { useStripe, useElements, PaymentElement } from "@stripe/react-stripe-js";
import { AlertCircle, Lock } from "lucide-react";

export default function StripePaymentForm({ 
  onSuccess, 
  priceCents 
}: { 
  onSuccess: (paymentIntentId: string) => void;
  priceCents: number;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);
    setError(null);

    // Confirm the card payment (which executes the 'manual' hold because the PI is configured this way)
    const { error: submitError, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });

    if (submitError) {
      setError(submitError.message || "An error occurred with your payment.");
      setIsProcessing(false);
    } else if (paymentIntent && paymentIntent.status === "requires_capture") {
      // Hold is successful! Pass the ID back to the main form to finalize the DB Booking.
      onSuccess(paymentIntent.id);
    } else {
      setError("Unexpected payment status. Please try again or contact support.");
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="mb-6 p-4 bg-white border border-gray-100 rounded-2xl shadow-sm">
        <PaymentElement />
      </div>

      {error && (
        <div className="mb-4 p-4 rounded-xl border border-red-200 bg-red-50 text-red-600 text-sm flex items-start gap-2 font-medium">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={isProcessing || !stripe}
        className="w-full mt-2 bg-[#1A1A1A] text-white px-8 py-3.5 rounded-xl font-bold shadow-xl shadow-black/10 hover:bg-black transition-all flex items-center justify-center gap-2 disabled:bg-gray-400"
      >
        <Lock className="w-4 h-4" />
        {isProcessing ? "Authorizing Card..." : `Reserve via Escrow • $${(priceCents / 100).toFixed(2)} CAD`}
      </button>
      <p className="text-center text-xs text-gray-400 mt-4 flex items-center justify-center gap-1">
        <Lock className="w-3 h-3" /> Secure Escrow Hold. No funds are drawn until the consultant accepts your request.
      </p>
    </form>
  );
}
