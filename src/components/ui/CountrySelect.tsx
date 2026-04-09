"use client";

import { useState, useRef, useEffect } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { countries } from "@/lib/countries";

interface CountrySelectProps {
  value: string;
  onChange: (val: string) => void;
  className?: string;
  placeholder?: string;
}

export default function CountrySelect({ value, onChange, className = "", placeholder = "Select a country" }: CountrySelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredCountries = countries.filter(c => c.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="relative w-full" ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between text-left ${className}`}
      >
        <span className={`block truncate ${!value ? "text-gray-400" : "text-gray-900"}`}>
          {value || placeholder}
        </span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Mobile Backdrop */}
          <div className="fixed inset-0 z-[100] bg-black/20 backdrop-blur-sm md:hidden" onClick={() => setIsOpen(false)} />
          
          <div className="
            fixed bottom-0 left-0 right-0 z-[101] bg-white rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.1)] flex flex-col max-h-[85vh]
            md:absolute md:bottom-auto md:top-full md:left-0 md:right-auto md:w-full md:rounded-xl md:shadow-2xl md:border md:border-gray-100 md:mt-2 md:max-h-80 md:z-50
          ">
            {/* Mobile Handle & Header */}
            <div className="w-full flex flex-col items-center pt-3 pb-2 md:hidden shrink-0">
              <div className="w-12 h-1.5 bg-gray-200 rounded-full mb-3" />
              <h3 className="font-bold text-[#1A1F2B] text-lg">Select Country</h3>
            </div>
            
            <div className="p-4 md:p-3 border-b border-gray-100 bg-gray-50/30 shrink-0">
              <div className="relative">
                <Search className="absolute left-4 md:left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search country..."
                  className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-4 py-3 md:py-2 text-base md:text-sm focus:outline-none focus:border-[#2FA4A9] focus:ring-1 focus:ring-[#2FA4A9] transition-all shadow-sm"
                  autoFocus
                />
              </div>
            </div>
            
            <ul className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar pb-8 md:pb-2 bg-gray-50/30">
              {filteredCountries.length === 0 ? (
                <li className="p-6 text-center text-gray-400 text-sm font-medium">No countries found.</li>
              ) : (
                filteredCountries.map((country) => (
                  <li key={country}>
                    <button
                      type="button"
                      onClick={() => {
                        onChange(country);
                        setIsOpen(false);
                        setSearch("");
                      }}
                      className={`w-full text-left px-4 py-3.5 md:py-2.5 rounded-xl flex items-center justify-between transition-colors ${
                        value === country ? "bg-[#2FA4A9]/10 text-[#2FA4A9] font-bold border border-[#2FA4A9]/20" : "text-gray-700 hover:bg-white hover:shadow-sm border border-transparent"
                      }`}
                    >
                      <span className="text-base md:text-sm">{country}</span>
                      {value === country && <Check className="w-5 h-5 md:w-4 md:h-4" />}
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
