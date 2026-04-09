// ============================================================================
// Hardware Source: components/blog/ArticleCTA.tsx
// Version: 1.0.0 — 2026-03-23
// Why: The Conversion Heartbeat of the Blog Engine. Every article must loop back to Booking.
// ============================================================================

import Link from 'next/link';
import { ShieldCheck, ArrowRight } from 'lucide-react';

export default function ArticleCTA() {
  return (
    <div className="my-10 bg-gradient-to-br from-[#0F2A44] to-[#2A2A2A] rounded-2xl p-8 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative border border-gray-800">
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#2FA4A9] rounded-full blur-[80px] opacity-20 pointer-events-none"></div>
      
      <div className="relative z-10 flex-1">
        <div className="flex items-center gap-2 text-[#2FA4A9] mb-3">
          <ShieldCheck className="w-5 h-5" />
          <span className="text-sm font-bold uppercase tracking-widest">Verixa Verified</span>
        </div>
        <h3 className="text-2xl font-serif font-bold text-white mb-2">Ready to take the next step securely?</h3>
        <p className="text-gray-400 text-sm leading-relaxed max-w-lg">
          Don't navigate Canadian Immigration alone. Connect with active, government-licensed RCICs on Verixa. Transparent pricing, secure Escrow payments, and instant video bookings.
        </p>
      </div>

      <div className="relative z-10 shrink-0 w-full md:w-auto">
        <Link href="/search" className="w-full md:w-auto bg-[#2FA4A9] hover:bg-[#258d92] text-white px-8 py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-transform hover:scale-105 shadow-xl shadow-black/20">
          Find Licensed Consultants <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
