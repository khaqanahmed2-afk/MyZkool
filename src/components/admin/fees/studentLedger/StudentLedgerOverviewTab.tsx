import React from "react";
import {
  User,
  Phone,
  Calendar,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Clock,
  Bus,
  ShieldCheck,
  Receipt,
  ArrowRight,
} from "lucide-react";
import { formatPaise, formatDateDisplay, getStatusBadgeConfig } from "./ledgerFormatters";
import type {
  StudentLedgerDetails,
  FeeObligationBreakdownItem,
  LedgerTransactionItem,
} from "../../../../types/studentFeeLedger";

interface Props {
  ledgerDetails: StudentLedgerDetails;
  onNavigateTab: (tab: "breakdown" | "ledger" | "invoices" | "payments" | "concessions" | "transport" | "credits") => void;
  onSelectObligation: (item: FeeObligationBreakdownItem) => void;
  onSelectTransaction: (item: LedgerTransactionItem) => void;
  onCollectPayment: (studentId: string) => void;
}

export const StudentLedgerOverviewTab: React.FC<Props> = ({
  ledgerDetails,
  onNavigateTab,
  onSelectObligation,
  onSelectTransaction,
  onCollectPayment,
}) => {
  const { student, fee_breakdown = [], transactions = [] } = ledgerDetails;

  // Filter only unresolved obligations (unpaid, partial, overdue)
  const outstandingObligations = fee_breakdown.filter((b) => b.pending_paise > 0);
  const priorityObligations = outstandingObligations.slice(0, 5);

  // Recent transactions (last 4)
  const recentTransactions = transactions.slice(0, 4);

  const statusBadge = getStatusBadgeConfig(student.fee_status);

  return (
    <div className="space-y-6">
      {/* 1. Placement, Guardian & Billing Standing Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        {/* Student & Guardian Placement Details */}
        <div className="p-4 rounded-xl border border-slate-200/90 bg-white space-y-2.5 shadow-2xs">
          <div className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-2 text-slate-500 flex items-center justify-between">
            <span>Student & Placement Details</span>
            <span className="text-[10px] font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
              {student.admission_no}
            </span>
          </div>

          <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
            <span className="text-slate-500">Parent / Guardian:</span>
            <span className="font-semibold text-slate-800">
              {student.parent_name || "—"}{" "}
              {student.parent_relation ? `(${student.parent_relation})` : ""}
            </span>
          </div>

          <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
            <span className="text-slate-500">Contact Number:</span>
            <span className="font-semibold text-slate-800 font-mono">
              {student.parent_phone || "—"}
            </span>
          </div>

          <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
            <span className="text-slate-500">Class & Section:</span>
            <span className="font-semibold text-slate-800">
              {student.class_name} - {student.section_name}
            </span>
          </div>

          <div className="flex justify-between items-center py-1.5">
            <span className="text-slate-500">Assigned Fee Structure:</span>
            <span className="font-semibold text-blue-700 bg-blue-50/70 px-2 py-0.5 rounded text-[11px]">
              {student.applicable_fee_structure_name || "Standard Fee Structure"}
            </span>
          </div>
        </div>

        {/* Billing Status & Timeline */}
        <div className="p-4 rounded-xl border border-slate-200/90 bg-white space-y-2.5 shadow-2xs">
          <div className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-2 text-slate-500 flex items-center justify-between">
            <span>Billing Status & Standing</span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${statusBadge.className}`}>
              {statusBadge.label}
            </span>
          </div>

          <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
            <span className="text-slate-500">Earliest Relevant Due Date:</span>
            <span className="font-semibold text-slate-800 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>{formatDateDisplay(student.next_due_date)}</span>
            </span>
          </div>

          <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
            <span className="text-slate-500">Transport Enrollment:</span>
            <span className="font-semibold text-slate-800">
              {student.has_transport
                ? `Opted (${student.transport_route || "Route Assigned"})`
                : "Not Opted"}
            </span>
          </div>

          <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
            <span className="text-slate-500">Academic Year:</span>
            <span className="font-semibold text-slate-800">
              {student.academic_year_name || "2026–2027"}
            </span>
          </div>

          <div className="flex justify-between items-center py-1.5">
            <span className="text-slate-500">Overdue Days:</span>
            <span
              className={`font-bold tabular-nums ${
                student.overdue_days > 0 ? "text-rose-600" : "text-slate-700"
              }`}
            >
              {student.overdue_days > 0 ? `${student.overdue_days} Days Past Due` : "Current (0 Days)"}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Priority Outstanding Obligations (Concise List) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <span>Outstanding Obligations</span>
              {outstandingObligations.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-100 text-amber-800 font-mono">
                  {outstandingObligations.length}
                </span>
              )}
            </h4>
            <p className="text-[11px] text-slate-500">
              Direct list of fee components requiring payment settlement
            </p>
          </div>

          <button
            type="button"
            onClick={() => onNavigateTab("breakdown")}
            className="text-xs text-blue-600 font-semibold hover:text-blue-700 flex items-center gap-1 cursor-pointer transition-colors"
          >
            <span>View Complete Fee Breakdown ({fee_breakdown.length})</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {priorityObligations.length === 0 ? (
          <div className="p-6 rounded-xl border border-emerald-200 bg-emerald-50/40 text-center space-y-1.5 shadow-2xs">
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div className="text-xs font-bold text-emerald-900">
              All Fee Obligations Cleared
            </div>
            <p className="text-[11px] text-emerald-700 max-w-sm mx-auto">
              This student has no outstanding or overdue balances for the selected academic period.
            </p>
          </div>
        ) : (
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[620px]">
                <thead className="bg-slate-50/90 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">Fee Description</th>
                    <th className="py-2.5 px-3">Period</th>
                    <th className="py-2.5 px-3 text-right">Net Assessed</th>
                    <th className="py-2.5 px-3 text-right">Paid</th>
                    <th className="py-2.5 px-3 text-right">Outstanding</th>
                    <th className="py-2.5 px-3">Due Date</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {priorityObligations.map((b) => {
                    const badge = getStatusBadgeConfig(b.status);
                    return (
                      <tr
                        key={b.id}
                        tabIndex={0}
                        onClick={() => onSelectObligation(b)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            onSelectObligation(b);
                          }
                        }}
                        className="hover:bg-blue-50/40 transition-colors cursor-pointer focus:outline-none focus:bg-blue-50/50"
                        title="Click to view details and payment allocation"
                      >
                        <td className="py-2 px-3 font-semibold text-slate-800 text-[11px]">
                          {b.description}
                        </td>
                        <td className="py-2 px-3 text-slate-600 text-[11px] whitespace-nowrap">
                          {b.billing_period}
                        </td>
                        <td className="py-2 px-3 text-right font-medium text-slate-800 tabular-nums text-[11px]">
                          {formatPaise(b.original_amount_paise - b.waived_paise)}
                        </td>
                        <td className="py-2 px-3 text-right font-medium text-emerald-700 tabular-nums text-[11px]">
                          {b.paid_paise > 0 ? formatPaise(b.paid_paise) : "—"}
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-amber-800 tabular-nums text-[11px]">
                          {formatPaise(b.pending_paise)}
                        </td>
                        <td className="py-2 px-3 text-slate-600 text-[11px] whitespace-nowrap">
                          {formatDateDisplay(b.due_date)}
                        </td>
                        <td className="py-2 px-3 text-center whitespace-nowrap">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${badge.className}`}
                          >
                            {badge.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {outstandingObligations.length > 5 && (
              <div className="p-2.5 bg-slate-50/70 border-t border-slate-100 text-center">
                <button
                  type="button"
                  onClick={() => onNavigateTab("breakdown")}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800 inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>
                    Show {outstandingObligations.length - 5} additional outstanding obligations
                  </span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. Recent Transactions Snapshot */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Recent Ledger Activity
          </h4>
          <button
            type="button"
            onClick={() => onNavigateTab("ledger")}
            className="text-xs text-blue-600 font-semibold hover:text-blue-700 flex items-center gap-1 cursor-pointer transition-colors"
          >
            <span>View Full Ledger ({transactions.length})</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 text-center text-xs text-slate-500">
            No transactions recorded for this student yet.
          </div>
        ) : (
          <div className="space-y-2">
            {recentTransactions.map((tx) => {
              const isCredit = tx.credit_paise > 0;
              const badge = getStatusBadgeConfig(tx.payment_status);

              return (
                <div
                  role="button"
                  tabIndex={0}
                  key={tx.id}
                  onClick={() => onSelectTransaction(tx)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelectTransaction(tx);
                    }
                  }}
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-200/80 bg-white hover:border-blue-300 hover:bg-blue-50/20 transition-all shadow-2xs cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
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
                        <Receipt className="w-4 h-4" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-800 truncate">
                        {tx.description}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono text-slate-700 font-semibold">
                          {tx.ref_no}
                        </span>
                        <span>•</span>
                        <span>{tx.billing_period || tx.period || "—"}</span>
                        <span>•</span>
                        <span>{formatDateDisplay(tx.date)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0 ml-3">
                    <div
                      className={`text-xs font-bold tabular-nums ${
                        isCredit ? "text-emerald-700" : "text-slate-900"
                      }`}
                    >
                      {isCredit ? `- ${formatPaise(tx.credit_paise)}` : formatPaise(tx.debit_paise)}
                    </div>
                    <span
                      className={`inline-block text-[10px] font-semibold mt-0.5 ${
                        tx.payment_status === "Paid" || tx.payment_status === "Received" || tx.payment_status === "Waived"
                          ? "text-emerald-700"
                          : tx.payment_status === "Overdue"
                          ? "text-rose-600"
                          : "text-amber-700"
                      }`}
                    >
                      {tx.payment_status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
