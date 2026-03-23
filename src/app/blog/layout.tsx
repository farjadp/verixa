import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Verixa Blog | Immigration Guides and Consultant Insights",
  description: "Actionable immigration guides, consultant insights, and policy updates for Canada."
};

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#FDFCFB] text-[#1A1A1A]">
      <Header />
      <main className="max-w-7xl mx-auto px-6 md:px-8 py-12">
        {children}
      </main>
      <Footer />
    </div>
  );
}
