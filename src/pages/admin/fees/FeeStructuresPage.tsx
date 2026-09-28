import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  Plus, Loader2, ChevronRight, ChevronLeft, CheckCircle2, AlertCircle,
  Calendar, Layers, Users, BookOpen, Copy, Edit2, Archive, Check,
  Search, SlidersHorizontal, ArrowUpDown, UserCheck, HelpCircle,
  Sparkles, ShieldAlert, Trash2, ArrowRight, X, DollarSign,
} from "lucide-react";
import {
  getFeeStructures,
  getFeeHeads,
  getFeeTerms,
  saveCompleteFeeStructure,
  duplicateFeeStructure,
  activateStructure,
  deactivateFeeStructure,
  archiveFeeStructure,
  checkStructureOverlaps,
  assignStructureTargets,
  getStructureConfigItems,
} from "../../../services/feeSetupService";
import { getCurrentAcademicYear, listStudents } from "../../../services/studentService";
import { getClassesWithSections } from "../../../services/classSectionService";
import type {
  FeeStructure,
  FeeHead,
  FeeTerm,
  StructureStatus,
  StructureTargetType,
  FeeHeadFrequency,
  FeeStructureConfigItem,
} from "../../../types/fees";
import { useAuth } from "../../../hooks/useAuth";
import { FeeNavHeader } from "../../../components/admin/fees/FeeNavHeader";

// ─── Constants & Options ───────────────────────────────────────────────────────

const FREQUENCY_OPTIONS: { value: FeeHeadFrequency; label: string; description: string }[] = [
  { value: "monthly", label: "Monthly", description: "Billed every month" },
  { value: "quarterly", label: "Quarterly", description: "Billed each term (4 times/year)" },
  { value: "half_yearly", label: "Half-Yearly", description: "Billed twice per year" },
  { value: "yearly", label: "Yearly (Annual)", description: "Billed once per academic session" },
  { value: "one_time", label: "One-Time Charge", description: "Charged once upon admission/event" },
  { value: "custom", label: "Custom Terms", description: "Custom term distribution" },
];

const TARGET_TYPE_OPTIONS: { value: StructureTargetType; title: string; desc: string; icon: any }[] = [
  { value: "all_classes", title: "All Classes", desc: "Universal structure for all students in the school", icon: BookOpen },
  { value: "specific_classes", title: "Specific Classes", desc: "Assign to one or multiple selected classes", icon: Layers },
  { value: "specific_sections", title: "Specific Sections", desc: "Target specific class sections (e.g. 10-A, 10-B)", icon: SlidersHorizontal },
  { value: "specific_students", title: "Specific Students (Override)", desc: "Individual student overrides or special fees", icon: Users },
];

export default function FeeStructuresPage() {
  const { school: authSchool, schoolId: authSchoolId, profile, loading: authLoading } = useAuth() as any;
  const activeSchoolId = authSchool?.id || authSchoolId || null;
  const school = authSchool || (activeSchoolId ? { id: activeSchoolId } : null);

  // Core Data
  const [yearId, setYearId] = useState<string | null>(null);
  const [structures, setStructures] = useState<FeeStructure[]>([]);
  const [classes, setClasses] = useState<Array<{ id: string; name: string; sections?: Array<{ id: string; name: string }> }>>([]);
  const [heads, setHeads] = useState<FeeHead[]>([]);
  const [terms, setTerms] = useState<FeeTerm[]>([]);
  const [students, setStudents] = useState<Array<{ id: string; first_name: string; last_name: string; admission_no: string; class_id?: string | null }>>([]);

  // Hub UI state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | StructureStatus>("all");
  const [targetFilter, setTargetFilter] = useState<"all" | StructureTargetType>("all");
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  // Wizard state
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [editingStructureId, setEditingStructureId] = useState<string | null>(null);

  // Wizard Form state
  const [formName, setFormName] = useState("");
  const [formStatus, setFormStatus] = useState<StructureStatus>("draft");
  const [formDescription, setFormDescription] = useState("");
  const [formTargetType, setFormTargetType] = useState<StructureTargetType>("specific_classes");
  const [formClassIds, setFormClassIds] = useState<string[]>([]);
  const [formSectionIds, setFormSectionIds] = useState<string[]>([]);
  const [formStudentIds, setFormStudentIds] = useState<string[]>([]);
  const [formItems, setFormItems] = useState<FeeStructureConfigItem[]>([]);
  const [conflictModal, setConflictModal] = useState<{ hasConflict: boolean; conflicts: any[] } | null>(null);
  const [savingStructure, setSavingStructure] = useState(false);

  // Assign modal state
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignTargetStructure, setAssignTargetStructure] = useState<FeeStructure | null>(null);
  const [assignType, setAssignType] = useState<StructureTargetType>("specific_classes");
  const [assignTargetIds, setAssignTargetIds] = useState<string[]>([]);
  const [assignSaving, setAssignSaving] = useState(false);

  // ─── Initial Load ────────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    if (authLoading) return;
    if (!activeSchoolId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    try {
      // 1. Resolve Academic Year
      let currentYearId: string | null = null;
      try {
        const ayRes = await getCurrentAcademicYear(activeSchoolId);
        const currentYear = (ayRes as any).year || (ayRes as any).academicYear;
        if (currentYear) currentYearId = currentYear.id;
      } catch (err) {
        console.warn("Failed to fetch academic year:", err);
      }

      if (!currentYearId && typeof localStorage !== "undefined") {
        const years = JSON.parse(localStorage.getItem(`myzkool_academic_years_${activeSchoolId}`) || "[]");
        const localCurrent = years.find((y: any) => y.is_current);
        if (localCurrent) currentYearId = localCurrent.id;
      }
      if (!currentYearId) currentYearId = "ay-2026-27";
      setYearId(currentYearId);

      // 2. Load Classes & Sections
      try {
        const clsRes = await getClassesWithSections(activeSchoolId, currentYearId);
        if (clsRes.classes && clsRes.classes.length > 0) {
          setClasses(clsRes.classes);
        } else if (typeof localStorage !== "undefined") {
          const cls = JSON.parse(localStorage.getItem(`myzkool_classes_${activeSchoolId}`) || "[]");
          setClasses(cls);
        }
      } catch {
        if (typeof localStorage !== "undefined") {
          const cls = JSON.parse(localStorage.getItem(`myzkool_classes_${activeSchoolId}`) || "[]");
          setClasses(cls);
        }
      }

      try {
        const stuRes = await listStudents(activeSchoolId, { limit: 100 });
        if (stuRes.response?.data) {
          setStudents(stuRes.response.data.map((s: any) => ({
            id: s.id,
            first_name: s.first_name,
            last_name: s.last_name,
            admission_no: s.admission_no,
            class_id: s.class_id,
          })));
        }
      } catch (err) {
        console.warn("Failed to load students:", err);
      }

      // 4. Load Fee Heads, Terms & Structures
      const [{ heads: h }, { terms: t }, { structures: s }] = await Promise.all([
        getFeeHeads(activeSchoolId),
        getFeeTerms(activeSchoolId, currentYearId),
        getFeeStructures(activeSchoolId, currentYearId),
      ]);

      setHeads((h || []).filter(hd => hd.is_active));
      setTerms(t || []);
      setStructures(s || []);
    } catch (err: any) {
      setError(err.message || "Failed to load fee structures system.");
    } finally {
      setLoading(false);
    }
  }, [activeSchoolId, authLoading]);

  useEffect(() => { loadData(); }, [loadData]);

  // ─── Wizard Open / Edit Handlers ─────────────────────────────────────────────

  function handleOpenNewWizard() {
    setEditingStructureId(null);
    setFormName("");
    setFormStatus("draft");
    setFormDescription("");
    setFormTargetType("specific_classes");
    setFormClassIds(classes.length > 0 ? [classes[0].id] : []);
    setFormSectionIds([]);
    setFormStudentIds([]);
    setFormItems(
      heads.map(h => ({
        fee_head_id: h.id,
        frequency: h.kind === "one_time" ? "one_time" : "quarterly",
        base_amount_rupees: 0,
        is_mandatory: true,
        proration_rule: "full",
        start_date: null,
        end_date: null,
        term_amounts: {},
      }))
    );
    setWizardStep(1);
    setIsWizardOpen(true);
  }

  async function handleOpenEditWizard(structure: FeeStructure) {
    setEditingStructureId(structure.id);
    setFormName(structure.name);
    setFormStatus(structure.status);
    setFormDescription(structure.description || "");
    setFormTargetType(structure.target_type || (structure.class_id ? "specific_classes" : "all_classes"));
    setFormClassIds(structure.class_ids || (structure.class_id ? [structure.class_id] : []));
    setFormSectionIds(structure.section_ids || []);
    setFormStudentIds(structure.student_ids || []);

    // Load structure items
    const { items: configItems } = await getStructureConfigItems(activeSchoolId, structure.id);
    if (configItems && configItems.length > 0) {
      // Merge with any new fee heads that might not be in the structure
      const itemMap = new Map(configItems.map(ci => [ci.fee_head_id, ci]));
      const allItems: FeeStructureConfigItem[] = heads.map(h => {
        if (itemMap.has(h.id)) return itemMap.get(h.id)!;
        return {
          fee_head_id: h.id,
          frequency: h.kind === "one_time" ? "one_time" : "quarterly",
          base_amount_rupees: 0,
          is_mandatory: true,
          proration_rule: "full",
          start_date: null,
          end_date: null,
          term_amounts: {},
        };
      });
      setFormItems(allItems);
    } else {
      setFormItems(
        heads.map(h => ({
          fee_head_id: h.id,
          frequency: h.kind === "one_time" ? "one_time" : "quarterly",
          base_amount_rupees: 0,
          is_mandatory: true,
          proration_rule: "full",
          start_date: null,
          end_date: null,
          term_amounts: {},
        }))
      );
    }

    setWizardStep(1);
    setIsWizardOpen(true);
  }

  // ─── Schedule Calculation Helper ─────────────────────────────────────────────

  function calculateAutoSchedule(item: FeeStructureConfigItem): Record<string, number> {
    const termMap: Record<string, number> = {};
    if (!terms.length || item.base_amount_rupees <= 0) return termMap;

    if (item.frequency === "one_time") {
      // One-time: assign to the first term only
      termMap[terms[0].id] = item.base_amount_rupees;
    } else if (item.frequency === "yearly") {
      // Annual: apply to the first term
      termMap[terms[0].id] = item.base_amount_rupees;
    } else if (item.frequency === "half_yearly") {
      // Semi-annual: 2 equal splits
      if (terms.length >= 2) {
        termMap[terms[0].id] = item.base_amount_rupees;
        const midIdx = Math.floor(terms.length / 2);
        termMap[terms[midIdx].id] = item.base_amount_rupees;
      } else {
        termMap[terms[0].id] = item.base_amount_rupees;
      }
    } else {
      // Monthly or Quarterly: applies equally across every term
      terms.forEach(t => {
        termMap[t.id] = item.base_amount_rupees;
      });
    }
    return termMap;
  }

  function handleUpdateItem(index: number, patch: Partial<FeeStructureConfigItem>) {
    setFormItems(prev => {
      const next = [...prev];
      const updated = { ...next[index], ...patch };
      // Auto-recalculate term schedule if base_amount or frequency changed
      if ("base_amount_rupees" in patch || "frequency" in patch) {
        updated.term_amounts = calculateAutoSchedule(updated);
      }
      next[index] = updated;
      return next;
    });
  }

  // ─── Save & Activation Workflow ──────────────────────────────────────────────

  async function executeSave(targetStatus?: StructureStatus) {
    if (!yearId || !formName.trim()) {
      alert("Please provide a valid structure name.");
      return;
    }
    const statusToSave = targetStatus || formStatus;
    setSavingStructure(true);

    try {
      // Check for overlap conflicts if activating
      if (statusToSave === "active") {
        const targetIds = formTargetType === "specific_classes"
          ? formClassIds
          : formTargetType === "specific_sections"
          ? formSectionIds
          : formStudentIds;

        const overlapCheck = await checkStructureOverlaps(
          activeSchoolId,
          yearId,
          formTargetType,
          targetIds,
          editingStructureId || undefined
        );

        if (overlapCheck.hasConflict && !conflictModal) {
          setConflictModal(overlapCheck);
          setSavingStructure(false);
          return;
        }
      }

      const res = await saveCompleteFeeStructure(activeSchoolId, {
        id: editingStructureId || undefined,
        name: formName.trim(),
        academic_year_id: yearId,
        status: statusToSave,
        target_type: formTargetType,
        class_ids: formTargetType === "specific_classes" ? formClassIds : [],
        section_ids: formTargetType === "specific_sections" ? formSectionIds : [],
        student_ids: formTargetType === "specific_students" ? formStudentIds : [],
        description: formDescription,
        items: formItems.filter(i => i.base_amount_rupees > 0 || Object.values(i.term_amounts).some((v: any) => Number(v) > 0)),
      });

      if (res.error) throw new Error(res.error);

      setIsWizardOpen(false);
      setConflictModal(null);
      await loadData();
    } catch (err: any) {
      alert(`Save failed: ${err.message}`);
    } finally {
      setSavingStructure(false);
    }
  }

  // ─── Structure Hub Actions ───────────────────────────────────────────────────

  async function handleDuplicate(structure: FeeStructure) {
    setActionInProgress(structure.id);
    try {
      const res = await duplicateFeeStructure(activeSchoolId, structure.id, `${structure.name} (Copy)`);
      if (res.error) throw new Error(res.error);
      await loadData();
    } catch (err: any) {
      alert(`Duplicate failed: ${err.message}`);
    } finally {
      setActionInProgress(null);
    }
  }

  async function handleToggleStatus(structure: FeeStructure) {
    setActionInProgress(structure.id);
    try {
      if (structure.status === "active") {
        await deactivateFeeStructure(activeSchoolId, structure.id);
      } else {
        const targetIds = structure.target_type === "specific_classes"
          ? (structure.class_ids || (structure.class_id ? [structure.class_id] : []))
          : structure.target_type === "specific_sections"
          ? (structure.section_ids || [])
          : (structure.student_ids || []);

        const check = await checkStructureOverlaps(
          activeSchoolId,
          structure.academic_year_id,
          structure.target_type || "specific_classes",
          targetIds,
          structure.id
        );

        if (check.hasConflict) {
          const proceed = window.confirm(
            `Activating "${structure.name}" will archive conflicting active structure(s):\n` +
            check.conflicts.map(c => `• ${c.structureName}`).join("\n") +
            `\n\nDo you want to proceed and activate?`
          );
          if (!proceed) {
            setActionInProgress(null);
            return;
          }
        }
        await activateStructure(activeSchoolId, structure.id, profile?.id);
      }
      await loadData();
    } catch (err: any) {
      alert(`Status update failed: ${err.message}`);
    } finally {
      setActionInProgress(null);
    }
  }

  async function handleArchive(structure: FeeStructure) {
    if (!window.confirm(`Archive "${structure.name}"? Archived structures will no longer generate new dues.`)) return;
    setActionInProgress(structure.id);
    try {
      await archiveFeeStructure(activeSchoolId, structure.id);
      await loadData();
    } catch (err: any) {
      alert(`Archive failed: ${err.message}`);
    } finally {
      setActionInProgress(null);
    }
  }

  // ─── Assign Structure Modal ──────────────────────────────────────────────────

  function handleOpenAssignModal(structure: FeeStructure) {
    setAssignTargetStructure(structure);
    setAssignType(structure.target_type || "specific_classes");
    setAssignTargetIds(
      structure.target_type === "specific_classes"
        ? (structure.class_ids || (structure.class_id ? [structure.class_id] : []))
        : structure.target_type === "specific_sections"
        ? (structure.section_ids || [])
        : (structure.student_ids || [])
    );
    setAssignModalOpen(true);
  }

  async function handleExecuteAssign() {
    if (!assignTargetStructure) return;
    setAssignSaving(true);
    try {
      await assignStructureTargets(activeSchoolId, assignTargetStructure.id, assignType, assignTargetIds);
      setAssignModalOpen(false);
      await loadData();
    } catch (err: any) {
      alert(`Assignment failed: ${err.message}`);
    } finally {
      setAssignSaving(false);
    }
  }

  // ─── Computed Statistics & Filtering ─────────────────────────────────────────

  const filteredStructures = useMemo(() => {
    return structures.filter(s => {
      const matchSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.description && s.description.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchStatus = statusFilter === "all" || s.status === statusFilter;
      const matchTarget = targetFilter === "all" || (s.target_type || "specific_classes") === targetFilter;
      return matchSearch && matchStatus && matchTarget;
    });
  }, [structures, searchQuery, statusFilter, targetFilter]);

  const activeCount = structures.filter(s => s.status === "active").length;
  const draftCount = structures.filter(s => s.status === "draft").length;
  const archivedCount = structures.filter(s => s.status === "archived").length;

  // ─── Wizard Financial Computations ───────────────────────────────────────────

  const wizardSummary = useMemo(() => {
    let annualRecurring = 0;
    let oneTimeTotal = 0;
    const headsConfigured = formItems.filter(i => i.base_amount_rupees > 0);

    for (const item of headsConfigured) {
      const termTotal = (Object.values(item.term_amounts || {}) as number[]).reduce<number>((sum, v) => sum + Number(v || 0), 0);
      if (item.frequency === "one_time") {
        oneTimeTotal += termTotal || item.base_amount_rupees;
      } else {
        annualRecurring += termTotal || (item.base_amount_rupees * terms.length);
      }
    }

    const estimatedGrandAnnual = annualRecurring + oneTimeTotal;

    // Audience label
    let audienceLabel = "Universal (All Classes)";
    if (formTargetType === "specific_classes") {
      const classNames = classes.filter(c => formClassIds.includes(c.id)).map(c => c.name);
      audienceLabel = classNames.length > 0 ? `${classNames.length} Classes (${classNames.join(", ")})` : "No classes selected";
    } else if (formTargetType === "specific_sections") {
      audienceLabel = `${formSectionIds.length} Selected Section(s)`;
    } else if (formTargetType === "specific_students") {
      audienceLabel = `${formStudentIds.length} Selected Student Override(s)`;
    }

    return {
      headsCount: headsConfigured.length,
      annualRecurring,
      oneTimeTotal,
      estimatedGrandAnnual,
      audienceLabel,
    };
  }, [formItems, formTargetType, formClassIds, formSectionIds, formStudentIds, classes, terms]);

  // ─── RENDER: Main Hub ────────────────────────────────────────────────────────

  return (
    <div className="py-6 px-4 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <FeeNavHeader
        title="Fee Structures System"
        subtitle="Create, configure, and assign reusable class-wide or student-specific fee structures."
        action={
          <button
            onClick={handleOpenNewWizard}
            className="flex items-center gap-2 px-4 py-2 bg-[#2158E0] hover:bg-[#1b48b8] text-white rounded-xl text-sm font-semibold shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Structure</span>
          </button>
        }
      />

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#E6EAF3] rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-[#5B6478]">Total Structures</div>
            <div className="text-2xl font-bold text-[#141A2E] mt-0.5">{structures.length}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#2158E0] flex items-center justify-center font-bold">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-[#E6EAF3] rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-[#5B6478]">Active Structures</div>
            <div className="text-2xl font-bold text-emerald-600 mt-0.5">{activeCount}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-[#E6EAF3] rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-[#5B6478]">Draft / Staged</div>
            <div className="text-2xl font-bold text-amber-600 mt-0.5">{draftCount}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <SlidersHorizontal className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-[#E6EAF3] rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-[#5B6478]">Classes Available</div>
            <div className="text-2xl font-bold text-[#141A2E] mt-0.5">{classes.length}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <BookOpen className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white border border-[#E6EAF3] rounded-2xl p-3 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search fee structures by name or notes..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-[#E6EAF3] rounded-xl text-sm focus:border-[#2158E0] focus:ring-1 focus:ring-[#2158E0] outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
          {/* Status Tabs */}
          <div className="flex items-center bg-[#F4F6FB] p-1 rounded-xl text-xs font-medium text-[#5B6478]">
            {(["all", "active", "draft", "archived"] as const).map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg capitalize transition-colors ${
                  statusFilter === s ? "bg-white text-[#141A2E] font-semibold shadow-xs" : "hover:text-[#141A2E]"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Target Filter */}
          <select
            value={targetFilter}
            onChange={e => setTargetFilter(e.target.value as any)}
            className="border border-[#E6EAF3] bg-white rounded-xl px-3 py-1.5 text-xs text-[#141A2E] font-medium outline-none cursor-pointer"
          >
            <option value="all">All Audiences</option>
            <option value="all_classes">All Classes</option>
            <option value="specific_classes">Specific Classes</option>
            <option value="specific_sections">Specific Sections</option>
            <option value="specific_students">Student Overrides</option>
          </select>
        </div>
      </div>

      {/* Structures Grid / Cards View */}
      {loading ? (
        <div className="py-24 text-center text-[#5B6478] bg-white border border-[#E6EAF3] rounded-2xl flex items-center justify-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-[#2158E0]" />
          <span>Loading Fee Structures system...</span>
        </div>
      ) : filteredStructures.length === 0 ? (
        <div className="py-20 text-center bg-white border border-[#E6EAF3] rounded-2xl p-6">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#2158E0] flex items-center justify-center mx-auto mb-3">
            <Layers className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-[#141A2E]">No Fee Structures Found</h3>
          <p className="text-xs text-[#5B6478] max-w-sm mx-auto mt-1 mb-4">
            {searchQuery || statusFilter !== "all"
              ? "No fee structures match your search or filter criteria."
              : "Get started by creating your first reusable fee structure for your school."}
          </p>
          <button
            onClick={handleOpenNewWizard}
            className="px-4 py-2 bg-[#2158E0] hover:bg-[#1b48b8] text-white rounded-xl text-xs font-semibold"
          >
            Create Fee Structure
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredStructures.map(structure => {
            const isWorking = actionInProgress === structure.id;
            const targetType = structure.target_type || (structure.class_id ? "specific_classes" : "all_classes");

            let targetBadgeText = "All Classes";
            let targetColor = "bg-blue-50 text-blue-700 border-blue-200";
            if (targetType === "specific_classes") {
              const count = (structure.class_ids?.length || (structure.class_id ? 1 : 0));
              targetBadgeText = `${count} ${count === 1 ? "Class" : "Classes"}`;
              targetColor = "bg-purple-50 text-purple-700 border-purple-200";
            } else if (targetType === "specific_sections") {
              const count = structure.section_ids?.length || 0;
              targetBadgeText = `${count} Sections`;
              targetColor = "bg-amber-50 text-amber-700 border-amber-200";
            } else if (targetType === "specific_students") {
              const count = structure.student_ids?.length || 0;
              targetBadgeText = `${count} Student Override${count === 1 ? "" : "s"}`;
              targetColor = "bg-rose-50 text-rose-700 border-rose-200";
            }

            return (
              <div
                key={structure.id}
                className="bg-white border border-[#E6EAF3] hover:border-[#b8c7ea] rounded-2xl p-5 shadow-xs transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Card Header: Status & Audience */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${targetColor}`}>
                      {targetBadgeText}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {structure.status === "active" ? (
                        <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Active
                        </span>
                      ) : structure.status === "draft" ? (
                        <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Draft
                        </span>
                      ) : (
                        <span className="text-[11px] font-semibold text-gray-600 bg-gray-50 border border-gray-200 px-2.5 py-0.5 rounded-full">
                          Archived
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-base font-bold text-[#141A2E] truncate">{structure.name}</h3>
                  <p className="text-xs text-[#5B6478] line-clamp-2 mt-1 min-h-[2rem]">
                    {structure.description || "Reusable fee structure for tuition, amenities, and annual session terms."}
                  </p>

                  {/* Target details snippet */}
                  <div className="mt-3 py-2 px-3 bg-[#F8FAFC] rounded-xl text-xs text-[#475569] flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span className="truncate">Session: {structure.academic_year_id}</span>
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="mt-5 pt-4 border-t border-[#E6EAF3] flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEditWizard(structure)}
                      className="p-1.5 text-[#5B6478] hover:text-[#2158E0] hover:bg-blue-50 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                      title="Edit structure"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>

                    <button
                      onClick={() => handleDuplicate(structure)}
                      disabled={isWorking}
                      className="p-1.5 text-[#5B6478] hover:text-[#141A2E] hover:bg-gray-100 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                      title="Duplicate structure"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Clone</span>
                    </button>

                    <button
                      onClick={() => handleOpenAssignModal(structure)}
                      className="p-1.5 text-[#2158E0] hover:bg-blue-50 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                      title="Assign target audience"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Assign</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {structure.status !== "archived" && (
                      <button
                        onClick={() => handleToggleStatus(structure)}
                        disabled={isWorking}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                          structure.status === "active"
                            ? "bg-gray-100 hover:bg-gray-200 text-gray-700"
                            : "bg-emerald-600 hover:bg-emerald-700 text-white"
                        }`}
                      >
                        {isWorking ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : structure.status === "active" ? (
                          "Deactivate"
                        ) : (
                          "Activate"
                        )}
                      </button>
                    )}

                    {structure.status !== "archived" && (
                      <button
                        onClick={() => handleArchive(structure)}
                        disabled={isWorking}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg"
                        title="Archive structure"
                      >
                        <Archive className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── 5-STEP WIZARD MODAL ─────────────────────────────────────────────── */}
      {isWizardOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-[#E6EAF3] w-full max-w-4xl max-h-[90vh] flex flex-col my-auto">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-[#E6EAF3] flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-[#141A2E]">
                  {editingStructureId ? "Edit Fee Structure" : "Create Reusable Fee Structure"}
                </h2>
                <p className="text-xs text-[#5B6478]">
                  Step {wizardStep} of 5 — {
                    wizardStep === 1 ? "Basic Details" :
                    wizardStep === 2 ? "Applicability & Targets" :
                    wizardStep === 3 ? "Fee Heads & Amounts" :
                    wizardStep === 4 ? "Billing Schedule Distribution" :
                    "Review & Activate"
                  }
                </p>
              </div>
              <button
                onClick={() => setIsWizardOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Stepper Progress Bar */}
            <div className="px-6 pt-3 pb-2 border-b border-[#E6EAF3] bg-gray-50/50">
              <div className="flex items-center justify-between">
                {[
                  { step: 1, label: "Details" },
                  { step: 2, label: "Applicability" },
                  { step: 3, label: "Fee Heads" },
                  { step: 4, label: "Schedule" },
                  { step: 5, label: "Review & Save" },
                ].map((s, idx) => (
                  <div key={s.step} className="flex items-center gap-2">
                    <button
                      onClick={() => setWizardStep(s.step as any)}
                      className={`flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-lg ${
                        wizardStep === s.step
                          ? "bg-[#2158E0] text-white"
                          : wizardStep > s.step
                          ? "text-emerald-700 bg-emerald-50"
                          : "text-gray-400"
                      }`}
                    >
                      <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] bg-white/20">
                        {s.step}
                      </span>
                      <span>{s.label}</span>
                    </button>
                    {idx < 4 && <ChevronRight className="w-3.5 h-3.5 text-gray-300" />}
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Body: Dynamic Step Content */}
            <div className="p-6 overflow-y-auto flex-1 space-y-5">
              {/* STEP 1: Details */}
              {wizardStep === 1 && (
                <div className="space-y-4 max-w-xl mx-auto">
                  <div>
                    <label className="block text-xs font-semibold text-[#141A2E] mb-1">
                      Structure Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Primary School Standard Structure 2026-27"
                      value={formName}
                      onChange={e => setFormName(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-[#E6EAF3] rounded-xl text-sm focus:border-[#2158E0] outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#141A2E] mb-1">
                        Academic Year
                      </label>
                      <input
                        type="text"
                        disabled
                        value={yearId || ""}
                        className="w-full px-3.5 py-2.5 border border-[#E6EAF3] bg-gray-50 rounded-xl text-sm text-[#5B6478]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#141A2E] mb-1">
                        Initial Status
                      </label>
                      <select
                        value={formStatus}
                        onChange={e => setFormStatus(e.target.value as StructureStatus)}
                        className="w-full px-3.5 py-2.5 border border-[#E6EAF3] bg-white rounded-xl text-sm font-medium outline-none"
                      >
                        <option value="draft">Draft (Staged for review)</option>
                        <option value="active">Active (Available for billing)</option>
                        <option value="archived">Archived</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#141A2E] mb-1">
                      Description / Notes (Optional)
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Describe the scope, applicability criteria, or policy notes..."
                      value={formDescription}
                      onChange={e => setFormDescription(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-[#E6EAF3] rounded-xl text-sm focus:border-[#2158E0] outline-none"
                    />
                  </div>
                </div>
              )}

              {/* STEP 2: Applicability */}
              {wizardStep === 2 && (
                <div className="space-y-5">
                  <div className="text-xs text-[#5B6478]">
                    Choose who this fee structure applies to. One structure can be assigned across multiple classes, sections, or reserved as an individual student override.
                  </div>

                  {/* Target Type Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {TARGET_TYPE_OPTIONS.map(opt => {
                      const Icon = opt.icon;
                      const isSelected = formTargetType === opt.value;
                      return (
                        <div
                          key={opt.value}
                          onClick={() => setFormTargetType(opt.value)}
                          className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex items-start gap-3 ${
                            isSelected
                              ? "border-[#2158E0] bg-blue-50/40 shadow-xs"
                              : "border-[#E6EAF3] hover:border-gray-300 bg-white"
                          }`}
                        >
                          <div className={`p-2 rounded-xl shrink-0 ${isSelected ? "bg-[#2158E0] text-white" : "bg-gray-100 text-gray-500"}`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="text-sm font-bold text-[#141A2E]">{opt.title}</div>
                            <div className="text-xs text-[#5B6478] mt-0.5">{opt.desc}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Target Specific Pickers */}
                  {formTargetType === "specific_classes" && (
                    <div className="p-4 bg-gray-50/60 border border-[#E6EAF3] rounded-xl space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-[#141A2E]">
                          Select Classes ({formClassIds.length} selected)
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            if (formClassIds.length === classes.length) setFormClassIds([]);
                            else setFormClassIds(classes.map(c => c.id));
                          }}
                          className="text-xs text-[#2158E0] font-semibold hover:underline cursor-pointer"
                        >
                          {formClassIds.length === classes.length ? "Deselect All" : "Select All Classes"}
                        </button>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-1">
                        {classes.map(cls => {
                          const isChecked = formClassIds.includes(cls.id);
                          return (
                            <label
                              key={cls.id}
                              className={`flex items-center gap-2 p-2 rounded-lg border text-xs font-medium cursor-pointer transition-colors ${
                                isChecked ? "bg-blue-50 border-blue-300 text-blue-800" : "bg-white border-[#E6EAF3] text-gray-700"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  if (isChecked) setFormClassIds(prev => prev.filter(id => id !== cls.id));
                                  else setFormClassIds(prev => [...prev, cls.id]);
                                }}
                                className="accent-[#2158E0]"
                              />
                              <span className="truncate">{cls.name}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {formTargetType === "specific_sections" && (
                    <div className="p-4 bg-gray-50/60 border border-[#E6EAF3] rounded-xl space-y-3">
                      <label className="text-xs font-semibold text-[#141A2E]">
                        Select Specific Sections ({formSectionIds.length} selected)
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                        {classes.flatMap(c => (c.sections || []).map(sec => {
                          const isChecked = formSectionIds.includes(sec.id);
                          return (
                            <label
                              key={sec.id}
                              className={`flex items-center gap-2 p-2 rounded-lg border text-xs font-medium cursor-pointer ${
                                isChecked ? "bg-blue-50 border-blue-300 text-blue-800" : "bg-white border-[#E6EAF3] text-gray-700"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  if (isChecked) setFormSectionIds(prev => prev.filter(id => id !== sec.id));
                                  else setFormSectionIds(prev => [...prev, sec.id]);
                                }}
                                className="accent-[#2158E0]"
                              />
                              <span className="truncate">{c.name} - {sec.name}</span>
                            </label>
                          );
                        }))}
                      </div>
                    </div>
                  )}

                  {formTargetType === "specific_students" && (
                    <div className="p-4 bg-gray-50/60 border border-[#E6EAF3] rounded-xl space-y-3">
                      <label className="text-xs font-semibold text-[#141A2E]">
                        Select Specific Students ({formStudentIds.length} selected)
                      </label>
                      <div className="space-y-1 max-h-52 overflow-y-auto">
                        {students.map(stu => {
                          const isChecked = formStudentIds.includes(stu.id);
                          return (
                            <label
                              key={stu.id}
                              className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer ${
                                isChecked ? "bg-blue-50 border-blue-300 text-blue-800 font-semibold" : "bg-white border-[#E6EAF3] text-gray-700"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {
                                    if (isChecked) setFormStudentIds(prev => prev.filter(id => id !== stu.id));
                                    else setFormStudentIds(prev => [...prev, stu.id]);
                                  }}
                                  className="accent-[#2158E0]"
                                />
                                <span>{stu.first_name} {stu.last_name}</span>
                              </div>
                              <span className="text-gray-400 font-mono text-[11px]">{stu.admission_no}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 3: Fee Heads & Amounts */}
              {wizardStep === 3 && (
                <div className="space-y-4">
                  <div className="text-xs text-[#5B6478]">
                    Configure amounts, frequency, mandatory status, and proration rule for each active fee head.
                  </div>

                  <div className="border border-[#E6EAF3] rounded-xl overflow-hidden">
                    <table className="min-w-full text-xs">
                      <thead className="bg-gray-50 border-b border-[#E6EAF3] text-[#5B6478] font-semibold">
                        <tr>
                          <th className="text-left px-4 py-3">Fee Head</th>
                          <th className="text-left px-3 py-3 w-40">Frequency</th>
                          <th className="text-right px-3 py-3 w-36">Base Amount (₹)</th>
                          <th className="text-center px-3 py-3 w-28">Mandatory</th>
                          <th className="text-left px-3 py-3 w-36">Proration</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E6EAF3]">
                        {formItems.map((item, idx) => {
                          const head = heads.find(h => h.id === item.fee_head_id);
                          if (!head) return null;

                          return (
                            <tr key={item.fee_head_id} className="hover:bg-gray-50/50">
                              <td className="px-4 py-3">
                                <div className="font-bold text-[#141A2E]">{head.name}</div>
                                <div className="text-[10px] text-gray-400 font-mono">{head.code}</div>
                              </td>

                              <td className="px-3 py-3">
                                <select
                                  value={item.frequency}
                                  onChange={e => handleUpdateItem(idx, { frequency: e.target.value as FeeHeadFrequency })}
                                  className="w-full border border-[#E6EAF3] bg-white rounded-lg px-2 py-1.5 text-xs text-[#141A2E] font-medium outline-none"
                                >
                                  {FREQUENCY_OPTIONS.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                  ))}
                                </select>
                              </td>

                              <td className="px-3 py-3">
                                <input
                                  type="number"
                                  min="0"
                                  step="50"
                                  placeholder="0"
                                  value={item.base_amount_rupees === 0 ? "" : item.base_amount_rupees}
                                  onChange={e => handleUpdateItem(idx, { base_amount_rupees: parseFloat(e.target.value) || 0 })}
                                  className="w-full text-right font-mono font-semibold border border-[#E6EAF3] focus:border-[#2158E0] rounded-lg px-2 py-1.5 text-xs outline-none"
                                />
                              </td>

                              <td className="px-3 py-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={item.is_mandatory}
                                  onChange={e => handleUpdateItem(idx, { is_mandatory: e.target.checked })}
                                  className="accent-[#2158E0] w-4 h-4 cursor-pointer"
                                />
                              </td>

                              <td className="px-3 py-3">
                                <select
                                  value={item.proration_rule}
                                  onChange={e => handleUpdateItem(idx, { proration_rule: e.target.value as any })}
                                  className="w-full border border-[#E6EAF3] bg-white rounded-lg px-2 py-1.5 text-xs text-[#141A2E] outline-none"
                                >
                                  <option value="full">Full Charge</option>
                                  <option value="prorated">Prorated by Term</option>
                                  <option value="none">No Proration</option>
                                </select>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* STEP 4: Schedule Distribution */}
              {wizardStep === 4 && (
                <div className="space-y-4">
                  <div className="text-xs text-[#5B6478]">
                    Review and fine-tune how fee heads distribute across the configured billing terms for the session.
                  </div>

                  <div className="border border-[#E6EAF3] rounded-xl overflow-x-auto">
                    <table className="min-w-full text-xs">
                      <thead className="bg-gray-50 border-b border-[#E6EAF3] text-[#5B6478]">
                        <tr>
                          <th className="text-left px-4 py-3 font-semibold min-w-[12rem]">Fee Head</th>
                          {terms.map(t => (
                            <th key={t.id} className="text-right px-3 py-3 font-semibold min-w-[6.5rem]">
                              <div>{t.name}</div>
                              <div className="text-[10px] text-gray-400 font-normal">{t.due_date}</div>
                            </th>
                          ))}
                          <th className="text-right px-4 py-3 font-semibold min-w-[6.5rem]">Annual Head Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E6EAF3]">
                        {formItems.filter(i => i.base_amount_rupees > 0).map((item, idx) => {
                          const head = heads.find(h => h.id === item.fee_head_id);
                          if (!head) return null;
                          const actualItemIdx = formItems.findIndex(fi => fi.fee_head_id === item.fee_head_id);
                          const totalHeadRupees = (Object.values(item.term_amounts || {}) as number[]).reduce<number>((s, a) => s + Number(a || 0), 0);

                          return (
                            <tr key={item.fee_head_id} className="hover:bg-gray-50/50">
                              <td className="px-4 py-3">
                                <div className="font-bold text-[#141A2E]">{head.name}</div>
                                <div className="text-[10px] text-blue-600 font-medium capitalize">{item.frequency}</div>
                              </td>

                              {terms.map(t => {
                                const termVal = item.term_amounts[t.id] ?? 0;
                                return (
                                  <td key={t.id} className="px-2 py-2 text-right">
                                    <input
                                      type="number"
                                      min="0"
                                      step="50"
                                      value={termVal === 0 ? "" : termVal}
                                      placeholder="0"
                                      onChange={e => {
                                        const newAmt = parseFloat(e.target.value) || 0;
                                        const newTermAmounts = { ...item.term_amounts, [t.id]: newAmt };
                                        handleUpdateItem(actualItemIdx, { term_amounts: newTermAmounts });
                                      }}
                                      className="w-full text-right font-mono border border-transparent hover:border-[#E6EAF3] focus:border-[#2158E0] rounded px-2 py-1 text-xs outline-none bg-transparent"
                                    />
                                  </td>
                                );
                              })}

                              <td className="px-4 py-3 text-right font-bold text-[#141A2E] font-mono">
                                ₹{Math.round(totalHeadRupees).toLocaleString()}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* STEP 5: Review & Summary */}
              {wizardStep === 5 && (
                <div className="space-y-6 max-w-2xl mx-auto">
                  <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-5 space-y-3">
                    <h3 className="text-sm font-bold text-blue-900 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-blue-600" />
                      Structure Financial & Audience Summary
                    </h3>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                      <div className="bg-white p-3 rounded-xl border border-blue-100 shadow-2xs">
                        <div className="text-[11px] text-gray-500 font-medium">Audience</div>
                        <div className="text-xs font-bold text-[#141A2E] mt-0.5 truncate">{wizardSummary.audienceLabel}</div>
                      </div>

                      <div className="bg-white p-3 rounded-xl border border-blue-100 shadow-2xs">
                        <div className="text-[11px] text-gray-500 font-medium">Heads Included</div>
                        <div className="text-xs font-bold text-[#141A2E] mt-0.5">{wizardSummary.headsCount} Categories</div>
                      </div>

                      <div className="bg-white p-3 rounded-xl border border-blue-100 shadow-2xs">
                        <div className="text-[11px] text-gray-500 font-medium">One-Time Fees</div>
                        <div className="text-xs font-bold text-amber-700 mt-0.5 font-mono">₹{wizardSummary.oneTimeTotal.toLocaleString("en-IN")}</div>
                      </div>

                      <div className="bg-white p-3 rounded-xl border border-blue-100 shadow-2xs">
                        <div className="text-[11px] text-gray-500 font-medium">Annual Estimate</div>
                        <div className="text-sm font-black text-[#2158E0] mt-0.5 font-mono">₹{wizardSummary.estimatedGrandAnnual.toLocaleString("en-IN")}</div>
                      </div>
                    </div>
                  </div>

                  {/* Configured Heads Review List */}
                  <div className="border border-[#E6EAF3] rounded-2xl p-4 bg-white space-y-2">
                    <div className="text-xs font-bold text-[#141A2E] mb-2">Configured Fee Heads</div>
                    {formItems.filter(i => i.base_amount_rupees > 0).map(item => {
                      const head = heads.find(h => h.id === item.fee_head_id);
                      const totalAnnual = (Object.values(item.term_amounts || {}) as number[]).reduce<number>((s, v) => s + Number(v || 0), 0);
                      return (
                        <div key={item.fee_head_id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0 text-xs">
                          <div>
                            <span className="font-semibold text-[#141A2E]">{head?.name}</span>
                            <span className="text-gray-400 ml-2 capitalize">({item.frequency})</span>
                            {item.is_mandatory && <span className="ml-2 text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">Mandatory</span>}
                          </div>
                          <div className="font-mono font-bold text-[#141A2E]">
                            ₹{Math.round(totalAnnual).toLocaleString()} / year
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-[#E6EAF3] flex items-center justify-between bg-gray-50/50">
              <div>
                {wizardStep > 1 && (
                  <button
                    onClick={() => setWizardStep((wizardStep - 1) as any)}
                    className="flex items-center gap-1.5 px-3 py-2 border border-[#E6EAF3] hover:bg-white text-[#5B6478] rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Back</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsWizardOpen(false)}
                  className="px-4 py-2 border border-[#E6EAF3] text-gray-600 rounded-xl text-xs font-semibold hover:bg-gray-100"
                >
                  Cancel
                </button>

                {wizardStep < 5 ? (
                  <button
                    onClick={() => {
                      if (wizardStep === 1 && !formName.trim()) {
                        alert("Please enter a structure name.");
                        return;
                      }
                      setWizardStep((wizardStep + 1) as any);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 bg-[#2158E0] hover:bg-[#1b48b8] text-white rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    <span>Continue</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => executeSave("draft")}
                      disabled={savingStructure}
                      className="px-4 py-2 border border-[#2158E0] text-[#2158E0] hover:bg-blue-50 rounded-xl text-xs font-semibold"
                    >
                      Save as Draft
                    </button>

                    <button
                      onClick={() => executeSave("active")}
                      disabled={savingStructure}
                      className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold cursor-pointer"
                    >
                      {savingStructure ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      <span>Save & Activate</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── DEDICATED ASSIGN TARGET AUDIENCE MODAL ─────────────────────────── */}
      {assignModalOpen && assignTargetStructure && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-[#E6EAF3] w-full max-w-lg p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-[#E6EAF3] pb-3">
              <div>
                <h3 className="text-base font-bold text-[#141A2E]">Assign Target Audience</h3>
                <p className="text-xs text-[#5B6478]">Structure: {assignTargetStructure.name}</p>
              </div>
              <button onClick={() => setAssignModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#141A2E] mb-2">Applicability Target Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { type: "all_classes", label: "All Classes" },
                    { type: "specific_classes", label: "Specific Classes" },
                    { type: "specific_sections", label: "Specific Sections" },
                    { type: "specific_students", label: "Student Overrides" },
                  ].map(t => (
                    <button
                      key={t.type}
                      type="button"
                      onClick={() => {
                        setAssignType(t.type as any);
                        setAssignTargetIds([]);
                      }}
                      className={`p-2.5 rounded-xl border text-xs font-medium text-left transition-colors ${
                        assignType === t.type ? "border-[#2158E0] bg-blue-50 text-blue-900 font-bold" : "border-[#E6EAF3] text-gray-700"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {assignType === "specific_classes" && (
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-[#141A2E]">Select Target Classes:</div>
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
                    {classes.map(c => {
                      const checked = assignTargetIds.includes(c.id);
                      return (
                        <label key={c.id} className="flex items-center gap-2 p-2 border rounded-lg text-xs cursor-pointer">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              if (checked) setAssignTargetIds(prev => prev.filter(id => id !== c.id));
                              else setAssignTargetIds(prev => [...prev, c.id]);
                            }}
                            className="accent-[#2158E0]"
                          />
                          <span>{c.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {assignType === "specific_sections" && (
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-[#141A2E]">Select Target Sections:</div>
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
                    {classes.flatMap(c => (c.sections || []).map(s => {
                      const checked = assignTargetIds.includes(s.id);
                      return (
                        <label key={s.id} className="flex items-center gap-2 p-2 border rounded-lg text-xs cursor-pointer">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              if (checked) setAssignTargetIds(prev => prev.filter(id => id !== s.id));
                              else setAssignTargetIds(prev => [...prev, s.id]);
                            }}
                            className="accent-[#2158E0]"
                          />
                          <span>{c.name} - {s.name}</span>
                        </label>
                      );
                    }))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E6EAF3]">
              <button
                onClick={() => setAssignModalOpen(false)}
                className="px-4 py-2 border border-[#E6EAF3] text-gray-600 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteAssign}
                disabled={assignSaving}
                className="px-4 py-2 bg-[#2158E0] hover:bg-[#1b48b8] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                {assignSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                <span>Save Assignment</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── CONFLICT WARNING MODAL ─────────────────────────────────────────── */}
      {conflictModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-amber-300 w-full max-w-md p-6 space-y-4">
            <div className="flex items-center gap-3 text-amber-600">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                <ShieldAlert className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#141A2E]">Active Overlap Detected</h3>
                <p className="text-xs text-amber-700">Conflicting active fee structures found</p>
              </div>
            </div>

            <div className="text-xs text-[#5B6478] space-y-2">
              <p>Activating this fee structure will automatically archive or supersede conflicting active structures:</p>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1 font-medium text-amber-900">
                {conflictModal.conflicts.map((c, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <span>• {c.structureName}</span>
                    {c.targetName && <span className="text-amber-700 text-[11px]">({c.targetName})</span>}
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-gray-400">Do you want to proceed and activate this structure now?</p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setConflictModal(null)}
                className="px-4 py-2 border border-[#E6EAF3] text-gray-600 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => executeSave("active")}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold"
              >
                Confirm & Activate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
