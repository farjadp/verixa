import { getCampaignHistory, getDailyEmailUsage } from "@/actions/broadcast.actions";
import BroadcastComposer from "./BroadcastComposer";
import BroadcastHistory from "./BroadcastHistory";
import { Mailbox } from "lucide-react";

export default async function AdminBroadcastsPage() {
  let campaigns: any[] = [];
  let dailyUsed = 0;
  try {
    [campaigns, dailyUsed] = await Promise.all([getCampaignHistory(), getDailyEmailUsage()]);
  } catch (e) {}

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-serif font-black text-white tracking-tight flex items-center gap-3">
           <Mailbox className="w-8 h-8 text-[#2FA4A9]" /> Transmission Broadcasts
        </h1>
        <p className="text-gray-400 mt-2 font-light text-sm">
           Command center for deploying hyper-targeted email campaigns to the CICC registry.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2 space-y-6">
          <BroadcastComposer dailyUsed={dailyUsed} dailyLimit={100} />
        </div>
        <div className="sticky top-8">
          <BroadcastHistory campaigns={campaigns} />
        </div>
      </div>
    </div>
  );
}
