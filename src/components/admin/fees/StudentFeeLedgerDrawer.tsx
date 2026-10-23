import React, { useState, useEffect } from "react";
import {
  X,
  User,
  Phone,
  MessageSquare,
  Bus,
  Calendar,
  Clock,
  CreditCard,
  Printer,
  Download,
  CheckCircle2,
  AlertCircle,
  FileText,
  ChevronRight,
  ChevronDown,
  RefreshCw,
  Wallet,
  Receipt,
  Info,
  ShieldCheck,
} from "lucide-react";
import { formatPaise } from "../../../lib/amountInWords";
import {
  getStudentLedgerDetails,
  generateStudentLedgerHTML,
  getWhatsAppFeeMessage,
} from "../../../services/studentFeeLedgerService";
import { generateInvoiceHTML } from "../../../lib/invoiceTemplate";
import type {
  StudentLedgerDetails,
  LedgerTransactionItem,
  FeeObligationBreakdownItem,
} from "../../../types/studentFeeLedger";

interface StudentFeeLedgerDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  studentId: string | null;
  schoolId: string;
  schoolName: string;
  onCollectPayment: (studentId: string) => void;
}

export function StudentFeeLedgerDrawer({
  isOpen,
  onClose,
  studentId,
  schoolId,
  schoolName,
  onCollectPayment,
}: StudentFeeLedgerDrawerProps) {
  const [activeTab, setActiveTab] = useState<
    "overview" | "breakdown" | "ledger" | "invoices" | "payments" | "concessions" | "transport" | "credits"
  >("overview");
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<string | null>(null);
  const [expandedAuditTxId, setExpandedAuditTxId] = useState<string | null>(null);
  const [selectedTxDetail, setSelectedTxDetail] = useState<LedgerTransactionItem | null>(null);
  const [selectedDueDetail, setSelectedDueDetail] = useState<FeeObligationBreakdownItem | null>(null);
  const [ledgerDetails, setLedgerDetails] = useState<StudentLedgerDetails | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !studentId) {
      setLedgerDetails(null);
      return;
    }

    setLoading(true);
    setError(null);
    getStudentLedgerDetails(schoolId, studentId)
      .then((data) => {
        setLedgerDetails(data);
      })
      .catch((err) => {
        console.error("Failed to load student ledger:", err);
        setError("Unable to load ledger details.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isOpen, studentId, schoolId]);

  if (!isOpen) return null;

  const student = ledgerDetails?.student;

  const handlePrintLedger = () => {
    if (!ledgerDetails) return;
    const html = generateStudentLedgerHTML(ledgerDetails, schoolName);
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 300);
    }
  };

  const handleWhatsApp = () => {
    if (!student) return;
    const encoded = getWhatsAppFeeMessage(student, schoolName);
    const cleanPhone = student.parent_phone ? student.parent_phone.replace(/[^0-9]/g, "") : "";
    const waUrl = cleanPhone
      ? `https://wa.me/91${cleanPhone}?text=${encoded}`
      : `https://wa.me/?text=${encoded}`;
    window.open(waUrl, "_blank");
  };

  const handlePrintInvoice = (invoice: any) => {
    const html = generateInvoiceHTML(invoice, {
      name: schoolName,
    });
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();
    }
  };

  const handlePrintReceipt = (p: any) => {
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html><head><meta charset="utf-8"/><title>Receipt - ${p.receipt_no}</title>
        <style>body{font-family:Arial,sans-serif;padding:24px;color:#1e293b}h2{margin:0 0 4px;font-size:18px;}h3{margin:0 0 16px;font-size:14px;color:#475569;}table{width:100%;border-collapse:collapse;margin:16px 0;}th,td{border:1px solid #cbd5e1;padding:8px 12px;font-size:12px;}th{background:#f8fafc;text-align:left;}</style></head>
        <body>
          <h2>${schoolName}</h2>
          <h3>Official Fee Payment Receipt</h3>
          <p><strong>Receipt No:</strong> ${p.receipt_no} &nbsp;|&nbsp; <strong>Date:</strong> ${p.receipt_date}</p>
          <p><strong>Student Name:</strong> ${student?.student_name} &nbsp;|&nbsp; <strong>Admission No:</strong> ${student?.admission_no}</p>
          <p><strong>Class:</strong> ${student?.class_name} - ${student?.section_name}</p>
          <table>
            <thead><tr><th>Description</th><th>Mode</th><th style="text-align:right">Amount Paid</th></tr></thead>
            <tbody>
              <tr>
                <td>Fee Payment (${p.receipt_no})</td>
                <td style="text-transform:uppercase">${p.payment_mode}</td>
                <td style="text-align:right;font-weight:bold">${formatPaise(p.total_paise)}</td>
              </tr>
            </tbody>
          </table>
          <p style="font-size:11px;color:#64748b;">Collected By: ${p.collected_by_name || "School Office"}</p>
          <script>window.print();</script>
        </body></html>
      `);
      printWindow.document.close();
    }
  };

  // Avatar initials and background
  const initials = student?.student_name
    ? student.student_name
        .split(" ")
        .map((p) => p[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "ST";

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-4xl lg:max-w-5xl bg-white shadow-2xl h-full flex flex-col transform transition-transform ease-out duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-200 bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 font-display flex items-center gap-2">
                <span>Student Fee Ledger</span>
                {student && (
                  <span className="text-xs font-normal text-slate-500">
                    — {student.student_name} ({student.admission_no})
                  </span>
                )}
              </h2>
            </div>
          </div>
          <button
            aria-label="Close"
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-3">
            <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
            <p className="text-sm text-slate-500 font-medium">Loading student fee records...</p>
          </div>
        ) : error || !student ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3">
            <AlertCircle className="w-10 h-10 text-rose-500" />
            <p className="text-sm font-semibold text-slate-800">{error || "Student records not found"}</p>
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200"
            >
              Close Drawer
            </button>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {/* Student Profile Card & Key Financial Metrics */}
            <div className="p-6 pb-4 border-b border-slate-100 bg-slate-50/60">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-sm border-2 border-white shadow-xs shrink-0">
                    {student.avatar_url ? (
                      <img
                        src={student.avatar_url}
                        alt={student.student_name}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      initials
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-slate-900">{student.student_name}</h3>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        {student.student_status || "Active"}
                      </span>
                      {student.applicable_fee_structure_name && (
                        <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-600">
                          {student.applicable_fee_structure_name}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                      <span className="font-mono text-slate-700 font-medium">{student.admission_no}</span>
                      <span>•</span>
                      <span>
                        {student.class_name} - {student.section_name}
                      </span>
                      <span>•</span>
                      <span className="text-slate-600 font-medium">{student.academic_year_name || "2026–2027"}</span>
                    </div>
                  </div>
                </div>

                {/* Quick actions for calling guardian or whatsapp */}
                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => window.open(`tel:${student.parent_phone}`)}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Call Guardian"
                  >
                    <Phone className="w-3.5 h-3.5 text-slate-500" />
                    <span>{student.parent_phone}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleWhatsApp}
                    className="px-2.5 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100/70 text-emerald-800 flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Share fee summary on WhatsApp"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="font-semibold">WhatsApp</span>
                  </button>
                </div>
              </div>

              {/* 4 Primary Financial Metric Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                {/* 1. Total Net Assessed Fee */}
                <div className="bg-white border border-slate-200/90 rounded-xl p-3 text-center shadow-2xs">
                  <div className="text-sm font-bold text-slate-900 tabular-nums">
                    {formatPaise(
                      ledgerDetails?.metrics.net_assessed_paise !== undefined
                        ? ledgerDetails.metrics.net_assessed_paise
                        : student.total_applicable_paise
                    )}
                  </div>
                  <div className="text-[11px] text-slate-600 font-medium mt-0.5">Total Net Fee</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Gross: {formatPaise(ledgerDetails?.metrics.total_charges_paise || student.total_billed_paise || 0)}
                  </div>
                </div>

                {/* 2. Total Paid */}
                <div className="bg-emerald-50/70 border border-emerald-200/90 rounded-xl p-3 text-center shadow-2xs">
                  <div className="text-sm font-bold text-emerald-700 tabular-nums">
                    {formatPaise(student.total_paid_paise)}
                  </div>
                  <div className="text-[11px] text-emerald-700 font-medium mt-0.5">Total Paid</div>
                  <div className="text-[10px] text-emerald-600/80 mt-0.5">
                    {student.total_paid_paise > 0 ? "Receipts Recorded" : "No Payments"}
                  </div>
                </div>

                {/* 3. Pending / Outstanding */}
                <div className="bg-amber-50/70 border border-amber-200/90 rounded-xl p-3 text-center shadow-2xs">
                  <div className="text-sm font-bold text-amber-800 tabular-nums">
                    {formatPaise(ledgerDetails?.metrics.closing_balance_paise ?? student.total_pending_paise)}
                  </div>
                  <div className="text-[11px] text-amber-800 font-medium mt-0.5">Remaining Pending</div>
                  <div className="text-[10px] text-amber-700/80 mt-0.5">
                    {student.next_due_date ? `Due ${student.next_due_date}` : "Clear"}
                  </div>
                </div>

                {/* 4. Overdue */}
                <div
                  className={`rounded-xl p-3 text-center shadow-2xs border ${
                    student.total_overdue_paise > 0
                      ? "bg-rose-50/80 border-rose-200 text-rose-700"
                      : "bg-slate-50 border-slate-200 text-slate-600"
                  }`}
                >
                  <div className="text-sm font-bold tabular-nums">
                    {formatPaise(student.total_overdue_paise)}
                  </div>
                  <div className="text-[11px] opacity-90 font-medium mt-0.5">Overdue Balance</div>
                  <div className="text-[10px] opacity-75 mt-0.5">
                    {student.total_overdue_paise > 0 ? "Past Due Date" : "Zero Overdue"}
                  </div>
                </div>
              </div>

              {/* Concession / Waiver Banner if applicable */}
              {(ledgerDetails?.metrics.total_concessions_paise || 0) > 0 && (
                <div className="mt-3 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-emerald-900 font-semibold">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      Approved Concessions Applied:{" "}
                      <span className="font-bold">{formatPaise(ledgerDetails?.metrics.total_concessions_paise || 0)}</span>
                    </span>
                  </div>
                  <span className="text-[11px] text-emerald-700 font-medium">
                    100% RTE Government Quota Waiver
                  </span>
                </div>
              )}

              {/* Advance Credit Banner if available */}
              {(student.advance_credit_paise || 0) > 0 && (
                <div className="mt-3 p-2.5 bg-sky-50 border border-sky-200 rounded-xl flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-sky-800 font-semibold">
                    <CreditCard className="w-4 h-4 text-sky-600 shrink-0" />
                    <span>Unallocated Advance Credit Available</span>
                  </div>
                  <span className="font-bold text-sky-700 tabular-nums">
                    {formatPaise(student.advance_credit_paise || 0)}
                  </span>
                </div>
              )}

              {/* Tab Navigation Strip */}
              <div className="flex items-center gap-1 mt-4 border-b border-slate-200 text-xs font-semibold overflow-x-auto no-scrollbar pb-px">
                <button
                  type="button"
                  onClick={() => setActiveTab("overview")}
                  className={`pb-2.5 px-3 border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                    activeTab === "overview"
                      ? "border-blue-600 text-blue-600 font-bold"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Overview
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("breakdown")}
                  className={`pb-2.5 px-3 border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                    activeTab === "breakdown"
                      ? "border-blue-600 text-blue-600 font-bold"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <span>Fee Breakdown</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 text-slate-600 font-mono">
                    {ledgerDetails?.fee_breakdown?.length || 0}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("ledger")}
                  className={`pb-2.5 px-3 border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                    activeTab === "ledger"
                      ? "border-blue-600 text-blue-600 font-bold"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <span>Ledger</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 text-slate-600 font-mono">
                    {ledgerDetails?.transactions.length || 0}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("invoices")}
                  className={`pb-2.5 px-3 border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                    activeTab === "invoices"
                      ? "border-blue-600 text-blue-600 font-bold"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <span>Invoices</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 text-slate-600 font-mono">
                    {ledgerDetails?.invoices.length || 0}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("payments")}
                  className={`pb-2.5 px-3 border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                    activeTab === "payments"
                      ? "border-blue-600 text-blue-600 font-bold"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <span>Payments</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 text-slate-600 font-mono">
                    {ledgerDetails?.payments.length || 0}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("concessions")}
                  className={`pb-2.5 px-3 border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                    activeTab === "concessions"
                      ? "border-blue-600 text-blue-600 font-bold"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <span>Concessions</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 text-slate-600 font-mono">
                    {ledgerDetails?.concessions.length || 0}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("transport")}
                  className={`pb-2.5 px-3 border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                    activeTab === "transport"
                      ? "border-blue-600 text-blue-600 font-bold"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <Bus className="w-3.5 h-3.5" />
                  <span>Transport</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("credits")}
                  className={`pb-2.5 px-3 border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                    activeTab === "credits"
                      ? "border-blue-600 text-blue-600 font-bold"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <Wallet className="w-3.5 h-3.5" />
                  <span>Credits</span>
                </button>
              </div>
            </div>

            {/* Tab Body Content */}
            <div className="p-6 pb-20">
              {/* TAB 1: OVERVIEW */}
              {activeTab === "overview" && (
                <div className="space-y-6">
                  {/* Account Summary & Operational Metadata */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2.5">
                      <div className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-2 text-slate-500">
                        Student & Placement Details
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-slate-50">
                        <span className="text-slate-500">Parent / Guardian:</span>
                        <span className="font-semibold text-slate-800">
                          {student.parent_name} ({student.parent_phone})
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-slate-50">
                        <span className="text-slate-500">Class & Section:</span>
                        <span className="font-semibold text-slate-800">
                          {student.class_name} - {student.section_name}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-1">
                        <span className="text-slate-500">Fee Structure:</span>
                        <span className="font-semibold text-slate-800">
                          {student.applicable_fee_structure_name || "Standard Structure"}
                        </span>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2.5">
                      <div className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-2 text-slate-500">
                        Billing Status & Timeline
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-slate-50">
                        <span className="text-slate-500">Transport Enrolled:</span>
                        <span className="font-semibold text-slate-800">
                          {student.has_transport ? `Yes (${student.transport_route || "Route Assigned"})` : "Not Opted"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-slate-50">
                        <span className="text-slate-500">Earliest Due Date:</span>
                        <span className="font-semibold text-slate-800">
                          {student.next_due_date || "— All cleared"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-1">
                        <span className="text-slate-500">Account Standing:</span>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            student.fee_status === "overdue"
                              ? "bg-rose-100 text-rose-700"
                              : student.fee_status === "fully_paid"
                              ? "bg-emerald-100 text-emerald-700"
                              : student.fee_status === "partially_paid"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {student.fee_status.replace("_", " ")}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Fee Obligations & Balance Breakdown Preview */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                          Fee Obligations & Balances
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Detailed breakdown of all assessed fee components, waivers, payments, and pending dues
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveTab("breakdown")}
                        className="text-xs text-blue-600 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <span>View All ({ledgerDetails?.fee_breakdown?.length || 0})</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-2xs">
                      <table className="w-full text-left text-xs min-w-[650px]">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                          <tr>
                            <th className="py-2.5 px-3">Fee Description</th>
                            <th className="py-2.5 px-3">Period</th>
                            <th className="py-2.5 px-3 text-right">Original Gross</th>
                            <th className="py-2.5 px-3 text-right">Waived</th>
                            <th className="py-2.5 px-3 text-right">Paid</th>
                            <th className="py-2.5 px-3 text-right">Pending</th>
                            <th className="py-2.5 px-3">Due Date</th>
                            <th className="py-2.5 px-3 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {(ledgerDetails?.fee_breakdown || []).slice(0, 6).map((b) => (
                            <tr
                              key={b.id}
                              tabIndex={0}
                              onClick={() => setSelectedDueDetail(b)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  setSelectedDueDetail(b);
                                }
                              }}
                              className="hover:bg-blue-50/40 transition-colors cursor-pointer focus:outline-none focus:bg-blue-50/50"
                              title="Click to view payment allocation & obligation details"
                            >
                              <td className="py-2 px-3 font-semibold text-slate-800 text-[11px]">
                                {b.description}
                              </td>
                              <td className="py-2 px-3 text-slate-600 text-[11px] whitespace-nowrap">
                                {b.billing_period}
                              </td>
                              <td className="py-2 px-3 text-right font-medium text-slate-900 tabular-nums text-[11px]">
                                {formatPaise(b.original_amount_paise)}
                              </td>
                              <td className="py-2 px-3 text-right font-medium text-teal-700 tabular-nums text-[11px]">
                                {b.waived_paise > 0 ? formatPaise(b.waived_paise) : "—"}
                              </td>
                              <td className="py-2 px-3 text-right font-medium text-emerald-700 tabular-nums text-[11px]">
                                {b.paid_paise > 0 ? formatPaise(b.paid_paise) : "—"}
                              </td>
                              <td className={`py-2 px-3 text-right font-bold tabular-nums text-[11px] ${b.pending_paise > 0 ? (b.status === "Overdue" ? "text-rose-600" : "text-amber-700") : "text-slate-400"}`}>
                                {formatPaise(b.pending_paise)}
                              </td>
                              <td className="py-2 px-3 text-slate-600 text-[11px] whitespace-nowrap">
                                {b.due_date}
                              </td>
                              <td className="py-2 px-3 text-center whitespace-nowrap">
                                <span
                                  className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                                    b.status === "Paid"
                                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                      : b.status === "Waived"
                                      ? "bg-teal-50 text-teal-700 border border-teal-200"
                                      : b.status === "Overdue"
                                      ? "bg-rose-50 text-rose-700 border border-rose-200"
                                      : b.status === "Partial"
                                      ? "bg-amber-50 text-amber-700 border border-amber-200"
                                      : "bg-slate-100 text-slate-700 border border-slate-200"
                                  }`}
                                >
                                  {b.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Recent Transactions List */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Recent Transactions
                      </h4>
                      <button
                        type="button"
                        onClick={() => setActiveTab("ledger")}
                        className="text-xs text-blue-600 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <span>View All Transactions ({ledgerDetails?.transactions.length || 0})</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="space-y-2">
                      {ledgerDetails?.transactions.slice(0, 6).map((tx) => (
                        <div
                          role="button"
                          tabIndex={0}
                          key={tx.id}
                          onClick={() => setSelectedTxDetail(tx)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setSelectedTxDetail(tx);
                            }
                          }}
                          className="flex items-center justify-between p-3 rounded-xl border border-slate-200/80 bg-white hover:border-blue-300 hover:bg-blue-50/20 transition-all shadow-2xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
                          title="Click to view payment allocation & transaction details"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                                tx.type === "payment"
                                  ? "bg-emerald-50 text-emerald-600"
                                  : tx.type === "concession" || tx.type === "waiver"
                                  ? "bg-teal-50 text-teal-600"
                                  : tx.payment_status === "Overdue"
                                  ? "bg-rose-50 text-rose-600"
                                  : tx.category === "Transport"
                                  ? "bg-amber-50 text-amber-600"
                                  : "bg-blue-50 text-blue-600"
                              }`}
                            >
                              {tx.type === "payment" ? (
                                <Receipt className="w-4 h-4" />
                              ) : tx.category === "Transport" ? (
                                <Bus className="w-4 h-4" />
                              ) : tx.type === "concession" || tx.type === "waiver" ? (
                                <ShieldCheck className="w-4 h-4" />
                              ) : (
                                <FileText className="w-4 h-4" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-slate-800 truncate">{tx.description}</div>
                              <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
                                <span className="font-mono text-slate-600 font-medium">{tx.ref_no}</span>
                                <span>•</span>
                                <span>{tx.billing_period || tx.period}</span>
                                <span>•</span>
                                <span>{tx.date}</span>
                              </div>
                            </div>
                          </div>

                          <div className="text-right shrink-0 ml-3">
                            <div
                              className={`text-xs font-bold tabular-nums ${
                                tx.type === "payment" || tx.type === "concession" || tx.type === "waiver"
                                  ? "text-emerald-600"
                                  : tx.payment_status === "Overdue"
                                  ? "text-rose-600"
                                  : "text-slate-900"
                              }`}
                            >
                              {tx.debit_paise > 0 ? formatPaise(tx.debit_paise) : `- ${formatPaise(tx.credit_paise)}`}
                            </div>
                            <span
                              className={`inline-block text-[10px] font-semibold mt-0.5 ${
                                tx.payment_status === "Paid" ||
                                tx.payment_status === "Received" ||
                                tx.payment_status === "Waived"
                                  ? "text-emerald-600"
                                  : tx.payment_status === "Overdue"
                                  ? "text-rose-600"
                                  : "text-amber-600"
                              }`}
                            >
                              {tx.payment_status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: FEE BREAKDOWN */}
              {activeTab === "breakdown" && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Fee-Wise Obligations, Concessions & Balances
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Canonical breakdown showing original assessed fee, RTE concessions, paid amounts, and remaining balances
                      </p>
                    </div>
                    <div className="text-xs text-slate-500 font-medium">
                      Total Obligations: <span className="font-bold text-slate-800">{ledgerDetails?.fee_breakdown?.length || 0}</span>
                    </div>
                  </div>

                  <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-2xs">
                    <table className="w-full text-left text-xs min-w-[760px]">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                        <tr>
                          <th className="py-2.5 px-3">Fee Description</th>
                          <th className="py-2.5 px-3">Billing Period</th>
                          <th className="py-2.5 px-3 text-right">Original Gross</th>
                          <th className="py-2.5 px-3 text-right">Waived</th>
                          <th className="py-2.5 px-3 text-right">Paid</th>
                          <th className="py-2.5 px-3 text-right">Pending Balance</th>
                          <th className="py-2.5 px-3">Due Date</th>
                          <th className="py-2.5 px-3 text-center">Status</th>
                          <th className="py-2.5 px-3 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(ledgerDetails?.fee_breakdown || []).map((b) => (
                          <tr
                            key={b.id}
                            className="hover:bg-slate-50/70 transition-colors"
                          >
                            <td className="py-2.5 px-3 text-slate-800 text-[11px]">
                              <div className="font-semibold">{b.description}</div>
                              <span className="text-[10px] text-slate-500 font-mono">DUE-{b.id.slice(0, 8)}</span>
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 text-[11px] whitespace-nowrap">
                              {b.billing_period}
                            </td>
                            <td className="py-2.5 px-3 text-right font-medium text-slate-900 tabular-nums text-[11px]">
                              {formatPaise(b.original_amount_paise)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-medium text-teal-700 tabular-nums text-[11px]">
                              {b.waived_paise > 0 ? formatPaise(b.waived_paise) : "—"}
                            </td>
                            <td className="py-2.5 px-3 text-right font-medium text-emerald-700 tabular-nums text-[11px]">
                              {b.paid_paise > 0 ? formatPaise(b.paid_paise) : "—"}
                            </td>
                            <td className={`py-2.5 px-3 text-right font-bold tabular-nums text-[11px] ${b.pending_paise > 0 ? (b.status === "Overdue" ? "text-rose-600" : "text-amber-700") : "text-slate-400"}`}>
                              {formatPaise(b.pending_paise)}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 text-[11px] whitespace-nowrap">
                              {b.due_date}
                            </td>
                            <td className="py-2.5 px-3 text-center whitespace-nowrap">
                              <span
                                className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                                  b.status === "Paid"
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : b.status === "Waived"
                                    ? "bg-teal-50 text-teal-700 border border-teal-200"
                                    : b.status === "Overdue"
                                    ? "bg-rose-50 text-rose-700 border border-rose-200"
                                    : b.status === "Partial"
                                    ? "bg-amber-50 text-amber-700 border border-amber-200"
                                    : "bg-slate-100 text-slate-700 border border-slate-200"
                                }`}
                              >
                                {b.status}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => setSelectedDueDetail(b)}
                                className="px-2 py-1 text-[10px] font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
                              >
                                Details
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Aggregated Totals Footer for Breakdown */}
                  <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 text-xs flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-4 flex-wrap">
                      <div>
                        <span className="text-slate-500">Gross Assessed:</span>{" "}
                        <span className="font-bold text-slate-900">
                          {formatPaise(ledgerDetails?.metrics.total_charges_paise || 0)}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500">Approved Concessions:</span>{" "}
                        <span className="font-bold text-teal-700">
                          -{formatPaise(ledgerDetails?.metrics.total_concessions_paise || 0)}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500">Net Payable:</span>{" "}
                        <span className="font-bold text-slate-900">
                          {formatPaise(ledgerDetails?.metrics.net_assessed_paise || 0)}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500">Total Paid:</span>{" "}
                        <span className="font-bold text-emerald-700">
                          {formatPaise(ledgerDetails?.metrics.total_payments_paise || 0)}
                        </span>
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-500">Current Pending:</span>{" "}
                      <span className="font-bold text-amber-800">
                        {formatPaise(ledgerDetails?.metrics.closing_balance_paise || 0)}
                      </span>
                      {" "}(<span className="font-bold text-rose-600">{formatPaise(ledgerDetails?.metrics.overdue_balance_paise || 0)} Overdue</span>)
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: CHRONOLOGICAL LEDGER */}
              {activeTab === "ledger" && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Chronological Fee Ledger
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Deterministic chronological ledger of all fee obligations, waivers, payments, and running balances
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handlePrintLedger}
                      className="px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg flex items-center gap-1.5 transition-colors self-start sm:self-auto cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Print Statement</span>
                    </button>
                  </div>

                  {/* Desktop & Tablet Table with Controlled Horizontal Scroll */}
                  <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-2xs">
                    <table className="w-full text-left text-xs min-w-[700px]">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                        <tr>
                          <th className="py-2.5 px-3 whitespace-nowrap">Date</th>
                          <th className="py-2.5 px-3 whitespace-nowrap">Ref #</th>
                          <th className="py-2.5 px-3">Fee / Transaction Description</th>
                          <th className="py-2.5 px-3 whitespace-nowrap">Billing Period</th>
                          <th className="py-2.5 px-3 whitespace-nowrap">Due Date</th>
                          <th className="py-2.5 px-3 text-right whitespace-nowrap">Debit</th>
                          <th className="py-2.5 px-3 text-right whitespace-nowrap">Credit</th>
                          <th className="py-2.5 px-3 text-right whitespace-nowrap">Running Balance</th>
                          <th className="py-2.5 px-3 text-center whitespace-nowrap">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {ledgerDetails?.transactions.map((t) => {
                          const isAuditOpen = expandedAuditTxId === t.id;
                          return (
                            <React.Fragment key={t.id}>
                              <tr
                                tabIndex={0}
                                onClick={() => setSelectedTxDetail(t)}
                                onKeyDown={(e) => {
                                  if (e.target !== e.currentTarget) return;
                                  if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    setSelectedTxDetail(t);
                                  }
                                }}
                                className="hover:bg-blue-50/40 transition-colors cursor-pointer focus:outline-none focus:bg-blue-50/50"
                                title="Click to view full transaction and payment allocation details"
                              >
                                <td className="py-2 px-3 text-slate-600 whitespace-nowrap text-[11px]">
                                  {t.date}
                                </td>
                                <td className="py-2 px-3 font-semibold text-slate-800 whitespace-nowrap text-[11px] font-mono">
                                  {t.ref_no}
                                </td>
                                <td className="py-2 px-3 text-slate-800 text-[11px]">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-medium">{t.description}</span>
                                    {t.internal_note && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setExpandedAuditTxId(isAuditOpen ? null : t.id);
                                        }}
                                        className="text-slate-400 hover:text-blue-600 p-0.5 cursor-pointer"
                                        title="View reconciliation audit note"
                                      >
                                        <Info className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </td>
                                <td className="py-2 px-3 text-slate-600 whitespace-nowrap text-[11px]">
                                  {t.billing_period || t.period || "—"}
                                </td>
                                <td className="py-2 px-3 text-slate-600 whitespace-nowrap text-[11px]">
                                  {t.due_date || "—"}
                                </td>
                                <td className="py-2 px-3 text-right text-rose-600 font-semibold tabular-nums text-[11px] whitespace-nowrap">
                                  {t.debit_paise > 0 ? formatPaise(t.debit_paise) : "—"}
                                </td>
                                <td className="py-2 px-3 text-right text-emerald-600 font-semibold tabular-nums text-[11px] whitespace-nowrap">
                                  {t.credit_paise > 0 ? formatPaise(t.credit_paise) : "—"}
                                </td>
                                <td className="py-2 px-3 text-right font-bold text-slate-900 tabular-nums text-[11px] whitespace-nowrap">
                                  {formatPaise(t.running_balance_paise)}
                                </td>
                                <td className="py-2 px-3 text-center whitespace-nowrap">
                                  <span
                                    className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                                      t.payment_status === "Paid" || t.payment_status === "Received"
                                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                        : t.payment_status === "Overdue"
                                        ? "bg-rose-50 text-rose-700 border border-rose-200"
                                        : t.payment_status === "Waived"
                                        ? "bg-teal-50 text-teal-700 border border-teal-200"
                                        : "bg-amber-50 text-amber-700 border border-amber-200"
                                    }`}
                                  >
                                    {t.payment_status}
                                  </span>
                                </td>
                              </tr>
                              {/* Secondary Audit Note Drawer Row */}
                              {isAuditOpen && (
                                <tr className="bg-slate-50/90 text-[10px] text-slate-500 border-b border-slate-200">
                                  <td colSpan={9} className="py-2 px-4 space-y-1">
                                    <div className="flex items-center gap-2">
                                      <span className="font-semibold text-slate-700">Audit Detail:</span>
                                      <span>{t.internal_note}</span>
                                    </div>
                                    <div className="flex items-center gap-4 text-slate-400">
                                      <span>Internal Ref: {t.audit_ref || "None"}</span>
                                      {t.raw_due_id && <span>Linked Due ID: {t.raw_due_id}</span>}
                                      {t.receipt_id && <span>Linked Receipt ID: {t.receipt_id}</span>}
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Summary Bar */}
                  <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 text-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div className="flex items-center gap-4 flex-wrap">
                      <div>
                        <span className="text-slate-500">Gross Billed:</span>{" "}
                        <span className="font-bold text-slate-900">
                          {formatPaise(ledgerDetails?.metrics.total_charges_paise || 0)}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500">Concessions:</span>{" "}
                        <span className="font-bold text-emerald-600">
                          -{formatPaise(ledgerDetails?.metrics.total_concessions_paise || 0)}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500">Closing Balance:</span>{" "}
                        <span className="font-bold text-slate-900">
                          {formatPaise(ledgerDetails?.metrics.closing_balance_paise || 0)}
                        </span>
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-500">Total Overdue:</span>{" "}
                      <span className="font-bold text-rose-600">
                        {formatPaise(ledgerDetails?.metrics.overdue_balance_paise || 0)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: INVOICES WITH EXPANDABLE LINE ITEMS & PRINT */}
              {activeTab === "invoices" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Applicable Invoices
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Term-wise fee invoices issued for this student
                      </p>
                    </div>
                    <span className="text-[11px] text-slate-500 font-medium">
                      {ledgerDetails?.invoices.length || 0} invoices issued
                    </span>
                  </div>

                  {!ledgerDetails?.invoices || ledgerDetails.invoices.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                      <p className="text-xs font-semibold text-slate-600">No invoices issued for this student yet.</p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Invoices are compiled term-wise from assigned fee structures and transport charges.
                      </p>
                    </div>
                  ) : (
                    ledgerDetails.invoices.map((inv) => {
                      const isExpanded = expandedInvoiceId === inv.id;
                      return (
                        <div
                          key={inv.id}
                          className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-colors shadow-2xs space-y-2.5"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-slate-900 font-mono">{inv.invoice_no}</span>
                              <span className="text-xs text-slate-500">• {inv.billing_period}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                  inv.status === "paid"
                                    ? "bg-emerald-100 text-emerald-700"
                                    : inv.status === "overdue"
                                    ? "bg-rose-100 text-rose-700"
                                    : "bg-amber-100 text-amber-700"
                                }`}
                              >
                                {inv.status}
                              </span>
                              <button
                                type="button"
                                onClick={() => handlePrintInvoice(inv)}
                                className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                                title="Print Invoice"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-4 gap-2 text-xs pt-1 border-t border-slate-100">
                            <div>
                              <div className="text-[10px] text-slate-400">Total Billed</div>
                              <div className="font-semibold text-slate-800">
                                {formatPaise(inv.gross_paise || inv.total_paise)}
                              </div>
                            </div>
                            <div>
                              <div className="text-[10px] text-slate-400">Discount / Waiver</div>
                              <div className="font-semibold text-emerald-700">
                                {inv.concession_paise > 0 ? `-${formatPaise(inv.concession_paise)}` : "—"}
                              </div>
                            </div>
                            <div>
                              <div className="text-[10px] text-slate-400">Paid</div>
                              <div className="font-semibold text-emerald-600">{formatPaise(inv.paid_paise)}</div>
                            </div>
                            <div>
                              <div className="text-[10px] text-slate-400">Balance</div>
                              <div className={`font-bold ${inv.balance_paise > 0 ? "text-rose-600" : "text-slate-700"}`}>
                                {formatPaise(inv.balance_paise)}
                              </div>
                            </div>
                          </div>

                          {/* Line items accordion toggle */}
                          <div className="pt-1.5 border-t border-slate-50 flex items-center justify-between text-[11px]">
                            <button
                              type="button"
                              onClick={() => setExpandedInvoiceId(isExpanded ? null : inv.id)}
                              className="text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 cursor-pointer"
                            >
                              <span>{isExpanded ? "Hide Line Items" : `View ${inv.line_items?.length || 0} Line Items`}</span>
                              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                            </button>
                            <span className="text-slate-400">Due: {inv.due_date || "—"}</span>
                          </div>

                          {/* Line items details table */}
                          {isExpanded && (
                            <div className="mt-2 pt-2 border-t border-slate-100 overflow-x-auto animate-in fade-in duration-150">
                              <table className="w-full text-left text-[11px]">
                                <thead className="text-[9px] uppercase tracking-wider bg-slate-50 text-slate-500 font-bold">
                                  <tr>
                                    <th className="py-1.5 px-2">Component</th>
                                    <th className="py-1.5 px-2 text-right">Gross</th>
                                    <th className="py-1.5 px-2 text-right">Concession</th>
                                    <th className="py-1.5 px-2 text-right">Net Payable</th>
                                    <th className="py-1.5 px-2 text-right">Paid</th>
                                    <th className="py-1.5 px-2 text-right">Balance</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {inv.line_items?.map((item) => (
                                    <tr key={item.due_id} className="hover:bg-slate-50/50">
                                      <td className="py-1.5 px-2 font-medium text-slate-800">
                                        <div className="flex items-center gap-1.5">
                                          <span>{item.fee_head_name}</span>
                                          {item.is_transport && (
                                            <span className="px-1 py-0.2 rounded text-[8px] bg-amber-100 text-amber-800 font-bold uppercase">
                                              Transport
                                            </span>
                                          )}
                                        </div>
                                      </td>
                                      <td className="py-1.5 px-2 text-right text-slate-600 tabular-nums">
                                        {formatPaise(item.gross_paise)}
                                      </td>
                                      <td className="py-1.5 px-2 text-right text-emerald-700 tabular-nums">
                                        {item.concession_paise > 0 ? `-${formatPaise(item.concession_paise)}` : "—"}
                                      </td>
                                      <td className="py-1.5 px-2 text-right font-semibold text-slate-800 tabular-nums">
                                        {formatPaise(item.net_paise)}
                                      </td>
                                      <td className="py-1.5 px-2 text-right text-emerald-600 tabular-nums">
                                        {formatPaise(item.paid_paise)}
                                      </td>
                                      <td className="py-1.5 px-2 text-right font-bold text-rose-600 tabular-nums">
                                        {formatPaise(item.balance_paise)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* TAB 4: PAYMENTS & RECEIPTS */}
              {activeTab === "payments" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Payment Receipts
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Official fee payment receipts recorded for this student
                      </p>
                    </div>
                    <span className="text-[11px] text-slate-500 font-medium">
                      {ledgerDetails?.payments.length || 0} receipts recorded
                    </span>
                  </div>

                  {!ledgerDetails?.payments || ledgerDetails.payments.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200 space-y-2">
                      <Receipt className="w-8 h-8 mx-auto text-slate-300" />
                      <p className="text-xs font-semibold text-slate-700">
                        No fee payments recorded for this student yet.
                      </p>
                      <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                        When a payment is received, the receipt details, transaction mode, and print action will appear here.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          if (student) onCollectPayment(student.student_id);
                        }}
                        className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>Collect First Payment</span>
                      </button>
                    </div>
                  ) : (
                    ledgerDetails.payments.map((p) => (
                      <div
                        key={p.id}
                        className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-colors shadow-2xs flex items-center justify-between"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-slate-900 font-mono">{p.receipt_no}</span>
                            <span className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded font-semibold uppercase">
                              {p.payment_mode}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {p.receipt_date} • {p.collected_by_name || "Accounts Office"}
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="text-xs font-bold text-emerald-600 tabular-nums">
                              {formatPaise(p.total_paise)}
                            </div>
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600">
                              <CheckCircle2 className="w-3 h-3" />
                              Recorded
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handlePrintReceipt(p)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="Print Payment Receipt"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* TAB 5: CONCESSIONS & WAIVERS */}
              {activeTab === "concessions" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Approved Concessions & Waivers
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Government quota waivers and authorized institutional fee concessions
                      </p>
                    </div>
                    <span className="text-[11px] text-slate-500 font-medium">
                      {ledgerDetails?.concessions.length || 0} concessions active
                    </span>
                  </div>

                  {!ledgerDetails?.concessions || ledgerDetails.concessions.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      <ShieldCheck className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                      <p className="text-xs font-semibold text-slate-600">No concessions or fee waivers assigned.</p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Any sibling discounts, RTE waivers, or merit scholarships will be tracked here.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {ledgerDetails.concessions.map((c) => (
                        <div
                          key={c.id}
                          className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/40 shadow-2xs space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-emerald-950">{c.rule_name}</span>
                            <span className="font-bold text-xs text-emerald-700 tabular-nums">
                              {formatPaise(c.applied_amount_paise)} waived
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-600 flex items-center justify-between pt-1 border-t border-emerald-100">
                            <span>Reason: {c.reason}</span>
                            <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                              <CheckCircle2 className="w-3 h-3" />
                              Active
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 6: TRANSPORT SERVICE */}
              {activeTab === "transport" && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Transport Service & Route Details
                  </h4>
                  {ledgerDetails?.transport_details?.has_transport ? (
                    <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/40 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Bus className="w-4 h-4 text-amber-700" />
                          <span className="font-bold text-xs text-amber-900">Active School Bus Rider</span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 uppercase">
                          Route Assigned
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-xs pt-2 border-t border-amber-200/60">
                        <div>
                          <div className="text-[10px] text-slate-500">Route</div>
                          <div className="font-semibold text-slate-800">{ledgerDetails.transport_details.route_name}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-500">Designated Stop</div>
                          <div className="font-semibold text-slate-800">{ledgerDetails.transport_details.stop_name}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-500">Monthly Transport Fee</div>
                          <div className="font-semibold text-slate-800">
                            {formatPaise(ledgerDetails.transport_details.monthly_fee_paise || 120000)} / mo
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-500">Total Billed in Session</div>
                          <div className="font-bold text-amber-800">
                            {formatPaise(ledgerDetails.transport_details.total_billed_paise || 0)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      <Bus className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                      <p className="text-xs font-semibold text-slate-600">Student has not opted for school transport service.</p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Transport fees are strictly separated from base academic fees and billed monthly when opted.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 7: CREDITS & ADJUSTMENTS */}
              {activeTab === "credits" && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Unallocated Advance Credits
                  </h4>
                  {!ledgerDetails?.advance_credits || ledgerDetails.advance_credits.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      <Wallet className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                      <p className="text-xs font-semibold text-slate-600">No unallocated advance fee credits recorded.</p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Overpayments or advance counter deposits will appear here and automatically apply to future dues.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {ledgerDetails.advance_credits.map((cr) => (
                        <div
                          key={cr.id}
                          className="p-3.5 rounded-xl border border-sky-200 bg-sky-50/40 shadow-2xs space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-sky-900">{cr.note || "Advance Credit"}</span>
                            <span className="font-bold text-xs text-sky-700 tabular-nums">
                              {formatPaise(cr.remaining_paise)} remaining
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1">
                            <span>Receipt Ref: {cr.receipt_no || "Advance Counter Payment"}</span>
                            <span>{cr.date}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Sticky Drawer Footer Actions */}
        <div className="shrink-0 p-4 border-t border-slate-200 bg-white grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button
            type="button"
            onClick={() => {
              if (student) onCollectPayment(student.student_id);
            }}
            className="col-span-2 sm:col-span-1 w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <CreditCard className="w-4 h-4" />
            <span>Collect Payment</span>
          </button>

          <button
            type="button"
            onClick={handlePrintLedger}
            className="py-2.5 px-3 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            <span>Print Ledger</span>
          </button>

          <button
            type="button"
            onClick={handlePrintLedger}
            className="py-2.5 px-3 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Download PDF</span>
          </button>

        </div>

        {/* Transaction or Obligation Detail Modal */}
        {(selectedTxDetail || selectedDueDetail) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              {/* Modal Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/70">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <h3 className="font-bold text-sm text-slate-900">
                    {selectedTxDetail ? "Transaction Details" : "Fee Obligation Details"}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTxDetail(null);
                    setSelectedDueDetail(null);
                  }}
                  className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
                {/* Title & Period */}
                <div>
                  <div className="text-base font-bold text-slate-900">
                    {selectedTxDetail?.description || selectedDueDetail?.description}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-slate-500 font-medium">
                    <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-semibold text-[11px]">
                      {selectedTxDetail?.category || selectedDueDetail?.category || "Fee"}
                    </span>
                    <span>•</span>
                    <span>Billing Period: {selectedTxDetail?.billing_period || selectedDueDetail?.billing_period}</span>
                    <span>•</span>
                    <span>{selectedTxDetail?.academic_year || selectedDueDetail?.academic_year || "2026–2027"}</span>
                  </div>
                </div>

                {/* Financial Breakdown Card */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div>
                    <div className="text-[10px] uppercase font-bold text-slate-500">Original Gross</div>
                    <div className="text-xs font-bold text-slate-900 tabular-nums mt-0.5">
                      {formatPaise(
                        selectedDueDetail?.original_amount_paise ??
                          (selectedTxDetail?.debit_paise || selectedTxDetail?.credit_paise || 0)
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-bold text-slate-500">Waived / Concession</div>
                    <div className="text-xs font-bold text-teal-700 tabular-nums mt-0.5">
                      {formatPaise(
                        selectedDueDetail?.waived_paise ??
                          (selectedTxDetail?.type === "concession" || selectedTxDetail?.type === "waiver"
                            ? selectedTxDetail.credit_paise
                            : 0)
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-bold text-slate-500">Paid Amount</div>
                    <div className="text-xs font-bold text-emerald-700 tabular-nums mt-0.5">
                      {formatPaise(
                        selectedDueDetail?.paid_paise ??
                          (selectedTxDetail?.type === "payment" ? selectedTxDetail.credit_paise : 0)
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-bold text-slate-500">Net Pending</div>
                    <div className="text-xs font-bold text-amber-800 tabular-nums mt-0.5">
                      {formatPaise(
                        selectedDueDetail?.pending_paise ??
                          (selectedTxDetail?.running_balance_paise || 0)
                      )}
                    </div>
                  </div>
                </div>

                {/* Payment Allocation Information */}
                <div className="border border-slate-200 rounded-xl p-3.5 space-y-2">
                  <div className="font-bold text-slate-900 flex items-center justify-between">
                    <span>Payment & Concession Allocation</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        (selectedDueDetail?.status || selectedTxDetail?.payment_status) === "Paid" ||
                        (selectedDueDetail?.status || selectedTxDetail?.payment_status) === "Received" ||
                        (selectedDueDetail?.status || selectedTxDetail?.payment_status) === "Waived"
                          ? "bg-emerald-100 text-emerald-800"
                          : (selectedDueDetail?.status || selectedTxDetail?.payment_status) === "Overdue"
                          ? "bg-rose-100 text-rose-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {selectedDueDetail?.status || selectedTxDetail?.payment_status}
                    </span>
                  </div>

                  {/* If there are linked allocations */}
                  {((selectedDueDetail?.allocations && selectedDueDetail.allocations.length > 0) ||
                    (selectedTxDetail?.allocations && selectedTxDetail.allocations.length > 0)) ? (
                    <div className="space-y-1.5 pt-1">
                      <div className="text-[11px] text-slate-600 font-medium">Linked Transactions & Allocations:</div>
                      {(selectedDueDetail?.allocations || selectedTxDetail?.allocations || []).map((alc, i) => (
                        <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-emerald-50/60 border border-emerald-100 text-[11px]">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <div>
                              <span className="font-semibold text-slate-800">
                                {(alc as any).receipt_no || (alc as any).due_description}
                              </span>
                              {(alc as any).receipt_date && (
                                <span className="text-slate-500 ml-1.5">({(alc as any).receipt_date})</span>
                              )}
                              {(alc as any).payment_mode && (
                                <span className="text-slate-400 ml-1">via {(alc as any).payment_mode}</span>
                              )}
                            </div>
                          </div>
                          <span className="font-bold text-emerald-700 tabular-nums">
                            {formatPaise(alc.amount_paise)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (selectedDueDetail?.waived_paise || 0) > 0 ? (
                    <div className="p-2.5 rounded-lg bg-teal-50/70 border border-teal-200 text-teal-800 flex items-start gap-2">
                      <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-semibold">Fully Waived under 100% RTE Quota</div>
                        <div className="text-[11px] text-teal-700 mt-0.5">
                          Obligation is non-chargeable to parents pursuant to approved government concession rules.
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-slate-500 text-[11px] py-1">
                      No payments have been allocated to this fee obligation yet.
                    </div>
                  )}
                </div>

                {/* Due Date & Reference Timeline */}
                <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-slate-500">Official Due Date:</span>
                    <div className="font-semibold text-slate-800 mt-0.5">
                      {selectedDueDetail?.due_date || selectedTxDetail?.due_date || "—"}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-500">Reference / Invoice #:</span>
                    <div className="font-semibold text-slate-800 font-mono mt-0.5">
                      {selectedTxDetail?.ref_no || (selectedDueDetail?.id ? `DUE-${selectedDueDetail.id.slice(0, 8)}` : "—")}
                    </div>
                  </div>
                </div>

                {/* Audit & Technical Traceability */}
                <div className="p-3 bg-slate-100/70 rounded-xl border border-slate-200/80 space-y-1.5 text-[11px] text-slate-600">
                  <div className="font-bold uppercase tracking-wider text-[10px] text-slate-500">
                    Audit & System Traceability
                  </div>
                  <div className="flex justify-between">
                    <span>Database ID:</span>
                    <span className="font-mono text-slate-700">
                      {selectedDueDetail?.id || selectedTxDetail?.raw_due_id || selectedTxDetail?.id}
                    </span>
                  </div>
                  {selectedTxDetail?.internal_note && (
                    <div>
                      <span className="font-semibold text-slate-700">Audit Log Note:</span>
                      <div className="text-slate-600 font-mono text-[10px] mt-0.5 break-all">
                        {selectedTxDetail.internal_note}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTxDetail(null);
                    setSelectedDueDetail(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-200 hover:bg-slate-300 text-slate-700 cursor-pointer transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
