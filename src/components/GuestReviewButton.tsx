"use client";

import { useState } from "react";
import { MessageSquarePlus } from "lucide-react";
import GuestReviewModal from "./GuestReviewModal";

export default function GuestReviewButton({ licenseNumber, consultantName }: { licenseNumber: string, consultantName: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 text-sm font-bold text-[#2FA4A9] bg-[#2FA4A9]/10 hover:bg-[#2FA4A9] hover:text-white transition-all px-4 py-2 rounded-xl"
      >
        <MessageSquarePlus className="w-4 h-4" />
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
