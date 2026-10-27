import React from "react";
import {
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowDownRight,
  Wallet,
  Clock,
} from "lucide-react";
import { formatPaise } from "./ledgerFormatters";
import type { StudentLedgerDetails } from "../../../../types/studentFeeLedger";

interface Props {
  ledgerDetails: StudentLedgerDetails;
}

/**
 * Phase 2: Authoritative Financial Summary Section
 *
 * Implements one single, consistent, reconciled financial summary:
 * 1. Gross Assessed & Waivers -> Net Assessed Fees
 * 2. Total Paid (Receipts Recorded)
 * 3. Outstanding Balance (Net unpaid liability)
 * 4. Overdue Balance (Exclusively marked as a SUBSET of Outstanding, never added as separate debt!)
 * 5. Advance counter credits & Government RTE waivers
 */
export const StudentLedgerSummarySection: React.FC<Props> = ({ ledgerDetails }) => {
  const { student, metrics } = ledgerDetails;

  const grossAssessed = metrics.total_charges_paise || student.total_billed_paise || 0;
  const waiversConcessions = metrics.total_concessions_paise || student.total_concession_paise || 0;
  const netAssessed = metrics.net_assessed_paise !== undefined
    ? metrics.net_assessed_paise
    : Math.max(0, grossAssessed - waiversConcessions);

  const totalPaid = metrics.total_payments_paise !== undefined
    ? metrics.total_payments_paise
    : student.total_paid_paise || 0;

  const outstandingBalance = metrics.closing_balance_paise !== undefined
    ? metrics.closing_balance_paise
    : student.total_pending_paise || 0;

  const overdueBalance = metrics.overdue_balance_paise !== undefined
    ? metrics.overdue_balance_paise
    : student.total_overdue_paise || 0;

  const advanceCredits = metrics.advance_credits_paise !== undefined
    ? metrics.advance_credits_paise
    : student.advance_credit_paise || 0;

  const hasObligations = grossAssessed > 0 || netAssessed > 0;
  const isFullyPaid = hasObligations && outstandingBalance === 0;

  return (
    <div className="space-y-3">
      {/* 4 Reconciled Financial Summary Tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Assessed Fees (Net with Gross & Concessions) */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-3.5 flex flex-col justify-between shadow-2xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Net Assessed Fees
            </span>
            <span
              className="text-slate-400 cursor-help"
              title="Net fee payable after subtracting approved institutional concessions and RTE waivers from gross charges."
            >
              <HelpCircle className="w-3.5 h-3.5" />
            </span>
          </div>

          <div className="text-lg lg:text-xl font-bold text-slate-900 tabular-nums">
            {formatPaise(netAssessed)}
          </div>

          <div className="mt-1.5 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
            <span>Gross: {formatPaise(grossAssessed)}</span>
            {waiversConcessions > 0 && (
              <span className="text-teal-700 font-medium">
                Waivers: -{formatPaise(waiversConcessions)}
              </span>
            )}
          </div>
        </div>

        {/* Card 2: Total Paid */}
        <div className="bg-emerald-50/50 border border-emerald-200/80 rounded-xl p-3.5 flex flex-col justify-between shadow-2xs hover:border-emerald-300 transition-all">
          <div className="flex items-center justify-between text-emerald-800 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">
              Total Amount Paid
            </span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          </div>

          <div className="text-lg lg:text-xl font-bold text-emerald-700 tabular-nums">
            {formatPaise(totalPaid)}
          </div>

          <div className="mt-1.5 pt-1.5 border-t border-emerald-100/70 text-[10px] text-emerald-700/90 font-medium">
            {totalPaid > 0 ? (
              <span>
                {ledgerDetails.payments.length > 0
                  ? `${ledgerDetails.payments.length} verified receipt voucher${ledgerDetails.payments.length === 1 ? "" : "s"}${
                      ledgerDetails.unreceipted_settlement ? " + direct settlements" : ""
                    }`
                  : "Settled direct / legacy fee allocations"}
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
              ? "bg-amber-50/50 border-amber-200/90 text-amber-900"
              : "bg-slate-50/80 border-slate-200 text-slate-700"
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider opacity-90">
              Outstanding Balance
            </span>
            <AlertCircle className="w-3.5 h-3.5 opacity-70" />
          </div>

          <div className="text-lg lg:text-xl font-bold tabular-nums">
            {formatPaise(outstandingBalance)}
          </div>

          <div className="mt-1.5 pt-1.5 border-t border-amber-100/70 text-[10px] opacity-80 flex items-center justify-between">
            <span>
              {advanceCredits > 0
                ? `Payable after credit: ${formatPaise(Math.max(0, outstandingBalance - advanceCredits))}`
                : outstandingBalance === 0
                ? "All dues settled"
                : student.next_due_date
                ? `Next due: ${student.next_due_date}`
                : "Active dues balance"}
            </span>
            {isFullyPaid && (
              <span className="font-semibold text-emerald-700">Cleared</span>
            )}
          </div>
        </div>

        {/* Card 4: Overdue Balance — Subtitle explicitly marks as a SUBSET */}
        <div
          className={`rounded-xl p-3.5 flex flex-col justify-between shadow-2xs border transition-all ${
            overdueBalance > 0
              ? "bg-rose-50/60 border-rose-200 text-rose-800"
              : "bg-slate-50/60 border-slate-200 text-slate-500"
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">
                Overdue Balance
              </span>
              <span
                className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-rose-100/80 text-rose-700"
                title="This amount is an overdue subset of the Outstanding Balance above. Do NOT add to outstanding."
              >
                Subset
              </span>
            </div>
            <Clock className="w-3.5 h-3.5 text-rose-500" />
          </div>

          <div className="text-lg lg:text-xl font-bold tabular-nums">
            {formatPaise(overdueBalance)}
          </div>

          <div className="mt-1.5 pt-1.5 border-t border-rose-100/70 text-[10px] text-rose-600 flex items-center justify-between font-medium">
            <span>
              {overdueBalance > 0
                ? "Past due date obligation"
                : "Zero overdue balance"}
            </span>
            <span className="text-[9px] opacity-75">
              (Included in Outstanding)
            </span>
          </div>
        </div>
      </div>

      {/* Auxiliary Financial Banners: Concessions & Advance Credits */}
      <div className="space-y-2">
        {/* Concessions / Waiver Banner */}
        {waiversConcessions > 0 && (
          <div className="p-2.5 bg-teal-50/80 border border-teal-200 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-teal-900 font-semibold">
              <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0" />
              <span>
                Approved Waivers / Concessions Applied:{" "}
                <span className="font-bold tabular-nums text-teal-950">
                  {formatPaise(waiversConcessions)}
                </span>
              </span>
            </div>
            <span className="text-[11px] text-teal-700 font-medium">
              Reduces student billing liability pursuant to school quota policy
            </span>
          </div>
        )}

        {/* Advance Credit Counter Deposit Banner with 3-Point Reconciled Formula */}
        {advanceCredits > 0 && (
          <div className="p-3 bg-sky-50/80 border border-sky-200 rounded-xl space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sky-900 font-semibold">
                <Wallet className="w-4 h-4 text-sky-600 shrink-0" />
                <span>Advance Fee Credit Settlement Model</span>
              </div>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-sky-100 text-sky-800">
                Unallocated Credit
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 border-t border-sky-200/60 text-[11px]">
              <div>
                <span className="text-slate-500">Outstanding before credit:</span>{" "}
                <span className="font-bold text-slate-800 tabular-nums">
                  {formatPaise(outstandingBalance)}
                </span>
              </div>
              <div>
                <span className="text-slate-500">Available advance credit:</span>{" "}
                <span className="font-bold text-sky-700 tabular-nums">
                  {formatPaise(advanceCredits)}
                </span>
              </div>
              <div>
                <span className="text-slate-500">Payable after available credit:</span>{" "}
                <span className="font-bold text-emerald-800 tabular-nums">
                  {formatPaise(Math.max(0, outstandingBalance - advanceCredits))}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
