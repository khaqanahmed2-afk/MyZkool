import React, { useState, useEffect } from "react";
import {
  X,
  Phone,
  MessageSquare,
  Printer,
  Download,
  CreditCard,
  RefreshCw,
  AlertCircle,
  Receipt,
  FileText,
  Bus,
  ShieldCheck,
  Wallet,
  Calendar,
  Layers,
} from "lucide-react";
import {
  getStudentLedgerDetails,
  generateStudentLedgerHTML,
  getWhatsAppFeeMessage,
} from "../../../../services/studentFeeLedgerService";
import { generateInvoiceHTML } from "../../../../lib/invoiceTemplate";
import { formatPaise, getInitials, getStatusBadgeConfig } from "./ledgerFormatters";
import { StudentLedgerSummarySection } from "./StudentLedgerSummarySection";
import { StudentLedgerOverviewTab } from "./StudentLedgerOverviewTab";
import { StudentFeeBreakdownTab } from "./StudentFeeBreakdownTab";
import { StudentLedgerJournalTab } from "./StudentLedgerJournalTab";
import { StudentInvoicesTab } from "./StudentInvoicesTab";
import { StudentPaymentsTab } from "./StudentPaymentsTab";
import { StudentConcessionsTab } from "./StudentConcessionsTab";
import { StudentTransportTab } from "./StudentTransportTab";
import { StudentCreditsTab } from "./StudentCreditsTab";
import { StudentLedgerDetailModal } from "./StudentLedgerDetailModal";
import type {
  StudentLedgerDetails,
  FeeObligationBreakdownItem,
  LedgerTransactionItem,
} from "../../../../types/studentFeeLedger";
import type { StudentInvoice } from "../../../../types/fees";

export type LedgerTabType =
  | "overview"
  | "breakdown"
  | "ledger"
  | "invoices"
  | "payments"
  | "concessions"
  | "transport"
  | "credits";

export interface StudentFeeLedgerViewProps {
  studentId: string;
  schoolId: string;
  schoolName: string;
  academicYearId?: string;
  onCollectPayment: (studentId: string) => void;
  mode?: "drawer" | "embedded" | "page";
  showHeader?: boolean;
  onClose?: () => void;
}

export const StudentFeeLedgerView: React.FC<StudentFeeLedgerViewProps> = ({
  studentId,
  schoolId,
  schoolName,
  academicYearId,
  onCollectPayment,
  mode = "drawer",
  showHeader = true,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<LedgerTabType>("overview");
  const [ledgerDetails, setLedgerDetails] = useState<StudentLedgerDetails | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modals for deep inspection
  const [selectedObligation, setSelectedObligation] = useState<FeeObligationBreakdownItem | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<LedgerTransactionItem | null>(null);

  // Load ledger details
  const loadLedger = () => {
    if (!studentId || !schoolId) return;
    setLoading(true);
    setError(null);
    getStudentLedgerDetails(schoolId, studentId, academicYearId)
      .then((data) => {
        if (!data) {
          setError("No fee records found for this student.");
        } else {
          setLedgerDetails(data);
        }
      })
      .catch((err) => {
        console.error("Failed to load student ledger:", err);
        setError("Unable to load ledger details.");
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    loadLedger();
  }, [studentId, schoolId, academicYearId]);

  const student = ledgerDetails?.student;

  // Print full statement
  const handlePrintStatement = () => {
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

  // WhatsApp reminder message
  const handleWhatsApp = () => {
    if (!student) return;
    const encoded = getWhatsAppFeeMessage(student, schoolName);
    const cleanPhone = student.parent_phone ? student.parent_phone.replace(/[^0-9]/g, "") : "";
    const waUrl = cleanPhone
      ? `https://wa.me/91${cleanPhone}?text=${encoded}`
      : `https://wa.me/?text=${encoded}`;
    window.open(waUrl, "_blank");
  };

  // Print Invoice
  const handlePrintInvoice = (invoice: StudentInvoice) => {
    const html = generateInvoiceHTML(invoice, { name: schoolName });
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();
    }
  };

  // Print Payment Receipt
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

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 space-y-3">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-sm text-slate-500 font-medium">Loading student billing ledger...</p>
      </div>
    );
  }

  if (error || !student || !ledgerDetails) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-3">
        <AlertCircle className="w-10 h-10 text-rose-500" />
        <p className="text-sm font-semibold text-slate-800">{error || "Student records not found"}</p>
        <button
          type="button"
          onClick={loadLedger}
          className="px-4 py-2 text-xs font-semibold text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 cursor-pointer"
        >
          Try Again
        </button>
      </div>
    );
  }

  const initials = getInitials(student.student_name);
  const statusBadge = getStatusBadgeConfig(student.fee_status);

  // Counts for tabs
  const feeBreakdownCount = ledgerDetails.fee_breakdown?.length || 0;
  const ledgerTxCount = ledgerDetails.transactions?.length || 0;
  const invoicesCount = ledgerDetails.invoices?.length || 0;
  const paymentsCount = ledgerDetails.payments?.length || 0;
  const concessionsCount = ledgerDetails.concessions?.length || 0;
  const creditsCount = ledgerDetails.advance_credits?.length || 0;
  const transportObligations = (ledgerDetails.fee_breakdown || []).filter((b) => b.category === "Transport");

  return (
    <div className="flex flex-col h-full bg-white">
      {/* 1. Header (Drawer Mode or Standalone Header) */}
      {showHeader && mode === "drawer" && (
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-200 bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 font-display flex items-center gap-2">
                <span>Student Billing Ledger</span>
                <span className="text-xs font-normal text-slate-500">
                  — {student.student_name} ({student.admission_no})
                </span>
              </h2>
            </div>
          </div>
          {onClose && (
            <button
              aria-label="Close"
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      )}

      {/* 2. Independently Scrollable Body Area */}
      <div className="flex-1 overflow-y-auto">
        {/* Student Profile Identity & Contact Header */}
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
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${statusBadge.className}`}>
                    {statusBadge.label}
                  </span>
                  {student.applicable_fee_structure_name && (
                    <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-600">
                      {student.applicable_fee_structure_name}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 flex-wrap">
                  <span className="font-mono text-slate-700 font-semibold">{student.admission_no}</span>
                  <span>•</span>
                  <span>
                    {student.class_name} - {student.section_name}
                  </span>
                  <span>•</span>
                  <span className="text-slate-600 font-medium">
                    {student.academic_year_name || "2026–2027"}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Contact & Remind Actions */}
            <div className="flex items-center gap-2 text-xs">
              {student.parent_phone && (
                <button
                  type="button"
                  onClick={() => window.open(`tel:${student.parent_phone}`)}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Call Guardian"
                >
                  <Phone className="w-3.5 h-3.5 text-slate-500" />
                  <span className="font-mono">{student.parent_phone}</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleWhatsApp}
                className="px-2.5 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100/70 text-emerald-800 flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Send fee statement summary on WhatsApp"
              >
                <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                <span className="font-semibold">WhatsApp</span>
              </button>
            </div>
          </div>

          {/* Phase 2: One Single Consistent Financial Summary Section */}
          <div className="mt-4">
            <StudentLedgerSummarySection ledgerDetails={ledgerDetails} />
          </div>

          {/* Phase 3: Simplified Navigation Strip */}
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
                {feeBreakdownCount}
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
                {ledgerTxCount}
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
                {invoicesCount}
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
                {paymentsCount}
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
                {concessionsCount}
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
              {creditsCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-sky-100 text-sky-800 font-mono">
                  {creditsCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Tab Body Content Area */}
        <div className="p-6 pb-24">
          {activeTab === "overview" && (
            <StudentLedgerOverviewTab
              ledgerDetails={ledgerDetails}
              onNavigateTab={setActiveTab}
              onSelectObligation={setSelectedObligation}
              onSelectTransaction={setSelectedTransaction}
              onCollectPayment={onCollectPayment}
            />
          )}

          {activeTab === "breakdown" && (
            <StudentFeeBreakdownTab
              feeBreakdown={ledgerDetails.fee_breakdown || []}
              onSelectObligation={setSelectedObligation}
              metrics={{
                total_charges_paise: ledgerDetails.metrics.total_charges_paise,
                total_concessions_paise: ledgerDetails.metrics.total_concessions_paise,
                net_assessed_paise: ledgerDetails.metrics.net_assessed_paise,
                total_payments_paise: ledgerDetails.metrics.total_payments_paise,
                closing_balance_paise: ledgerDetails.metrics.closing_balance_paise,
                overdue_balance_paise: ledgerDetails.metrics.overdue_balance_paise,
              }}
            />
          )}

          {activeTab === "ledger" && (
            <StudentLedgerJournalTab
              transactions={ledgerDetails.transactions}
              onPrintLedger={handlePrintStatement}
              onSelectTransaction={setSelectedTransaction}
              metrics={{
                total_charges_paise: ledgerDetails.metrics.total_charges_paise,
                total_concessions_paise: ledgerDetails.metrics.total_concessions_paise,
                closing_balance_paise: ledgerDetails.metrics.closing_balance_paise,
                overdue_balance_paise: ledgerDetails.metrics.overdue_balance_paise,
              }}
            />
          )}

          {activeTab === "invoices" && (
            <StudentInvoicesTab
              invoices={ledgerDetails.invoices}
              onPrintInvoice={handlePrintInvoice}
            />
          )}

          {activeTab === "payments" && (
            <StudentPaymentsTab
              payments={ledgerDetails.payments}
              onPrintReceipt={handlePrintReceipt}
              onCollectPayment={() => onCollectPayment(student.student_id)}
            />
          )}

          {activeTab === "concessions" && (
            <StudentConcessionsTab
              concessions={ledgerDetails.concessions}
              totalConcessionsPaise={ledgerDetails.metrics.total_concessions_paise}
            />
          )}

          {activeTab === "transport" && (
            <StudentTransportTab
              transportDetails={ledgerDetails.transport_details}
              transportObligations={transportObligations}
              onSelectObligation={setSelectedObligation}
            />
          )}

          {activeTab === "credits" && (
            <StudentCreditsTab
              advanceCredits={ledgerDetails.advance_credits || []}
              totalAdvanceCreditPaise={ledgerDetails.metrics.advance_credits_paise || 0}
            />
          )}
        </div>
      </div>

      {/* 3. Sticky Bottom Actions Bar (Phase 5) */}
      <div className="shrink-0 p-4 border-t border-slate-200 bg-white shadow-lg flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Left Status Recap */}
        <div className="hidden sm:flex items-center gap-3 text-xs">
          <div>
            <span className="text-slate-500">Net Outstanding:</span>{" "}
            <span className="font-bold text-amber-800 tabular-nums">
              {formatPaise(ledgerDetails.metrics.closing_balance_paise || 0)}
            </span>
          </div>
          {ledgerDetails.metrics.overdue_balance_paise > 0 && (
            <div>
              <span className="text-slate-500">Overdue:</span>{" "}
              <span className="font-bold text-rose-600 tabular-nums">
                {formatPaise(ledgerDetails.metrics.overdue_balance_paise)}
              </span>
            </div>
          )}
        </div>

        {/* Right Primary & Secondary Actions */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => onCollectPayment(student.student_id)}
            className="flex-1 sm:flex-initial py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <CreditCard className="w-4 h-4" />
            <span>Collect Payment</span>
          </button>

          <button
            type="button"
            onClick={handlePrintStatement}
            className="py-2.5 px-3.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            <span>Print Statement</span>
          </button>

          <button
            type="button"
            onClick={handlePrintStatement}
            className="py-2.5 px-3.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Download PDF</span>
          </button>
        </div>
      </div>

      {/* 4. Detail Modal for Deep Inspection */}
      {(selectedObligation || selectedTransaction) && (
        <StudentLedgerDetailModal
          obligation={selectedObligation}
          transaction={selectedTransaction}
          onClose={() => {
            setSelectedObligation(null);
            setSelectedTransaction(null);
          }}
        />
      )}
    </div>
  );
};
