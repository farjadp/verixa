"use client";

import { Printer } from "lucide-react";

export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white text-xs font-bold text-navy transition-colors hover:border-navy"
    >
      <Printer className="h-4 w-4" aria-hidden="true" /> Print PDF
    </button>
  );
}
