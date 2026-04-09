"use client";

import { useState } from "react";
import { Sparkles, X, ChevronRight } from "lucide-react";
import { markNotificationAsRead } from "@/actions/notification.actions";
import { useRouter } from "next/navigation";

interface Announcement {
  id: string;
  title: string;
  message: string;
  createdAt: Date;
}

export default function AnnouncementBanner({ announcement }: { announcement: Announcement }) {
  const [isVisible, setIsVisible] = useState(true);
  const [dismissing, setDismissing] = useState(false);
  const router = useRouter();

  if (!isVisible) return null;

  const handleDismiss = async () => {
    setDismissing(true);
    try {
      await markNotificationAsRead(announcement.id);
      setIsVisible(false);
      router.refresh();
    } catch (e) {
      console.error(e);
      setDismissing(false);
    }
  };

  return (
    <div className={`bg-[#0F2A44] border border-[#2FA4A9]/30 rounded-3xl p-6 shadow-xl relative overflow-hidden transition-all duration-500 ${dismissing ? "opacity-0 scale-95 origin-top" : "opacity-100 scale-100 text-white"}`}>
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-[#2FA4A9]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

      <div className="relative z-10 flex flex-col md:flex-row gap-6 items-start">
        <div className="shrink-0 w-12 h-12 bg-[#2FA4A9]/20 rounded-2xl flex items-center justify-center border border-[#2FA4A9]/30 shadow-[0_0_15px_rgba(47,164,169,0.2)]">
          <Sparkles className="w-6 h-6 text-[#2FA4A9]" />
        </div>
        
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-xl font-bold font-serif">{announcement.title}</h3>
            <span className="text-[10px] font-black uppercase tracking-widest bg-white/10 text-white px-2 py-0.5 rounded-full">Admin Update</span>
          </div>
          <div className="text-gray-300 text-sm leading-relaxed mb-4 prose prose-sm prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: announcement.message }} />
          
          <button 
            onClick={handleDismiss}
            disabled={dismissing}
            className="group flex flex-row items-center gap-2 bg-[#2FA4A9] text-white px-5 py-2 rounded-xl text-sm font-bold shadow-md hover:bg-[#258a8f] transition-all disabled:opacity-50"
          >
            {dismissing ? "Acknowleging..." : "Acknowledge & Dismiss"}
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        <button 
          onClick={handleDismiss}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
