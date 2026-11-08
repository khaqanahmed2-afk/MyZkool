import React from "react";
import {
  Wallet,
  ShieldCheck,
  Info,
  CheckCircle2,
  Clock,
  ArrowRight,
} from "lucide-react";
import { formatPaise, formatDateDisplay } from "./ledgerFormatters";

interface CreditItem {
  id: string;
  amount_paise: number;
  remaining_paise: number;
  receipt_no?: string;
  date?: string;
  note?: string;
}

interface ConcessionItem {
  id: string;
  rule_name: string;
  basis: string;
  type: "percent" | "fixed";
  value: number;
  reason: string;
  status: string;
  applied_amount_paise: number;
}

interface Props {
  concessions: ConcessionItem[];
  advanceCredits: CreditItem[];
  totalConcessionsPaise: number;
  totalAdvanceCreditPaise: number;
  outstandingBalancePaise: number;
}

/**
 * Unified Credits & Concessions Tab
 *
 * Consolidates institutional waivers/concessions with advance credit deposits
 * and counter settlement details into a single clean view.
 */
export const StudentCreditsAndConcessionsTab: React.FC<Props> = ({
  concessions,
  advanceCredits,
  totalConcessionsPaise,
  totalAdvanceCreditPaise,
  outstandingBalancePaise,
}) => {
  const payableAfterCredit = Math.max(0, outstandingBalancePaise - totalAdvanceCreditPaise);

  return (
    <div className="space-y-6">
      {/* 1. Header & KPI Badges */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Credits, Concessions & Waivers
          </h4>
          <p className="text-[11px] text-slate-500">
            Institutional fee discounts, quota waivers, and unallocated advance payment deposits
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-teal-800 bg-teal-50 border border-teal-200/80 px-2.5 py-1 rounded-lg tabular-nums">
            Waivers: {formatPaise(totalConcessionsPaise)}
          </span>
          <span className="text-xs font-bold text-sky-800 bg-sky-50 border border-sky-200/80 px-2.5 py-1 rounded-lg tabular-nums">
            Advance Credit: {formatPaise(totalAdvanceCreditPaise)}
          </span>
        </div>
      </div>

      {/* 2. Advance Fee Credit Settlement Section */}
      <div className="p-4 bg-sky-50/50 border border-sky-200 rounded-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sky-950 font-bold text-xs">
            <Wallet className="w-4 h-4 text-sky-600 shrink-0" />
            <span>Advance Fee Credit Settlement Model</span>
          </div>
          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-sky-100 text-sky-800">
            Reconciled Counter Credit
          </span>
        </div>

        {/* 3-Point Reconciled Formula */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-sky-200/60 text-xs">
          <div className="p-2.5 bg-white/80 rounded-lg border border-sky-100">
            <div className="text-[10px] uppercase font-semibold text-slate-500">
              Outstanding Before Credit
            </div>
            <div className="font-bold text-slate-900 tabular-nums text-sm mt-0.5">
              {formatPaise(outstandingBalancePaise)}
            </div>
          </div>

          <div className="p-2.5 bg-white/80 rounded-lg border border-sky-100">
            <div className="text-[10px] uppercase font-semibold text-slate-500">
              Available Advance Credit
            </div>
            <div className="font-bold text-sky-700 tabular-nums text-sm mt-0.5">
              {formatPaise(totalAdvanceCreditPaise)}
            </div>
          </div>

          <div className="p-2.5 bg-white/80 rounded-lg border border-sky-100">
            <div className="text-[10px] uppercase font-semibold text-slate-500">
              Payable After Credit
            </div>
            <div className="font-bold text-emerald-800 tabular-nums text-sm mt-0.5">
              {formatPaise(payableAfterCredit)}
            </div>
          </div>
        </div>

        <p className="text-[11px] text-sky-800/80 pt-1">
          Unallocated advance credits offset future term obligations automatically before requiring parent payments.
        </p>
      </div>

      {/* 3. Unallocated Advance Credits List */}
      <div className="space-y-3">
        <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
          <span>Unallocated Advance Credit Deposits</span>
          {advanceCredits.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-sky-100 text-sky-800 font-mono">
              {advanceCredits.length}
            </span>
          )}
        </h5>

        {advanceCredits.length === 0 ? (
          <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200 space-y-1">
            <Wallet className="w-6 h-6 mx-auto text-slate-300" />
            <p className="text-xs font-medium text-slate-600">No unallocated advance fee credits recorded.</p>
            <p className="text-[11px] text-slate-400">
              Any advance deposits or counter overpayments will be tracked here.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
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
                      {formatPaise(cr.remaining_paise)} Available
                    </span>
                    {cr.amount_paise > cr.remaining_paise ? (
                      <span className="block text-[10px] text-slate-500 tabular-nums">
                        Applied: {formatPaise(cr.amount_paise - cr.remaining_paise)} | Original: {formatPaise(cr.amount_paise)}
                      </span>
                    ) : (
                      <span className="block text-[10px] text-slate-400 tabular-nums">
                        Original: {formatPaise(cr.amount_paise)} (Fully Available)
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
                  {cr.date && (
                    <div className="flex items-center gap-1 text-slate-500">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>{formatDateDisplay(cr.date)}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. Approved Concessions & Fee Waivers Section */}
      <div className="space-y-3 pt-2">
        <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
          <span>Approved Institutional Concessions & Waivers</span>
          {concessions.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-teal-100 text-teal-800 font-mono">
              {concessions.length}
            </span>
          )}
        </h5>

        {concessions.length === 0 ? (
          <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200 space-y-1">
            <ShieldCheck className="w-6 h-6 mx-auto text-slate-300" />
            <p className="text-xs font-medium text-slate-600">No concessions or fee waivers assigned.</p>
            <p className="text-[11px] text-slate-400">
              RTE quota waivers, sibling discounts, or merit concessions will be listed here.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {concessions.map((c) => (
              <div
                key={c.id}
                className="p-3.5 rounded-xl border border-teal-200/90 bg-white shadow-2xs hover:border-teal-300 transition-all space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0" />
                    <span className="font-bold text-xs text-slate-900">{c.rule_name}</span>
                  </div>
                  <span className="font-bold text-xs text-teal-700 tabular-nums">
                    -{formatPaise(c.applied_amount_paise)} Waived
                  </span>
                </div>

                <div className="text-[11px] text-slate-600 flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400">Reason:</span>
                    <span className="font-medium text-slate-700">{c.reason}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-slate-400">
                      Basis: {c.type === "percent" ? `${c.value}% Percentage` : "Fixed Amount"}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-teal-700 uppercase bg-teal-50 px-2 py-0.5 rounded border border-teal-200/60">
                      <CheckCircle2 className="w-3 h-3 text-teal-600" />
                      {c.status || "Active"}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

