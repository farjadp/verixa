import Link from "next/link";
import { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Search, Home, ArrowLeft, Compass } from "lucide-react";

export const metadata: Metadata = {
  title: "Page Not Found | Verixa",
  description: "The page you're looking for doesn't exist or has been moved.",
};

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#F4F6F9] font-sans flex flex-col">
      <Header />

      <main className="flex-1 flex items-center justify-center px-4 py-20">
        <div className="max-w-lg w-full text-center">

          {/* Animated number */}
          <div className="relative mb-8 select-none">
            <div className="text-[160px] font-black text-[#0F2A44]/5 leading-none tracking-tighter absolute inset-0 flex items-center justify-center pointer-events-none">
              404
            </div>
            <div className="relative z-10 pt-8">
              <div className="w-20 h-20 bg-gradient-to-br from-[#2FA4A9]/20 to-[#0F2A44]/10 border border-[#2FA4A9]/20 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-[#2FA4A9]/10">
                <Compass className="w-10 h-10 text-[#2FA4A9]" />
              </div>
            </div>
          </div>

          {/* Message */}
          <h1 className="text-3xl font-black font-serif text-[#0F172A] tracking-tight mb-3">
            This page doesn't exist
          </h1>
          <p className="text-gray-500 text-base leading-relaxed mb-10">
            The page you're looking for may have been moved, renamed, or is still under construction.
            Don't worry — let us help you find your way back.
          </p>

          {/* Quick links */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
            {[
              { href: "/", icon: <Home className="w-4 h-4" />, label: "Home", desc: "Back to main page" },
              { href: "/consultants", icon: <Search className="w-4 h-4" />, label: "Find a Consultant", desc: "Browse RCIC directory" },
              { href: "/dashboard", icon: <ArrowLeft className="w-4 h-4" />, label: "Dashboard", desc: "Go to your panel" },
            ].map(({ href, icon, label, desc }) => (
              <Link
                key={href}
                href={href}
                className="group flex flex-col items-center gap-2 p-4 bg-white border border-gray-100 rounded-2xl hover:border-[#2FA4A9]/30 hover:shadow-md transition-all"
              >
                <div className="w-9 h-9 bg-[#2FA4A9]/10 rounded-xl flex items-center justify-center text-[#2FA4A9] group-hover:bg-[#2FA4A9] group-hover:text-white transition-all">
                  {icon}
                </div>
                <div>
                  <p className="font-bold text-sm text-gray-900">{label}</p>
                  <p className="text-[11px] text-gray-400">{desc}</p>
                </div>
              </Link>
            ))}
          </div>

          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#0F2A44]/5 border border-[#0F2A44]/10 rounded-full text-xs font-semibold text-[#0F2A44]/60">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2FA4A9] inline-block" />
            Error 404 — Page Not Found
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
