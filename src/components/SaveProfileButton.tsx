"use client";

import { useState } from "react";
import { Bookmark } from "lucide-react";
import { toggleSaveProfile } from "@/actions/savedProfiles.actions";
import { useRouter } from "next/navigation";

export default function SaveProfileButton({ 
  licenseNumber, 
  initialIsSaved,
  variant = "hero" // "hero" | "card"
}: { 
  licenseNumber: string; 
  initialIsSaved: boolean;
  variant?: "hero" | "card";
}) {
  const [isSaved, setIsSaved] = useState(initialIsSaved);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleToggle = async () => {
    setIsLoading(true);
    try {
      const newState = await toggleSaveProfile(licenseNumber);
      setIsSaved(newState);
      // Let server revalidation handle background refresh
    } catch (e: any) {
      if (e.message.includes("logged in")) {
        router.push("/login?callbackUrl=/consultant/" + licenseNumber);
      } else {
        alert("Failed to save profile. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (variant === "card") {
    return (
      <button 
        onClick={handleToggle}
        disabled={isLoading}
        className={`absolute top-4 right-4 shadow-sm border rounded-full p-2 transition-all ${isSaved ? 'bg-[#2FA4A9] text-white border-[#2FA4A9]' : 'bg-white text-gray-400 border-gray-100 hover:text-[#2FA4A9]'}`}
        title={isSaved ? "Saved Profile" : "Save Profile"}
      >
         <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''} ${isLoading ? 'opacity-50' : ''}`} />
      </button>
    );
  }

  return (
    <button 
      onClick={handleToggle}
      disabled={isLoading}
      className={`w-full md:w-auto px-6 py-3.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2 border shadow-sm ${
        isSaved 
          ? "bg-[#2FA4A9] text-white border-[#2FA4A9] hover:bg-[#258d92]" 
          : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:border-[#2FA4A9]/30"
      }`}
    >
      <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
      {isLoading ? "Saving..." : isSaved ? "Saved" : "Save Profile"}
    </button>
  );
}
