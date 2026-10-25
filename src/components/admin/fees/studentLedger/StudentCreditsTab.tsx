import React from "react";
import { Wallet, Info, CheckCircle2, ArrowDownRight, Clock } from "lucide-react";
import { formatPaise, formatDateDisplay } from "./ledgerFormatters";

interface CreditItem {
  id: string;
  amount_paise: number;
  remaining_paise: number;
  receipt_no?: string;
  date?: string;
  note?: string;
}

interface Props {
  advanceCredits: CreditItem[];
  totalAdvanceCreditPaise: number;
}

export const StudentCreditsTab: React.FC<Props> = ({
  advanceCredits,
  totalAdvanceCreditPaise,
}) => {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Unallocated Advance Credits
          </h4>
          <p className="text-[11px] text-slate-500">
            Prepayments, counter advance deposits, and credit adjustments available to offset future dues
          </p>
        </div>
        <span className="text-xs font-bold text-sky-800 bg-sky-50 border border-sky-200/80 px-2.5 py-1 rounded-lg tabular-nums">
          Available Credit: {formatPaise(totalAdvanceCreditPaise)}
        </span>
      </div>

      {/* Explanatory Policy Note */}
      <div className="p-3 bg-sky-50/60 border border-sky-200/80 rounded-xl flex items-start gap-2.5 text-xs text-sky-900">
        <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold">How Advance Credits Offset Liabilities:</span>
          <p className="text-[11px] text-sky-800/90 mt-0.5">
            Advance credits are subtracted exactly once from the net outstanding balance. When future term
            invoices or dues are generated, these balances automatically apply first before requiring parental payment.
          </p>
        </div>
      </div>

      {advanceCredits.length === 0 ? (
        <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200 space-y-1.5">
          <Wallet className="w-8 h-8 mx-auto text-slate-300" />
          <p className="text-xs font-semibold text-slate-700">No unallocated advance fee credits recorded.</p>
          <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
            When a parent overpays or deposits advance caution money, the credit will be securely tracked here.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {advanceCredits.map((cr) => (
            <div
              key={cr.id}
              className="p-3.5 rounded-xl border border-sky-200/90 bg-white shadow-2xs hover:border-sky-300 transition-all space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-sky-600 shrink-0" />
                  <span className="font-bold text-xs text-slate-900">
                    {cr.note || "Counter Advance Deposit"}
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-xs text-sky-700 tabular-nums">
                    {formatPaise(cr.remaining_paise)} Remaining
                  </span>
                  {cr.amount_paise > cr.remaining_paise && (
                    <span className="block text-[10px] text-slate-400">
                      (Initial: {formatPaise(cr.amount_paise)})
                    </span>
                  )}
                </div>
              </div>

              <div className="text-[11px] text-slate-600 flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">Source:</span>
                  <span className="font-mono font-medium text-slate-800">
                    {cr.receipt_no || "Advance Counter Receipt"}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>{formatDateDisplay(cr.date)}</span>
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-sky-700 uppercase bg-sky-50 px-2 py-0.5 rounded border border-sky-200/60">
                    <CheckCircle2 className="w-3 h-3 text-sky-600" />
                    Available
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
