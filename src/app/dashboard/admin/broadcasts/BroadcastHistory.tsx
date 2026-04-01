"use client";

import { useState } from "react";
import { Activity, Users } from "lucide-react";
import { format } from "date-fns";
import CampaignRecipients from "./CampaignRecipients";

interface Props {
  campaigns: any[];
}

export default function BroadcastHistory({ campaigns }: Props) {
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);

  return (
    <>
      <div className="bg-[#0F2A44] border border-gray-800 rounded-3xl p-6 shadow-2xl">
        <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
          <Activity className="w-5 h-5 text-gray-400" /> Recent Transmissions
        </h2>

        <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
          {campaigns.length === 0 ? (
            <p className="text-gray-500 text-sm italic text-center py-10">No broadcast history found.</p>
          ) : (
            campaigns.map(camp => (
              <div
                key={camp.id}
                className="bg-black/20 border border-white/5 rounded-2xl p-4 hover:border-white/10 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-[#2FA4A9] bg-[#2FA4A9]/10 px-2 py-0.5 rounded">
                    {camp.cohort.replace(/_/g, " ")}
                  </span>
                  <span className="text-gray-500 text-[10px] whitespace-nowrap">
                    {format(new Date(camp.createdAt), "MMM d, HH:mm")}
                  </span>
                </div>

                <h3 className="text-white font-medium text-sm line-clamp-1 mb-3" title={camp.subject}>
                  {camp.subject}
                </h3>

                <div className="flex gap-4 text-xs mb-3">
                  <div className="flex flex-col">
                    <span className="text-gray-500">Sent</span>
                    <span className="text-white font-bold">{camp.sentCount}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-gray-500">Success</span>
                    <span className="text-green-400 font-bold">{camp.successfulCount}</span>
                  </div>
                  {camp.failedCount > 0 && (
                    <div className="flex flex-col">
                      <span className="text-gray-500">Failed</span>
                      <span className="text-red-400 font-bold">{camp.failedCount}</span>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setSelectedCampaignId(camp.id)}
                  className="flex items-center gap-1.5 text-[10px] font-bold text-[#2FA4A9] hover:text-white transition-colors"
                >
                  <Users className="w-3 h-3" /> View Recipients
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {selectedCampaignId && (
        <CampaignRecipients
          campaignId={selectedCampaignId}
          onClose={() => setSelectedCampaignId(null)}
        />
      )}
    </>
  );
}
