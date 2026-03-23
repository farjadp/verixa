import { Hammer } from "lucide-react";

export default function ComingSoonPage() {
  return (
    <div className="p-8 max-w-[1600px] mx-auto min-h-[60vh] flex flex-col items-center justify-center text-center">
      <div className="w-20 h-20 bg-yellow-500/10 rounded-full flex items-center justify-center mb-6">
        <Hammer className="w-10 h-10 text-yellow-500" />
      </div>
      <h1 className="text-3xl font-serif font-black text-white mb-2">Under Construction</h1>
      <p className="text-gray-400 max-w-md">This module is part of the expanded administrative roadmap and is currently being built. It will be available in future phases.</p>
    </div>
  );
}
