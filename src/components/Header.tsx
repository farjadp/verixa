import Link from "next/link";
import { Shield } from "lucide-react";

export default function Header() {
  return (
    <nav className="w-full px-8 py-8 flex justify-between items-center max-w-7xl mx-auto font-sans bg-[#FDFCFB]">
      <div className="flex items-center gap-2">
        <Link href="/" className="flex items-center gap-2 z-10 transition-transform hover:scale-105">
          <img src="/Brand/Vertixa.png" alt="Verixa Logo" className="h-8 w-auto object-contain rounded-sm" />
          <span className="text-xl font-bold tracking-tighter uppercase font-serif text-[#1A1A1A]">Verixa</span>
        </Link>
      </div>
      
      <div className="hidden md:flex gap-10 text-[13px] font-semibold uppercase tracking-widest text-gray-500">
        <Link href="/#how" className="hover:text-black transition">The Standard</Link>
        <Link href="/#verify" className="hover:text-black transition">Verification</Link>
        <Link href="/#consultants" className="hover:text-black transition">For Professionals</Link>
        <Link href="/blog" className="hover:text-black transition">Blog</Link>
      </div>

      <div className="flex gap-6 items-center">
        <Link href="/login" className="text-sm font-bold shadow-sm px-6 py-2.5 rounded-full border border-gray-200 hover:border-gray-300 transition-all bg-white">Login</Link>
        <Link href="/search" className="bg-[#1A1A1A] text-white px-7 py-3 rounded-full text-sm font-bold hover:bg-gray-800 transition shadow-xl">
          Find an RCIC
        </Link>
      </div>
    </nav>
  );
}
