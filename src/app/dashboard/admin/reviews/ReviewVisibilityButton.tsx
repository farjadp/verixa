"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setReviewVisibility } from "@/actions/admin-reviews.actions";

export default function ReviewVisibilityButton({ reviewId, status }: { reviewId: string; status: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const next = status === "PUBLISHED" ? "HIDDEN" : "PUBLISHED";

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (next === "HIDDEN" && !window.confirm("Hide this review from the consultant's public profile? You can restore it later.")) return;
          setError(null);
          start(async () => {
            const res = await setReviewVisibility(reviewId, next);
            if (!res.ok) setError(res.error);
            else router.refresh();
          });
        }}
        className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors disabled:opacity-50 ${
          next === "HIDDEN" ? "border border-gray-200 bg-white text-error hover:border-error" : "bg-navy text-white hover:bg-[#0a1e30]"
        }`}
      >
        {pending ? "Saving…" : next === "HIDDEN" ? "Hide" : "Publish"}
      </button>
      {error ? <span className="text-[11px] text-error">{error}</span> : null}
    </div>
  );
}
