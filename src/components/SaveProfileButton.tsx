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
    } catch (e: unknown) {
      if (e instanceof Error && e.message.includes("logged in")) {
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
      type="button"
      onClick={handleToggle}
      disabled={isLoading}
      aria-pressed={isSaved}
      className={`flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border px-6 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-70 ${
        isSaved
          ? "border-navy bg-navy text-white hover:bg-ink"
          : "border-gray-300 bg-white text-navy hover:border-navy"
      }`}
    >
      <Bookmark className={`h-4 w-4 ${isSaved ? "fill-current" : ""}`} aria-hidden="true" />
      {isLoading ? "Saving..." : isSaved ? "Saved" : "Save profile"}
    </button>
  );
}
