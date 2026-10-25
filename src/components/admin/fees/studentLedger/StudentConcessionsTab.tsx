import React from "react";
import { ShieldCheck, CheckCircle2, Info, AlertCircle } from "lucide-react";
import { formatPaise } from "./ledgerFormatters";

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
  totalConcessionsPaise: number;
}

export const StudentConcessionsTab: React.FC<Props> = ({
  concessions,
  totalConcessionsPaise,
}) => {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Approved Concessions & Fee Waivers
          </h4>
          <p className="text-[11px] text-slate-500">
            Institutional fee discounts, merit scholarships, and 100% RTE Government quota waivers
          </p>
        </div>
        <span className="text-xs font-bold text-teal-800 bg-teal-50 border border-teal-200/80 px-2.5 py-1 rounded-lg tabular-nums">
          Total Waived: {formatPaise(totalConcessionsPaise)}
        </span>
      </div>

      {/* Explanatory Policy Note */}
      <div className="p-3 bg-teal-50/60 border border-teal-200/80 rounded-xl flex items-start gap-2.5 text-xs text-teal-900">
        <Info className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold">How Concessions Affect Outstanding Balance:</span>
          <p className="text-[11px] text-teal-800/90 mt-0.5">
            Approved waivers and concessions directly reduce gross fee liability. They are credited against
            the assessed components and non-chargeable to parents.
          </p>
        </div>
      </div>

      {concessions.length === 0 ? (
        <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200 space-y-1.5">
          <ShieldCheck className="w-8 h-8 mx-auto text-slate-300" />
          <p className="text-xs font-semibold text-slate-700">No concessions or fee waivers assigned.</p>
          <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
            Any RTE quota waivers, sibling discounts, or special administrative concessions assigned to this student will be listed here.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
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
  );
};
