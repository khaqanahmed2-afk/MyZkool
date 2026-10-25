import React, { useState, useMemo } from "react";
import {
  Printer,
  Info,
  Receipt,
  FileText,
  Bus,
  ShieldCheck,
  CreditCard,
  ChevronDown,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { formatPaise, formatDateDisplay, getStatusBadgeConfig } from "./ledgerFormatters";
import type { LedgerTransactionItem } from "../../../../types/studentFeeLedger";

interface Props {
  transactions: LedgerTransactionItem[];
  onPrintLedger: () => void;
  onSelectTransaction: (item: LedgerTransactionItem) => void;
  metrics: {
    total_charges_paise: number;
    total_concessions_paise: number;
    closing_balance_paise: number;
    overdue_balance_paise: number;
  };
}

type TxFilterType = "all" | "charge" | "payment" | "concession" | "adjustment";

export const StudentLedgerJournalTab: React.FC<Props> = ({
  transactions,
  onPrintLedger,
  onSelectTransaction,
  metrics,
}) => {
  const [filter, setFilter] = useState<TxFilterType>("all");
  const [expandedAuditId, setExpandedAuditId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      if (filter === "charge") return t.type === "charge";
      if (filter === "payment") return t.type === "payment";
      if (filter === "concession") return t.type === "concession" || t.type === "waiver";
      if (filter === "adjustment") return t.type === "adjustment" || t.type === "refund";
      return true;
    });
  }, [transactions, filter]);

  return (
    <div className="space-y-4">
      {/* Header and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Chronological Accounting Ledger
          </h4>
          <p className="text-[11px] text-slate-500">
            Deterministic journal of charges, waivers, payments, and running balance progression
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Transaction Filter Buttons */}
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-xs">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors ${
                filter === "all" ? "bg-white text-slate-900 font-bold shadow-2xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setFilter("charge")}
              className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors ${
                filter === "charge" ? "bg-white text-slate-900 font-bold shadow-2xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Charges
            </button>
            <button
              type="button"
              onClick={() => setFilter("payment")}
              className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors ${
                filter === "payment" ? "bg-white text-slate-900 font-bold shadow-2xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Payments
            </button>
            <button
              type="button"
              onClick={() => setFilter("concession")}
              className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors ${
                filter === "concession" ? "bg-white text-slate-900 font-bold shadow-2xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Waivers
            </button>
          </div>

          <button
            type="button"
            onClick={onPrintLedger}
            className="px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Statement</span>
          </button>
        </div>
      </div>

      {/* Main Table: Exact 7 Columns required: Date, Reference, Transaction, Debit, Credit, Running Balance, Status */}
      <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[700px]">
            <thead className="bg-slate-50/90 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-2.5 px-3 whitespace-nowrap">Date</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Reference</th>
                <th className="py-2.5 px-3">Transaction</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap">Debit</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap">Credit</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap">Running Balance</th>
                <th className="py-2.5 px-3 text-center whitespace-nowrap">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="text-xs font-semibold text-slate-600">No ledger transactions found</p>
                  </td>
                </tr>
              ) : (
                filtered.map((t) => {
                  const isAuditOpen = expandedAuditId === t.id;
                  const badge = getStatusBadgeConfig(t.payment_status);

                  return (
                    <React.Fragment key={t.id}>
                      <tr
                        tabIndex={0}
                        onClick={() => onSelectTransaction(t)}
                        onKeyDown={(e) => {
                          if (e.target !== e.currentTarget) return;
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            onSelectTransaction(t);
                          }
                        }}
                        className="hover:bg-blue-50/30 transition-colors cursor-pointer focus:outline-none focus:bg-blue-50/40"
                        title="Click to view full transaction and payment allocation details"
                      >
                        {/* 1. Date */}
                        <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap text-[11px]">
                          {formatDateDisplay(t.date)}
                        </td>

                        {/* 2. Reference (Clickable) */}
                        <td className="py-2.5 px-3 font-semibold text-blue-600 hover:text-blue-800 whitespace-nowrap text-[11px] font-mono">
                          <span className="inline-flex items-center gap-1 hover:underline">
                            {t.ref_no}
                          </span>
                        </td>

                        {/* 3. Transaction Description */}
                        <td className="py-2.5 px-3 text-slate-800 text-[11px]">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-slate-900">{t.description}</span>
                            {t.billing_period && (
                              <span className="text-[10px] text-slate-400 font-normal">
                                • {t.billing_period}
                              </span>
                            )}
                            {t.internal_note && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedAuditId(isAuditOpen ? null : t.id);
                                }}
                                className="text-slate-400 hover:text-blue-600 p-0.5 cursor-pointer"
                                title="Toggle reconciliation audit note"
                              >
                                <Info className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>

                        {/* 4. Debit (Charge) */}
                        <td className="py-2.5 px-3 text-right text-rose-600 font-semibold tabular-nums text-[11px] whitespace-nowrap">
                          {t.debit_paise > 0 ? formatPaise(t.debit_paise) : "—"}
                        </td>

                        {/* 5. Credit (Payment, Waiver, Offset) */}
                        <td className="py-2.5 px-3 text-right text-emerald-700 font-semibold tabular-nums text-[11px] whitespace-nowrap">
                          {t.credit_paise > 0 ? formatPaise(t.credit_paise) : "—"}
                        </td>

                        {/* 6. Running Balance */}
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900 tabular-nums text-[11px] whitespace-nowrap">
                          {formatPaise(t.running_balance_paise)}
                        </td>

                        {/* 7. Status */}
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${badge.className}`}
                          >
                            {badge.label}
                          </span>
                        </td>
                      </tr>

                      {/* Secondary Audit Note Drawer Row */}
                      {isAuditOpen && (
                        <tr className="bg-slate-50/95 text-[10px] text-slate-600 border-b border-slate-200">
                          <td colSpan={7} className="py-2 px-4 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-700">Audit Detail:</span>
                              <span>{t.internal_note}</span>
                            </div>
                            <div className="flex items-center gap-4 text-slate-400 font-mono text-[9px]">
                              <span>Internal Ref: {t.audit_ref || "None"}</span>
                              {t.raw_due_id && <span>Linked Obligation: {t.raw_due_id}</span>}
                              {t.receipt_id && <span>Linked Receipt: {t.receipt_id}</span>}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary Bar */}
      <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 text-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div className="flex items-center gap-4 flex-wrap">
          <div>
            <span className="text-slate-500">Gross Billed:</span>{" "}
            <span className="font-bold text-slate-900 tabular-nums">
              {formatPaise(metrics.total_charges_paise || 0)}
            </span>
          </div>
          <div>
            <span className="text-slate-500">Concessions:</span>{" "}
            <span className="font-bold text-teal-700 tabular-nums">
              -{formatPaise(metrics.total_concessions_paise || 0)}
            </span>
          </div>
          <div>
            <span className="text-slate-500">Closing Balance:</span>{" "}
            <span className="font-bold text-slate-900 tabular-nums">
              {formatPaise(metrics.closing_balance_paise || 0)}
            </span>
          </div>
        </div>

        <div>
          <span className="text-slate-500">Total Overdue:</span>{" "}
          <span className="font-bold text-rose-600 tabular-nums">
            {formatPaise(metrics.overdue_balance_paise || 0)}
          </span>
        </div>
      </div>
    </div>
  );
};
