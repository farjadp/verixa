"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";

export default function HeroSearch() {
  const [query, setQuery] = useState("");
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    } else {
      router.push("/search");
    }
  };

  return (
    <form onSubmit={handleSearch} className="relative flex items-center bg-white border border-gray-200 p-2 rounded-[30px] shadow-2xl shadow-gray-200/50">
      <div className="flex-1 flex items-center px-4">
        <Search className="w-6 h-6 text-[#2FA4A9] mr-3" />
        <input 
          type="text" 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Find by name, city, or RCIC number..." 
          className="w-full bg-transparent py-4 text-lg outline-none placeholder:text-gray-400"
        />
      </div>
      <button 
        type="submit" 
        className="bg-[#0F2A44] text-white px-10 py-4 rounded-[22px] font-bold hover:bg-[#2FA4A9] transition-all transform hover:scale-[1.02] active:scale-95 shadow-lg"
      >
        Search
      </button>
    </form>
  );
}
