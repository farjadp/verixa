// ============================================================================
// Hardware Source: register/page.tsx
// Route: /register
// Version: 1.0.0 — 2026-03-23
// Why: Route entry for /register (structured for SEO, trust, and conversion)
// Env / Identity: React Client Component
// Owner: Verixa Web
// Notes: Keep structure consistent; every section must support Traffic -> Trust -> Booking
// ============================================================================

"use client";

import Link from "next/link";
import { ShieldCheck, ArrowRight, Building2, User } from "lucide-react";
import { useState } from "react";
import { registerUser } from "@/actions/auth.actions";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function RegisterPage() {
  const [role, setRole] = useState<'client' | 'consultant'>('client');
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    licenseNumber: "",
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      await registerUser({
        ...formData,
        role,
      });

      // Auto login
      const res = await signIn("credentials", {
        redirect: false,
        email: formData.email,
        password: formData.password,
      });

      if (res?.error) {
        setError(res.error);
        setIsLoading(false);
      } else {
        router.push("/dashboard");
      }
    } catch (err: any) {
      setError(err.message || "Registration failed");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 font-sans overflow-hidden">
      
      {/* LEFT SIDE: Form */}
      <div className="flex flex-col justify-center px-8 py-12 sm:px-16 md:px-24 bg-[#FDFCFB] overflow-y-auto">
        <div className="max-w-md w-full mx-auto my-auto">
          {/* Header */}
          <Link href="/" className="flex items-center gap-2 mb-12 group w-fit">
            <img src="/Brand/Vertixa.png" alt="Verixa Logo" className="h-8 w-auto object-contain rounded-sm" />
            <span className="text-xl font-bold tracking-tighter uppercase font-serif text-[#1A1A1A]">Verixa</span>
          </Link>

          {/* Titles */}
          <div className="mb-10">
            <h1 className="text-3xl md:text-4xl font-bold font-serif text-[#1A1A1A] mb-3">Create an account</h1>
            <p className="text-gray-500">Join the verified immigration ecosystem.</p>
          </div>

          {/* Form */}
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm font-bold">{error}</div>}
            {/* Role Selection */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <button
                type="button"
                onClick={() => setRole('client')}
                className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all ${
                  role === 'client' 
                    ? 'border-[#C29967] bg-[#FDF8F0] shadow-sm' 
                    : 'border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50'
                }`}
              >
                <User className={`w-6 h-6 mb-2 ${role === 'client' ? 'text-[#C29967]' : 'text-gray-400'}`} />
                <span className={`text-sm font-bold ${role === 'client' ? 'text-[#C29967]' : 'text-gray-600'}`}>I am a Client</span>
              </button>
              
              <button
                type="button"
                onClick={() => setRole('consultant')}
                className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all ${
                  role === 'consultant' 
                    ? 'border-[#0D9488] bg-[#EAF5F4] shadow-sm' 
                    : 'border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50'
                }`}
              >
                <Building2 className={`w-6 h-6 mb-2 ${role === 'consultant' ? 'text-[#0D9488]' : 'text-gray-400'}`} />
                <span className={`text-sm font-bold truncate ${role === 'consultant' ? 'text-[#0D9488]' : 'text-gray-600'}`}>I am an RCIC</span>
              </button>
            </div>

            {/* Inputs */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-gray-700" htmlFor="firstName">First name</label>
                <input 
                  type="text" 
                  id="firstName" 
                  value={formData.firstName}
                  onChange={e => setFormData(p => ({...p, firstName: e.target.value}))}
                  required
                  className="w-full bg-white border border-gray-200 px-4 py-3.5 rounded-xl focus:border-[#C29967] focus:ring-1 focus:ring-[#C29967] focus:outline-none transition-colors shadow-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-gray-700" htmlFor="lastName">Last name</label>
                <input 
                  type="text" 
                  id="lastName" 
                  value={formData.lastName}
                  onChange={e => setFormData(p => ({...p, lastName: e.target.value}))}
                  required
                  className="w-full bg-white border border-gray-200 px-4 py-3.5 rounded-xl focus:border-[#C29967] focus:ring-1 focus:ring-[#C29967] focus:outline-none transition-colors shadow-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-700" htmlFor="email">Email address</label>
              <input 
                type="email" 
                id="email" 
                value={formData.email}
                onChange={e => setFormData(p => ({...p, email: e.target.value}))}
                required
                placeholder="you@example.com"
                className="w-full bg-white border border-gray-200 px-4 py-3.5 rounded-xl focus:border-[#C29967] focus:ring-1 focus:ring-[#C29967] focus:outline-none transition-colors shadow-sm"
              />
            </div>
            
            {role === 'consultant' && (
              <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-300">
                <label className="text-sm font-bold text-gray-700 flex justify-between" htmlFor="license">
                  <span>CICC License Number</span>
                  <span className="text-[#0D9488] font-normal text-xs">Required for verification</span>
                </label>
                <input 
                  type="text" 
                  id="license" 
                  value={formData.licenseNumber}
                  onChange={e => setFormData(p => ({...p, licenseNumber: e.target.value}))}
                  required={role === 'consultant'}
                  placeholder="e.g. R406354"
                  className="w-full bg-white border border-[#0D9488] px-4 py-3.5 rounded-xl focus:ring-2 focus:ring-[#0D9488] focus:outline-none transition-colors shadow-sm uppercase placeholder:normal-case"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-700" htmlFor="password">Password</label>
              <input 
                type="password" 
                id="password" 
                value={formData.password}
                onChange={e => setFormData(p => ({...p, password: e.target.value}))}
                required
                placeholder="Create a strong password"
                className="w-full bg-white border border-gray-200 px-4 py-3.5 rounded-xl focus:border-[#C29967] focus:ring-1 focus:ring-[#C29967] focus:outline-none transition-colors shadow-sm"
              />
            </div>

            <button 
              type="submit" 
              disabled={isLoading}
              className={`w-full text-white py-4 rounded-xl font-bold text-lg transition-all shadow-lg mt-4 flex items-center justify-center gap-2 group disabled:opacity-70 ${
                role === 'consultant' ? 'bg-[#0D9488] hover:bg-[#0f766d] shadow-[#0D9488]/20' : 'bg-[#1A1A1A] hover:bg-black shadow-black/10'
              }`}
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Construct Account"}
              {!isLoading && <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
            </button>
            
            <p className="text-xs text-gray-400 text-center leading-relaxed px-4">
              By creating an account, you agree to Verixa's{' '}
              <Link href="#" className="underline hover:text-gray-600">Terms of Service</Link> and{' '}
              <Link href="#" className="underline hover:text-gray-600">Privacy Policy</Link>.
            </p>
          </form>

          {/* Footer */}
          <p className="text-center text-gray-500 mt-8">
            Already have an account?{' '}
            <Link href="/login" className="text-[#C29967] font-bold hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>

      {/* RIGHT SIDE: Branding (Hidden on mobile) */}
      <div className="hidden lg:flex relative bg-[#1A1A1A] items-center justify-center p-12 overflow-hidden">
        {/* Subtle glow effect */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#C29967]/10 rounded-full blur-[100px]"></div>
        
        <div className="relative z-10 w-full max-w-xl">
           <div className="grid grid-cols-2 gap-6 relative">
             {/* Decorative UI elements floating */}
             <div className="col-span-2 bg-white/5 border border-white/10 p-8 rounded-3xl backdrop-blur-md mb-4 transform -translate-x-8 hover:translate-x-0 transition-transform duration-700">
               <div className="flex gap-4 items-center mb-4">
                 <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#0D9488] to-[#14b8a6]"></div>
                 <div>
                   <div className="h-4 w-32 bg-white/20 rounded mb-2"></div>
                   <div className="h-3 w-20 bg-white/10 rounded"></div>
                 </div>
               </div>
               <div className="h-3 w-full bg-white/10 rounded mb-2"></div>
               <div className="h-3 w-4/5 bg-white/10 rounded"></div>
             </div>
             
             <div className="bg-white/5 border border-white/10 p-8 rounded-3xl backdrop-blur-md transform translate-y-8 hover:translate-y-0 transition-transform duration-700 delay-100">
                <ShieldCheck className="w-8 h-8 text-[#C29967] mb-4" />
                <h3 className="text-white font-bold mb-2">Verified Profiles</h3>
                <p className="text-white/50 text-sm">Every consultant is authenticated against the CICC registry hourly.</p>
             </div>
             
             <div className="bg-[#0A192F] border border-[#0D9488]/30 p-8 rounded-3xl shadow-2xl transform -translate-y-8 hover:-translate-y-12 transition-transform duration-700 delay-200">
                <Building2 className="w-8 h-8 text-[#0D9488] mb-4" />
                <h3 className="text-white font-bold mb-2">Practice Growth</h3>
                <p className="text-white/50 text-sm">RCICs gain access to exclusive tools and serious clients.</p>
             </div>
           </div>
        </div>
      </div>

    </div>
  );
}
