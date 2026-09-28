import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Link, useOutletContext } from "react-router-dom";
import {
  Calendar, Check, CheckCircle2, AlertCircle, Plus, Trash2,
  ArrowRight, ArrowLeft, Loader2, RotateCcw,
  Sliders, Layers, Table as TableIcon, Sparkles,
  Clock, IndianRupee, Info, ChevronRight, AlertTriangle
} from "lucide-react";
import {
  getFeeTerms,
  getFeeHeads,
  saveFeeCycleSchedule,
  getFeeCycleSchedule,
  generateTermPreset,
  deleteFeeTerm,
} from "../../../services/feeSetupService";
import type {
  FeeTerm,
  FeeTermInput,
  FeeHead,
  FeeCycleFrequency,
} from "../../../types/fees";
import type { School } from "../../../types/school";
import { useAuth } from "../../../hooks/useAuth";
import { FeeNavHeader } from "../../../components/admin/fees/FeeNavHeader";

type StepId = "setup" | "configure" | "applicability" | "review";

interface FrequencyOption {
  id: FeeCycleFrequency;
  title: string;
  cycleCount: number;
  subtitle: string;
  badge?: string;
}

const FREQUENCY_OPTIONS: FrequencyOption[] = [
  {
    id: "quarterly",
    title: "Quarterly Schedule",
    cycleCount: 4,
    subtitle: "4 cycles: Term 1 (Apr–Jun), Term 2 (Jul–Sep), Term 3 (Oct–Dec), Term 4 (Jan–Mar). Recommended for most Indian K-12 schools.",
    badge: "Recommended",
  },
  {
    id: "monthly",
    title: "Monthly Schedule",
    cycleCount: 12,
    subtitle: "12 cycles: April through March. Best for day-care, pre-primary, or schools collecting dues monthly.",
  },
  {
    id: "three_term",
    title: "Three Terms (Tri-annual)",
    cycleCount: 3,
    subtitle: "3 cycles: Term 1 (Apr–Jul), Term 2 (Aug–Nov), Term 3 (Dec–Mar). Roughly 4 months per billing cycle.",
  },
  {
    id: "half_yearly",
    title: "Half-Yearly Schedule",
    cycleCount: 2,
    subtitle: "2 cycles: Term 1 (Apr–Sep) and Term 2 (Oct–Mar). Best for senior secondary, colleges, or bi-annual collection.",
  },
  {
    id: "yearly",
    title: "Annual / Single Payment",
    cycleCount: 1,
    subtitle: "1 cycle: Full year fee collected upfront at the start of admission or academic session.",
  },
  {
    id: "custom",
    title: "Custom Frequency",
    cycleCount: 0,
    subtitle: "Define arbitrary billing terms, exam-aligned due dates, or irregular intervals specific to your school.",
  },
];

export default function FeeTermsPage() {
  const { school: authSchool, schoolId: authSchoolId, loading: authLoading } = useAuth() as any;
  const outlet = useOutletContext<{ school: School | null } | null>();
  const school = authSchool || outlet?.school || null;
  const activeSchoolId = school?.id || authSchoolId || null;

  // Active step: "setup" -> "configure" -> "applicability" -> "review"
  const [currentStep, setCurrentStep] = useState<StepId>("setup");

  // Core data states
  const [yearId, setYearId] = useState<string>("ay_current");
  const [yearName, setYearName] = useState<string>("2025-2026");
  const [sessionStart, setSessionStart] = useState<string>("2025-04-01");
  const [defaultDueDay, setDefaultDueDay] = useState<number>(10);
  const [defaultGraceDays, setDefaultGraceDays] = useState<number>(5);
  const [frequency, setFrequency] = useState<FeeCycleFrequency>("quarterly");

  const [heads, setHeads] = useState<FeeHead[]>([]);
  const [terms, setTerms] = useState<FeeTermInput[]>([]);
  // headMapping: headId -> termIds (or term names)
  const [headMapping, setHeadMapping] = useState<Record<string, string[]>>({});

  // UI status
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<"cards" | "matrix">("cards");

  // Load initial data
  const loadData = useCallback(async () => {
    if (authLoading) return;
    if (!activeSchoolId) {
      setLoading(false);
      setError("No active school found. Please check your school context.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Resolve Academic Year
      const years = typeof localStorage !== "undefined"
        ? JSON.parse(localStorage.getItem(`myzkool_academic_years_${activeSchoolId}`) || "[]")
        : [];
      let currentYear = years.find((y: any) => y.is_current);
      if (!currentYear && years.length > 0) currentYear = years[0];

      const resolvedYearId = currentYear?.id || `ay_${activeSchoolId}`;
      const resolvedYearName = currentYear?.name || "2025-2026";
      const resolvedStart = currentYear?.start_date || `${currentYear?.start_year || 2025}-04-01`;

      setYearId(resolvedYearId);
      setYearName(resolvedYearName);
      setSessionStart(resolvedStart);

      // 2. Fetch Fee Heads & Fee Cycle Schedule
      const [headsRes, scheduleRes] = await Promise.all([
        getFeeHeads(activeSchoolId, true),
        getFeeCycleSchedule(activeSchoolId, resolvedYearId),
      ]);

      const activeHeads = headsRes.heads || [];
      setHeads(activeHeads);

      if (scheduleRes.terms && scheduleRes.terms.length > 0) {
        // Populate existing terms
        setTerms(scheduleRes.terms.map(t => ({
          id: t.id,
          name: t.name,
          period_start: t.period_start,
          period_end: t.period_end,
          due_date: t.due_date,
          late_grace_days: t.late_grace_days,
          sort_order: t.sort_order,
          applicable_fee_head_ids: t.applicable_fee_head_ids || [],
        })));
        setFrequency(scheduleRes.frequency || "quarterly");

        // Populate head mapping
        if (scheduleRes.headMapping && Object.keys(scheduleRes.headMapping).length > 0) {
          setHeadMapping(scheduleRes.headMapping);
        } else {
          // Initialize default head mapping if not set
          const initialMap: Record<string, string[]> = {};
          const allTermIds = scheduleRes.terms.map(t => t.id);
          const firstTermId = scheduleRes.terms[0]?.id ? [scheduleRes.terms[0].id] : [];

          for (const h of activeHeads) {
            if (h.kind === "recurring") {
              initialMap[h.id] = [...allTermIds];
            } else if (h.code === "exam_fee") {
              // Exam fee default: mid-term and final
              const midTerm = scheduleRes.terms[Math.floor(scheduleRes.terms.length / 2)]?.id;
              const lastTerm = scheduleRes.terms[scheduleRes.terms.length - 1]?.id;
              initialMap[h.id] = Array.from(new Set([midTerm, lastTerm].filter(Boolean) as string[]));
            } else {
              // Other one-time charges (Admission, Caution Deposit) in first term
              initialMap[h.id] = [...firstTermId];
            }
          }
          setHeadMapping(initialMap);
        }
        // Jump directly to configure or review if already set
        setCurrentStep("configure");
      } else {
        // No terms configured yet: generate default Quarterly terms
        const generated = generateTermPreset(resolvedYearId, activeSchoolId, "quarterly", resolvedStart, defaultDueDay, defaultGraceDays);
        setTerms(generated);
        setFrequency("quarterly");

        // Prepopulate default head mapping
        const initialMap: Record<string, string[]> = {};
        for (const h of activeHeads) {
          if (h.kind === "recurring") {
            initialMap[h.id] = generated.map(t => t.name);
          } else if (h.code === "exam_fee") {
            initialMap[h.id] = [generated[1]?.name, generated[3]?.name].filter(Boolean) as string[];
          } else {
            initialMap[h.id] = generated[0]?.name ? [generated[0].name] : [];
          }
        }
        setHeadMapping(initialMap);
      }
    } catch (err: any) {
      console.error("Failed to load fee terms schedule:", err);
      setError(err.message || "Failed to load fee terms.");
    } finally {
      setLoading(false);
    }
  }, [activeSchoolId, authLoading, defaultDueDay, defaultGraceDays]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handler: Apply frequency preset
  const applyFrequencyPreset = (chosenFreq: FeeCycleFrequency) => {
    setFrequency(chosenFreq);
    if (chosenFreq === "custom") {
      // Keep existing terms or leave editable
      return;
    }
    const presetTerms = generateTermPreset(yearId, activeSchoolId || "default", chosenFreq, sessionStart, defaultDueDay, defaultGraceDays);
    setTerms(presetTerms);

    // Auto-update head mapping for the new terms
    const newMap: Record<string, string[]> = {};
    const allTermIdentifiers = presetTerms.map(t => t.id || t.name);
    const firstTermIdentifier = allTermIdentifiers[0] ? [allTermIdentifiers[0]] : [];

    for (const h of heads) {
      if (h.kind === "recurring") {
        newMap[h.id] = [...allTermIdentifiers];
      } else if (h.code === "exam_fee") {
        if (presetTerms.length >= 4) {
          newMap[h.id] = [allTermIdentifiers[1], allTermIdentifiers[3]].filter(Boolean);
        } else if (presetTerms.length >= 2) {
          newMap[h.id] = [allTermIdentifiers[0], allTermIdentifiers[allTermIdentifiers.length - 1]].filter(Boolean);
        } else {
          newMap[h.id] = [...allTermIdentifiers];
        }
      } else {
        newMap[h.id] = [...firstTermIdentifier];
      }
    }
    setHeadMapping(newMap);
  };

  // Term management helpers
  const handleAddCycle = () => {
    const nextIndex = terms.length;
    const lastTerm = terms[terms.length - 1];

    let newStart = sessionStart;
    let newEnd = sessionStart;
    let newDue = sessionStart;

    if (lastTerm?.period_end) {
      const d = new Date(lastTerm.period_end);
      d.setDate(d.getDate() + 1);
      newStart = d.toISOString().split("T")[0];
      const endD = new Date(d);
      endD.setMonth(endD.getMonth() + 3);
      newEnd = endD.toISOString().split("T")[0];
      const dueD = new Date(d);
      dueD.setDate(defaultDueDay);
      newDue = dueD.toISOString().split("T")[0];
    }

    const newTerm: FeeTermInput = {
      id: crypto.randomUUID(),
      name: `Term ${nextIndex + 1}`,
      period_start: newStart,
      period_end: newEnd,
      due_date: newDue,
      late_grace_days: defaultGraceDays,
      sort_order: nextIndex,
    };

    setTerms(prev => [...prev, newTerm]);

    // Automatically add recurring heads to this new term
    setHeadMapping(prev => {
      const next = { ...prev };
      for (const h of heads) {
        if (h.kind === "recurring") {
          const current = next[h.id] || [];
          next[h.id] = [...current, newTerm.id!];
        }
      }
      return next;
    });
  };

  const handleUpdateTerm = (index: number, field: keyof FeeTermInput, value: any) => {
    setTerms(prev => prev.map((t, i) => i === index ? { ...t, [field]: value } : t));
  };

  const handleDeleteTerm = async (index: number) => {
    const termToDelete = terms[index];
    if (termToDelete.id) {
      const delCheck = await deleteFeeTerm(activeSchoolId!, termToDelete.id);
      if (!delCheck.success) {
        setError(delCheck.error || "Cannot delete term.");
        return;
      }
    }

    const termIdentifier = termToDelete.id || termToDelete.name;
    setTerms(prev => prev.filter((_, i) => i !== index));

    // Remove from head mappings
    setHeadMapping(prev => {
      const next = { ...prev };
      for (const hid in next) {
        next[hid] = next[hid].filter(tid => tid !== termIdentifier && tid !== termToDelete.name && tid !== termToDelete.id);
      }
      return next;
    });
  };

  // Toggle head applicability to a term
  const toggleHeadForTerm = (headId: string, termKey: string) => {
    setHeadMapping(prev => {
      const current = prev[headId] || [];
      const exists = current.includes(termKey);
      const updated = exists ? current.filter(t => t !== termKey) : [...current, termKey];
      return { ...prev, [headId]: updated };
    });
  };

  const setAllTermsForHead = (headId: string, allTermKeys: string[]) => {
    setHeadMapping(prev => ({ ...prev, [headId]: [...allTermKeys] }));
  };

  const clearAllTermsForHead = (headId: string) => {
    setHeadMapping(prev => ({ ...prev, [headId]: [] }));
  };

  // Validation
  const validationIssues = useMemo(() => {
    const issues: string[] = [];
    if (terms.length === 0) {
      issues.push("At least one billing cycle/term must be configured.");
    }

    const nameSet = new Set<string>();
    terms.forEach((t, i) => {
      if (!t.name || !t.name.trim()) {
        issues.push(`Cycle #${i + 1} is missing a name.`);
      } else if (nameSet.has(t.name.trim().toLowerCase())) {
        issues.push(`Duplicate cycle name: "${t.name}". Each term must have a distinct name.`);
      } else {
        nameSet.add(t.name.trim().toLowerCase());
      }

      if (!t.due_date) {
        issues.push(`Cycle "${t.name || `#${i + 1}`}" is missing a due date.`);
      }

      if (t.period_start && t.period_end && t.period_start > t.period_end) {
        issues.push(`Cycle "${t.name}" has start date (${t.period_start}) later than end date (${t.period_end}).`);
      }
    });

    // Check if any active term has zero heads
    const allTermIdentifiers = terms.map(t => t.id || t.name);
    const coveredTerms = new Set<string>();
    Object.values(headMapping).forEach((tids: string[]) => {
      (tids || []).forEach(id => coveredTerms.add(id));
    });

    const unassignedTerm = terms.find(t => !coveredTerms.has(t.id || "") && !coveredTerms.has(t.name));
    if (unassignedTerm) {
      issues.push(`Cycle "${unassignedTerm.name}" has no fee heads assigned to it.`);
    }

    return issues;
  }, [terms, headMapping]);

  // Final Save Handler
  const handleSaveSchedule = async () => {
    if (validationIssues.length > 0) {
      setError(validationIssues[0]);
      return;
    }
    if (!activeSchoolId) {
      setError("Active school context not found.");
      return;
    }

    setSaving(true);
    setError(null);
    setSaveSuccess(false);

    try {
      const res = await saveFeeCycleSchedule(
        activeSchoolId,
        yearId,
        terms,
        headMapping,
        frequency
      );

      if (res.error) {
        setError(res.error);
      } else {
        setSaveSuccess(true);
        // Refresh terms with stored IDs
        if (res.terms) {
          setTerms(res.terms.map(t => ({
            id: t.id,
            name: t.name,
            period_start: t.period_start,
            period_end: t.period_end,
            due_date: t.due_date,
            late_grace_days: t.late_grace_days,
            sort_order: t.sort_order,
            applicable_fee_head_ids: t.applicable_fee_head_ids,
          })));
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to save fee schedule.");
    } finally {
      setSaving(false);
    }
  };

  const allTermKeys = terms.map(t => t.id || t.name);

  return (
    <div className="max-w-6xl mx-auto py-6 px-4">
      <FeeNavHeader
        title="Billing Cycles & Terms Setup"
        subtitle={`Configure the payment calendar, due dates, and fee head distribution for ${yearName}.`}
        action={
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg">
              AY: {yearName}
            </span>
          </div>
        }
      />

      {/* 4-Step Progress Indicator */}
      <div className="bg-white border border-[#E6EAF3] rounded-2xl p-4 mb-6 shadow-xs">
        <div className="grid grid-cols-4 gap-2 text-center">
          {[
            { id: "setup", label: "1. Setup & Frequency", icon: Sliders },
            { id: "configure", label: "2. Configure Cycles", icon: Calendar },
            { id: "applicability", label: "3. Head Applicability", icon: Layers },
            { id: "review", label: "4. Review & Save", icon: CheckCircle2 },
          ].map((step, idx) => {
            const Icon = step.icon;
            const isActive = currentStep === step.id;
            const isCompleted =
              (step.id === "setup" && currentStep !== "setup") ||
              (step.id === "configure" && (currentStep === "applicability" || currentStep === "review")) ||
              (step.id === "applicability" && currentStep === "review");

            return (
              <button
                key={step.id}
                onClick={() => setCurrentStep(step.id as StepId)}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  isActive
                    ? "bg-[#2158E0] text-white shadow-xs"
                    : isCompleted
                    ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                    : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-white" : isCompleted ? "text-emerald-600" : "text-gray-400"}`} />
                <span className="hidden sm:inline">{step.label}</span>
                <span className="sm:hidden">{idx + 1}</span>
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-[#5B6478]">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-3" />
          <p className="text-sm font-medium text-[#141A2E]">Loading billing schedule…</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center my-6">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-red-800">Notice</h3>
          <p className="text-xs text-red-600 mt-1 max-w-md mx-auto">{error}</p>
          <button
            onClick={() => { setError(null); loadData(); }}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-red-300 text-red-700 rounded-lg text-xs font-semibold hover:bg-red-50 shadow-xs cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </button>
        </div>
      ) : (
        <div>
          {/* STEP 1: SETUP & FREQUENCY */}
          {currentStep === "setup" && (
            <div className="space-y-6">
              {/* Frequency selection */}
              <div className="bg-white border border-[#E6EAF3] rounded-2xl p-6 shadow-xs">
                <div className="mb-4">
                  <h2 className="text-base font-bold text-[#141A2E]">Select Billing Frequency</h2>
                  <p className="text-xs text-[#5B6478]">
                    Choose how often your school bills parents throughout the academic year.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {FREQUENCY_OPTIONS.map((opt) => {
                    const isSelected = frequency === opt.id;
                    return (
                      <div
                        key={opt.id}
                        onClick={() => applyFrequencyPreset(opt.id)}
                        className={`p-4 rounded-xl border-2 transition cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? "border-[#2158E0] bg-blue-50/40 shadow-xs"
                            : "border-[#E6EAF3] hover:border-slate-300 hover:bg-slate-50/50"
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-bold text-[#141A2E]">{opt.title}</span>
                            {opt.badge && (
                              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-600 text-white">
                                {opt.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[#5B6478] leading-relaxed mb-3">{opt.subtitle}</p>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs font-medium">
                          <span className="text-[#2158E0]">
                            {opt.cycleCount > 0 ? `${opt.cycleCount} terms generated` : "Custom cycles"}
                          </span>
                          <span className={`w-4 h-4 rounded-full flex items-center justify-center border ${isSelected ? "border-[#2158E0] bg-[#2158E0] text-white" : "border-slate-300"}`}>
                            {isSelected && <Check className="w-2.5 h-2.5" />}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Session Defaults */}
              <div className="bg-white border border-[#E6EAF3] rounded-2xl p-6 shadow-xs">
                <h2 className="text-sm font-bold text-[#141A2E] mb-1">Session & Grace Period Defaults</h2>
                <p className="text-xs text-[#5B6478] mb-4">
                  These defaults auto-populate dates and grace periods across generated cycles.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#141A2E] mb-1">Session Start Date</label>
                    <input
                      type="date"
                      value={sessionStart}
                      onChange={e => {
                        setSessionStart(e.target.value);
                        applyFrequencyPreset(frequency);
                      }}
                      className="w-full border border-[#E6EAF3] rounded-lg px-3 py-2 text-sm text-[#141A2E] outline-none focus:border-[#2158E0]"
                    />
                    <span className="text-[11px] text-gray-500 mt-0.5 block">Default first day of Term 1</span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#141A2E] mb-1">Default Due Day of Month</label>
                    <input
                      type="number"
                      min={1}
                      max={28}
                      value={defaultDueDay}
                      onChange={e => {
                        const val = parseInt(e.target.value) || 10;
                        setDefaultDueDay(val);
                      }}
                      className="w-full border border-[#E6EAF3] rounded-lg px-3 py-2 text-sm text-[#141A2E] outline-none focus:border-[#2158E0]"
                    />
                    <span className="text-[11px] text-gray-500 mt-0.5 block">e.g. 10th of the starting month</span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#141A2E] mb-1">Late Grace Period (Days)</label>
                    <input
                      type="number"
                      min={0}
                      max={30}
                      value={defaultGraceDays}
                      onChange={e => {
                        const val = parseInt(e.target.value) || 0;
                        setDefaultGraceDays(val);
                      }}
                      className="w-full border border-[#E6EAF3] rounded-lg px-3 py-2 text-sm text-[#141A2E] outline-none focus:border-[#2158E0]"
                    />
                    <span className="text-[11px] text-gray-500 mt-0.5 block">Days after due date before penalty</span>
                  </div>
                </div>
              </div>

              {/* Next Button */}
              <div className="flex justify-end">
                <button
                  onClick={() => setCurrentStep("configure")}
                  className="flex items-center gap-2 px-6 py-2.5 bg-[#2158E0] text-white rounded-xl text-sm font-semibold hover:bg-[#1a46b8] shadow-xs cursor-pointer transition"
                >
                  <span>Configure {terms.length} Cycles</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: CONFIGURE TERMS */}
          {currentStep === "configure" && (
            <div className="space-y-6">
              <div className="bg-white border border-[#E6EAF3] rounded-2xl overflow-hidden shadow-xs">
                <div className="p-5 border-b border-[#E6EAF3] flex items-center justify-between bg-gray-50/50">
                  <div>
                    <h2 className="text-sm font-bold text-[#141A2E]">Terms & Due Dates ({terms.length})</h2>
                    <p className="text-xs text-[#5B6478]">
                      Verify cycle names, billing windows, due dates, and grace periods.
                    </p>
                  </div>
                  <button
                    onClick={handleAddCycle}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 cursor-pointer shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Cycle</span>
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#E6EAF3] bg-gray-50/25">
                        <th className="text-left px-4 py-3 text-xs text-[#5B6478] font-semibold w-10">#</th>
                        <th className="text-left px-3 py-3 text-xs text-[#5B6478] font-semibold min-w-[180px]">Cycle / Term Name *</th>
                        <th className="text-left px-3 py-3 text-xs text-[#5B6478] font-semibold min-w-[130px]">Start Date</th>
                        <th className="text-left px-3 py-3 text-xs text-[#5B6478] font-semibold min-w-[130px]">End Date</th>
                        <th className="text-left px-3 py-3 text-xs text-[#5B6478] font-semibold min-w-[130px]">Due Date *</th>
                        <th className="text-left px-3 py-3 text-xs text-[#5B6478] font-semibold w-24">Grace Days</th>
                        <th className="text-right px-4 py-3 text-xs text-[#5B6478] font-semibold w-16">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {terms.map((term, i) => (
                        <tr key={term.id || i} className="border-b border-[#E6EAF3] last:border-0 hover:bg-gray-50/50">
                          <td className="px-4 py-3 font-medium text-xs text-gray-500">{i + 1}</td>
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={term.name}
                              onChange={e => handleUpdateTerm(i, "name", e.target.value)}
                              placeholder="e.g. Term 1 (Apr-Jun)"
                              className="w-full border border-gray-200 focus:border-[#2158E0] rounded-lg px-2.5 py-1.5 text-xs text-[#141A2E] font-medium outline-none bg-white"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="date"
                              value={term.period_start || ""}
                              onChange={e => handleUpdateTerm(i, "period_start", e.target.value)}
                              className="border border-gray-200 focus:border-[#2158E0] rounded-lg px-2 py-1.5 text-xs text-[#141A2E] outline-none bg-white"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="date"
                              value={term.period_end || ""}
                              onChange={e => handleUpdateTerm(i, "period_end", e.target.value)}
                              className="border border-gray-200 focus:border-[#2158E0] rounded-lg px-2 py-1.5 text-xs text-[#141A2E] outline-none bg-white"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="date"
                              value={term.due_date}
                              onChange={e => handleUpdateTerm(i, "due_date", e.target.value)}
                              className="border border-gray-200 focus:border-[#2158E0] rounded-lg px-2 py-1.5 text-xs text-[#141A2E] font-medium outline-none bg-white"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min={0}
                              value={term.late_grace_days ?? 0}
                              onChange={e => handleUpdateTerm(i, "late_grace_days", parseInt(e.target.value) || 0)}
                              className="w-16 border border-gray-200 focus:border-[#2158E0] rounded-lg px-2 py-1.5 text-xs text-[#141A2E] outline-none text-center bg-white"
                            />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => handleDeleteTerm(i)}
                              title="Delete cycle"
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Navigation controls */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setCurrentStep("setup")}
                  className="flex items-center gap-2 px-5 py-2 border border-[#E6EAF3] bg-white rounded-xl text-xs font-semibold text-[#5B6478] hover:bg-gray-50"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Setup</span>
                </button>

                <button
                  onClick={() => setCurrentStep("applicability")}
                  className="flex items-center gap-2 px-6 py-2.5 bg-[#2158E0] text-white rounded-xl text-sm font-semibold hover:bg-[#1a46b8] shadow-xs cursor-pointer"
                >
                  <span>Configure Fee Head Applicability</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: HEAD APPLICABILITY */}
          {currentStep === "applicability" && (
            <div className="space-y-6">
              <div className="bg-white border border-[#E6EAF3] rounded-2xl p-6 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-gray-100">
                  <div>
                    <h2 className="text-base font-bold text-[#141A2E]">Fee Head Assignment by Cycle</h2>
                    <p className="text-xs text-[#5B6478]">
                      Assign recurring heads (Tuition, Transport) across all terms, and one-time heads (Exam, Admission) to specific terms.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-xl self-start">
                    <button
                      onClick={() => setViewMode("cards")}
                      className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${viewMode === "cards" ? "bg-white text-[#141A2E] shadow-xs" : "text-gray-600"}`}
                    >
                      Cards View
                    </button>
                    <button
                      onClick={() => setViewMode("matrix")}
                      className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${viewMode === "matrix" ? "bg-white text-[#141A2E] shadow-xs" : "text-gray-600"}`}
                    >
                      Matrix View
                    </button>
                  </div>
                </div>

                {heads.length === 0 ? (
                  <div className="text-center py-12 text-[#5B6478]">
                    <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-[#141A2E]">No Fee Heads Configured</p>
                    <p className="text-xs mt-1 mb-4">Please create fee heads (Tuition, Admission, Exam Fee) first.</p>
                    <Link
                      to="/admin/fees/setup/heads"
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700"
                    >
                      Go to Fee Heads Page →
                    </Link>
                  </div>
                ) : viewMode === "cards" ? (
                  <div className="space-y-4">
                    {heads.map((head) => {
                      const assignedTermKeys = headMapping[head.id] || [];
                      const isAllAssigned = allTermKeys.every(k => assignedTermKeys.includes(k));
                      const isNoneAssigned = assignedTermKeys.length === 0;

                      return (
                        <div key={head.id} className="border border-[#E6EAF3] rounded-xl p-4 hover:border-slate-300 transition">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-[#141A2E]">{head.name}</span>
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${head.kind === "recurring" ? "bg-blue-50 text-blue-700" : "bg-purple-50 text-purple-700"}`}>
                                {head.kind === "recurring" ? "Recurring" : "One-time"}
                              </span>
                              {head.is_refundable && (
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                                  Refundable
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2 text-xs">
                              <button
                                type="button"
                                onClick={() => setAllTermsForHead(head.id, allTermKeys)}
                                className="text-blue-600 hover:underline font-semibold text-xs cursor-pointer"
                              >
                                All Cycles
                              </button>
                              <span className="text-gray-300">|</span>
                              <button
                                type="button"
                                onClick={() => {
                                  if (allTermKeys[0]) setHeadMapping(prev => ({ ...prev, [head.id]: [allTermKeys[0]] }));
                                }}
                                className="text-blue-600 hover:underline font-semibold text-xs cursor-pointer"
                              >
                                Term 1 Only
                              </button>
                              <span className="text-gray-300">|</span>
                              <button
                                type="button"
                                onClick={() => clearAllTermsForHead(head.id)}
                                className="text-gray-500 hover:underline text-xs cursor-pointer"
                              >
                                Clear
                              </button>
                            </div>
                          </div>

                          {/* Chips for terms */}
                          <div className="flex flex-wrap gap-2">
                            {terms.map((term, tIdx) => {
                              const termKey = term.id || term.name;
                              const isChecked = assignedTermKeys.includes(termKey) || (term.id && assignedTermKeys.includes(term.id)) || assignedTermKeys.includes(term.name);

                              return (
                                <button
                                  key={termKey}
                                  type="button"
                                  onClick={() => toggleHeadForTerm(head.id, termKey)}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer border ${
                                    isChecked
                                      ? "bg-blue-50 border-blue-200 text-blue-800"
                                      : "bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-100"
                                  }`}
                                >
                                  <span className={`w-3.5 h-3.5 rounded-sm flex items-center justify-center border text-[10px] ${
                                    isChecked ? "bg-blue-600 border-blue-600 text-white" : "border-gray-300 bg-white"
                                  }`}>
                                    {isChecked && "✓"}
                                  </span>
                                  <span>{term.name}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* Matrix View */
                  <div className="overflow-x-auto border border-[#E6EAF3] rounded-xl">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-gray-50 border-b border-[#E6EAF3]">
                          <th className="text-left px-4 py-3 font-semibold text-[#141A2E] min-w-[160px]">Fee Category</th>
                          <th className="text-left px-2 py-3 font-semibold text-[#5B6478] w-20">Type</th>
                          {terms.map((term) => (
                            <th key={term.id || term.name} className="text-center px-3 py-3 font-semibold text-[#141A2E] min-w-[100px]">
                              {term.name}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {heads.map((head) => {
                          const assigned = headMapping[head.id] || [];
                          return (
                            <tr key={head.id} className="border-b border-[#E6EAF3] last:border-0 hover:bg-gray-50/50">
                              <td className="px-4 py-2.5 font-medium text-[#141A2E]">{head.name}</td>
                              <td className="px-2 py-2.5 text-gray-500 capitalize">{head.kind}</td>
                              {terms.map((term) => {
                                const termKey = term.id || term.name;
                                const isChecked = assigned.includes(termKey) || (term.id && assigned.includes(term.id)) || assigned.includes(term.name);

                                return (
                                  <td key={termKey} className="text-center px-3 py-2.5">
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => toggleHeadForTerm(head.id, termKey)}
                                      className="w-4 h-4 accent-[#2158E0] cursor-pointer rounded"
                                    />
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Navigation controls */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setCurrentStep("configure")}
                  className="flex items-center gap-2 px-5 py-2 border border-[#E6EAF3] bg-white rounded-xl text-xs font-semibold text-[#5B6478] hover:bg-gray-50 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Cycles</span>
                </button>

                <button
                  onClick={() => setCurrentStep("review")}
                  className="flex items-center gap-2 px-6 py-2.5 bg-[#2158E0] text-white rounded-xl text-sm font-semibold hover:bg-[#1a46b8] shadow-xs cursor-pointer"
                >
                  <span>Review Schedule & Summary</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: REVIEW & SAVE */}
          {currentStep === "review" && (
            <div className="space-y-6">
              {/* Validation Status Box */}
              {validationIssues.length > 0 ? (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-amber-800 font-semibold text-sm mb-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>Please correct the following before saving:</span>
                  </div>
                  <ul className="list-disc list-inside text-xs text-amber-700 space-y-1">
                    {validationIssues.map((issue, idx) => (
                      <li key={idx}>{issue}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-emerald-900">Schedule Verified and Valid</p>
                    <p className="text-[11px] text-emerald-700">
                      All {terms.length} billing cycles have valid dates, non-overlapping timelines, and assigned fee categories.
                    </p>
                  </div>
                </div>
              )}

              {/* Save Success Alert */}
              {saveSuccess && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center shadow-xs">
                  <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
                  <h3 className="text-base font-bold text-emerald-900">Fee Schedule Successfully Saved & Activated!</h3>
                  <p className="text-xs text-emerald-700 mt-1 max-w-md mx-auto mb-4">
                    Your {terms.length} billing cycles are now active for academic year {yearName}. Existing and new fee structures will automatically adopt this payment schedule.
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    <Link
                      to="/admin/fees/setup/structures"
                      className="px-4 py-2 bg-[#2158E0] text-white rounded-lg text-xs font-semibold hover:bg-[#1a46b8]"
                    >
                      Set Class Fee Amounts in Structures →
                    </Link>
                    <Link
                      to="/admin/fees/setup"
                      className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-50"
                    >
                      Return to Fee Setup Checklist
                    </Link>
                  </div>
                </div>
              )}

              {/* Schedule Summary Card */}
              <div className="bg-white border border-[#E6EAF3] rounded-2xl p-6 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-100 gap-2 mb-6">
                  <div>
                    <h2 className="text-base font-bold text-[#141A2E]">Fee Schedule Preview ({yearName})</h2>
                    <p className="text-xs text-[#5B6478]">
                      Frequency: <span className="font-semibold capitalize">{frequency.replace("_", " ")}</span> · {terms.length} Billing Terms
                    </p>
                  </div>

                  <button
                    onClick={handleSaveSchedule}
                    disabled={saving || validationIssues.length > 0}
                    className="flex items-center justify-center gap-2 px-6 py-2.5 bg-[#2158E0] text-white rounded-xl text-sm font-semibold hover:bg-[#1a46b8] disabled:opacity-60 shadow-xs cursor-pointer"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    <span>Save & Activate Schedule</span>
                  </button>
                </div>

                {/* Term-by-term breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {terms.map((term, i) => {
                    const termKey = term.id || term.name;
                    // Find all heads mapped to this term
                    const mappedHeads = heads.filter(h => {
                      const tids = headMapping[h.id] || [];
                      return tids.includes(termKey) || (term.id && tids.includes(term.id)) || tids.includes(term.name);
                    });

                    return (
                      <div key={termKey} className="border border-[#E6EAF3] rounded-xl p-4 bg-gray-50/30">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <span className="text-xs font-bold text-[#141A2E]">{term.name}</span>
                            <p className="text-[11px] text-[#5B6478]">
                              {term.period_start || "Start"} to {term.period_end || "End"}
                            </p>
                          </div>
                          <span className="text-[10px] font-semibold px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 rounded-md">
                            Due: {term.due_date}
                          </span>
                        </div>

                        <div className="text-[11px] text-[#5B6478] mb-3 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-gray-400" />
                          <span>Grace period: {term.late_grace_days ?? 0} days</span>
                        </div>

                        <div className="pt-2 border-t border-gray-100">
                          <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">
                            Billed in this cycle ({mappedHeads.length}):
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {mappedHeads.length === 0 ? (
                              <span className="text-[11px] text-amber-600 italic">No heads assigned</span>
                            ) : (
                              mappedHeads.map(h => (
                                <span
                                  key={h.id}
                                  className={`text-[10px] font-medium px-2 py-0.5 rounded-md ${
                                    h.kind === "recurring"
                                      ? "bg-white border border-slate-200 text-slate-700"
                                      : "bg-purple-50 border border-purple-100 text-purple-700"
                                  }`}
                                >
                                  {h.name}
                                </span>
                              ))
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bottom Back Button */}
              <div className="flex justify-start">
                <button
                  onClick={() => setCurrentStep("applicability")}
                  className="flex items-center gap-2 px-5 py-2 border border-[#E6EAF3] bg-white rounded-xl text-xs font-semibold text-[#5B6478] hover:bg-gray-50 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Head Applicability</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
