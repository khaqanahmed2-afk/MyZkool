import React, { useEffect, useState, useCallback } from "react";
import {
  Plus, GripVertical, Lock, Edit2, ToggleLeft, ToggleRight,
  CheckSquare, Loader2, AlertCircle, IndianRupee
} from "lucide-react";
import {
  getFeeHeads, createFeeHead, updateFeeHead, reorderFeeHeads, addSuggestedHeads,
  ensureSystemHeads,
} from "../../../services/feeSetupService";
import type { FeeHead, FeeHeadInput, FeeHeadKind } from "../../../types/fees";
import { SUGGESTED_FEE_HEADS } from "../../../types/fees";
import { useAuth } from "../../../hooks/useAuth";

interface DrawerState {
  open: boolean;
  mode: "add" | "edit";
  head?: FeeHead;
}

export default function FeeHeadsPage() {
  const { school, profile } = useAuth() as any;
  const [heads, setHeads] = useState<FeeHead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drawer, setDrawer] = useState<DrawerState>({ open: false, mode: "add" });
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [selectedSuggested, setSelectedSuggested] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FeeHeadInput>({
    name: "", code: "", kind: "recurring", is_refundable: false, rte_waivable: false,
  });
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!school?.id) return;
    setLoading(true);
    await ensureSystemHeads(school.id);
    const { heads: h, error: e } = await getFeeHeads(school.id, true);
    setHeads(h);
    setError(e ?? null);
    setLoading(false);
  }, [school?.id]);

  useEffect(() => { load(); }, [load]);

  function openAdd() {
    setForm({ name: "", code: "", kind: "recurring", is_refundable: false, rte_waivable: false });
    setFormError(null);
    setDrawer({ open: true, mode: "add" });
  }

  function openEdit(head: FeeHead) {
    setForm({ name: head.name, code: head.code, kind: head.kind, is_refundable: head.is_refundable, rte_waivable: head.rte_waivable });
    setFormError(null);
    setDrawer({ open: true, mode: "edit", head });
  }

  async function handleSave() {
    if (!form.name.trim() || !form.code.trim()) { setFormError("Name and code are required."); return; }
    setSaving(true);
    if (drawer.mode === "add") {
      const { error: e } = await createFeeHead(school.id, form, profile?.id);
      if (e) { setFormError(e); setSaving(false); return; }
    } else if (drawer.head) {
      const { error: e } = await updateFeeHead(school.id, drawer.head.id, form);
      if (e) { setFormError(e); setSaving(false); return; }
    }
    await load();
    setSaving(false);
    setDrawer({ open: false, mode: "add" });
  }

  async function toggleActive(head: FeeHead) {
    await updateFeeHead(school.id, head.id, { ...form, name: head.name, code: head.code, kind: head.kind, is_refundable: head.is_refundable, rte_waivable: head.rte_waivable });
    // Simple toggle using updateFeeHead not exposed for is_active — call supabase directly via update
    const { heads: h } = await getFeeHeads(school.id, true);
    setHeads(h);
  }

  async function handleAddSuggested() {
    if (selectedSuggested.size === 0) return;
    setSaving(true);
    await addSuggestedHeads(school.id, Array.from(selectedSuggested));
    await load();
    setSaving(false);
    setSuggestOpen(false);
    setSelectedSuggested(new Set());
  }

  const systemHeads = heads.filter(h => h.is_system);
  const userHeads = heads.filter(h => !h.is_system).sort((a, b) => a.display_order - b.display_order);
  const existingCodes = new Set(heads.map(h => h.code));

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#141A2E]">Fee Heads</h1>
          <p className="text-[#5B6478] text-sm mt-0.5">Define what you charge — tuition, exam fee, transport, etc.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setSuggestOpen(true)}
            className="flex items-center gap-2 text-sm px-4 py-2 border border-[#E6EAF3] bg-white rounded-lg text-[#5B6478] hover:bg-gray-50"
          >
            <CheckSquare className="w-4 h-4" />
            Add suggested heads
          </button>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 text-sm px-4 py-2 bg-[#2158E0] text-white rounded-lg hover:bg-[#1a46b8]"
          >
            <Plus className="w-4 h-4" />
            Add fee head
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-[#5B6478]">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600 text-sm">{error}</div>
      ) : (
        <div className="space-y-6">
          {/* User-defined heads */}
          <div className="bg-white border border-[#E6EAF3] rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E6EAF3] bg-gray-50/50">
              <h2 className="text-sm font-semibold text-[#141A2E]">Fee Heads ({userHeads.length})</h2>
            </div>
            {userHeads.length === 0 ? (
              <div className="py-12 text-center text-[#5B6478] text-sm">
                <IndianRupee className="w-8 h-8 mx-auto mb-2 opacity-30" />
                No fee heads yet. Click "Add suggested heads" to get started.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#E6EAF3]">
                    <th className="text-left px-5 py-3 text-xs text-[#5B6478] font-medium w-8" />
                    <th className="text-left px-3 py-3 text-xs text-[#5B6478] font-medium">Name</th>
                    <th className="text-left px-3 py-3 text-xs text-[#5B6478] font-medium">Code</th>
                    <th className="text-left px-3 py-3 text-xs text-[#5B6478] font-medium">Type</th>
                    <th className="text-center px-3 py-3 text-xs text-[#5B6478] font-medium">Refundable</th>
                    <th className="text-center px-3 py-3 text-xs text-[#5B6478] font-medium">RTE waivable</th>
                    <th className="text-center px-3 py-3 text-xs text-[#5B6478] font-medium">Active</th>
                    <th className="px-5 py-3 w-10" />
                  </tr>
                </thead>
                <tbody>
                  {userHeads.map((head) => (
                    <tr key={head.id} className="border-b border-[#E6EAF3] last:border-0 hover:bg-gray-50">
                      <td className="px-5 py-3 text-gray-300 cursor-grab">
                        <GripVertical className="w-4 h-4" />
                      </td>
                      <td className="px-3 py-3 font-medium text-[#141A2E]">{head.name}</td>
                      <td className="px-3 py-3 text-[#5B6478] font-mono text-xs">{head.code}</td>
                      <td className="px-3 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${head.kind === "recurring" ? "bg-blue-50 text-blue-700" : "bg-purple-50 text-purple-700"}`}>
                          {head.kind === "recurring" ? "Recurring" : "One-time"}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center text-xs">
                        {head.is_refundable ? "✓" : "—"}
                      </td>
                      <td className="px-3 py-3 text-center text-xs">
                        {head.rte_waivable ? "✓" : "—"}
                      </td>
                      <td className="px-3 py-3 text-center">
                        {head.is_active
                          ? <ToggleRight className="w-5 h-5 text-green-500 inline" />
                          : <ToggleLeft className="w-5 h-5 text-gray-300 inline" />}
                      </td>
                      <td className="px-5 py-3">
                        <button onClick={() => openEdit(head)} className="p-1.5 text-[#5B6478] hover:text-[#2158E0] rounded">
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* System heads */}
          {systemHeads.length > 0 && (
            <div className="bg-white border border-[#E6EAF3] rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-[#E6EAF3] bg-gray-50/50 flex items-center gap-2">
                <Lock className="w-4 h-4 text-[#5B6478]" />
                <h2 className="text-sm font-semibold text-[#5B6478]">System Heads (locked)</h2>
              </div>
              <table className="w-full text-sm">
                <tbody>
                  {systemHeads.map((head) => (
                    <tr key={head.id} className="border-b border-[#E6EAF3] last:border-0">
                      <td className="px-5 py-3 font-medium text-[#5B6478]">{head.name}</td>
                      <td className="px-3 py-3 text-[#5B6478] font-mono text-xs">{head.code}</td>
                      <td className="px-3 py-3">
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                          {head.kind === "recurring" ? "Recurring" : "One-time"}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span title="System head — not editable" className="text-gray-400 cursor-not-allowed">
                          <Lock className="w-3.5 h-3.5" />
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Drawer */}
      {drawer.open && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setDrawer({ open: false, mode: "add" })} />
          <div className="w-96 bg-white h-full shadow-xl flex flex-col">
            <div className="px-6 py-4 border-b border-[#E6EAF3]">
              <h2 className="text-base font-bold text-[#141A2E]">
                {drawer.mode === "add" ? "Add Fee Head" : "Edit Fee Head"}
              </h2>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {formError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-600 text-sm flex gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />{formError}
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-[#141A2E] mb-1">Name *</label>
                <input
                  className="w-full border border-[#E6EAF3] rounded-lg px-3 py-2 text-sm focus:border-[#2158E0] outline-none"
                  value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Tuition Fee"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#141A2E] mb-1">Code *</label>
                <input
                  className="w-full border border-[#E6EAF3] rounded-lg px-3 py-2 text-sm font-mono focus:border-[#2158E0] outline-none"
                  value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toLowerCase().replace(/\s+/g, "_") }))}
                  placeholder="e.g. tuition_fee"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#141A2E] mb-1">Type</label>
                <select
                  className="w-full border border-[#E6EAF3] rounded-lg px-3 py-2 text-sm focus:border-[#2158E0] outline-none"
                  value={form.kind}
                  onChange={e => setForm(f => ({ ...f, kind: e.target.value as FeeHeadKind }))}
                >
                  <option value="recurring">Recurring (charged each term)</option>
                  <option value="one_time">One-time (charged once)</option>
                </select>
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={form.is_refundable ?? false}
                  onChange={e => setForm(f => ({ ...f, is_refundable: e.target.checked }))}
                  className="w-4 h-4 accent-[#2158E0]"
                />
                <span className="text-sm text-[#141A2E]">Refundable (shown on caution deposit, etc.)</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={form.rte_waivable ?? false}
                  onChange={e => setForm(f => ({ ...f, rte_waivable: e.target.checked }))}
                  className="w-4 h-4 accent-[#2158E0]"
                />
                <span className="text-sm text-[#141A2E]">RTE waivable (auto-concession for RTE students)</span>
              </label>
            </div>
            <div className="px-6 py-4 border-t border-[#E6EAF3] flex gap-3">
              <button
                onClick={() => setDrawer({ open: false, mode: "add" })}
                className="flex-1 px-4 py-2 border border-[#E6EAF3] rounded-lg text-sm text-[#5B6478] hover:bg-gray-50"
              >Cancel</button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-[#2158E0] text-white rounded-lg text-sm font-medium hover:bg-[#1a46b8] disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Suggested heads modal */}
      {suggestOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-[#E6EAF3]">
              <h2 className="text-base font-bold text-[#141A2E]">Add Suggested Heads</h2>
              <p className="text-xs text-[#5B6478] mt-0.5">Select the heads you want to add</p>
            </div>
            <div className="px-6 py-4 space-y-2 max-h-80 overflow-y-auto">
              {SUGGESTED_FEE_HEADS.map((s) => {
                const alreadyExists = existingCodes.has(s.code);
                return (
                  <label
                    key={s.code}
                    className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer ${alreadyExists ? "opacity-40 cursor-not-allowed" : "hover:bg-gray-50"}`}
                  >
                    <input
                      type="checkbox"
                      disabled={alreadyExists}
                      checked={selectedSuggested.has(s.code) || alreadyExists}
                      onChange={e => {
                        const next = new Set(selectedSuggested);
                        if (e.target.checked) next.add(s.code); else next.delete(s.code);
                        setSelectedSuggested(next);
                      }}
                      className="w-4 h-4 accent-[#2158E0]"
                    />
                    <div>
                      <p className="text-sm font-medium text-[#141A2E]">{s.name}</p>
                      <p className="text-xs text-[#5B6478]">{s.kind === "one_time" ? "One-time" : "Recurring"}{s.is_refundable ? " · Refundable" : ""}{s.rte_waivable ? " · RTE waivable" : ""}</p>
                    </div>
                    {alreadyExists && <span className="ml-auto text-xs text-green-600 font-medium">Added</span>}
                  </label>
                );
              })}
            </div>
            <div className="px-6 py-4 border-t border-[#E6EAF3] flex gap-3">
              <button onClick={() => setSuggestOpen(false)} className="flex-1 px-4 py-2 border border-[#E6EAF3] rounded-lg text-sm text-[#5B6478]">Cancel</button>
              <button
                onClick={handleAddSuggested}
                disabled={saving || selectedSuggested.size === 0}
                className="flex-1 px-4 py-2 bg-[#2158E0] text-white rounded-lg text-sm font-medium hover:bg-[#1a46b8] disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Add {selectedSuggested.size > 0 ? selectedSuggested.size : ""} selected
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

