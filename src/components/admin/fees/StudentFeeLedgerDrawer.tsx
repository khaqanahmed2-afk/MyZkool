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
  Share2,
  CheckCircle2,
  AlertCircle,
  FileText,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Receipt,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  Eye,
} from "lucide-react";
import { formatPaise } from "../../../lib/amountInWords";
import {
  getStudentLedgerDetails,
  generateStudentLedgerHTML,
  getWhatsAppFeeMessage,
} from "../../../services/studentFeeLedgerService";
import type {
  StudentFeeSummary,
  StudentLedgerDetails,
  LedgerTransactionItem,
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
  const [activeTab, setActiveTab] = useState<"overview" | "ledger" | "invoices" | "payments" | "concessions">("overview");
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
    const cleanPhone = student.parent_phone.replace(/[^0-9]/g, "");
    const waUrl = cleanPhone
      ? `https://wa.me/91${cleanPhone}?text=${encoded}`
      : `https://wa.me/?text=${encoded}`;
    window.open(waUrl, "_blank");
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
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-xl bg-white shadow-2xl h-full flex flex-col transform transition-transform ease-out duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900 font-display">Student Fee Ledger</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
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
            {/* Student Profile Card */}
            <div className="p-6 pb-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="w-13 h-13 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-base border-2 border-white shadow-xs">
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
                        Active
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                      <span className="font-mono text-slate-600 font-medium">{student.admission_no}</span>
                      <span>•</span>
                      <span>
                        {student.class_name} - {student.section_name}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="flex items-center gap-2 mt-5 border-b border-slate-200 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setActiveTab("overview")}
                  className={`pb-2.5 px-2 border-b-2 transition-colors ${
                    activeTab === "overview"
                      ? "border-blue-600 text-blue-600 font-bold"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Overview
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("ledger")}
                  className={`pb-2.5 px-2 border-b-2 transition-colors ${
                    activeTab === "ledger"
                      ? "border-blue-600 text-blue-600 font-bold"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Ledger
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("invoices")}
                  className={`pb-2.5 px-2 border-b-2 transition-colors ${
                    activeTab === "invoices"
                      ? "border-blue-600 text-blue-600 font-bold"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Invoices ({ledgerDetails?.invoices.length || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("payments")}
                  className={`pb-2.5 px-2 border-b-2 transition-colors ${
                    activeTab === "payments"
                      ? "border-blue-600 text-blue-600 font-bold"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Payments ({ledgerDetails?.payments.length || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("concessions")}
                  className={`pb-2.5 px-2 border-b-2 transition-colors ${
                    activeTab === "concessions"
                      ? "border-blue-600 text-blue-600 font-bold"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Concessions ({ledgerDetails?.concessions.length || 0})
                </button>
              </div>

              {/* 4 Mini Summary Metric Cards */}
              <div className="grid grid-cols-4 gap-2.5 mt-4">
                <div className="bg-white border border-slate-200/80 rounded-xl p-2.5 text-center shadow-2xs">
                  <div className="text-xs font-bold text-slate-900 tabular-nums">
                    {formatPaise(student.total_applicable_paise)}
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium mt-0.5">Total Fee</div>
                </div>
                <div className="bg-emerald-50/60 border border-emerald-100 rounded-xl p-2.5 text-center shadow-2xs">
                  <div className="text-xs font-bold text-emerald-700 tabular-nums">
                    {formatPaise(student.total_paid_paise)}
                  </div>
                  <div className="text-[10px] text-emerald-600 font-medium mt-0.5">Paid</div>
                </div>
                <div className="bg-amber-50/60 border border-amber-100 rounded-xl p-2.5 text-center shadow-2xs">
                  <div className="text-xs font-bold text-amber-700 tabular-nums">
                    {formatPaise(student.total_pending_paise)}
                  </div>
                  <div className="text-[10px] text-amber-600 font-medium mt-0.5">Pending</div>
                </div>
                <div
                  className={`rounded-xl p-2.5 text-center shadow-2xs border ${
                    student.total_overdue_paise > 0
                      ? "bg-rose-50/80 border-rose-200 text-rose-700"
                      : "bg-slate-50 border-slate-200 text-slate-600"
                  }`}
                >
                  <div className="text-xs font-bold tabular-nums">
                    {formatPaise(student.total_overdue_paise)}
                  </div>
                  <div className="text-[10px] opacity-80 font-medium mt-0.5">Overdue</div>
                </div>
              </div>

              {/* Profile Details Metadata */}
              <div className="mt-4 pt-3.5 border-t border-slate-200/70 space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-500">
                    <User className="w-3.5 h-3.5" />
                    <span>Parent / Guardian</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-800">{student.parent_name}</span>
                    <span className="text-slate-500 font-mono">({student.parent_phone})</span>
                    <button
                      type="button"
                      onClick={() => window.open(`tel:${student.parent_phone}`)}
                      className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                      title="Call Guardian"
                    >
                      <Phone className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={handleWhatsApp}
                      className="p-1 rounded text-emerald-600 hover:bg-emerald-50"
                      title="Send WhatsApp Message"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-500">
                    <Bus className="w-3.5 h-3.5" />
                    <span>Transport</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-800">
                      {student.has_transport ? `Yes (${student.transport_route || "Route A"})` : "Not Opted"}
                    </span>
                    {student.has_transport && (
                      <span className="text-[10px] text-blue-600 font-semibold cursor-pointer hover:underline">
                        View
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-500">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Next Due Date</span>
                  </div>
                  <span className="font-semibold text-slate-800">
                    {student.next_due_date || "— All dues cleared"}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-500">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Fee Status</span>
                  </div>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
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

            {/* Tab Views */}
            <div className="p-6">
              {/* TAB 1: OVERVIEW */}
              {activeTab === "overview" && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Recent Transactions</h4>
                    <button
                      type="button"
                      onClick={() => setActiveTab("ledger")}
                      className="text-xs text-blue-600 font-semibold hover:underline flex items-center gap-1"
                    >
                      View All
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {ledgerDetails?.transactions.slice(0, 6).map((tx) => (
                      <div
                        key={tx.id}
                        className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-white hover:border-slate-200 transition-colors shadow-2xs"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                              tx.type === "payment"
                                ? "bg-emerald-50 text-emerald-600"
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
                            ) : (
                              <FileText className="w-4 h-4" />
                            )}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-800">{tx.description}</div>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              {tx.ref_no} • {tx.date}
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div
                            className={`text-xs font-bold tabular-nums ${
                              tx.type === "payment"
                                ? "text-emerald-600"
                                : tx.payment_status === "Overdue"
                                ? "text-rose-600"
                                : "text-slate-800"
                            }`}
                          >
                            {tx.type === "payment" ? `+ ${formatPaise(tx.credit_paise)}` : formatPaise(tx.debit_paise)}
                          </div>
                          <span
                            className={`inline-block text-[10px] font-semibold mt-0.5 ${
                              tx.payment_status === "Paid" || tx.payment_status === "Received"
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
              )}

              {/* TAB 2: FULL LEDGER */}
              {activeTab === "ledger" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Chronological Ledger</h4>
                      <p className="text-[11px] text-slate-500">Every debit obligation, payment credit, and running balance</p>
                    </div>
                    <button
                      type="button"
                      onClick={handlePrintLedger}
                      className="px-2.5 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg flex items-center gap-1.5 transition-colors"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      Print Statement
                    </button>
                  </div>

                  <div className="overflow-x-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                        <tr>
                          <th className="py-2.5 px-3">Date</th>
                          <th className="py-2.5 px-3">Ref #</th>
                          <th className="py-2.5 px-3">Description</th>
                          <th className="py-2.5 px-3 text-right">Debit</th>
                          <th className="py-2.5 px-3 text-right">Credit</th>
                          <th className="py-2.5 px-3 text-right">Balance</th>
                          <th className="py-2.5 px-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {ledgerDetails?.transactions.map((t) => (
                          <tr key={t.id} className="hover:bg-slate-50/60">
                            <td className="py-2 px-3 text-slate-600 whitespace-nowrap text-[11px]">{t.date}</td>
                            <td className="py-2 px-3 font-semibold text-slate-800 whitespace-nowrap text-[11px]">{t.ref_no}</td>
                            <td className="py-2 px-3 text-slate-700 text-[11px] max-w-[150px] truncate">{t.description}</td>
                            <td className="py-2 px-3 text-right text-rose-600 font-semibold tabular-nums text-[11px]">
                              {t.debit_paise > 0 ? formatPaise(t.debit_paise) : "—"}
                            </td>
                            <td className="py-2 px-3 text-right text-emerald-600 font-semibold tabular-nums text-[11px]">
                              {t.credit_paise > 0 ? formatPaise(t.credit_paise) : "—"}
                            </td>
                            <td className="py-2 px-3 text-right font-bold text-slate-900 tabular-nums text-[11px]">
                              {formatPaise(t.running_balance_paise)}
                            </td>
                            <td className="py-2 px-3 text-center whitespace-nowrap">
                              <span
                                className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                                  t.payment_status === "Paid" || t.payment_status === "Received"
                                    ? "bg-emerald-50 text-emerald-700"
                                    : t.payment_status === "Overdue"
                                    ? "bg-rose-50 text-rose-700"
                                    : "bg-amber-50 text-amber-700"
                                }`}
                              >
                                {t.payment_status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Summary Bar */}
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-xs flex justify-between items-center">
                    <div>
                      <span className="text-slate-500">Closing Balance:</span>{" "}
                      <span className="font-bold text-slate-900">{formatPaise(ledgerDetails?.metrics.closing_balance_paise || 0)}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Overdue:</span>{" "}
                      <span className="font-bold text-rose-600">{formatPaise(ledgerDetails?.metrics.overdue_balance_paise || 0)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: INVOICES */}
              {activeTab === "invoices" && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Applicable Invoices</h4>
                  {ledgerDetails?.invoices.map((inv) => (
                    <div
                      key={inv.id}
                      className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-colors shadow-2xs space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-900">{inv.invoice_no}</span>
                          <span className="text-xs text-slate-500">• {inv.billing_period}</span>
                        </div>
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
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-xs pt-1 border-t border-slate-100">
                        <div>
                          <div className="text-[10px] text-slate-400">Total Billed</div>
                          <div className="font-semibold text-slate-800">{formatPaise(inv.total_paise)}</div>
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
                    </div>
                  ))}
                </div>
              )}

              {/* TAB 4: PAYMENTS */}
              {activeTab === "payments" && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Payment Receipts</h4>
                  {ledgerDetails?.payments.map((p) => (
                    <div
                      key={p.id}
                      className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-colors shadow-2xs flex items-center justify-between"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-900">{p.receipt_no}</span>
                          <span className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded font-semibold uppercase">
                            {p.payment_mode}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {p.receipt_date} • {p.collected_by_name || "School Office"}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-xs font-bold text-emerald-600 tabular-nums">
                          {formatPaise(p.total_paise)}
                        </div>
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600">
                          <CheckCircle2 className="w-3 h-3" />
                          Successful
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* TAB 5: CONCESSIONS */}
              {activeTab === "concessions" && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Approved Concessions & Scholarships</h4>
                  {ledgerDetails?.concessions.map((c) => (
                    <div
                      key={c.id}
                      className="p-3.5 rounded-xl border border-emerald-100 bg-emerald-50/40 shadow-2xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-emerald-900">{c.rule_name}</span>
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                          {c.type === "percent" ? `${c.value}% Off` : `₹${c.value} Off`}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600">{c.reason}</p>
                      <div className="text-[11px] text-emerald-800 font-semibold pt-1">
                        Applied benefit: {formatPaise(c.applied_amount_paise)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Sticky Drawer Footer Actions */}
        <div className="p-4 border-t border-slate-200 bg-white grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              if (student) onCollectPayment(student.student_id);
            }}
            className="col-span-2 w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <CreditCard className="w-4 h-4" />
            Collect Payment
          </button>

          <button
            type="button"
            onClick={handlePrintLedger}
            className="py-2 px-3 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            Print Ledger
          </button>

          <button
            type="button"
            onClick={handlePrintLedger}
            className="py-2 px-3 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            Download PDF
          </button>

          <button
            type="button"
            onClick={handleWhatsApp}
            className="col-span-2 py-2 px-3 rounded-xl border border-emerald-200 bg-emerald-50/50 text-emerald-800 hover:bg-emerald-100/60 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
          >
            <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
            Send on WhatsApp
          </button>
        </div>
      </div>
    </div>
  );
}
