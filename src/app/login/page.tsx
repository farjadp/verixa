// ============================================================================
// Hardware Source: login/page.tsx
// Route: /login
// Version: 1.0.0 — 2026-03-23
// Why: Route entry for /login (structured for SEO, trust, and conversion)
// Env / Identity: React Client Component
// Owner: Verixa Web
// Notes: Keep structure consistent; every section must support Traffic -> Trust -> Booking
// ============================================================================

"use client";

import Link from "next/link";
import { ShieldCheck, ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const res = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });

      if (res?.error) {
        setError(res.error);
      } else {
        router.push("/dashboard");
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 font-sans overflow-hidden">
      
      {/* LEFT SIDE: Form */}
      <div className="flex flex-col justify-center px-8 sm:px-16 md:px-24 bg-[#FDFCFB]">
        <div className="max-w-md w-full mx-auto">
          {/* Header */}
          <Link href="/" className="flex items-center gap-2 mb-16 group w-fit">
            <img src="/Brand/Vertixa.png" alt="Verixa Logo" className="h-8 w-auto object-contain rounded-sm" />
            <span className="text-xl font-bold tracking-tighter uppercase font-serif text-[#1A1A1A]">Verixa</span>
          </Link>

          {/* Titles */}
          <div className="mb-10">
            <h1 className="text-3xl md:text-4xl font-bold font-serif text-[#1A1A1A] mb-3">Welcome back</h1>
            <p className="text-gray-500">Sign in to your Verixa account to continue.</p>
          </div>

          {/* Form */}
          <form className="space-y-6" onSubmit={handleLogin}>
            {error && <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm font-bold">{error}</div>}
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-700" htmlFor="email">Email address</label>
              <input 
                type="email" 
                id="email" 
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full bg-white border border-gray-200 px-4 py-3.5 rounded-xl focus:border-[#C29967] focus:ring-1 focus:ring-[#C29967] focus:outline-none transition-colors shadow-sm"
              />
            </div>
            
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-gray-700" htmlFor="password">Password</label>
                <Link href="#" className="text-sm text-[#C29967] font-bold hover:underline">Forgot password?</Link>
              </div>
              <input 
                type="password" 
                id="password" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full bg-white border border-gray-200 px-4 py-3.5 rounded-xl focus:border-[#C29967] focus:ring-1 focus:ring-[#C29967] focus:outline-none transition-colors shadow-sm"
              />
            </div>

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-[#1A1A1A] text-white py-4 rounded-xl font-bold text-lg hover:bg-black transition-colors shadow-lg shadow-black/10 mt-4 flex items-center justify-center gap-2 group disabled:opacity-70"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Sign In"}
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </form>

          {/* Footer */}
          <p className="text-center text-gray-500 mt-10">
            Don't have an account?{' '}
            <Link href="/register" className="text-[#C29967] font-bold hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </div>

      {/* RIGHT SIDE: Branding (Hidden on mobile) */}
      <div className="hidden lg:flex relative bg-[#0A192F] items-center justify-center p-12">
        {/* Background Decorative Pattern */}
        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] mix-blend-overlay"></div>
        <div className="absolute inset-0 bg-gradient-to-tr from-[#0A192F] to-transparent"></div>
        
        <div className="relative z-10 max-w-lg text-white">
          <div className="flex flex-col gap-6 p-10 bg-white/5 border border-white/10 rounded-[32px] backdrop-blur-sm shadow-2xl">
            <h2 className="text-4xl font-serif font-bold leading-tight">
              The Gold Standard in Immigration Trust.
            </h2>
            <p className="text-gray-400 text-lg leading-relaxed mb-4">
              Join thousands of verified RCICs and confident clients connecting in a secure, transparent ecosystem.
            </p>
            
            <ul className="space-y-4">
              <li className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#0D9488]/20 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-4 h-4 text-[#0D9488]" />
                </div>
                <span className="font-semibold text-gray-200">Real-time CICC verification</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#0D9488]/20 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-4 h-4 text-[#0D9488]" />
                </div>
                <span className="font-semibold text-gray-200">Secure end-to-end booking</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#0D9488]/20 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-4 h-4 text-[#0D9488]" />
                </div>
                <span className="font-semibold text-gray-200">Zero tolerance for ghost consultants</span>
              </li>
            </ul>
          </div>
        </div>

      </div>

    </div>
  );
}
