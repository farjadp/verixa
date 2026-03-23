import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-100 py-20 px-8 font-sans">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-10">
        <Link href="/" className="flex items-center gap-2">
           <img src="/Brand/Vertixa.png" alt="Verixa Logo" className="h-8 w-auto object-contain rounded-sm grayscale opacity-80" />
           <span className="text-xl font-bold tracking-tighter uppercase font-serif text-gray-800">Verixa</span>
        </Link>
        <div className="flex gap-10 text-sm font-bold text-gray-400">
          <Link href="#" className="hover:text-gray-900 transition">Privacy</Link>
          <Link href="#" className="hover:text-gray-900 transition">Transparency</Link>
          <Link href="#" className="hover:text-gray-900 transition">CICC Registry</Link>
          <Link href="#" className="hover:text-gray-900 transition">Contact</Link>
        </div>
        <div className="text-sm text-gray-400 font-medium">© {new Date().getFullYear()} Verixa Technologies Inc.</div>
      </div>
      <div className="max-w-7xl mx-auto mt-12 pt-8 border-t border-gray-50 text-xs text-gray-400 font-sans text-center md:text-left leading-relaxed max-w-3xl">
         "Verixa is an independent directory and technology platform and is not affiliated with the College of Immigration and Citizenship Consultants (CICC) or the Government of Canada. All license data is sourced passively from public records and synced to provide transparency for prospective immigrants."
      </div>
    </footer>
  );
}
