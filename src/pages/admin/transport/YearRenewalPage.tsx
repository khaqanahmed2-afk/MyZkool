/**
 * Transport Year Renewal Screen (Spec C5.4, C7.9)
 *
 * At year change, assignments do not roll over silently.
 * Lists last year's riders who are promoted with route, stop, and new fee.
 * Bulk selection with exception unchecking.
 * Commits renewals and triggers FeeService.createTransportDues for new year.
 */

import React, { useState, useEffect } from "react";
import {
  CalendarSync,
  Bus,
  CheckCircle2,
  AlertCircle,
  Search,
  CheckSquare,
  Square,
  ArrowRight,
  Filter,
  UserX,
  AlertTriangle,
} from "lucide-react";
import { getRenewalPreview, commitRenewal } from "../../../services/transportAssignmentService";
import { useAuth } from "../../../context/AuthContext";
import type { RenewalPreviewItem } from "../../../types/transport";

export const YearRenewalPage: React.FC = () => {
  const { schoolId: authSchoolId } = useAuth();
  const [schoolId, setSchoolId] = useState<string>(authSchoolId || "");
  const [oldYearId, setOldYearId] = useState<string>("ay-2025-26");
  const [newYearId, setNewYearId] = useState<string>("ay-2026-27");
  const [effectiveFrom, setEffectiveFrom] = useState<string>("2026-04-01");

  const [items, setItems] = useState<RenewalPreviewItem[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [activeFilter, setActiveFilter] = useState<"all" | "eligible" | "already_assigned" | "left_school">("eligible");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  useEffect(() => {
    if (authSchoolId) {
      setSchoolId(authSchoolId);
    } else if (typeof localStorage !== "undefined") {
      const stored = localStorage.getItem("current_school_id");
      if (stored) setSchoolId(stored);
    }
  }, [authSchoolId]);

  const loadPreview = async () => {
    if (!schoolId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setStatusMessage(null);
    try {
      const preview = await getRenewalPreview(schoolId, oldYearId, newYearId);
      setItems(preview);

      // Pre-select all eligible by default
      const eligibleIds = new Set(preview.filter((p) => p.status === "eligible").map((p) => p.student_id));
      setSelectedStudentIds(eligibleIds);
    } catch (err: any) {
      console.error(err);
      setStatusMessage({ type: "error", text: err.message || "Failed to load renewal preview" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!schoolId) return;
    loadPreview();
  }, [schoolId, oldYearId, newYearId]);

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      `${item.student_name} ${item.admission_no} ${item.route_name} ${item.pickup_stop_name}`
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
    const matchesFilter = activeFilter === "all" || item.status === activeFilter;
    return matchesSearch && matchesFilter;
  });

  const toggleSelect = (studentId: string) => {
    const next = new Set(selectedStudentIds);
    if (next.has(studentId)) next.delete(studentId);
    else next.add(studentId);
    setSelectedStudentIds(next);
  };

  const toggleSelectAll = () => {
    const selectable = filteredItems.filter((i) => i.status === "eligible");
    if (selectable.every((i) => selectedStudentIds.has(i.student_id))) {
      // Unselect all in current view
      const next = new Set(selectedStudentIds);
      selectable.forEach((i) => next.delete(i.student_id));
      setSelectedStudentIds(next);
    } else {
      const next = new Set(selectedStudentIds);
      selectable.forEach((i) => next.add(i.student_id));
      setSelectedStudentIds(next);
    }
  };

  const handleCommit = async () => {
    if (selectedStudentIds.size === 0) return;

    setSubmitting(true);
    setStatusMessage(null);

    try {
      const renewalsToCommit = items
        .filter((i) => selectedStudentIds.has(i.student_id) && i.status === "eligible")
        .map((i) => ({
          student_id: i.student_id,
          route_id: i.route_id,
          pickup_stop_id: i.pickup_stop_id,
          drop_stop_id: i.drop_stop_id,
          service_type: i.service_type,
        }));

      const res = await commitRenewal(schoolId, {
        new_academic_year_id: newYearId,
        effective_from: effectiveFrom,
        renewals: renewalsToCommit,
      });

      if (!res.success) {
        setStatusMessage({ type: "error", text: res.error || "Failed to commit renewals." });
        return;
      }

      setStatusMessage({
        type: "success",
        text: `Successfully renewed transport for ${res.count} student(s). Transport dues created for ${newYearId}.`,
      });

      loadPreview();
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "An error occurred." });
    } finally {
      setSubmitting(false);
    }
  };

  const eligibleCount = items.filter((i) => i.status === "eligible").length;
  const alreadyAssignedCount = items.filter((i) => i.status === "already_assigned").length;
  const leftSchoolCount = items.filter((i) => i.status === "left_school").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 font-display flex items-center gap-2.5">
            <CalendarSync className="w-5 h-5 text-[#2158E0]" />
            Transport Year Renewal
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Review previous year riders and confirm assignments for the new academic session.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 font-medium">Session:</span>
            <span className="font-semibold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg border border-[#E6EAF3]">
              {oldYearId} → {newYearId}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-500 font-medium">Effective:</span>
            <input
              type="date"
              value={effectiveFrom}
              onChange={(e) => setEffectiveFrom(e.target.value)}
              className="px-2 py-1 border border-[#E6EAF3] rounded-lg bg-white font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#2158E0]"
            />
          </div>
        </div>
      </div>

      {statusMessage && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center gap-2.5 border ${
            statusMessage.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-rose-50 text-rose-800 border-rose-200"
          }`}
        >
          {statusMessage.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Main card */}
      <div className="bg-white border border-[#E6EAF3] rounded-2xl p-6 shadow-2xs space-y-5">
        {/* Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search riders, routes, or stops..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-[#E6EAF3] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2158E0]"
              />
            </div>

            <div className="flex items-center border border-[#E6EAF3] rounded-lg p-0.5 bg-slate-50 text-xs">
              <button
                type="button"
                onClick={() => setActiveFilter("eligible")}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                  activeFilter === "eligible"
                    ? "bg-white text-[#2158E0] shadow-xs font-semibold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Eligible ({eligibleCount})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter("already_assigned")}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                  activeFilter === "already_assigned"
                    ? "bg-white text-[#2158E0] shadow-xs font-semibold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Renewed ({alreadyAssignedCount})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter("left_school")}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                  activeFilter === "left_school"
                    ? "bg-white text-[#2158E0] shadow-xs font-semibold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Left School ({leftSchoolCount})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter("all")}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                  activeFilter === "all"
                    ? "bg-white text-[#2158E0] shadow-xs font-semibold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                All ({items.length})
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <span className="text-xs text-slate-500 font-medium">
              {selectedStudentIds.size} student(s) selected
            </span>
            <button
              type="button"
              onClick={handleCommit}
              disabled={submitting || selectedStudentIds.size === 0}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#2158E0] text-white text-xs font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors cursor-pointer shadow-xs"
            >
              {submitting ? (
                "Renewing..."
              ) : (
                <>
                  <span>Confirm renewal ({selectedStudentIds.size})</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-[#E6EAF3]">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-[#E6EAF3] text-slate-500 font-semibold text-[11px] uppercase tracking-wider">
                <th className="py-3 px-4 w-10">
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className="flex items-center cursor-pointer text-slate-500 hover:text-slate-700"
                  >
                    <CheckSquare className="w-4 h-4" />
                  </button>
                </th>
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">Class</th>
                <th className="py-3 px-4">Route & Stop</th>
                <th className="py-3 px-4 text-right">Previous Fee</th>
                <th className="py-3 px-4 text-right">New Fee</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E6EAF3]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    Loading renewal preview...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    No riders found matching the current filter.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const isSelected = selectedStudentIds.has(item.student_id);
                  const isEligible = item.status === "eligible";

                  return (
                    <tr
                      key={item.student_id}
                      onClick={() => {
                        if (isEligible) toggleSelect(item.student_id);
                      }}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        !isEligible
                          ? "bg-slate-50/30 text-slate-400 cursor-not-allowed"
                          : isSelected
                          ? "bg-blue-50/40 cursor-pointer"
                          : "cursor-pointer"
                      }`}
                    >
                      <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                        {isEligible ? (
                          <button
                            type="button"
                            onClick={() => toggleSelect(item.student_id)}
                            className="cursor-pointer text-slate-600"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-[#2158E0]" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-300" />
                            )}
                          </button>
                        ) : (
                          <Square className="w-4 h-4 text-slate-200" />
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{item.student_name}</div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {item.admission_no}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        {item.new_class_name}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-900">{item.route_name}</div>
                        <div className="text-[11px] text-slate-500">
                          {item.pickup_stop_name} ({item.service_type})
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right text-slate-500 font-mono">
                        ₹{(item.old_monthly_fee_paise / 100).toFixed(0)}/mo
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-slate-900 font-mono">
                        ₹{(item.new_monthly_fee_paise / 100).toFixed(0)}/mo
                      </td>
                      <td className="py-3 px-4 text-center">
                        {item.status === "eligible" && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-[#2158E0] border border-blue-200">
                            Eligible
                          </span>
                        )}
                        {item.status === "already_assigned" && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Renewed
                          </span>
                        )}
                        {item.status === "left_school" && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                            Left school
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

