import React, { useEffect, useState, useCallback } from "react";
import { useOutletContext, Link } from "react-router-dom";
import {
  Plus, GripVertical, Lock, Edit2, ToggleLeft, ToggleRight,
  CheckSquare, Loader2, AlertCircle, IndianRupee, RotateCcw,
  Sparkles, CheckCircle2, ShieldCheck
} from "lucide-react";
import {
  getFeeHeads, createFeeHead, updateFeeHead, reorderFeeHeads, addSuggestedHeads,
  ensureSystemHeads,
} from "../../../services/feeSetupService";
import type { FeeHead, FeeHeadInput, FeeHeadKind } from "../../../types/fees";
import { SUGGESTED_FEE_HEADS } from "../../../types/fees";
import type { School } from "../../../types/school";
import { useAuth } from "../../../hooks/useAuth";
import { FeeNavHeader } from "../../../components/admin/fees/FeeNavHeader";
import { checkSchoolFeature } from "../../../middleware/features";
import { getSchoolSubscriptionStatus } from "../../../services/subscriptionService";

interface DrawerState {
  open: boolean;
  mode: "add" | "edit";
  head?: FeeHead;
}

export default function FeeHeadsPage() {
  const { school: authSchool, schoolId: authSchoolId, profile, loading: authLoading } = useAuth();
  const outletContext = useOutletContext<{ school: School | null } | null>();
  const activeSchool = authSchool || outletContext?.school || null;
  const activeSchoolId = activeSchool?.id || authSchoolId || profile?.school_id || null;

  const [heads, setHeads] = useState<FeeHead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drawer, setDrawer] = useState<DrawerState>({ open: false, mode: "add" });
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [selectedSuggested, setSelectedSuggested] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [hasTransportFeature, setHasTransportFeature] = useState<boolean>(false);
  const [subscriptionInfo, setSubscriptionInfo] = useState<{ isTrial: boolean; isTrialActive: boolean; planName: string } | null>(null);
  const [form, setForm] = useState<FeeHeadInput>({
    name: "", code: "", kind: "recurring", is_refundable: false, rte_waivable: false,
  });
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    // If authentication context is still initializing, wait for it to complete
    if (authLoading) return;

    if (!activeSchoolId) {
      setLoading(false);
      setError("No active school found for your account. Please select or initialize your school profile.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Check transport feature entitlement and subscription state
      const [transportEnabled, subStatus] = await Promise.all([
        checkSchoolFeature(activeSchoolId, "transport"),
        getSchoolSubscriptionStatus(activeSchoolId).catch(() => null),
      ]);
      setHasTransportFeature(transportEnabled);
      if (subStatus) {
        setSubscriptionInfo({
          isTrial: subStatus.isTrial,
          isTrialActive: subStatus.isTrialActive,
          planName: subStatus.planName,
        });
      }

      // Ensure default system heads exist (Transport Fee, Late Fee, Previous Year Dues)
      try {
        await ensureSystemHeads(activeSchoolId);
      } catch (sysErr) {
        console.warn("Could not ensure system fee heads:", sysErr);
      }

      const { heads: fetchedHeads, error: fetchErr } = await getFeeHeads(activeSchoolId, true);
      setHeads(fetchedHeads || []);
      if (fetchErr) {
        setError(fetchErr);
      }
    } catch (err: any) {
      console.error("Failed to load fee heads:", err);
      setError(err.message || "Failed to load fee heads. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, [activeSchoolId, authLoading]);

  useEffect(() => {
    load();
  }, [load]);

  function openAdd() {
    setForm({ name: "", code: "", kind: "recurring", is_refundable: false, rte_waivable: false });
    setFormError(null);
    setDrawer({ open: true, mode: "add" });
  }

  function openEdit(head: FeeHead) {
    setForm({
      name: head.name,
      code: head.code,
      kind: head.kind,
      is_refundable: head.is_refundable,
      rte_waivable: head.rte_waivable,
    });
    setFormError(null);
    setDrawer({ open: true, mode: "edit", head });
  }

  async function handleSave() {
    if (!form.name.trim() || !form.code.trim()) {
      setFormError("Name and code are required.");
      return;
    }
    if (!activeSchoolId) {
      setFormError("School identifier is missing.");
      return;
    }

    setSaving(true);
    setFormError(null);

    try {
      if (drawer.mode === "add") {
        const { error: e } = await createFeeHead(activeSchoolId, form, profile?.id);
        if (e) {
          setFormError(e);
          setSaving(false);
          return;
        }
      } else if (drawer.head) {
        const { error: e } = await updateFeeHead(activeSchoolId, drawer.head.id, form);
        if (e) {
          setFormError(e);
          setSaving(false);
          return;
        }
      }
      await load();
      setDrawer({ open: false, mode: "add" });
    } catch (err: any) {
      setFormError(err.message || "Failed to save fee head.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(head: FeeHead) {
    if (!activeSchoolId) return;
    const nextActive = !head.is_active;

    // Optimistic UI update
    setHeads(prev => prev.map(h => h.id === head.id ? { ...h, is_active: nextActive } : h));

    const res = await updateFeeHead(activeSchoolId, head.id, { is_active: nextActive });
    if (res.error) {
      // Revert if error
      setHeads(prev => prev.map(h => h.id === head.id ? { ...h, is_active: head.is_active } : h));
    }
  }

  async function handleAddSuggested() {
    if (selectedSuggested.size === 0 || !activeSchoolId) return;
    setSaving(true);
    try {
      await addSuggestedHeads(activeSchoolId, Array.from(selectedSuggested));
      await load();
      setSuggestOpen(false);
      setSelectedSuggested(new Set());
    } catch (err: any) {
      console.error("Failed to add suggested fee heads:", err);
    } finally {
      setSaving(false);
    }
  }

  const systemHeads = heads.filter(h => h.is_system);
  const userHeads = heads
    .filter(h => !h.is_system)
    .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
  const existingCodes = new Set(heads.map(h => h.code));

  return (
    <div className="max-w-5xl mx-auto py-6 px-4">
      <FeeNavHeader
        title="Fee Categories / Heads"
        subtitle="Define what you charge: tuition, exam fee, transport, admission, and more."
        action={
          <>
            <button
              onClick={() => setSuggestOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E6EAF3] bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-xs transition"
            >
              <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
              <span>Suggested Heads</span>
            </button>
            <button
              onClick={openAdd}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 cursor-pointer shadow-xs transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Fee Head</span>
            </button>
          </>
        }
      />

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-[#5B6478]">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-3" />
          <p className="text-sm font-medium text-[#141A2E]">Loading fee categories…</p>
          <p className="text-xs text-[#5B6478] mt-1">Retrieving configured fee heads and system defaults</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center my-6">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-red-800">Unable to load fee categories</h3>
          <p className="text-xs text-red-600 mt-1 max-w-md mx-auto">{error}</p>
          <button
            onClick={() => load()}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-red-300 text-red-700 rounded-lg text-xs font-semibold hover:bg-red-50 shadow-xs cursor-pointer transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* User-defined heads */}
          <div className="bg-white border border-[#E6EAF3] rounded-xl overflow-hidden shadow-xs">
            <div className="px-5 py-4 border-b border-[#E6EAF3] bg-gray-50/50 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-[#141A2E]">Custom Fee Heads ({userHeads.length})</h2>
                <p className="text-xs text-[#5B6478] mt-0.5">Recurring and one-time fees defined for your institution</p>
              </div>
              {userHeads.length > 0 && (
                <span className="text-xs text-[#5B6478]">
                  {userHeads.filter(h => h.is_active).length} active
                </span>
              )}
            </div>

            {userHeads.length === 0 ? (
              <div className="py-16 text-center px-4">
                <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-3">
                  <IndianRupee className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-sm font-semibold text-[#141A2E]">No Custom Fee Heads Configured</h3>
                <p className="text-xs text-[#5B6478] mt-1 max-w-md mx-auto mb-5">
                  You haven't added any custom fee heads yet. Add suggested heads like Tuition Fee, Exam Fee, and Caution Deposit with a single click, or create custom heads tailored to your school.
                </p>
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={() => setSuggestOpen(true)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#E6EAF3] bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-xs transition"
                  >
                    <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
                    <span>Add Suggested Heads</span>
                  </button>
                  <button
                    onClick={openAdd}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 cursor-pointer shadow-xs transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create Custom Head</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#E6EAF3] bg-gray-50/25">
                      <th className="text-left px-5 py-3 text-xs text-[#5B6478] font-medium w-8" />
                      <th className="text-left px-3 py-3 text-xs text-[#5B6478] font-medium">Name</th>
                      <th className="text-left px-3 py-3 text-xs text-[#5B6478] font-medium">Code</th>
                      <th className="text-left px-3 py-3 text-xs text-[#5B6478] font-medium">Type</th>
                      <th className="text-center px-3 py-3 text-xs text-[#5B6478] font-medium">Refundable</th>
                      <th className="text-center px-3 py-3 text-xs text-[#5B6478] font-medium">RTE Waivable</th>
                      <th className="text-center px-3 py-3 text-xs text-[#5B6478] font-medium">Status</th>
                      <th className="px-5 py-3 w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {userHeads.map((head) => (
                      <tr key={head.id} className="border-b border-[#E6EAF3] last:border-0 hover:bg-gray-50/60 transition">
                        <td className="px-5 py-3 text-gray-300">
                          <GripVertical className="w-4 h-4" />
                        </td>
                        <td className="px-3 py-3 font-medium text-[#141A2E]">{head.name}</td>
                        <td className="px-3 py-3 text-[#5B6478] font-mono text-xs">{head.code}</td>
                        <td className="px-3 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${head.kind === "recurring" ? "bg-blue-50 text-blue-700 border border-blue-100" : "bg-purple-50 text-purple-700 border border-purple-100"}`}>
                            {head.kind === "recurring" ? "Recurring" : "One-time"}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center text-xs">
                          {head.is_refundable ? (
                            <span className="text-emerald-600 font-semibold">Yes</span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-center text-xs">
                          {head.rte_waivable ? (
                            <span className="text-emerald-600 font-semibold">Yes</span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => toggleActive(head)}
                            title={head.is_active ? "Click to deactivate" : "Click to activate"}
                            className="inline-flex items-center justify-center p-0.5 hover:opacity-80 transition cursor-pointer"
                          >
                            {head.is_active ? (
                              <ToggleRight className="w-6 h-6 text-emerald-500" />
                            ) : (
                              <ToggleLeft className="w-6 h-6 text-gray-300" />
                            )}
                          </button>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <button
                            onClick={() => openEdit(head)}
                            className="p-1.5 text-[#5B6478] hover:text-[#2158E0] hover:bg-blue-50 rounded-lg transition cursor-pointer"
                            title="Edit fee head"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* System heads */}
          {systemHeads.length > 0 && (
            <div className="bg-white border border-[#E6EAF3] rounded-xl overflow-hidden shadow-xs">
              <div className="px-5 py-4 border-b border-[#E6EAF3] bg-gray-50/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#2158E0]" />
                  <h2 className="text-sm font-semibold text-[#141A2E]">System Heads ({systemHeads.length})</h2>
                </div>
                <span className="text-xs text-[#5B6478]">Managed by core engine</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <tbody>
                    {systemHeads.map((head) => {
                      const isTransport = head.code === "transport_fee";
                      return (
                        <tr key={head.id} className="border-b border-[#E6EAF3] last:border-0 hover:bg-gray-50/30">
                          <td className="px-5 py-3 font-medium text-[#141A2E]">
                            <div className="flex items-center gap-2">
                              <span>{head.name}</span>
                              {isTransport && (
                                hasTransportFeature ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
                                    <Sparkles className="w-2.5 h-2.5 text-emerald-600" />
                                    Pro {subscriptionInfo?.isTrialActive ? "Trial" : "Plan"}
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 inline-flex items-center gap-1">
                                    <Lock className="w-2.5 h-2.5 text-amber-600" />
                                    Pro Required
                                  </span>
                                )
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-3 text-[#5B6478] font-mono text-xs">{head.code}</td>
                          <td className="px-3 py-3">
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                              {head.kind === "recurring" ? "Recurring" : "One-time"}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-right">
                            {isTransport ? (
                              hasTransportFeature ? (
                                <span
                                  title="Transport Fee is active and unlocked under your active Pro subscription / trial"
                                  className="text-emerald-700 bg-emerald-50/80 border border-emerald-200 px-2.5 py-1 rounded-lg inline-flex items-center gap-1.5 text-xs font-semibold"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                  Unlocked
                                </span>
                              ) : (
                                <Link
                                  to="/onboarding/subscription"
                                  title="Activate 14-day Pro trial or upgrade to unlock Transport Fee"
                                  className="text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2.5 py-1 rounded-lg inline-flex items-center gap-1.5 text-xs font-semibold transition"
                                >
                                  <Lock className="w-3.5 h-3.5 text-amber-600" />
                                  Locked (Upgrade)
                                </Link>
                              )
                            ) : (
                              <span
                                title="System head — automatically managed by core billing engine"
                                className="text-[#5B6478] bg-gray-100 px-2.5 py-1 rounded-lg inline-flex items-center gap-1 text-xs font-medium"
                              >
                                <ShieldCheck className="w-3.5 h-3.5 text-[#5B6478]" />
                                System Managed
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Drawer */}
      {drawer.open && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40 backdrop-blur-xs transition-opacity" onClick={() => setDrawer({ open: false, mode: "add" })} />
          <div className="w-96 bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
            <div className="px-6 py-4 border-b border-[#E6EAF3] flex items-center justify-between">
              <h2 className="text-base font-bold text-[#141A2E]">
                {drawer.mode === "add" ? "Add Fee Head" : "Edit Fee Head"}
              </h2>
              <button
                onClick={() => setDrawer({ open: false, mode: "add" })}
                className="text-[#5B6478] hover:text-[#141A2E] text-lg font-semibold"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {formError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-600 text-sm flex gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-[#141A2E] mb-1">Name *</label>
                <input
                  className="w-full border border-[#E6EAF3] rounded-lg px-3 py-2 text-sm focus:border-[#2158E0] focus:ring-1 focus:ring-[#2158E0] outline-none transition"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Tuition Fee"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#141A2E] mb-1">Code *</label>
                <input
                  className="w-full border border-[#E6EAF3] rounded-lg px-3 py-2 text-sm font-mono focus:border-[#2158E0] focus:ring-1 focus:ring-[#2158E0] outline-none transition"
                  value={form.code}
                  disabled={drawer.mode === "edit"}
                  onChange={e => setForm(f => ({ ...f, code: e.target.value.toLowerCase().replace(/\s+/g, "_") }))}
                  placeholder="e.g. tuition_fee"
                />
                {drawer.mode === "edit" && (
                  <p className="text-[11px] text-[#5B6478] mt-1">Code cannot be changed once created to maintain ledger integrity.</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-[#141A2E] mb-1">Type</label>
                <select
                  className="w-full border border-[#E6EAF3] rounded-lg px-3 py-2 text-sm focus:border-[#2158E0] focus:ring-1 focus:ring-[#2158E0] outline-none transition"
                  value={form.kind}
                  onChange={e => setForm(f => ({ ...f, kind: e.target.value as FeeHeadKind }))}
                >
                  <option value="recurring">Recurring (charged each term/month)</option>
                  <option value="one_time">One-time (charged once on admission/annual)</option>
                </select>
              </div>
              <label className="flex items-start gap-3 cursor-pointer pt-2">
                <input
                  type="checkbox"
                  checked={form.is_refundable ?? false}
                  onChange={e => setForm(f => ({ ...f, is_refundable: e.target.checked }))}
                  className="w-4 h-4 mt-0.5 accent-[#2158E0] rounded"
                />
                <div>
                  <span className="text-sm font-medium text-[#141A2E] block">Refundable</span>
                  <span className="text-xs text-[#5B6478] block">Caution deposit or security fee refundable at exit</span>
                </div>
              </label>
              <label className="flex items-start gap-3 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={form.rte_waivable ?? false}
                  onChange={e => setForm(f => ({ ...f, rte_waivable: e.target.checked }))}
                  className="w-4 h-4 mt-0.5 accent-[#2158E0] rounded"
                />
                <div>
                  <span className="text-sm font-medium text-[#141A2E] block">RTE Waivable</span>
                  <span className="text-xs text-[#5B6478] block">Eligible for automatic concession for RTE admitted students</span>
                </div>
              </label>
            </div>
            <div className="px-6 py-4 border-t border-[#E6EAF3] flex gap-3 bg-gray-50/50">
              <button
                type="button"
                onClick={() => setDrawer({ open: false, mode: "add" })}
                className="flex-1 px-4 py-2 border border-[#E6EAF3] bg-white rounded-lg text-sm font-medium text-[#5B6478] hover:bg-gray-100 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-[#2158E0] text-white rounded-lg text-sm font-medium hover:bg-[#1a46b8] disabled:opacity-60 flex items-center justify-center gap-2 transition cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-[#E6EAF3]">
              <h2 className="text-base font-bold text-[#141A2E]">Add Suggested Heads</h2>
              <p className="text-xs text-[#5B6478] mt-0.5">Select standard fee categories commonly used by Indian schools</p>
            </div>
            <div className="px-6 py-4 space-y-2 max-h-80 overflow-y-auto">
              {SUGGESTED_FEE_HEADS.map((s) => {
                const alreadyExists = existingCodes.has(s.code);
                return (
                  <label
                    key={s.code}
                    className={`flex items-center gap-3 p-2.5 rounded-xl border transition ${
                      alreadyExists
                        ? "opacity-50 border-gray-100 bg-gray-50 cursor-not-allowed"
                        : selectedSuggested.has(s.code)
                        ? "border-blue-200 bg-blue-50/50 cursor-pointer"
                        : "border-transparent hover:bg-gray-50 cursor-pointer"
                    }`}
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
                      className="w-4 h-4 accent-[#2158E0] rounded"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#141A2E]">{s.name}</p>
                      <p className="text-xs text-[#5B6478]">
                        {s.kind === "one_time" ? "One-time" : "Recurring"}
                        {s.is_refundable ? " · Refundable" : ""}
                        {s.rte_waivable ? " · RTE waivable" : ""}
                      </p>
                    </div>
                    {alreadyExists && (
                      <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                        Added
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
            <div className="px-6 py-4 border-t border-[#E6EAF3] flex gap-3 bg-gray-50/50">
              <button
                type="button"
                onClick={() => setSuggestOpen(false)}
                className="flex-1 px-4 py-2 border border-[#E6EAF3] bg-white rounded-lg text-sm font-medium text-[#5B6478] hover:bg-gray-100 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddSuggested}
                disabled={saving || selectedSuggested.size === 0}
                className="flex-1 px-4 py-2 bg-[#2158E0] text-white rounded-lg text-sm font-medium hover:bg-[#1a46b8] disabled:opacity-60 flex items-center justify-center gap-2 transition cursor-pointer"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Add {selectedSuggested.size > 0 ? `(${selectedSuggested.size})` : ""}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
