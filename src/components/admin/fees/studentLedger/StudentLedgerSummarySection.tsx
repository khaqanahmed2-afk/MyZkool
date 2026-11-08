import React from "react";
import {
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Clock,
  Wallet,
} from "lucide-react";
import { formatPaise, formatDateDisplay } from "./ledgerFormatters";
import type { StudentLedgerDetails } from "../../../../types/studentFeeLedger";

interface Props {
  ledgerDetails: StudentLedgerDetails;
}

/**
 * Authoritative Financial Summary Section (4 Compact Summary Cards)
 *
 * Implements 4 clean, compact summary cards with clear labels and subtle visual differences:
 * 1. Total Fees (Net Assessed after subtracting approved waivers/concessions)
 * 2. Total Paid (Verified receipts and reconciled settlements)
 * 3. Outstanding Balance (Net unpaid liability)
 * 4. Overdue Amount (Past-due subset of Outstanding, clearly marked as subset)
 */
export const StudentLedgerSummarySection: React.FC<Props> = ({ ledgerDetails }) => {
  const { student, metrics } = ledgerDetails;

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

  const receiptCount = ledgerDetails.payments?.length || 0;
  const nextDueDate = student.next_due_date;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {/* Card 1: Total Fees */}
      <div className="bg-slate-50/70 border border-slate-200/90 rounded-xl p-3.5 flex flex-col justify-between shadow-2xs hover:border-slate-300 transition-all">
        <div className="flex items-center justify-between text-slate-500 mb-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
            Total Fees
          </span>
          <Wallet className="w-3.5 h-3.5 text-slate-400" />
        </div>

        <div className="text-lg lg:text-xl font-bold text-slate-900 tabular-nums">
          {formatPaise(netAssessed)}
        </div>

        <div className="mt-1.5 pt-1.5 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-slate-500">
          <span>Gross: {formatPaise(grossAssessed)}</span>
          {waiversConcessions > 0 && (
            <span className="text-teal-700 font-medium">
              Waivers: -{formatPaise(waiversConcessions)}
            </span>
          )}
        </div>
      </div>

      {/* Card 2: Total Paid */}
      <div className="bg-emerald-50/40 border border-emerald-200/80 rounded-xl p-3.5 flex flex-col justify-between shadow-2xs hover:border-emerald-300 transition-all">
        <div className="flex items-center justify-between text-emerald-800 mb-1">
          <span className="text-[11px] font-bold uppercase tracking-wider">
            Total Paid
          </span>
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
        </div>

        <div className="text-lg lg:text-xl font-bold text-emerald-700 tabular-nums">
          {formatPaise(totalPaid)}
        </div>

        <div className="mt-1.5 pt-1.5 border-t border-emerald-200/60 text-[10px] text-emerald-700/90 font-medium">
          {totalPaid > 0 ? (
            <span>
              {receiptCount > 0
                ? `${receiptCount} receipt voucher${receiptCount === 1 ? "" : "s"}`
                : "Direct fee settlement"}
            </span>
          ) : (
            <span className="text-emerald-600/70">No payments recorded</span>
          )}
        </div>
      </div>

      {/* Card 3: Outstanding Balance */}
      <div
        className={`rounded-xl p-3.5 flex flex-col justify-between shadow-2xs border transition-all ${
          outstandingBalance > 0
            ? "bg-amber-50/40 border-amber-200/90 text-amber-950"
            : "bg-slate-50/70 border-slate-200 text-slate-700"
        }`}
      >
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] font-bold uppercase tracking-wider opacity-90">
            Outstanding Balance
          </span>
          <AlertCircle className="w-3.5 h-3.5 opacity-70" />
        </div>

        <div className="text-lg lg:text-xl font-bold tabular-nums">
          {formatPaise(outstandingBalance)}
        </div>

        <div className="mt-1.5 pt-1.5 border-t border-amber-200/60 text-[10px] opacity-80 flex items-center justify-between">
          <span>
            {outstandingBalance === 0
              ? "All dues settled"
              : nextDueDate
              ? `Due by ${formatDateDisplay(nextDueDate)}`
              : "Active balance"}
          </span>
          {outstandingBalance === 0 && (
            <span className="font-semibold text-emerald-700">Cleared</span>
          )}
        </div>
      </div>

      {/* Card 4: Overdue Amount */}
      <div
        className={`rounded-xl p-3.5 flex flex-col justify-between shadow-2xs border transition-all ${
          overdueBalance > 0
            ? "bg-rose-50/50 border-rose-200 text-rose-950"
            : "bg-slate-50/70 border-slate-200 text-slate-500"
        }`}
      >
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Overdue Amount
            </span>
            <span
              className="text-[9px] font-semibold px-1 py-0.2 rounded bg-rose-100/90 text-rose-700 uppercase tracking-tight"
              title="Subset of Outstanding Balance. Do not add to outstanding."
            >
              Subset
            </span>
          </div>
          <Clock className="w-3.5 h-3.5 text-rose-500" />
        </div>

        <div className="text-lg lg:text-xl font-bold tabular-nums">
          {formatPaise(overdueBalance)}
        </div>

        <div className="mt-1.5 pt-1.5 border-t border-rose-200/60 text-[10px] text-rose-600 flex items-center justify-between font-medium">
          <span>
            {overdueBalance > 0
              ? `${student.overdue_days || 0} days past due`
              : "Zero overdue balance"}
          </span>
          <span className="text-[9px] opacity-75">
            (In Outstanding)
          </span>
        </div>
      </div>
    </div>
  );
};
