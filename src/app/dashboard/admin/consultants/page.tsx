import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Search, Filter, MoreVertical, ShieldCheck, FileText, CheckCircle, XCircle } from "lucide-react";
import { searchConsultants } from "@/lib/db";

export default async function AdminConsultantsPage(props: { 
  searchParams: Promise<{ q?: string; page?: string }> 
}) {
  const searchParams = await props.searchParams;
  const q = searchParams.q || "";
  const page = parseInt(searchParams.page || "1", 10);
  const limit = 50;

  // 1. Fetch from the original CICC Scraper database
  const { data: registryConsultants, total, totalPages } = searchConsultants({ 
    search: q, 
    page, 
    limit 
  });

  // 2. Fetch platform data for these specific consultants
  const claimedProfiles = await prisma.consultantProfile.findMany({
    where: { licenseNumber: { in: registryConsultants.map(c => c.License_Number) } },
    include: {
      bookings: { select: { id: true } },
      reviews: { select: { id: true, rating: true } },
      user: { select: { email: true } }
    }
  });

  // 3. Map the data back together
  const profilesMap = new Map(claimedProfiles.map(p => [p.licenseNumber, p]));

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-black text-white tracking-tight">Consultants Directory</h1>
          <p className="text-gray-400 mt-1 font-light text-sm">Unified view of the CICC Registry and Verified Platform Users.</p>
        </div>
        <form className="flex gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input 
              type="text" 
              name="q"
              defaultValue={q}
              placeholder="Search Name or License..." 
              className="pl-9 pr-4 py-2 bg-[#1A1A1A] border border-gray-800 rounded-lg text-sm text-white focus:outline-none focus:border-gray-500 w-64"
            />
          </div>
          <button type="submit" className="px-4 py-2 bg-[#1A1A1A] border border-gray-800 rounded-lg text-sm text-gray-300 hover:text-white flex items-center gap-2">
            Search
          </button>
        </form>
      </div>

      <div className="bg-[#1A1A1A] border border-gray-800 rounded-xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-[#222] text-gray-400 text-xs uppercase tracking-wider border-b border-gray-800">
              <tr>
                <th className="px-6 py-4 font-bold">Consultant</th>
                <th className="px-6 py-4 font-bold">License</th>
                <th className="px-6 py-4 font-bold">Registry Status</th>
                <th className="px-6 py-4 font-bold">Platform Sync</th>
                <th className="px-6 py-4 font-bold">Metrics</th>
                <th className="px-6 py-4 font-bold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800 text-gray-300">
              {registryConsultants.map((reg) => {
                const platformData = profilesMap.get(reg.License_Number) as (typeof claimedProfiles)[0] | undefined;
                
                const avgRating = (platformData && platformData.reviews.length > 0)
                  ? (platformData.reviews.reduce((acc: number, r: { rating: number }) => acc + r.rating, 0) / platformData.reviews.length).toFixed(1) 
                  : "N/A";

                return (
                  <tr key={reg.License_Number} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-white">{reg.Full_Name}</div>
                      <div className="text-[10px] text-gray-500 uppercase tracking-widest">{platformData?.user?.email || reg.Email || "No Email"}</div>
                    </td>
                    <td className="px-6 py-4 font-mono text-gray-400">{reg.License_Number}</td>
                    
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-[10px] uppercase tracking-wider font-bold rounded ${
                        reg.Status === "Active" ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
                      }`}>
                        {reg.Status}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        {!platformData ? (
                          <><XCircle className="w-4 h-4 text-gray-600" /> <span className="text-gray-500">Unclaimed</span></>
                        ) : platformData.status === "Active" ? (
                          <><ShieldCheck className="w-4 h-4 text-green-500" /> <span className="text-green-500 font-bold">Verified User</span></>
                        ) : (
                          <><FileText className="w-4 h-4 text-orange-500" /> <span className="text-orange-500 font-bold">Verification Pending</span></>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      {platformData ? (
                        <div className="flex flex-col gap-1 text-[11px]">
                          <span><b className="text-white">{platformData.bookings.length}</b> Bookings</span>
                          <span><b className="text-white">{platformData.reviews.length}</b> Reviews ({avgRating} ⭐)</span>
                        </div>
                      ) : (
                        <div className="text-[11px] text-gray-500">N/A</div>
                      )}
                    </td>

                    <td className="px-6 py-4 text-center">
                      <button className="p-1.5 text-gray-500 hover:text-white rounded-md hover:bg-white/10 transition-colors">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              
              {registryConsultants.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    No consultants found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="p-4 border-t border-gray-800 flex justify-between items-center bg-[#1A1A1A]">
          <span className="text-xs text-gray-500">
            Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, total)} of {total.toLocaleString()} registry records
          </span>
          <div className="flex gap-2 text-sm">
            <Link 
              href={`/dashboard/admin/consultants?page=${page - 1}${q ? `&q=${q}` : ''}`}
              className={`px-3 py-1 bg-[#222] border border-gray-700 rounded text-gray-400 ${page <= 1 ? 'pointer-events-none opacity-50' : 'hover:text-white hover:border-gray-500'}`}
            >
              Prev
            </Link>
            <Link 
              href={`/dashboard/admin/consultants?page=${page + 1}${q ? `&q=${q}` : ''}`}
              className={`px-3 py-1 bg-[#222] border border-gray-700 rounded text-gray-400 ${page >= totalPages ? 'pointer-events-none opacity-50' : 'hover:text-white hover:border-gray-500'}`}
            >
              Next
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
