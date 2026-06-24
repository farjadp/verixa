"use client";

import { useEffect, useState } from "react";
import { Activity, AlertTriangle, CheckCircle2, Clock3, LoaderCircle, Users, XCircle } from "lucide-react";
import { format } from "date-fns";
import { getCampaignHistory } from "@/actions/broadcast.actions";
import CampaignRecipients from "./CampaignRecipients";

interface Props {
  campaigns: any[];
}

function deriveCampaignStatus(campaign: any) {
  if (campaign.status === "CANCELLED") {
    return { label: "Cancelled", color: "text-gray-300", bg: "bg-gray-400/10", icon: <XCircle className="w-3 h-3" /> };
  }
  if (campaign.status === "COMPLETED") {
    return { label: "Completed", color: "text-green-300", bg: "bg-green-400/10", icon: <CheckCircle2 className="w-3 h-3" /> };
  }
  if (campaign.status === "FAILED") {
    return { label: "Failed", color: "text-red-300", bg: "bg-red-400/10", icon: <XCircle className="w-3 h-3" /> };
  }
  if (campaign.status === "PARTIAL") {
    return { label: "Partial", color: "text-orange-300", bg: "bg-orange-400/10", icon: <AlertTriangle className="w-3 h-3" /> };
  }
  if (campaign.status === "PROCESSING") {
    return { label: "Processing", color: "text-sky-300", bg: "bg-sky-400/10", icon: <LoaderCircle className="w-3 h-3 animate-spin" /> };
  }
  if (campaign.status === "QUEUED") {
    return { label: "Queued", color: "text-amber-300", bg: "bg-amber-400/10", icon: <Clock3 className="w-3 h-3" /> };
  }

  const processed = (campaign.successfulCount || 0) + (campaign.failedCount || 0);
  if (processed === 0) {
    return { label: "Queued", color: "text-amber-300", bg: "bg-amber-400/10", icon: <Clock3 className="w-3 h-3" /> };
  }
  if (processed < (campaign.sentCount || 0)) {
    return { label: "Processing", color: "text-sky-300", bg: "bg-sky-400/10", icon: <LoaderCircle className="w-3 h-3 animate-spin" /> };
  }
  if ((campaign.successfulCount || 0) === (campaign.sentCount || 0)) {
    return { label: "Completed", color: "text-green-300", bg: "bg-green-400/10", icon: <CheckCircle2 className="w-3 h-3" /> };
  }
  if ((campaign.failedCount || 0) === (campaign.sentCount || 0)) {
    return { label: "Failed", color: "text-red-300", bg: "bg-red-400/10", icon: <XCircle className="w-3 h-3" /> };
  }
  return { label: "Partial", color: "text-orange-300", bg: "bg-orange-400/10", icon: <AlertTriangle className="w-3 h-3" /> };
}

export default function BroadcastHistory({ campaigns }: Props) {
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [items, setItems] = useState<any[]>(campaigns);

  useEffect(() => {
    setItems(campaigns);
  }, [campaigns]);

  useEffect(() => {
    const hasActiveCampaign = items.some((campaign) => {
      return campaign.status === "QUEUED" || campaign.status === "PROCESSING";
    });

    if (!hasActiveCampaign) return;

    const intervalId = window.setInterval(() => {
      getCampaignHistory()
        .then((nextItems) => setItems(nextItems))
        .catch(() => {});
    }, 5000);

    return () => window.clearInterval(intervalId);
  }, [items]);

  return (
    <>
      <div className="bg-[#0F2A44] border border-gray-800 rounded-3xl p-6 shadow-2xl">
        <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
          <Activity className="w-5 h-5 text-gray-400" /> Recent Transmissions
        </h2>

        <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
          {items.length === 0 ? (
            <p className="text-gray-500 text-sm italic text-center py-10">No broadcast history found.</p>
          ) : (
            items.map(camp => {
              const status = deriveCampaignStatus(camp);
              const processed = (camp.successfulCount || 0) + (camp.failedCount || 0);
              const progress = camp.sentCount > 0 ? Math.min(100, Math.round((processed / camp.sentCount) * 100)) : 0;

              return (
                <div
                  key={camp.id}
                  className="bg-black/20 border border-white/5 rounded-2xl p-4 hover:border-white/10 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2 gap-3">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-[#2FA4A9] bg-[#2FA4A9]/10 px-2 py-0.5 rounded">
                      {camp.cohort.replace(/_/g, " ")}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${status.bg} ${status.color}`}>
                        {status.icon} {status.label}
                      </span>
                      <span className="text-gray-500 text-[10px] whitespace-nowrap">
                        {format(new Date(camp.createdAt), "MMM d, HH:mm")}
                      </span>
                    </div>
                  </div>

                  <h3 className="text-white font-medium text-sm line-clamp-1 mb-3" title={camp.subject}>
                    {camp.subject}
                  </h3>

                  <div className="mb-3">
                    <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#2FA4A9] to-[#67e8f9] transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="mt-1 text-[10px] text-gray-500">
                      {processed.toLocaleString()} / {camp.sentCount.toLocaleString()} processed
                    </div>
                  </div>

                  <div className="flex gap-4 text-xs mb-3">
                    <div className="flex flex-col">
                      <span className="text-gray-500">Target</span>
                      <span className="text-white font-bold">{camp.sentCount}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-gray-500">Success</span>
                      <span className="text-green-400 font-bold">{camp.successfulCount}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-gray-500">Failed</span>
                      <span className="text-red-400 font-bold">{camp.failedCount}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedCampaignId(camp.id)}
                    className="flex items-center gap-1.5 text-[10px] font-bold text-[#2FA4A9] hover:text-white transition-colors"
                  >
                    <Users className="w-3 h-3" /> View Recipients
                  </button>
                </div>
              );
            })
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
