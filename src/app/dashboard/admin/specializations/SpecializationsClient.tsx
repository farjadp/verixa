"use client";

import { useState, useTransition } from "react";
import {
  ChevronDown, ChevronRight, Plus, Pencil, Trash2, Eye, EyeOff,
  Save, X, Layers, Tag, ShieldCheck, Loader2, Settings2
} from "lucide-react";
import {
  createCategory, updateCategory, toggleCategory, deleteCategory,
  createItem, updateItem, toggleItem, deleteItem,
  saveSpecializationLimit,
} from "@/actions/specializations.actions";

interface Item { id: string; key: string; label: string; isActive: boolean; sortOrder: number; }
interface Category { id: string; name: string; isActive: boolean; sortOrder: number; items: Item[]; }
interface PlanLimit { planId: string; planName: string; planSlug: string; featureId: string; planFeatureId: string | null; limit: string; }

export default function SpecializationsClient({
  initialCategories,
  planLimits,
}: {
  initialCategories: Category[];
  planLimits: PlanLimit[];
}) {
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [limits, setLimits] = useState<PlanLimit[]>(planLimits);
  const [isPending, startTransition] = useTransition();

  // UI state
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());
  const [newCatName, setNewCatName] = useState("");
  const [editingCat, setEditingCat] = useState<{ id: string; name: string } | null>(null);
  const [newItem, setNewItem] = useState<{ catId: string; key: string; label: string } | null>(null);
  const [editingItem, setEditingItem] = useState<{ id: string; label: string } | null>(null);
  const [activeTab, setActiveTab] = useState<"pathways" | "limits">("pathways");
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const refresh = () => window.location.reload();

  const toggleCat = (id: string) => {
    setExpandedCats(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // ── CATEGORY ACTIONS ─────────────────────────────────────────────────────
  const handleAddCategory = () => {
    if (!newCatName.trim()) return;
    startTransition(async () => {
      await createCategory(newCatName);
      setNewCatName("");
      showToast("Category added");
      refresh();
    });
  };

  const handleUpdateCat = () => {
    if (!editingCat || !editingCat.name.trim()) return;
    startTransition(async () => {
      await updateCategory(editingCat.id, editingCat.name);
      setEditingCat(null);
      showToast("Category updated");
      refresh();
    });
  };

  const handleToggleCat = (id: string, current: boolean) => {
    startTransition(async () => {
      await toggleCategory(id, !current);
      showToast(!current ? "Category enabled" : "Category disabled");
      refresh();
    });
  };

  const handleDeleteCat = (id: string, name: string) => {
    if (!confirm(`Delete category "${name}" and ALL its items? This cannot be undone.`)) return;
    startTransition(async () => {
      await deleteCategory(id);
      showToast("Category deleted");
      refresh();
    });
  };

  // ── ITEM ACTIONS ─────────────────────────────────────────────────────────
  const handleAddItem = () => {
    if (!newItem || !newItem.key.trim() || !newItem.label.trim()) return;
    startTransition(async () => {
      await createItem(newItem.catId, newItem.key, newItem.label);
      setNewItem(null);
      showToast("Item added");
      refresh();
    });
  };

  const handleUpdateItem = () => {
    if (!editingItem || !editingItem.label.trim()) return;
    startTransition(async () => {
      await updateItem(editingItem.id, editingItem.label);
      setEditingItem(null);
      showToast("Item updated");
      refresh();
    });
  };

  const handleToggleItem = (id: string, current: boolean) => {
    startTransition(async () => {
      await toggleItem(id, !current);
      refresh();
    });
  };

  const handleDeleteItem = (id: string, label: string) => {
    if (!confirm(`Delete "${label}"?`)) return;
    startTransition(async () => {
      await deleteItem(id);
      showToast("Item deleted");
      refresh();
    });
  };

  // ── PLAN LIMITS ──────────────────────────────────────────────────────────
  const handleSaveLimit = (plan: PlanLimit, val: string) => {
    startTransition(async () => {
      await saveSpecializationLimit(plan.planId, plan.featureId, plan.planFeatureId, val);
      setLimits(prev => prev.map(p => p.planId === plan.planId ? { ...p, limit: val } : p));
      showToast(`Limit saved for ${plan.planName}`);
    });
  };

  const totalItems = categories.reduce((sum, c) => sum + c.items.length, 0);
  const activeItems = categories.reduce((sum, c) => sum + c.items.filter((i: Item) => i.isActive).length, 0);

  return (
    <div className="min-h-screen bg-[#F4F6F9] p-6 font-sans">

      {/* Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-[#0F2A44] text-white text-sm font-bold px-5 py-3 rounded-2xl shadow-xl animate-fade-in flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#2FA4A9]" /> {toast}
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-[#2FA4A9]/10 border border-[#2FA4A9]/20 rounded-2xl flex items-center justify-center">
            <Layers className="w-5 h-5 text-[#2FA4A9]" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-[#0F172A]">Immigration Specializations</h1>
            <p className="text-sm text-gray-500">Manage pathways and per-plan selection limits</p>
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-4 mt-4">
          {[
            { label: "Categories", value: categories.length },
            { label: "Total Pathways", value: totalItems },
            { label: "Active Pathways", value: activeItems },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white border border-gray-100 rounded-2xl px-5 py-3 shadow-sm">
              <p className="text-2xl font-black text-[#0F2A44]">{value}</p>
              <p className="text-xs text-gray-400 font-semibold">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {[
          { id: "pathways", label: "Pathways", icon: <Tag className="w-4 h-4" /> },
          { id: "limits", label: "Plan Limits", icon: <Settings2 className="w-4 h-4" /> },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
              activeTab === tab.id
                ? "bg-[#0F2A44] text-white shadow-lg"
                : "bg-white border border-gray-200 text-gray-600 hover:border-[#2FA4A9]"
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* ── TAB: PATHWAYS ─────────────────────────────────────────────────── */}
      {activeTab === "pathways" && (
        <div className="space-y-4">

          {/* Add category */}
          <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3">Add New Category</p>
            <div className="flex gap-3">
              <input
                type="text"
                value={newCatName}
                onChange={e => setNewCatName(e.target.value)}
                placeholder="e.g. Study Permit Pathways"
                className="flex-1 border border-gray-200 px-4 py-2.5 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-[#2FA4A9] focus:ring-4 focus:ring-[#2FA4A9]/5"
                onKeyDown={e => e.key === "Enter" && handleAddCategory()}
              />
              <button
                onClick={handleAddCategory}
                disabled={isPending || !newCatName.trim()}
                className="bg-[#0F2A44] hover:bg-black text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Add Category
              </button>
            </div>
          </div>

          {/* Category list */}
          {categories.map(cat => (
            <div key={cat.id} className={`bg-white border rounded-3xl shadow-sm overflow-hidden transition-all ${cat.isActive ? 'border-gray-100' : 'border-gray-200 opacity-60'}`}>
              {/* Category header */}
              <div className="flex items-center gap-3 p-4">
                <button onClick={() => toggleCat(cat.id)} className="text-gray-400 hover:text-[#0F2A44] transition">
                  {expandedCats.has(cat.id) ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                </button>

                {editingCat?.id === cat.id ? (
                  <div className="flex-1 flex gap-2">
                    <input
                      autoFocus
                      value={editingCat.name}
                      onChange={e => setEditingCat({ ...editingCat, name: e.target.value })}
                      className="flex-1 border border-[#2FA4A9] px-3 py-1.5 rounded-xl text-sm font-bold focus:outline-none"
                      onKeyDown={e => e.key === "Enter" && handleUpdateCat()}
                    />
                    <button onClick={handleUpdateCat} disabled={isPending} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg"><Save className="w-4 h-4" /></button>
                    <button onClick={() => setEditingCat(null)} className="p-1.5 text-gray-400 hover:bg-gray-50 rounded-lg"><X className="w-4 h-4" /></button>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center gap-3">
                    <h3 className="font-bold text-[#0F172A]">{cat.name}</h3>
                    <span className="text-xs text-gray-400 font-semibold">{cat.items.length} pathways</span>
                    {!cat.isActive && <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Hidden</span>}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <button onClick={() => setEditingCat({ id: cat.id, name: cat.name })} className="p-2 text-gray-400 hover:text-[#2FA4A9] hover:bg-[#2FA4A9]/5 rounded-xl transition">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleToggleCat(cat.id, cat.isActive)} className="p-2 text-gray-400 hover:text-amber-500 hover:bg-amber-50 rounded-xl transition">
                    {cat.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button onClick={() => handleDeleteCat(cat.id, cat.name)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Items */}
              {expandedCats.has(cat.id) && (
                <div className="border-t border-gray-50">
                  {cat.items.map(item => (
                    <div key={item.id} className={`flex items-center gap-3 px-5 py-3 border-b border-gray-50 last:border-0 ${item.isActive ? '' : 'opacity-50'}`}>
                      <div className="w-2 h-2 rounded-full bg-[#2FA4A9]/30 shrink-0" />

                      {editingItem?.id === item.id ? (
                        <div className="flex-1 flex gap-2">
                          <input
                            autoFocus
                            value={editingItem.label}
                            onChange={e => setEditingItem({ ...editingItem, label: e.target.value })}
                            className="flex-1 border border-[#2FA4A9] px-3 py-1 rounded-lg text-sm focus:outline-none"
                            onKeyDown={e => e.key === "Enter" && handleUpdateItem()}
                          />
                          <button onClick={handleUpdateItem} disabled={isPending} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"><Save className="w-3.5 h-3.5" /></button>
                          <button onClick={() => setEditingItem(null)} className="p-1 text-gray-400 hover:bg-gray-50 rounded"><X className="w-3.5 h-3.5" /></button>
                        </div>
                      ) : (
                        <div className="flex-1">
                          <span className="text-sm text-gray-800 font-medium">{item.label}</span>
                          <span className="ml-2 text-[10px] font-mono text-gray-400">{item.key}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => setEditingItem({ id: item.id, label: item.label })} className="p-1.5 text-gray-300 hover:text-[#2FA4A9] rounded-lg transition">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleToggleItem(item.id, item.isActive)} className="p-1.5 text-gray-300 hover:text-amber-500 rounded-lg transition">
                          {item.isActive ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                        <button onClick={() => handleDeleteItem(item.id, item.label)} className="p-1.5 text-gray-300 hover:text-red-500 rounded-lg transition">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Add item form */}
                  {newItem?.catId === cat.id ? (
                    <div className="px-5 py-3 bg-gray-50 flex items-center gap-2">
                      <input
                        autoFocus
                        value={newItem.label}
                        onChange={e => setNewItem({ ...newItem, label: e.target.value })}
                        placeholder="Item label..."
                        className="flex-1 border border-gray-200 px-3 py-2 rounded-xl text-sm focus:outline-none focus:border-[#2FA4A9]"
                      />
                      <input
                        value={newItem.key}
                        onChange={e => setNewItem({ ...newItem, key: e.target.value })}
                        placeholder="key (e.g. study_permit)"
                        className="w-44 border border-gray-200 px-3 py-2 rounded-xl text-sm font-mono focus:outline-none focus:border-[#2FA4A9]"
                      />
                      <button onClick={handleAddItem} disabled={isPending} className="bg-[#2FA4A9] text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-1.5 disabled:opacity-50">
                        {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />} Add
                      </button>
                      <button onClick={() => setNewItem(null)} className="p-2 text-gray-400 hover:text-gray-600 rounded-xl"><X className="w-4 h-4" /></button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setNewItem({ catId: cat.id, key: "", label: "" })}
                      className="w-full flex items-center gap-2 px-5 py-3 text-xs font-bold text-[#2FA4A9] hover:bg-[#2FA4A9]/5 transition"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Pathway to "{cat.name}"
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── TAB: PLAN LIMITS ──────────────────────────────────────────────── */}
      {activeTab === "limits" && (
        <div className="space-y-4">
          <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm mb-2">
            <p className="text-sm text-gray-500 leading-relaxed">
              Set how many immigration specializations consultants on each plan can select.
              Use <strong className="text-gray-800">unlimited</strong> for no restriction, or a number like <strong className="text-gray-800">5</strong>.
            </p>
          </div>

          {limits.length === 0 ? (
            <div className="bg-white border border-gray-100 rounded-3xl p-10 text-center text-gray-400">
              <Settings2 className="w-8 h-8 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">No plans found. Create plans first in the Plans section.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {limits.map(plan => (
                <PlanLimitCard key={plan.planId} plan={plan} onSave={handleSaveLimit} isPending={isPending} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PlanLimitCard({
  plan,
  onSave,
  isPending,
}: {
  plan: PlanLimit;
  onSave: (plan: PlanLimit, val: string) => void;
  isPending: boolean;
}) {
  const [value, setValue] = useState(plan.limit);
  const presets = ["1", "3", "5", "10", "unlimited"];

  return (
    <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 bg-[#0F2A44]/5 rounded-xl flex items-center justify-center">
          <Settings2 className="w-4 h-4 text-[#0F2A44]" />
        </div>
        <div>
          <h3 className="font-black text-sm text-[#0F172A]">{plan.planName}</h3>
          <p className="text-[11px] text-gray-400 font-mono">{plan.planSlug}</p>
        </div>
        <div className="ml-auto">
          <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${
            plan.limit === "unlimited" ? "bg-emerald-50 text-emerald-700" : "bg-[#2FA4A9]/10 text-[#2FA4A9]"
          }`}>
            {plan.limit}
          </span>
        </div>
      </div>

      {/* Preset buttons */}
      <div className="flex flex-wrap gap-2 mb-4">
        {presets.map(p => (
          <button
            key={p}
            onClick={() => setValue(p)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
              value === p
                ? "bg-[#0F2A44] text-white border-[#0F2A44]"
                : "bg-white text-gray-600 border-gray-200 hover:border-[#2FA4A9]"
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Custom input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder="custom..."
          className="flex-1 border border-gray-200 px-3 py-2 rounded-xl text-sm focus:outline-none focus:border-[#2FA4A9]"
        />
        <button
          onClick={() => onSave(plan, value)}
          disabled={isPending}
          className="bg-[#2FA4A9] hover:bg-[#258d92] text-white font-bold px-4 py-2 rounded-xl text-sm flex items-center gap-1.5 disabled:opacity-50 transition-all"
        >
          {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          Save
        </button>
      </div>
    </div>
  );
}
