import { getCampaignHistory } from "@/actions/broadcast.actions";
import BroadcastComposer from "./BroadcastComposer";
import { Mailbox, Activity } from "lucide-react";
import { format } from "date-fns";

export default async function AdminBroadcastsPage() {
  let campaigns: any[] = [];
  try {
    campaigns = await getCampaignHistory();
  } catch (e) {
    // If not admin, or error, it will just be empty or caught upstream
  }

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8">
      {/* Page Context */}
      <div>
        <h1 className="text-3xl font-serif font-black text-white tracking-tight flex items-center gap-3">
           <Mailbox className="w-8 h-8 text-[#2FA4A9]" /> Transmission Broadcasts
        </h1>
        <p className="text-gray-400 mt-2 font-light text-sm">
           Command center for deploying hyper-targeted email campaigns to specific system cohorts.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Main Composer Area (Left spanning 2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          <BroadcastComposer />
        </div>

        {/* History Area (Right spanning 1 col) */}
        <div className="bg-[#0F2A44] border border-gray-800 rounded-3xl p-6 shadow-2xl sticky top-8">
          <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <Activity className="w-5 h-5 text-gray-400" /> Recent Transmissions
          </h2>

          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
            {campaigns.length === 0 ? (
              <p className="text-gray-500 text-sm italic text-center py-10">No broadcast history found.</p>
            ) : (
              campaigns.map(camp => (
                <div key={camp.id} className="bg-black/20 border border-white/5 rounded-2xl p-4 hover:border-white/10 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-[#2FA4A9] bg-[#2FA4A9]/10 px-2 py-0.5 rounded">
                      {camp.cohort.replace("_", " ")}
                    </span>
                    <span className="text-gray-500 text-[10px] whitespace-nowrap">
                      {format(new Date(camp.createdAt), "MMM d, HH:mm")}
                    </span>
                  </div>
                  <h3 className="text-white font-medium text-sm line-clamp-1 mb-3" title={camp.subject}>
                    {camp.subject}
                  </h3>
                  <div className="flex gap-4 text-xs">
                    <div className="flex flex-col">
                      <span className="text-gray-500">Targets</span>
                      <span className="text-white font-bold">{camp.sentCount}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-gray-500">Delivered</span>
                      <span className="text-green-400 font-bold">{camp.successfulCount}</span>
                    </div>
                    {camp.failedCount > 0 && (
                      <div className="flex flex-col">
                        <span className="text-gray-500">Failed</span>
                        <span className="text-red-400 font-bold">{camp.failedCount}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
