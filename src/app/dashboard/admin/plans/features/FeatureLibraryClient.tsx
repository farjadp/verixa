"use client";
// ============================================================================
// FeatureLibraryClient.tsx
// Version: 1.0.0 — 2026-03-25
// Why: Interactive feature list with category filtering and inline feature creation.
// ============================================================================

import { useState, useTransition } from "react";
import { createFeature, deleteFeature } from "@/actions/plans.actions";
import { Plus, Trash2, Loader2, Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";

const CATEGORY_OPTIONS = ["visibility", "booking", "trust", "analytics", "financial", "premium"];
const CATEGORY_COLORS: Record<string, string> = {
  visibility: "bg-purple-50 text-purple-700",
  booking:    "bg-blue-50 text-blue-700",
  trust:      "bg-teal-50 text-teal-700",
  analytics:  "bg-orange-50 text-orange-700",
  financial:  "bg-green-50 text-green-700",
  premium:    "bg-[#0F2A44]/10 text-[#0F2A44]",
};
const CATEGORY_ICONS: Record<string, string> = {
  visibility: "👁️", trust: "🛡️", booking: "📅",
  analytics: "📊", financial: "💰", premium: "⭐",
};

type Feature = {
  id: string; key: string; name: string; description: string | null;
  category: string; type: string; sortOrder: number;
  _count: { planFeatures: number };
};
type Plan = { id: string; name: string; slug: string; planFeatures: { featureId: string; enabled: boolean }[] };

interface Props { features: Feature[]; plans: Plan[]; categories: string[]; }

export default function FeatureLibraryClient({ features, plans, categories }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newFeature, setNewFeature] = useState({ key: "", name: "", description: "", category: "booking", type: "boolean" });

  const filtered = activeCategory === "all" ? features : features.filter((f) => f.category === activeCategory);

  const handleCreate = async () => {
    if (!newFeature.key || !newFeature.name) return;
    setSaving(true);
    await createFeature(newFeature);
    setNewFeature({ key: "", name: "", description: "", category: "booking", type: "boolean" });
    setShowAddForm(false);
    setSaving(false);
    router.refresh();
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      await deleteFeature(id);
      router.refresh();
    });
  };

  return (
    <div>
      {/* Category filter */}
      <div className="flex gap-2 flex-wrap mb-6">
        <button
          onClick={() => setActiveCategory("all")}
          className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${activeCategory === "all" ? "bg-[#0F2A44] text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-gray-400"}`}
        >
          All ({features.length})
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold capitalize transition-colors ${activeCategory === cat ? "bg-[#2FA4A9] text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-gray-400"}`}
          >
            {CATEGORY_ICONS[cat]} {cat} ({features.filter(f => f.category === cat).length})
          </button>
        ))}
      </div>

      {/* Feature table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-4">
        <table className="w-full">
          <thead className="border-b border-gray-100 bg-gray-50">
            <tr>
              <th className="text-left p-4 text-xs font-black uppercase tracking-widest text-gray-400">Feature</th>
              <th className="text-left p-4 text-xs font-black uppercase tracking-widest text-gray-400">Key</th>
              <th className="text-left p-4 text-xs font-black uppercase tracking-widest text-gray-400">Category</th>
              <th className="text-left p-4 text-xs font-black uppercase tracking-widest text-gray-400">Type</th>
              <th className="text-left p-4 text-xs font-black uppercase tracking-widest text-gray-400">Plans</th>
              <th className="text-right p-4 text-xs font-black uppercase tracking-widest text-gray-400">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((feature) => (
              <tr key={feature.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                <td className="p-4">
                  <div className="font-semibold text-[#1A1F2B] text-sm">{feature.name}</div>
                  {feature.description && <div className="text-xs text-gray-400 mt-0.5">{feature.description}</div>}
                </td>
                <td className="p-4">
                  <code className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded font-mono">{feature.key}</code>
                </td>
                <td className="p-4">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${CATEGORY_COLORS[feature.category] ?? "bg-gray-50 text-gray-600"}`}>
                    {CATEGORY_ICONS[feature.category]} {feature.category}
                  </span>
                </td>
                <td className="p-4">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${feature.type === "limit" ? "bg-orange-50 text-orange-600" : "bg-blue-50 text-blue-600"}`}>
                    {feature.type}
                  </span>
                </td>
                <td className="p-4">
                  <div className="flex gap-1 flex-wrap">
                    {plans.map((plan) => {
                      const pf = plan.planFeatures.find((p) => p.featureId === feature.id);
                      return (
                        <span
                          key={plan.id}
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${pf?.enabled ? "bg-teal-100 text-teal-700" : "bg-gray-100 text-gray-400"}`}
                        >
                          {plan.name}
                        </span>
                      );
                    })}
                  </div>
                </td>
                <td className="p-4 text-right">
                  <button
                    onClick={() => handleDelete(feature.id)}
                    disabled={isPending}
                    className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                    title="Delete feature"
                  >
                    {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add feature form */}
      {showAddForm ? (
        <div className="bg-white rounded-2xl border border-[#2FA4A9] shadow-md p-6">
          <h3 className="font-bold text-[#0F2A44] mb-4">Add New Feature</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Feature Key <span className="text-red-400">*</span></label>
              <input
                value={newFeature.key}
                onChange={(e) => setNewFeature((p) => ({ ...p, key: e.target.value.toLowerCase().replace(/\s+/g, "_") }))}
                placeholder="e.g. custom_domain"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:border-[#2FA4A9] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Display Name <span className="text-red-400">*</span></label>
              <input
                value={newFeature.name}
                onChange={(e) => setNewFeature((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Custom Domain"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-[#2FA4A9] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Category</label>
              <select value={newFeature.category} onChange={(e) => setNewFeature((p) => ({ ...p, category: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-[#2FA4A9] focus:outline-none">
                {CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Type</label>
              <select value={newFeature.type} onChange={(e) => setNewFeature((p) => ({ ...p, type: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-[#2FA4A9] focus:outline-none">
                <option value="boolean">Boolean (on/off)</option>
                <option value="limit">Limit (numeric value)</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-bold text-gray-500 mb-1">Description</label>
              <input
                value={newFeature.description}
                onChange={(e) => setNewFeature((p) => ({ ...p, description: e.target.value }))}
                placeholder="Short description shown in admin"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-[#2FA4A9] focus:outline-none"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={handleCreate} disabled={saving || !newFeature.key || !newFeature.name} className="flex items-center gap-2 px-5 py-2 bg-[#0F2A44] text-white rounded-lg text-sm font-bold hover:bg-black transition-colors disabled:opacity-40">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Create Feature
            </button>
            <button onClick={() => setShowAddForm(false)} className="px-5 py-2 border border-gray-200 rounded-lg text-sm font-bold text-gray-600 hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-white border-2 border-dashed border-gray-300 rounded-xl text-sm font-bold text-gray-500 hover:border-[#2FA4A9] hover:text-[#2FA4A9] transition-colors w-full justify-center"
        >
          <Plus className="w-4 h-4" /> Add New Feature
        </button>
      )}
    </div>
  );
}
