import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Sliders, Plus, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";
import { useAuth } from "../../../hooks/useAuth";
import type {
  StudentConcession,
  ConcessionSummaryMetrics,
  ConcessionFilters,
  ConcessionRule,
  FeeHead,
  StudentConcessionInput,
} from "../../../types/fees";
import {
  getConcessionsOverview,
  createStudentConcession,
  approveStudentConcession,
  rejectStudentConcession,
  revokeStudentConcession,
  deleteStudentConcession,
} from "../../../services/concessionService";
import { getConcessionRules, getFeeHeads } from "../../../services/feeSetupService";
import { getClassesWithSections } from "../../../services/classSectionService";
import { ConcessionSummaryCards } from "../../../components/admin/fees/concessions/ConcessionSummaryCards";
import { ConcessionFilterPanel } from "../../../components/admin/fees/concessions/ConcessionFilterPanel";
import { ConcessionTable } from "../../../components/admin/fees/concessions/ConcessionTable";
import { AddConcessionDrawer } from "../../../components/admin/fees/concessions/AddConcessionDrawer";
import { ConcessionDetailDrawer } from "../../../components/admin/fees/concessions/ConcessionDetailDrawer";
import { ConcessionPoliciesDrawer } from "../../../components/admin/fees/concessions/ConcessionPoliciesDrawer";
import { supabase, isSupabaseConfigured } from "../../../lib/supabase";

export default function ConcessionRulesPage() {
  const { school: authSchool, schoolId: authSchoolId, user, role } = useAuth() as any;
  const activeSchoolId = authSchool?.id || authSchoolId || "";

  // Data States
  const [concessions, setConcessions] = useState<StudentConcession[]>([]);
  const [metrics, setMetrics] = useState<ConcessionSummaryMetrics>({
    activeCount: 0,
    discountThisMonthPaise: 0,
    pendingCount: 0,
    scheduledCount: 0,
    totalCount: 0,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Metadata
  const [academicYears, setAcademicYears] = useState<{ id: string; label: string }[]>([]);
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [feeHeads, setFeeHeads] = useState<FeeHead[]>([]);
  const [concessionRules, setConcessionRules] = useState<ConcessionRule[]>([]);

  // Filtering & Pagination
  const [filters, setFilters] = useState<ConcessionFilters>({
    search: "",
    academicYearId: "all",
    classId: "all",
    concessionType: "all",
    status: "all",
    chipFilter: "all",
  });
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(8);

  // Drawers
  const [isAddDrawerOpen, setIsAddDrawerOpen] = useState(false);
  const [isPoliciesDrawerOpen, setIsPoliciesDrawerOpen] = useState(false);
  const [selectedConcessionForDetail, setSelectedConcessionForDetail] = useState<StudentConcession | null>(null);
  const [selectedConcessionForEdit, setSelectedConcessionForEdit] = useState<StudentConcession | null>(null);

  // Feedback Toasts
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showToast = (type: "success" | "error", text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // ─── Fetch Metadata ────────────────────────────────────────────────────────
  const loadMetadata = useCallback(async () => {
    if (!activeSchoolId) return;
    try {
      // 1. Academic Years
      if (isSupabaseConfigured) {
        const { data: years } = await supabase
          .from("academic_years")
          .select("id, label, is_current")
          .eq("school_id", activeSchoolId);
        if (years && years.length > 0) {
          setAcademicYears(
            years.map((y) => ({ id: y.id, label: y.label || "2026–2027" }))
          );
        } else {
          setAcademicYears([{ id: "default_year", label: "2025–2026" }]);
        }

        // 2. Classes
        const { classes: cls } = await getClassesWithSections(activeSchoolId);
        setClasses(cls || []);

        // 3. Students
        const { data: stds } = await supabase
          .from("students")
          .select("id, first_name, last_name, admission_no, admission_class_id, status")
          .eq("school_id", activeSchoolId)
          .is("deleted_at", null);
        setStudents(stds || []);
      } else {
        setAcademicYears([
          { id: "2025_2026", label: "2025–2026" },
          { id: "2026_2027", label: "2026–2027" },
        ]);
        const { classes: cls } = await getClassesWithSections(activeSchoolId);
        setClasses(cls || []);
      }

      // 4. Fee Heads & Concession Rules
      const [headsRes, rulesRes] = await Promise.all([
        getFeeHeads(activeSchoolId, false),
        getConcessionRules(activeSchoolId),
      ]);
      setFeeHeads(headsRes.heads || []);
      setConcessionRules(rulesRes.rules || []);
    } catch (err: any) {
      console.warn("Error loading metadata:", err?.message);
    }
  }, [activeSchoolId]);

  // ─── Load Concessions Overview ─────────────────────────────────────────────
  const loadConcessions = useCallback(async (isSilent = false) => {
    if (!activeSchoolId) return;
    if (!isSilent) setLoading(true);
    else setRefreshing(true);
    setError(null);

    try {
      const { concessions: list, metrics: m, error: err } = await getConcessionsOverview(
        activeSchoolId,
        filters
      );
      if (err) {
        setError(err);
      } else {
        setConcessions(list);
        setMetrics(m);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load concessions.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeSchoolId, filters]);

  useEffect(() => {
    loadMetadata();
  }, [loadMetadata]);

  useEffect(() => {
    loadConcessions();
  }, [loadConcessions]);

  // Reset to first page when filters change
  const handleFilterChange = (newFilters: ConcessionFilters) => {
    setFilters(newFilters);
    setPage(1);
  };

  // ─── Actions ───────────────────────────────────────────────────────────────
  const handleCreateConcession = async (input: StudentConcessionInput): Promise<boolean> => {
    const actorId = user?.id || null;
    const actorRole = role || "school_admin";
    const res = await createStudentConcession(activeSchoolId, input, actorId, actorRole);
    if (res.error) {
      showToast("error", res.error);
      return false;
    }
    if (res.approvalRequired) {
      showToast("success", "Concession submitted for administrator approval.");
    } else {
      showToast("success", "Concession created and applied successfully.");
    }
    await loadConcessions(true);
    return true;
  };

  const handleApprove = async (concessionId: string, note?: string) => {
    const actorId = user?.id || activeSchoolId;
    const res = await approveStudentConcession(activeSchoolId, concessionId, actorId, note);
    if (res.success) {
      showToast("success", "Concession approved and applied to student dues.");
      await loadConcessions(true);
    } else {
      showToast("error", res.error || "Failed to approve concession.");
    }
  };

  const handleReject = async (concessionId: string, reason: string) => {
    const actorId = user?.id || activeSchoolId;
    const res = await rejectStudentConcession(activeSchoolId, concessionId, actorId, reason);
    if (res.success) {
      showToast("success", "Concession request rejected.");
      await loadConcessions(true);
    } else {
      showToast("error", res.error || "Failed to reject concession.");
    }
  };

  const handleRevoke = async (concessionId: string, reason?: string) => {
    const actorId = user?.id || activeSchoolId;
    const res = await revokeStudentConcession(activeSchoolId, concessionId, actorId, reason);
    if (res.success) {
      showToast("success", "Concession revoked. Un-paid dues have been restored.");
      await loadConcessions(true);
    } else {
      showToast("error", res.error || "Failed to revoke concession.");
    }
  };

  const handleDelete = async (concessionId: string) => {
    const res = await deleteStudentConcession(activeSchoolId, concessionId);
    if (res.success) {
      showToast("success", "Concession deleted.");
      await loadConcessions(true);
    } else {
      showToast("error", res.error || "Failed to delete concession.");
    }
  };

  // ─── Export CSV ────────────────────────────────────────────────────────────
  const handleExportCSV = () => {
    if (concessions.length === 0) {
      showToast("error", "No concession records to export.");
      return;
    }
    const headers = [
      "Student Name",
      "Admission No",
      "Class",
      "Concession Type",
      "Discount Type",
      "Discount Value",
      "Status",
      "Valid From",
      "Valid To",
      "Billing Period",
      "Reason",
    ];

    const rows = concessions.map((c) => [
      `"${c.student_name || ""}"`,
      `"${c.admission_no || ""}"`,
      `"${c.class_name || ""} ${c.section_name || ""}"`,
      `"${c.concession_type || ""}"`,
      `"${c.type}"`,
      `"${c.value}"`,
      `"${c.status}"`,
      `"${c.valid_from || ""}"`,
      `"${c.valid_to || ""}"`,
      `"${c.billing_period || ""}"`,
      `"${(c.reason || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `concessions_${activeSchoolId}_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("success", `Exported ${concessions.length} concession records to CSV.`);
  };

  if (!activeSchoolId) {
    return (
      <div className="min-h-[60vh] bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-1">School Context Required</h2>
        <p className="text-sm text-slate-500 max-w-md">
          Please select or log into an authenticated school context to view and configure fee concessions.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-[1440px] mx-auto pb-12">
      {/* Toast Feedback */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 text-xs font-semibold animate-in slide-in-from-bottom duration-200 ${
            toastMessage.type === "success"
              ? "bg-[#00875A] text-white"
              : "bg-rose-600 text-white"
          }`}
        >
          {toastMessage.type === "success" ? (
            <CheckCircle className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Top Header Section */}
      <div>
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mb-1.5">
          <span>Fee Management</span>
          <span>›</span>
          <span className="text-slate-700 font-semibold">Discounts & Concessions</span>
        </div>

        {/* Title, Subtitle, and Top Action Buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Discounts & Concessions
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 font-normal">
              Manage student discounts, scholarships and fee concessions.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {/* Secondary Button: Concession Policies */}
            <button
              type="button"
              onClick={() => setIsPoliciesDrawerOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 border border-[#E6EAF3] text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
            >
              <Sliders className="w-4 h-4 text-slate-500" />
              <span>Concession Policies</span>
            </button>

            {/* Primary Action: Add Concession */}
            <button
              type="button"
              onClick={() => {
                setSelectedConcessionForEdit(null);
                setIsAddDrawerOpen(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#00875A] hover:bg-[#007048] text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Add Concession</span>
            </button>
          </div>
        </div>
      </div>

      {/* Error Alert if any */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => loadConcessions()}
            className="flex items-center gap-1 font-bold underline hover:no-underline cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* 4 Summary Cards */}
      <ConcessionSummaryCards metrics={metrics} loading={loading} />

      {/* Filter Panel */}
      <ConcessionFilterPanel
        filters={filters}
        onChange={handleFilterChange}
        academicYears={academicYears}
        classes={classes}
      />

      {/* Concession Records Table */}
      <ConcessionTable
        concessions={concessions}
        loading={loading}
        onViewDetails={(c) => setSelectedConcessionForDetail(c)}
        onEdit={(c) => {
          setSelectedConcessionForEdit(c);
          setIsAddDrawerOpen(true);
        }}
        onApprove={(c) => handleApprove(c.id)}
        onReject={(c) => handleReject(c.id, "Rejected by administrator")}
        onRevoke={(c) => handleRevoke(c.id, "Revoked by administrator")}
        onDelete={(c) => handleDelete(c.id)}
        onExport={handleExportCSV}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(newSize) => {
          setPageSize(newSize);
          setPage(1);
        }}
      />

      {/* Add Concession Drawer */}
      <AddConcessionDrawer
        isOpen={isAddDrawerOpen}
        onClose={() => setIsAddDrawerOpen(false)}
        onSubmit={handleCreateConcession}
        schoolId={activeSchoolId}
        students={students}
        academicYears={academicYears}
        classes={classes}
        feeHeads={feeHeads}
        concessionRules={concessionRules}
      />

      {/* Concession Details Drawer */}
      <ConcessionDetailDrawer
        concession={selectedConcessionForDetail}
        isOpen={!!selectedConcessionForDetail}
        onClose={() => setSelectedConcessionForDetail(null)}
        onApprove={handleApprove}
        onReject={handleReject}
        onRevoke={handleRevoke}
        onDelete={handleDelete}
      />

      {/* Concession Policies Drawer */}
      <ConcessionPoliciesDrawer
        isOpen={isPoliciesDrawerOpen}
        onClose={() => setIsPoliciesDrawerOpen(false)}
        rules={concessionRules}
        feeHeads={feeHeads}
        schoolId={activeSchoolId}
        onRefresh={async () => {
          const { rules: r } = await getConcessionRules(activeSchoolId);
          setConcessionRules(r || []);
        }}
      />
    </div>
  );
}
