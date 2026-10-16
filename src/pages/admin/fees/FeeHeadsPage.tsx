/**
 * FeeHeadsPage — /admin/fees/setup/heads
 * Redesigned Fee Categories / Heads Management
 *
 * Minimal, modern, professional SaaS interface:
 * 1. Compact Header: Single page title, subtitle, + Add Fee Head primary action, Fee Settings secondary action.
 * 2. Custom Fee Heads Card: Real-time search, status/type filters, active/total counters, and clean 5-column table.
 * 3. Compact System Fee Heads Card: Clear separation for transport, late fees, and carryover dues with system protections.
 * 4. Add / Edit Fee Head Modal/Drawer: Clean, accessible form with auto-code generation, validation, and feedback.
 * 5. Suggested Heads Modal: Quick-add common standard fee heads (Tuition, Exam, Caution Deposit, etc.).
 */

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useOutletContext, Link } from "react-router-dom";
import {
  Plus,
  Lock,
  Edit2,
  ToggleLeft,
  ToggleRight,
  CheckSquare,
  Loader2,
  AlertCircle,
  IndianRupee,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  ShieldCheck,
  Search,
  X,
  Settings,
  ArrowRight,
  Sliders,
  Filter,
} from "lucide-react";
import {
  getFeeHeads,
  createFeeHead,
  updateFeeHead,
  addSuggestedHeads,
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

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "recurring" | "one_time">("all");

  // Drawer / Modals
  const [drawer, setDrawer] = useState<DrawerState>({ open: false, mode: "add" });
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [selectedSuggested, setSelectedSuggested] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  // System head entitlements
  const [hasTransportFeature, setHasTransportFeature] = useState<boolean>(false);
  const [subscriptionInfo, setSubscriptionInfo] = useState<{
    isTrial: boolean;
    isTrialActive: boolean;
    planName: string;
  } | null>(null);

  // Form State
  const [form, setForm] = useState<FeeHeadInput>({
    name: "",
    code: "",
    kind: "recurring",
    is_refundable: false,
    rte_waivable: false,
    is_active: true,
  });
  const [autoCodeEnabled, setAutoCodeEnabled] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (authLoading) return;

    if (!activeSchoolId) {
      setLoading(false);
      setError("No active school found for your account. Please select or initialize your school profile.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
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

  // Generate code slug from name
  const generateSlug = (name: string): string => {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
  };

  function openAdd() {
    setForm({
      name: "",
      code: "",
      kind: "recurring",
      is_refundable: false,
      rte_waivable: false,
      is_active: true,
    });
    setAutoCodeEnabled(true);
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
      is_active: head.is_active,
    });
    setAutoCodeEnabled(false);
    setFormError(null);
    setDrawer({ open: true, mode: "edit", head });
  }

  async function handleSave() {
    const trimmedName = form.name.trim();
    const trimmedCode = form.code.trim();

    if (!trimmedName || !trimmedCode) {
      setFormError("Fee Head Name and Code are required.");
      return;
    }
    if (!activeSchoolId) {
      setFormError("School identifier is missing.");
      return;
    }

    // Check code duplication when adding
    if (drawer.mode === "add") {
      const isDuplicate = heads.some((h) => h.code.toLowerCase() === trimmedCode.toLowerCase());
      if (isDuplicate) {
        setFormError(`Fee code '${trimmedCode}' already exists. Please choose a unique code.`);
        return;
      }
    }

    setSaving(true);
    setFormError(null);

    try {
      if (drawer.mode === "add") {
        const { error: e } = await createFeeHead(
          activeSchoolId,
          { ...form, name: trimmedName, code: trimmedCode },
          profile?.id
        );
        if (e) {
          setFormError(e);
          setSaving(false);
          return;
        }
      } else if (drawer.head) {
        const { error: e } = await updateFeeHead(activeSchoolId, drawer.head.id, {
          name: trimmedName,
          kind: form.kind,
          is_refundable: form.is_refundable,
          rte_waivable: form.rte_waivable,
          is_active: form.is_active,
        });
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
    setHeads((prev) =>
      prev.map((h) => (h.id === head.id ? { ...h, is_active: nextActive } : h))
    );

    const res = await updateFeeHead(activeSchoolId, head.id, { is_active: nextActive });
    if (res.error) {
      // Revert if error
      setHeads((prev) =>
        prev.map((h) => (h.id === head.id ? { ...h, is_active: head.is_active } : h))
      );
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

  const systemHeads = useMemo(() => heads.filter((h) => h.is_system), [heads]);
  const userHeads = useMemo(
    () =>
      heads
        .filter((h) => !h.is_system)
        .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)),
    [heads]
  );
  const existingCodes = useMemo(() => new Set(heads.map((h) => h.code)), [heads]);

  // Filtered User Heads
  const filteredUserHeads = useMemo(() => {
    return userHeads.filter((head) => {
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = head.name.toLowerCase().includes(q);
        const matchesCode = head.code.toLowerCase().includes(q);
        if (!matchesName && !matchesCode) return false;
      }
      // Status filter
      if (statusFilter === "active" && !head.is_active) return false;
      if (statusFilter === "inactive" && head.is_active) return false;

      // Type filter
      if (typeFilter !== "all" && head.kind !== typeFilter) return false;

      return true;
    });
  }, [userHeads, searchQuery, statusFilter, typeFilter]);

  const activeCount = userHeads.filter((h) => h.is_active).length;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* ─── 1. Page Header ──────────────────────────────────────────────── */}
      <FeeNavHeader
        title="Fee Heads"
        subtitle="Manage the types of fees your school charges."
        action={
          <div className="flex items-center gap-2">
            <Link
              to="/admin/fees/setup/settings"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors shadow-2xs"
            >
              <Settings className="w-3.5 h-3.5 text-slate-500" />
              <span>Fee Settings</span>
            </Link>

            <button
              onClick={openAdd}
              type="button"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2563EB] text-white text-xs font-semibold hover:bg-[#1D4ED8] transition-colors cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Add Fee Head</span>
            </button>
          </div>
        }
      />

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-[#64748B]">
          <Loader2 className="w-8 h-8 animate-spin text-[#2563EB] mb-3" />
          <p className="text-sm font-semibold text-[#0F172A]">Loading fee heads…</p>
          <p className="text-xs text-[#64748B] mt-1">Retrieving configured categories and system defaults</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center my-6 shadow-2xs">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-red-800">Unable to load fee heads</h3>
          <p className="text-xs text-red-600 mt-1 max-w-md mx-auto">{error}</p>
          <button
            onClick={() => load()}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-red-300 text-red-700 rounded-lg text-xs font-semibold hover:bg-red-50 shadow-2xs cursor-pointer transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* ─── 2. Custom Fee Heads Card ──────────────────────────────────── */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-xs overflow-hidden">
            {/* Card Header & Toolbar */}
            <div className="p-4 sm:p-5 border-b border-[#E2E8F0] flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-sm font-bold text-[#0F172A]">Custom Fee Heads</h2>
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-[#2563EB] border border-blue-100">
                    {userHeads.length} Total
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                    {activeCount} Active
                  </span>
                </div>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Standard recurring and one-time fees configured for your school
                </p>
              </div>

              {/* Controls: Search, Filters & Suggested Heads */}
              <div className="flex items-center gap-2.5 flex-wrap">
                {/* Search */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search fee heads..."
                    className="pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#2563EB] focus:bg-white w-40 sm:w-48 transition-all"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:border-[#2563EB] cursor-pointer"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active only</option>
                  <option value="inactive">Inactive only</option>
                </select>

                {/* Type Filter */}
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as any)}
                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:border-[#2563EB] cursor-pointer"
                >
                  <option value="all">All Types</option>
                  <option value="recurring">Recurring</option>
                  <option value="one_time">One-time</option>
                </select>

                {/* Suggested Heads Trigger */}
                <button
                  type="button"
                  onClick={() => setSuggestOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors cursor-pointer shadow-2xs"
                  title="Select from standard fee categories"
                >
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  <span>Suggested Heads</span>
                </button>
              </div>
            </div>

            {/* Table or Empty State */}
            {userHeads.length === 0 ? (
              <div className="py-16 text-center px-4">
                <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#2563EB] flex items-center justify-center mx-auto mb-3 border border-blue-100">
                  <IndianRupee className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-[#0F172A]">No Custom Fee Heads Configured</h3>
                <p className="text-xs text-[#64748B] mt-1 max-w-md mx-auto mb-5">
                  Get started quickly with standard categories like Tuition Fee, Exam Fee, and Caution Deposit, or create custom heads tailored to your school.
                </p>
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={() => setSuggestOpen(true)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs transition"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    <span>Add Suggested Heads</span>
                  </button>
                  <button
                    onClick={openAdd}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2563EB] text-white text-xs font-semibold hover:bg-[#1D4ED8] cursor-pointer shadow-xs transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add First Fee Head</span>
                  </button>
                </div>
              </div>
            ) : filteredUserHeads.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#64748B]">
                <p>No fee heads match your current search or filter criteria.</p>
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setStatusFilter("all");
                    setTypeFilter("all");
                  }}
                  className="mt-2 text-[#2563EB] hover:underline font-semibold"
                >
                  Clear all filters
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-[#E2E8F0] bg-slate-50/60 text-[#64748B] font-semibold">
                      <th className="py-3 px-4">Fee Head</th>
                      <th className="py-3 px-4">Code</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    {filteredUserHeads.map((head) => (
                      <tr
                        key={head.id}
                        className="hover:bg-slate-50/70 transition-colors group"
                      >
                        {/* 1. Fee Head Name + Optional Tags */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-[#0F172A] text-sm">
                              {head.name}
                            </span>
                            {head.is_refundable && (
                              <span
                                className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"
                                title="Caution deposit or security fee refundable at exit"
                              >
                                Refundable
                              </span>
                            )}
                            {head.rte_waivable && (
                              <span
                                className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-[#2563EB] border border-blue-200"
                                title="Eligible for automatic concession for RTE admitted students"
                              >
                                RTE Waivable
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 2. Code */}
                        <td className="py-3 px-4 font-mono text-slate-500">
                          {head.code}
                        </td>

                        {/* 3. Type */}
                        <td className="py-3 px-4">
                          {head.kind === "recurring" ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200/60">
                              Recurring
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-purple-50 text-purple-700 border border-purple-200/60">
                              One-time
                            </span>
                          )}
                        </td>

                        {/* 4. Status Indicator / Toggle */}
                        <td className="py-3 px-4">
                          <button
                            type="button"
                            onClick={() => toggleActive(head)}
                            className="inline-flex items-center gap-1.5 cursor-pointer group/toggle focus:outline-none"
                            title={head.is_active ? "Click to deactivate" : "Click to activate"}
                          >
                            {head.is_active ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 group-hover/toggle:border-emerald-300">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500 border border-slate-200 group-hover/toggle:border-slate-300">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                Inactive
                              </span>
                            )}
                          </button>
                        </td>

                        {/* 5. Actions */}
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => openEdit(head)}
                            className="p-1.5 text-slate-400 hover:text-[#2563EB] hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="Edit fee head"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ─── 3. System Fee Heads Section ───────────────────────────────── */}
          {systemHeads.length > 0 && (
            <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-xs overflow-hidden">
              <div className="px-5 py-4 border-b border-[#E2E8F0] bg-slate-50/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#2563EB]" />
                  <h2 className="text-sm font-bold text-[#0F172A]">
                    System Fee Heads ({systemHeads.length})
                  </h2>
                </div>
                <span className="text-[11px] text-[#64748B]">
                  Protected categories managed by core billing rules
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-[#E2E8F0] bg-slate-50/25 text-[#64748B] font-semibold">
                      <th className="py-2.5 px-4">Fee Head</th>
                      <th className="py-2.5 px-4">Code</th>
                      <th className="py-2.5 px-4">Type</th>
                      <th className="py-2.5 px-4 text-right">System Status & Configuration</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    {systemHeads.map((head) => {
                      const isTransport = head.code === "transport_fee";
                      const isLateFee = head.code === "late_fee";

                      return (
                        <tr key={head.id} className="hover:bg-slate-50/40">
                          {/* Name */}
                          <td className="py-3 px-4 font-semibold text-[#0F172A]">
                            <div className="flex items-center gap-2">
                              <span>{head.name}</span>
                              {isTransport && (
                                hasTransportFeature ? (
                                  <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
                                    <Sparkles className="w-2.5 h-2.5 text-emerald-600" />
                                    Pro {subscriptionInfo?.isTrialActive ? "Trial" : "Plan"}
                                  </span>
                                ) : (
                                  <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 inline-flex items-center gap-1">
                                    <Lock className="w-2.5 h-2.5 text-amber-600" />
                                    Pro Required
                                  </span>
                                )
                              )}
                            </div>
                          </td>

                          {/* Code */}
                          <td className="py-3 px-4 font-mono text-slate-500">
                            {head.code}
                          </td>

                          {/* Type */}
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600">
                              {head.kind === "recurring" ? "Recurring" : "One-time"}
                            </span>
                          </td>

                          {/* Action / System status */}
                          <td className="py-3 px-4 text-right">
                            {isTransport ? (
                              hasTransportFeature ? (
                                <Link
                                  to="/admin/transport/fees"
                                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#2563EB] hover:underline"
                                >
                                  <span>Manage Zones</span>
                                  <ArrowRight className="w-3 h-3" />
                                </Link>
                              ) : (
                                <Link
                                  to="/onboarding/subscription"
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition-colors"
                                >
                                  <Lock className="w-3 h-3 text-amber-600" />
                                  <span>Unlock Pro</span>
                                </Link>
                              )
                            ) : isLateFee ? (
                              <Link
                                to="/admin/fees/setup/late-fees"
                                className="inline-flex items-center gap-1 text-xs font-semibold text-[#2563EB] hover:underline"
                              >
                                <span>Configure Rules</span>
                                <ArrowRight className="w-3 h-3" />
                              </Link>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-100 text-slate-600">
                                <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
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

      {/* ─── 4. Add / Edit Fee Head Drawer / Modal ─────────────────────────── */}
      {drawer.open && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-2xs transition-opacity animate-in fade-in"
            onClick={() => !saving && setDrawer({ open: false, mode: "add" })}
          />

          {/* Drawer Panel */}
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-200 border-l border-[#E2E8F0]">
            {/* Drawer Header */}
            <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-[#0F172A]">
                  {drawer.mode === "add" ? "Add Fee Head" : "Edit Fee Head"}
                </h2>
                <p className="text-xs text-[#64748B] mt-0.5">
                  {drawer.mode === "add"
                    ? "Create a new fee category for student billing"
                    : `Modify '${drawer.head?.name}' configuration`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDrawer({ open: false, mode: "add" })}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Form Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              {formError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-xs flex gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Name */}
              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                  Fee Head Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => {
                    const nextName = e.target.value;
                    setForm((f) => ({
                      ...f,
                      name: nextName,
                      code: autoCodeEnabled && drawer.mode === "add" ? generateSlug(nextName) : f.code,
                    }));
                  }}
                  placeholder="e.g. Tuition Fee"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] outline-none transition"
                />
              </div>

              {/* Code */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-[#0F172A]">
                    Fee Code <span className="text-red-500">*</span>
                  </label>
                  {drawer.mode === "add" && (
                    <button
                      type="button"
                      onClick={() => setAutoCodeEnabled(!autoCodeEnabled)}
                      className="text-[11px] text-[#2563EB] hover:underline"
                    >
                      {autoCodeEnabled ? "Edit manually" : "Auto-generate"}
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  required
                  disabled={drawer.mode === "edit"}
                  value={form.code}
                  onChange={(e) => {
                    setAutoCodeEnabled(false);
                    setForm((f) => ({
                      ...f,
                      code: e.target.value.toLowerCase().replace(/[^a-z0-9_]+/g, "_"),
                    }));
                  }}
                  placeholder="e.g. tuition_fee"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono text-slate-900 disabled:bg-slate-50 disabled:text-slate-400 focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] outline-none transition"
                />
                <p className="text-[11px] text-[#64748B] mt-1">
                  {drawer.mode === "edit"
                    ? "Code is locked to maintain financial ledger consistency."
                    : "Unique identifier used in ledger entries and receipts."}
                </p>
              </div>

              {/* Type */}
              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                  Fee Type
                </label>
                <select
                  value={form.kind}
                  onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value as FeeHeadKind }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:border-[#2563EB] outline-none transition cursor-pointer"
                >
                  <option value="recurring">Recurring (charged each billing cycle/term)</option>
                  <option value="one_time">One-time (charged once on admission or annually)</option>
                </select>
              </div>

              {/* Options */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_refundable ?? false}
                    onChange={(e) => setForm((f) => ({ ...f, is_refundable: e.target.checked }))}
                    className="w-4 h-4 mt-0.5 accent-[#2563EB] rounded"
                  />
                  <div>
                    <span className="text-xs font-semibold text-[#0F172A] block">Refundable</span>
                    <span className="text-[11px] text-[#64748B] block">
                      Caution deposit or security fee refundable upon student exit or withdrawal.
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.rte_waivable ?? false}
                    onChange={(e) => setForm((f) => ({ ...f, rte_waivable: e.target.checked }))}
                    className="w-4 h-4 mt-0.5 accent-[#2563EB] rounded"
                  />
                  <div>
                    <span className="text-xs font-semibold text-[#0F172A] block">RTE Waivable</span>
                    <span className="text-[11px] text-[#64748B] block">
                      Eligible for automatic concession for Right to Education (RTE) quota students.
                    </span>
                  </div>
                </label>

                {drawer.mode === "edit" && (
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.is_active ?? true}
                      onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                      className="w-4 h-4 mt-0.5 accent-[#2563EB] rounded"
                    />
                    <div>
                      <span className="text-xs font-semibold text-[#0F172A] block">Active Status</span>
                      <span className="text-[11px] text-[#64748B] block">
                        Allow assigning this fee in upcoming fee structures and student dues.
                      </span>
                    </div>
                  </label>
                )}
              </div>
            </div>

            {/* Drawer Footer Actions */}
            <div className="px-6 py-4 border-t border-[#E2E8F0] flex gap-3 bg-slate-50/70">
              <button
                type="button"
                disabled={saving}
                onClick={() => setDrawer({ open: false, mode: "add" })}
                className="flex-1 px-4 py-2 border border-slate-200 bg-white rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-[#2563EB] text-white rounded-lg text-xs font-semibold hover:bg-[#1D4ED8] disabled:opacity-60 flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{drawer.mode === "add" ? "Create Fee Head" : "Save Changes"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── 5. Suggested Heads Modal ────────────────────────────────────── */}
      {suggestOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150 border border-[#E2E8F0]">
            <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-[#0F172A]">Add Suggested Heads</h2>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Select standard fee categories commonly used by Indian schools
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSuggestOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-6 py-4 space-y-2 max-h-80 overflow-y-auto">
              {SUGGESTED_FEE_HEADS.map((s) => {
                const alreadyExists = existingCodes.has(s.code);
                return (
                  <label
                    key={s.code}
                    className={`flex items-center gap-3 p-2.5 rounded-xl border transition ${
                      alreadyExists
                        ? "opacity-50 border-slate-100 bg-slate-50 cursor-not-allowed"
                        : selectedSuggested.has(s.code)
                        ? "border-blue-300 bg-blue-50/50 cursor-pointer"
                        : "border-slate-100 hover:bg-slate-50 cursor-pointer"
                    }`}
                  >
                    <input
                      type="checkbox"
                      disabled={alreadyExists}
                      checked={selectedSuggested.has(s.code) || alreadyExists}
                      onChange={(e) => {
                        const next = new Set(selectedSuggested);
                        if (e.target.checked) next.add(s.code);
                        else next.delete(s.code);
                        setSelectedSuggested(next);
                      }}
                      className="w-4 h-4 accent-[#2563EB] rounded"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-[#0F172A]">{s.name}</p>
                      <p className="text-[11px] text-[#64748B]">
                        {s.kind === "one_time" ? "One-time" : "Recurring"}
                        {s.is_refundable ? " · Refundable" : ""}
                        {s.rte_waivable ? " · RTE waivable" : ""}
                      </p>
                    </div>
                    {alreadyExists && (
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                        Added
                      </span>
                    )}
                  </label>
                );
              })}
            </div>

            <div className="px-6 py-4 border-t border-[#E2E8F0] flex gap-3 bg-slate-50/70">
              <button
                type="button"
                onClick={() => setSuggestOpen(false)}
                className="flex-1 px-4 py-2 border border-slate-200 bg-white rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddSuggested}
                disabled={saving || selectedSuggested.size === 0}
                className="flex-1 px-4 py-2 bg-[#2563EB] text-white rounded-lg text-xs font-semibold hover:bg-[#1D4ED8] disabled:opacity-60 flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>
                  Add Selected {selectedSuggested.size > 0 ? `(${selectedSuggested.size})` : ""}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
