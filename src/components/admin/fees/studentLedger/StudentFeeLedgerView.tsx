import React, { useState, useEffect, useRef } from "react";
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
  MoreVertical,
  ChevronDown,
  Edit2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  getStudentLedgerDetails,
  generateStudentLedgerHTML,
  getWhatsAppFeeMessage,
} from "../../../../services/studentFeeLedgerService";
import { generateInvoiceHTML } from "../../../../lib/invoiceTemplate";
import { formatPaise, getInitials, getStatusBadgeConfig } from "./ledgerFormatters";
import { StudentLedgerOverviewTab } from "./StudentLedgerOverviewTab";
import { StudentFeeBreakdownTab } from "./StudentFeeBreakdownTab";
import { StudentLedgerJournalTab } from "./StudentLedgerJournalTab";
import { StudentPaymentsTab } from "./StudentPaymentsTab";
import { StudentInvoicesAndReceiptsTab } from "./StudentInvoicesAndReceiptsTab";
import { StudentCreditsAndConcessionsTab } from "./StudentCreditsAndConcessionsTab";
import { StudentTransportTab } from "./StudentTransportTab";
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
  | "payments"
  | "invoices"
  | "ledger"
  | "credits_concessions"
  | "transport";

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
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<LedgerTabType>("overview");
  const [ledgerDetails, setLedgerDetails] = useState<StudentLedgerDetails | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  // Modals for deep inspection
  const [selectedObligation, setSelectedObligation] = useState<FeeObligationBreakdownItem | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<LedgerTransactionItem | null>(null);

  // Close more menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setIsMoreMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
        setError("Unable to load fee ledger details.");
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

  // Download PDF (triggers statement print with dedicated file title)
  const handleDownloadPDF = () => {
    if (!ledgerDetails) return;
    const html = generateStudentLedgerHTML(ledgerDetails, schoolName);
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.title = `Fee_Statement_${student?.admission_no || "Student"}`;
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
      <div className="flex flex-col items-center justify-center p-12 space-y-3 min-h-[300px]">
        <RefreshCw className="w-7 h-7 text-blue-600 animate-spin" />
        <p className="text-xs text-slate-500 font-medium">Loading student fee records...</p>
      </div>
    );
  }

  if (error || !student || !ledgerDetails) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center space-y-3 min-h-[300px]">
        <AlertCircle className="w-9 h-9 text-rose-500" />
        <p className="text-sm font-semibold text-slate-800">{error || "Student records not found"}</p>
        <button
          type="button"
          onClick={loadLedger}
          className="px-4 py-2 text-xs font-semibold text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer"
        >
          Try Again
        </button>
      </div>
    );
  }

  const statusBadge = getStatusBadgeConfig(student.fee_status);

  // Tab count badges
  const feeBreakdownCount = ledgerDetails.fee_breakdown?.length || 0;
  const paymentsCount = ledgerDetails.payments?.length || 0;
  const invoicesCount = ledgerDetails.invoices?.length || 0;
  const ledgerTxCount = ledgerDetails.transactions?.length || 0;
  const concessionsCount = (ledgerDetails.concessions?.length || 0) + (ledgerDetails.advance_credits?.length || 0);
  const transportObligations = (ledgerDetails.fee_breakdown || []).filter((b) => b.category === "Transport");

  return (
    <div className="flex flex-col bg-white">
      {/* 1. Drawer Header (When viewed inside slide-over drawer) */}
      {showHeader && mode === "drawer" && (
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 font-display flex items-center gap-2">
                <span>Student Fee Management</span>
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

      {/* 2. Compact Top Actions Bar (Universal across views) */}
      <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Left: Section Title & Status Badge */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-900 font-display">Fee Management</span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${statusBadge.className}`}>
                {statusBadge.label}
              </span>
            </div>
            {student.applicable_fee_structure_name && (
              <span className="text-xs text-slate-500 hidden md:inline">
                • {student.applicable_fee_structure_name}
              </span>
            )}
          </div>

          {/* Right: Simplified Actions (Collect Payment, Print Statement, Download PDF, More Dropdown) */}
          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            {/* Primary Action 1: Collect Payment */}
            <button
              type="button"
              onClick={() => onCollectPayment(student.student_id)}
              className="py-2 px-3.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Collect Payment</span>
            </button>

            {/* Primary Action 2: Print Statement */}
            <button
              type="button"
              onClick={handlePrintStatement}
              className="py-2 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span>Print Statement</span>
            </button>

            {/* Primary Action 3: Download PDF */}
            <button
              type="button"
              onClick={handleDownloadPDF}
              className="py-2 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Download PDF</span>
            </button>

            {/* Secondary Actions Dropdown */}
            <div className="relative" ref={moreMenuRef}>
              <button
                type="button"
                onClick={() => setIsMoreMenuOpen((prev) => !prev)}
                className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer shadow-2xs"
                title="More Actions"
                aria-expanded={isMoreMenuOpen}
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {isMoreMenuOpen && (
                <div className="absolute right-0 mt-1.5 w-48 bg-white border border-slate-200 rounded-xl shadow-lg z-30 py-1 text-xs divide-y divide-slate-100">
                  <div className="py-1">
                    <button
                      type="button"
                      onClick={() => {
                        handleWhatsApp();
                        setIsMoreMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 flex items-center gap-2 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                      <span>WhatsApp Reminder</span>
                    </button>

                    {student.parent_phone && (
                      <button
                        type="button"
                        onClick={() => {
                          window.open(`tel:${student.parent_phone}`);
                          setIsMoreMenuOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 flex items-center gap-2 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        <Phone className="w-3.5 h-3.5 text-blue-600" />
                        <span>Call Guardian</span>
                      </button>
                    )}
                  </div>

                  <div className="py-1">
                    <button
                      type="button"
                      onClick={() => {
                        navigate(`/admin/students/${student.student_id}/edit?step=8`);
                        setIsMoreMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 flex items-center gap-2 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                      <span>Edit Fee Assignment</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        loadLedger();
                        setIsMoreMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 flex items-center gap-2 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                      <span>Refresh Records</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 3. The 7 Separate Navigation Tabs */}
        <div className="flex items-center gap-1 mt-4 border-b border-slate-200 text-xs font-semibold overflow-x-auto no-scrollbar pb-px">
          {/* Tab 1: Overview */}
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

          {/* Tab 2: Fee Breakdown */}
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

          {/* Tab 3: Payments */}
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

          {/* Tab 4: Invoices & Receipts */}
          <button
            type="button"
            onClick={() => setActiveTab("invoices")}
            className={`pb-2.5 px-3 border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              activeTab === "invoices"
                ? "border-blue-600 text-blue-600 font-bold"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <span>Invoices & Receipts</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 text-slate-600 font-mono">
              {invoicesCount}
            </span>
          </button>

          {/* Tab 5: Ledger */}
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

          {/* Tab 6: Credits & Concessions */}
          <button
            type="button"
            onClick={() => setActiveTab("credits_concessions")}
            className={`pb-2.5 px-3 border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              activeTab === "credits_concessions"
                ? "border-blue-600 text-blue-600 font-bold"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <span>Credits & Concessions</span>
            {concessionsCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-teal-100 text-teal-800 font-mono">
                {concessionsCount}
              </span>
            )}
          </button>

          {/* Tab 7: Transport Fees */}
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
            <span>Transport Fees</span>
          </button>
        </div>
      </div>

      {/* 4. Tab Body Content Area */}
      <div className="p-4 sm:p-6">
        {/* Tab 1: Overview */}
        {activeTab === "overview" && (
          <StudentLedgerOverviewTab
            ledgerDetails={ledgerDetails}
            onNavigateTab={setActiveTab}
            onSelectObligation={setSelectedObligation}
            onSelectTransaction={setSelectedTransaction}
            onCollectPayment={onCollectPayment}
            onPrintReceipt={handlePrintReceipt}
          />
        )}

        {/* Tab 2: Fee Breakdown */}
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

        {/* Tab 3: Payments */}
        {activeTab === "payments" && (
          <StudentPaymentsTab
            payments={ledgerDetails.payments}
            unreceiptedSettlement={ledgerDetails.unreceipted_settlement}
            onPrintReceipt={handlePrintReceipt}
            onCollectPayment={() => onCollectPayment(student.student_id)}
          />
        )}

        {/* Tab 4: Invoices & Receipts */}
        {activeTab === "invoices" && (
          <StudentInvoicesAndReceiptsTab
            invoices={ledgerDetails.invoices}
            payments={ledgerDetails.payments}
            onPrintInvoice={handlePrintInvoice}
            onPrintReceipt={handlePrintReceipt}
            onCollectPayment={() => onCollectPayment(student.student_id)}
          />
        )}

        {/* Tab 5: Ledger */}
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

        {/* Tab 6: Credits & Concessions */}
        {activeTab === "credits_concessions" && (
          <StudentCreditsAndConcessionsTab
            concessions={ledgerDetails.concessions}
            advanceCredits={ledgerDetails.advance_credits || ledgerDetails.advanceCredits || []}
            totalConcessionsPaise={ledgerDetails.metrics.total_concessions_paise || 0}
            totalAdvanceCreditPaise={ledgerDetails.metrics.advance_credits_paise || 0}
            outstandingBalancePaise={ledgerDetails.metrics.closing_balance_paise || 0}
          />
        )}

        {/* Tab 7: Transport Fees */}
        {activeTab === "transport" && (
          <StudentTransportTab
            transportDetails={ledgerDetails.transport_details}
            transportObligations={transportObligations}
            onSelectObligation={setSelectedObligation}
          />
        )}
      </div>

      {/* 5. Detail Modal for Deep Inspection */}
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
