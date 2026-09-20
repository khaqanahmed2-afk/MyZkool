/**
 * FeeReportsPage — /admin/fees/reports
 * Spec B5.11:
 * Comprehensive Fee Reports with filters, table with totals, XLSX/CSV export, and printing:
 * - Day book
 * - Collection summary
 * - Outstanding & Defaulters
 * - Concession register
 * - Cancelled receipts
 */

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Download, Printer, Filter, Calendar, Search, FileText,
  DollarSign, CheckSquare, RefreshCw, X
} from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import {
  getDayBookReport, getOutstandingReport, exportToCSV
} from "../../../services/feeReportsService";
import { getReceipts } from "../../../services/collectionService";
import { formatPaise } from "../../../lib/amountInWords";
import type { DayBookReportRow, OutstandingReportRow } from "../../../types/feeOperations";
import type { FeeReceipt } from "../../../types/collection";

function fmt(paise: number): string {
  return "₹" + (paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function FeeReportsPage() {
  const { schoolId } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<"day_book" | "outstanding" | "cancelled">("day_book");
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);

  // Data states
  const [dayBookRows, setDayBookRows] = useState<DayBookReportRow[]>([]);
  const [outstandingRows, setOutstandingRows] = useState<OutstandingReportRow[]>([]);
  const [cancelledReceipts, setCancelledReceipts] = useState<FeeReceipt[]>([]);

  const loadData = async () => {
    if (!schoolId) return;
    setLoading(true);

    try {
      if (activeTab === "day_book") {
        const data = await getDayBookReport(schoolId, selectedDate);
        setDayBookRows(data);
      } else if (activeTab === "outstanding") {
        const data = await getOutstandingReport(schoolId);
        setOutstandingRows(data);
      } else if (activeTab === "cancelled") {
        const { receipts } = await getReceipts(schoolId);
        setCancelledReceipts(receipts.filter(r => r.status === "cancelled"));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [schoolId, activeTab, selectedDate]);

  // CSV Export
  const handleExportCSV = () => {
    let headers: string[] = [];
    let rows: (string | number)[][] = [];

    if (activeTab === "day_book") {
      headers = ["Business Date", "Type", "Ref No", "Student Name", "Admission No", "Payment Mode", "Amount", "Collector", "Status"];
      rows = dayBookRows.map(r => [
        r.business_date, r.entry_type, r.reference_no, r.student_name, r.admission_no, r.payment_mode, fmt(r.amount_paise), r.collected_by || "", r.status
      ]);
    } else if (activeTab === "outstanding") {
      headers = ["Student Name", "Admission No", "Class", "Section", "Parent", "Phone", "Net Demand", "Paid", "Balance", "Days Overdue"];
      rows = outstandingRows.map(r => [
        r.student_name, r.admission_no, r.class_name, r.section_name || "", r.primary_parent_name || "", r.primary_parent_phone || "",
        fmt(r.total_net_paise), fmt(r.total_paid_paise), fmt(r.total_balance_paise), r.days_overdue
      ]);
    } else if (activeTab === "cancelled") {
      headers = ["Receipt No", "Date", "Amount", "Cancel Reason", "Cancelled By", "Date Cancelled"];
      rows = cancelledReceipts.map(r => [
        r.receipt_no, r.receipt_date, fmt(r.total_paise), r.cancel_reason || "", r.cancelled_by || "", r.cancelled_at || ""
      ]);
    }

    const csvContent = exportToCSV(headers, rows);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fee_report_${activeTab}_${selectedDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/admin/fees")}
            className="p-2 rounded-xl border border-[#E6EAF3] bg-white hover:bg-slate-50 text-slate-600 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 font-display">Fee Reports Register</h1>
            <p className="text-xs text-slate-500">Day book, outstanding statements, and cancelled receipts audits</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {activeTab === "day_book" && (
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="text-xs border border-[#E6EAF3] bg-white rounded-xl px-3 py-2 font-medium focus:outline-none focus:border-[#2158E0]"
            />
          )}

          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#E6EAF3] bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#E6EAF3] bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" /> Print
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#E6EAF3] bg-white rounded-t-2xl px-4 pt-2">
        {[
          { key: "day_book", label: "Day Book Register" },
          { key: "outstanding", label: "Outstanding & Aging" },
          { key: "cancelled", label: "Cancelled Receipts" },
        ].map(tab => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-4 py-3 text-xs font-semibold capitalize border-b-2 -mb-px cursor-pointer ${
              activeTab === tab.key
                ? "border-[#2158E0] text-[#2158E0]"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table Container */}
      <div className="bg-white border border-[#E6EAF3] rounded-2xl overflow-hidden shadow-2xs">
        {loading ? (
          <div className="py-16 text-center text-xs text-slate-400">Loading report data...</div>
        ) : (
          <div className="overflow-x-auto">
            {activeTab === "day_book" && (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[#E6EAF3] bg-slate-50 text-slate-600 text-left">
                    <th className="py-3 px-4 font-semibold">Ref No</th>
                    <th className="py-3 px-4 font-semibold">Type</th>
                    <th className="py-3 px-4 font-semibold">Student</th>
                    <th className="py-3 px-4 font-semibold">Mode</th>
                    <th className="py-3 px-4 font-semibold text-right">Amount</th>
                    <th className="py-3 px-4 font-semibold">Collector</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E6EAF3] text-slate-800">
                  {dayBookRows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">No day book entries on this date.</td>
                    </tr>
                  ) : (
                    dayBookRows.map(r => (
                      <tr key={r.entry_id} className="hover:bg-slate-50/70">
                        <td className="py-3 px-4 font-mono font-medium text-[#2158E0]">{r.reference_no}</td>
                        <td className="py-3 px-4 uppercase text-slate-600">{r.entry_type}</td>
                        <td className="py-3 px-4">
                          <div className="font-semibold">{r.student_name}</div>
                          <div className="text-[11px] text-slate-400 font-mono">{r.admission_no}</div>
                        </td>
                        <td className="py-3 px-4 capitalize">{r.payment_mode}</td>
                        <td className="py-3 px-4 text-right font-bold tabular-nums">{fmt(r.amount_paise)}</td>
                        <td className="py-3 px-4 text-slate-600">{r.collected_by || "System"}</td>
                        <td className="py-3 px-4 capitalize">{r.status}</td>
                      </tr>
                    ))
                  )}
                  {dayBookRows.length > 0 && (
                    <tr className="border-t-2 border-slate-300 bg-slate-50 font-bold">
                      <td colSpan={4} className="py-3 px-4">Total Day Receipts</td>
                      <td className="py-3 px-4 text-right tabular-nums">
                        {fmt(dayBookRows.reduce((s, r) => s + r.amount_paise, 0))}
                      </td>
                      <td colSpan={2}></td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}

            {activeTab === "outstanding" && (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[#E6EAF3] bg-slate-50 text-slate-600 text-left">
                    <th className="py-3 px-4 font-semibold">Student</th>
                    <th className="py-3 px-4 font-semibold">Class</th>
                    <th className="py-3 px-4 font-semibold">Parent Contact</th>
                    <th className="py-3 px-4 font-semibold text-right">Net Demand</th>
                    <th className="py-3 px-4 font-semibold text-right">Paid</th>
                    <th className="py-3 px-4 font-semibold text-right">Balance</th>
                    <th className="py-3 px-4 font-semibold">Days Overdue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E6EAF3] text-slate-800">
                  {outstandingRows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">No outstanding dues.</td>
                    </tr>
                  ) : (
                    outstandingRows.map(r => (
                      <tr key={r.student_id} className="hover:bg-slate-50/70">
                        <td className="py-3 px-4">
                          <div className="font-semibold">{r.student_name}</div>
                          <div className="text-[11px] text-slate-400 font-mono">{r.admission_no}</div>
                        </td>
                        <td className="py-3 px-4">{r.class_name} {r.section_name ? `- ${r.section_name}` : ""}</td>
                        <td className="py-3 px-4">
                          <div className="text-slate-700">{r.primary_parent_name || "—"}</div>
                          <div className="text-[11px] text-slate-400">{r.primary_parent_phone || "—"}</div>
                        </td>
                        <td className="py-3 px-4 text-right font-medium tabular-nums">{fmt(r.total_net_paise)}</td>
                        <td className="py-3 px-4 text-right font-medium text-[#1FAE7A] tabular-nums">{fmt(r.total_paid_paise)}</td>
                        <td className="py-3 px-4 text-right font-bold text-red-600 tabular-nums">{fmt(r.total_balance_paise)}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700">
                            {r.days_overdue} days
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                  {outstandingRows.length > 0 && (
                    <tr className="border-t-2 border-slate-300 bg-slate-50 font-bold">
                      <td colSpan={3} className="py-3 px-4">Total Outstanding</td>
                      <td className="py-3 px-4 text-right tabular-nums">
                        {fmt(outstandingRows.reduce((s, r) => s + r.total_net_paise, 0))}
                      </td>
                      <td className="py-3 px-4 text-right text-[#1FAE7A] tabular-nums">
                        {fmt(outstandingRows.reduce((s, r) => s + r.total_paid_paise, 0))}
                      </td>
                      <td className="py-3 px-4 text-right text-red-600 tabular-nums">
                        {fmt(outstandingRows.reduce((s, r) => s + r.total_balance_paise, 0))}
                      </td>
                      <td></td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}

            {activeTab === "cancelled" && (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[#E6EAF3] bg-slate-50 text-slate-600 text-left">
                    <th className="py-3 px-4 font-semibold">Receipt No</th>
                    <th className="py-3 px-4 font-semibold">Date</th>
                    <th className="py-3 px-4 font-semibold text-right">Amount</th>
                    <th className="py-3 px-4 font-semibold">Reason</th>
                    <th className="py-3 px-4 font-semibold">Cancelled At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E6EAF3] text-slate-800">
                  {cancelledReceipts.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">No cancelled receipts on record.</td>
                    </tr>
                  ) : (
                    cancelledReceipts.map(r => (
                      <tr key={r.id} className="hover:bg-slate-50/70">
                        <td className="py-3 px-4 font-mono font-medium text-red-600">{r.receipt_no}</td>
                        <td className="py-3 px-4 text-slate-600">{r.receipt_date}</td>
                        <td className="py-3 px-4 text-right font-bold tabular-nums">{fmt(r.total_paise)}</td>
                        <td className="py-3 px-4 text-slate-700">{r.cancel_reason}</td>
                        <td className="py-3 px-4 text-slate-500">{r.cancelled_at || r.updated_at}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

