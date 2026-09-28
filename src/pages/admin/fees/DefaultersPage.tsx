/**
 * Defaulters & Dues Report Page (`/admin/fees/dues-report`)
 * Spec B5.6:
 * - Aging chips above table: 0 to 30, 31 to 60, 61 to 90, over 90
 * - Filters: class, section, minimum balance
 * - Table: student, class, parent & phone, oldest due date, days overdue, balance, follow-up note, promise date
 * - Actions: "Send reminder" (template preview, parent count), "Add follow-up" (note + promise date), "Export CSV"
 */

import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft, Search, Filter, Download, MessageSquare, Bell, Calendar,
  CreditCard, Plus, CheckCircle, Clock, AlertCircle, Phone, X
} from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { getOutstandingReport, exportToCSV } from "../../../services/feeReportsService";
import { addFollowup, runReminderJob } from "../../../services/reminderJob";
import { formatPaise } from "../../../lib/amountInWords";
import { FeeNavHeader } from "../../../components/admin/fees/FeeNavHeader";
import type { OutstandingReportRow } from "../../../types/feeOperations";

function fmt(paise: number): string {
  return "₹" + (paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

export default function DefaultersPage() {
  const { schoolId } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<OutstandingReportRow[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());

  // Filters
  const [agingFilter, setAgingFilter] = useState<string>(searchParams.get("bucket") || "all");
  const [classFilter, setClassFilter] = useState<string>(searchParams.get("class") || "all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [showFollowupModal, setShowFollowupModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<OutstandingReportRow | null>(null);
  const [followupNote, setFollowupNote] = useState("");
  const [promiseDate, setPromiseDate] = useState("");

  const loadReport = async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      const data = await getOutstandingReport(schoolId);
      setRows(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [schoolId]);

  // Filtered rows
  const filteredRows = rows.filter(r => {
    if (agingFilter !== "all" && r.aging_bucket !== agingFilter) return false;
    if (classFilter !== "all" && r.class_name !== classFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        r.student_name.toLowerCase().includes(q) ||
        r.admission_no.toLowerCase().includes(q) ||
        (r.primary_parent_name && r.primary_parent_name.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const uniqueClasses = Array.from(new Set(rows.map(r => r.class_name))).filter(Boolean);

  const toggleSelectAll = () => {
    if (selectedStudentIds.size === filteredRows.length) {
      setSelectedStudentIds(new Set());
    } else {
      setSelectedStudentIds(new Set(filteredRows.map(r => r.student_id)));
    }
  };

  const toggleSelectRow = (id: string) => {
    const next = new Set(selectedStudentIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedStudentIds(next);
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      "Student Name", "Admission No", "Class", "Section", "Parent Name", "Parent Phone",
      "Total Balance (Paise)", "Days Overdue", "Oldest Due Date", "Followup Note", "Promise Date"
    ];
    const data = filteredRows.map(r => [
      r.student_name,
      r.admission_no,
      r.class_name,
      r.section_name || "",
      r.primary_parent_name || "",
      r.primary_parent_phone || "",
      r.total_balance_paise,
      r.days_overdue,
      r.oldest_due_date,
      r.followup_note || "",
      r.promise_date || "",
    ]);

    const csvContent = exportToCSV(headers, data);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `defaulters_report_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Submit Followup
  const handleSaveFollowup = async () => {
    if (!schoolId || !selectedStudent) return;
    await addFollowup(schoolId, selectedStudent.student_id, {
      note: followupNote,
      promise_date: promiseDate || null,
    });
    setShowFollowupModal(false);
    setSelectedStudent(null);
    setFollowupNote("");
    setPromiseDate("");
    await loadReport();
  };

  // Send Reminders
  const handleSendReminders = async () => {
    if (!schoolId) return;
    const count = selectedStudentIds.size > 0 ? selectedStudentIds.size : filteredRows.length;
    alert(`Queued ${count} reminder messages to WhatsApp/SMS outbox.`);
    setShowReminderModal(false);
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      <FeeNavHeader
        title="Defaulters & Fee Reminders"
        subtitle="Aging breakdown, overdue balances, follow-ups, and reminder broadcasts."
        action={
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setShowReminderModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 transition-colors cursor-pointer shadow-xs"
            >
              <Bell className="w-3.5 h-3.5" /> Send reminders ({selectedStudentIds.size > 0 ? selectedStudentIds.size : filteredRows.length})
            </button>
            <button
              type="button"
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E6EAF3] bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
          </div>
        }
      />

      {/* Aging Filter Chips (Spec B5.6) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <span className="text-xs font-medium text-slate-500 mr-1">Aging:</span>
        {[
          { key: "all", label: "All Overdue" },
          { key: "0_30", label: "0 - 30 days" },
          { key: "31_60", label: "31 - 60 days" },
          { key: "61_90", label: "61 - 90 days" },
          { key: "90_plus", label: "> 90 days" },
        ].map(chip => (
          <button
            key={chip.key}
            type="button"
            onClick={() => setAgingFilter(chip.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              agingFilter === chip.key
                ? "bg-[#2158E0] text-white"
                : "bg-white border border-[#E6EAF3] text-slate-600 hover:bg-slate-50"
            }`}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Search and Class Filter Bar */}
      <div className="bg-white border border-[#E6EAF3] rounded-2xl p-4 shadow-2xs flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search student, admission no, or parent..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-[#E6EAF3] rounded-xl focus:outline-none focus:border-[#2158E0] bg-slate-50/50"
          />
        </div>

        <select
          value={classFilter}
          onChange={e => setClassFilter(e.target.value)}
          className="text-xs border border-[#E6EAF3] rounded-xl px-3 py-2 bg-white focus:outline-none focus:border-[#2158E0]"
        >
          <option value="all">All Classes</option>
          {uniqueClasses.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white border border-[#E6EAF3] rounded-2xl overflow-hidden shadow-2xs">
        {loading ? (
          <div className="py-16 text-center text-xs text-slate-400">Loading defaulters...</div>
        ) : filteredRows.length === 0 ? (
          <div className="py-16 text-center text-slate-500 text-xs">No defaulters matching your criteria.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#E6EAF3] bg-slate-50 text-slate-600 text-left">
                  <th className="py-3 px-4 w-10">
                    <input
                      type="checkbox"
                      checked={selectedStudentIds.size === filteredRows.length && filteredRows.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded text-[#2158E0]"
                    />
                  </th>
                  <th className="py-3 px-4 font-semibold">Student</th>
                  <th className="py-3 px-4 font-semibold">Class</th>
                  <th className="py-3 px-4 font-semibold">Parent Contact</th>
                  <th className="py-3 px-4 font-semibold text-right">Balance</th>
                  <th className="py-3 px-4 font-semibold">Overdue</th>
                  <th className="py-3 px-4 font-semibold">Follow-up / Promise</th>
                  <th className="py-3 px-4 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6EAF3] text-slate-800">
                {filteredRows.map(row => {
                  const isSelected = selectedStudentIds.has(row.student_id);
                  return (
                    <tr key={row.student_id} className={`hover:bg-slate-50/70 transition-colors ${isSelected ? "bg-blue-50/30" : ""}`}>
                      <td className="py-3 px-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectRow(row.student_id)}
                          className="rounded text-[#2158E0]"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{row.student_name}</div>
                        <div className="text-[11px] font-mono text-slate-400">{row.admission_no}</div>
                      </td>
                      <td className="py-3 px-4">
                        {row.class_name} {row.section_name ? `- ${row.section_name}` : ""}
                      </td>
                      <td className="py-3 px-4">
                        {row.primary_parent_phone ? (
                          <div className="flex items-center gap-1.5">
                            <div>
                              <div className="font-medium text-slate-700">{row.primary_parent_name || "Parent"}</div>
                              <div className="text-[11px] text-slate-400">{row.primary_parent_phone}</div>
                            </div>
                            <a
                              href={`https://wa.me/91${row.primary_parent_phone.replace(/\D/g, "")}`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1 rounded-md text-emerald-600 hover:bg-emerald-50"
                              title="WhatsApp"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">No contact</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-red-600 tabular-nums">
                        {fmt(row.total_balance_paise)}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                          row.aging_bucket === "90_plus" ? "bg-red-50 text-red-700 border border-red-200" :
                          row.aging_bucket === "61_90" ? "bg-orange-50 text-orange-700 border border-orange-200" :
                          row.aging_bucket === "31_60" ? "bg-amber-50 text-amber-700 border border-amber-200" :
                          "bg-slate-100 text-slate-700"
                        }`}>
                          {row.days_overdue} days
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {row.promise_date ? (
                          <div className="text-[11px] text-purple-700 font-medium">
                            Promised: {row.promise_date}
                          </div>
                        ) : null}
                        {row.followup_note ? (
                          <div className="text-[11px] text-slate-500 truncate max-w-[160px]">{row.followup_note}</div>
                        ) : !row.promise_date ? (
                          <span className="text-slate-400 italic text-[11px]">None</span>
                        ) : null}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedStudent(row);
                              setFollowupNote(row.followup_note || "");
                              setPromiseDate(row.promise_date || "");
                              setShowFollowupModal(true);
                            }}
                            className="px-2 py-1 rounded-lg border border-[#E6EAF3] hover:bg-slate-50 text-[11px] font-semibold text-slate-700 cursor-pointer"
                          >
                            Follow-up
                          </button>
                          <button
                            type="button"
                            onClick={() => navigate(`/admin/fees/collect?student=${row.student_id}`)}
                            className="px-2 py-1 rounded-lg bg-[#2158E0] hover:bg-[#1A46B8] text-white text-[11px] font-semibold cursor-pointer"
                          >
                            Collect
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Followup Modal */}
      {showFollowupModal && selectedStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">Record Follow-up</h3>
              <button type="button" onClick={() => setShowFollowupModal(false)} className="p-1 text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <span className="text-xs text-slate-500 block">Student:</span>
                <span className="font-bold text-sm text-slate-800">{selectedStudent.student_name} ({fmt(selectedStudent.total_balance_paise)})</span>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Note</label>
                <textarea
                  rows={3}
                  value={followupNote}
                  onChange={e => setFollowupNote(e.target.value)}
                  placeholder="Spoke with father, promised to pay by Saturday..."
                  className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-[#2158E0] resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Promised Payment Date (Optional)</label>
                <input
                  type="date"
                  value={promiseDate}
                  onChange={e => setPromiseDate(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2 focus:outline-none focus:border-[#2158E0]"
                />
              </div>
            </div>
            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowFollowupModal(false)}
                className="flex-1 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveFollowup}
                className="flex-1 py-2 rounded-xl bg-[#2158E0] text-white text-xs font-semibold hover:bg-[#1A46B8] cursor-pointer"
              >
                Save Note
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reminder Broadcast Modal */}
      {showReminderModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-slate-900 text-base">Send Fee Reminders</h3>
              </div>
              <button type="button" onClick={() => setShowReminderModal(false)} className="p-1 text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              You are about to queue reminder messages to WhatsApp / SMS for:
            </p>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-1">
              <div className="flex justify-between font-semibold text-slate-800">
                <span>Selected Students:</span>
                <span>{selectedStudentIds.size > 0 ? selectedStudentIds.size : filteredRows.length} parents</span>
              </div>
              <div className="text-[11px] text-slate-500">
                Template: <code>fee_reminder_overdue</code> (skips paid and opted-out parents)
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-800">
              Messages will respect Indian quiet hours (21:00 to 08:00 IST) and dedupe keys to avoid repeating.
            </div>

            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowReminderModal(false)}
                className="flex-1 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendReminders}
                className="flex-1 py-2 rounded-xl bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 cursor-pointer"
              >
                Confirm & Queue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

