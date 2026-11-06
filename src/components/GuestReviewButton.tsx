"use client";

import { useState } from "react";
import { MessageSquarePlus } from "lucide-react";
import GuestReviewModal from "./GuestReviewModal";

export default function GuestReviewButton({ licenseNumber, consultantName }: { licenseNumber: string, consultantName: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex min-h-11 items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 text-sm font-bold text-navy transition-colors hover:border-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2"
      >
        <MessageSquarePlus className="h-4 w-4 text-teal" aria-hidden="true" />
        Leave a Review
      </button>

      {isOpen && (
        <GuestReviewModal 
          licenseNumber={licenseNumber} 
          consultantName={consultantName} 
          onClose={() => setIsOpen(false)} 
        />
      )}
    </>
  );
}
