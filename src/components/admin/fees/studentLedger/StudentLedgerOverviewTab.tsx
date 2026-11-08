import React from "react";
import {
  Calendar,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Clock,
  Printer,
  CreditCard,
  ArrowRight,
  Receipt,
} from "lucide-react";
import { formatPaise, formatDateDisplay, getStatusBadgeConfig } from "./ledgerFormatters";
import { StudentLedgerSummarySection } from "./StudentLedgerSummarySection";
import type {
  StudentLedgerDetails,
  FeeObligationBreakdownItem,
  LedgerTransactionItem,
} from "../../../../types/studentFeeLedger";

interface Props {
  ledgerDetails: StudentLedgerDetails;
  onNavigateTab: (
    tab:
      | "breakdown"
      | "payments"
      | "invoices"
      | "ledger"
      | "credits_concessions"
      | "transport"
  ) => void;
  onSelectObligation: (item: FeeObligationBreakdownItem) => void;
  onSelectTransaction: (item: LedgerTransactionItem) => void;
  onCollectPayment: (studentId: string) => void;
  onPrintReceipt?: (payment: any) => void;
}

/**
 * Redesigned Student Fee Overview Tab
 *
 * Strictly follows the specified layout hierarchy:
 * 1. Financial Summary Cards (Total Fees, Total Paid, Outstanding Balance, Overdue Amount)
 * 2. Payment Progress
 * 3. Next Due Date
 * 4. Outstanding Fees Table (Top 5 records with View All option)
 * 5. Recent Payment History (Recent records with View All option)
 *
 * Removes duplicate student profile & placement info, duplicate billing details,
 * advance settlement banners, and journal previews.
 */
export const StudentLedgerOverviewTab: React.FC<Props> = ({
  ledgerDetails,
  onNavigateTab,
  onSelectObligation,
  onCollectPayment,
  onPrintReceipt,
}) => {
  const { student, metrics, fee_breakdown = [], payments = [] } = ledgerDetails;

  // 1. Calculate Reconciled Figures & Progress
  const grossAssessed = metrics.total_charges_paise || student.total_billed_paise || 0;
  const waiversConcessions = metrics.total_concessions_paise || student.total_concession_paise || 0;
  const netAssessed =
    metrics.net_assessed_paise !== undefined
      ? metrics.net_assessed_paise
      : Math.max(0, grossAssessed - waiversConcessions);

  const totalPaid =
    metrics.total_payments_paise !== undefined
      ? metrics.total_payments_paise
      : student.total_paid_paise || 0;

  const outstandingBalance =
    metrics.closing_balance_paise !== undefined
      ? metrics.closing_balance_paise
      : student.total_pending_paise || 0;

  const overdueBalance =
    metrics.overdue_balance_paise !== undefined
      ? metrics.overdue_balance_paise
      : student.total_overdue_paise || 0;

  const progressPercent =
    netAssessed > 0 ? Math.min(100, Math.round((totalPaid / netAssessed) * 100)) : 100;

  // 2. Filter Outstanding Obligations (Max 5 for initial display)
  const outstandingObligations = fee_breakdown.filter((b) => b.pending_paise > 0);
  const priorityObligations = outstandingObligations.slice(0, 5);

  // 3. Recent Payments (Max 5 for initial display)
  const recentPayments = [...payments]
    .sort((a, b) => new Date(b.receipt_date).getTime() - new Date(a.receipt_date).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-5">
      {/* 1. Financial Summary Cards */}
      <StudentLedgerSummarySection ledgerDetails={ledgerDetails} />

      {/* 2. Payment Progress & 3. Next Due Date Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 2. Payment Progress Card */}
        <div className="p-4 rounded-xl border border-slate-200/90 bg-white shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Payment Progress
            </span>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/60 tabular-nums">
              {progressPercent}% Settled
            </span>
          </div>

          {/* Visual Dual-tone Progress Bar */}
          <div className="space-y-1.5">
            <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
              <div
                className="bg-emerald-500 h-full transition-all duration-500 rounded-full"
                style={{ width: `${progressPercent}%` }}
                title={`Paid: ${progressPercent}%`}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
              <span>{formatPaise(totalPaid)} paid</span>
              <span>{formatPaise(netAssessed)} total</span>
            </div>
          </div>

          {/* Progress Metrics Indicators */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <div className="truncate">
                <span className="text-[10px] text-slate-400 block uppercase">Paid</span>
                <span className="font-bold text-emerald-700 tabular-nums text-[11px]">
                  {formatPaise(totalPaid)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
              <div className="truncate">
                <span className="text-[10px] text-slate-400 block uppercase">Remaining</span>
                <span className="font-bold text-amber-800 tabular-nums text-[11px]">
                  {formatPaise(outstandingBalance)}
                </span>
              </div>
            </div>

            {overdueBalance > 0 && (
              <div className="flex items-center gap-1.5 col-span-2 sm:col-span-1">
                <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                <div className="truncate">
                  <span className="text-[10px] text-rose-500 block uppercase">Past Due</span>
                  <span className="font-bold text-rose-700 tabular-nums text-[11px]">
                    {formatPaise(overdueBalance)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 3. Next Due Date Status Card */}
        <div className="p-4 rounded-xl border border-slate-200/90 bg-white shadow-2xs flex flex-col justify-between">
          <div>
            <div className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Due Date & Standing</span>
              {student.overdue_days > 0 ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                  {student.overdue_days} Days Overdue
                </span>
              ) : outstandingBalance === 0 ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  All Clear
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                  Current
                </span>
              )}
            </div>

            {outstandingBalance === 0 ? (
              <div className="py-2 flex items-start gap-2.5 text-emerald-900">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold">All Dues Fully Settled</div>
                  <p className="text-[11px] text-emerald-700 mt-0.5">
                    There are no pending or overdue fee obligations for this student in the current session.
                  </p>
                </div>
              </div>
            ) : overdueBalance > 0 ? (
              <div className="py-2 flex items-start gap-2.5 text-rose-950">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold">
                    Overdue Fee Payment ({formatPaise(overdueBalance)})
                  </div>
                  <p className="text-[11px] text-rose-800/90 mt-0.5">
                    Obligation is past due since {formatDateDisplay(student.next_due_date)}. Please settle
                    promptly to avoid late fee penalties.
                  </p>
                </div>
              </div>
            ) : (
              <div className="py-2 flex items-start gap-2.5 text-slate-800">
                <Calendar className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold">
                    Next Due Date: {formatDateDisplay(student.next_due_date)}
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Next scheduled installment due date. Total outstanding balance is {formatPaise(outstandingBalance)}.
                  </p>
                </div>
              </div>
            )}
          </div>

          {outstandingBalance > 0 && (
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">Immediate action:</span>
              <button
                type="button"
                onClick={() => onCollectPayment(student.student_id)}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 cursor-pointer"
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Collect Payment Now</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 4. Outstanding Fees Table (Max 5 with View All) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <span>Outstanding Fees</span>
              {outstandingObligations.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-100 text-amber-800 font-mono">
                  {outstandingObligations.length}
                </span>
              )}
            </h4>
            <p className="text-[11px] text-slate-500">
              Fee components requiring payment settlement
            </p>
          </div>

          <button
            type="button"
            onClick={() => onNavigateTab("breakdown")}
            className="text-xs text-blue-600 font-semibold hover:text-blue-800 flex items-center gap-1 cursor-pointer transition-colors"
          >
            <span>View All Fee Breakdown ({fee_breakdown.length})</span>
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

      {/* 5. Recent Payment History (Max 5 with View All) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <span>Recent Payment History</span>
              {payments.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-mono">
                  {payments.length}
                </span>
              )}
            </h4>
            <p className="text-[11px] text-slate-500">
              Verified payment vouchers and settlement receipts
            </p>
          </div>

          <button
            type="button"
            onClick={() => onNavigateTab("payments")}
            className="text-xs text-blue-600 font-semibold hover:text-blue-800 flex items-center gap-1 cursor-pointer transition-colors"
          >
            <span>View All Payments ({payments.length})</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentPayments.length === 0 ? (
          <div className="p-6 rounded-xl border border-dashed border-slate-200 bg-slate-50 text-center space-y-1">
            <Receipt className="w-6 h-6 mx-auto text-slate-300" />
            <p className="text-xs font-semibold text-slate-700">No payment receipts recorded yet.</p>
            <p className="text-[11px] text-slate-400">
              When a payment is collected, the receipt details will appear here.
            </p>
          </div>
        ) : (
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[580px]">
                <thead className="bg-slate-50/90 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">Receipt #</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Mode</th>
                    <th className="py-2.5 px-3 text-right">Amount Paid</th>
                    <th className="py-2.5 px-3">Collected By</th>
                    {onPrintReceipt && <th className="py-2.5 px-3 text-right">Action</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentPayments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-2 px-3 font-mono font-bold text-slate-800 text-[11px]">
                        {p.receipt_no}
                      </td>
                      <td className="py-2 px-3 text-slate-600 text-[11px] whitespace-nowrap">
                        {formatDateDisplay(p.receipt_date)}
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap">
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 uppercase">
                          {p.payment_mode}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-emerald-700 tabular-nums text-[11px]">
                        {formatPaise(p.total_paise)}
                      </td>
                      <td className="py-2 px-3 text-slate-600 text-[11px]">
                        {p.collected_by_name || "School Office"}
                      </td>
                      {onPrintReceipt && (
                        <td className="py-2 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => onPrintReceipt(p)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-slate-200 hover:bg-slate-100 text-slate-600 text-[10px] font-medium transition-colors cursor-pointer"
                            title="Print Receipt"
                          >
                            <Printer className="w-3 h-3" />
                            <span>Print</span>
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {payments.length > 5 && (
              <div className="p-2.5 bg-slate-50/70 border-t border-slate-100 text-center">
                <button
                  type="button"
                  onClick={() => onNavigateTab("payments")}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800 inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>View All {payments.length} Payments</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
