import React, { useEffect } from "react";
import { X, FileText, CheckCircle2, ShieldCheck, Clock, Receipt, Tag } from "lucide-react";
import { formatPaise, formatDateDisplay, getStatusBadgeConfig } from "./ledgerFormatters";
import type {
  FeeObligationBreakdownItem,
  LedgerTransactionItem,
} from "../../../../types/studentFeeLedger";

interface Props {
  obligation: FeeObligationBreakdownItem | null;
  transaction: LedgerTransactionItem | null;
  onClose: () => void;
}

export const StudentLedgerDetailModal: React.FC<Props> = ({
  obligation,
  transaction,
  onClose,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!obligation && !transaction) return null;

  const title = obligation?.description || transaction?.description || "Financial Record Details";
  const category = obligation?.category || transaction?.category || "Fee";
  const billingPeriod = obligation?.billing_period || transaction?.billing_period || transaction?.period || "—";
  const academicYear = obligation?.academic_year || transaction?.academic_year || "2026–2027";
  const statusStr = obligation?.status || transaction?.payment_status || "Active";
  const badge = getStatusBadgeConfig(statusStr);

  const grossPaise = obligation
    ? obligation.original_amount_paise
    : transaction?.debit_paise || transaction?.credit_paise || 0;

  const waivedPaise = obligation
    ? obligation.waived_paise
    : transaction?.type === "concession" || transaction?.type === "waiver"
    ? transaction.credit_paise
    : 0;

  const netPaise = obligation
    ? (obligation.original_amount_paise - obligation.waived_paise)
    : (grossPaise - waivedPaise);

  const paidPaise = obligation
    ? obligation.paid_paise
    : transaction?.type === "payment"
    ? transaction.credit_paise
    : 0;

  const pendingPaise = obligation
    ? obligation.pending_paise
    : transaction?.running_balance_paise || 0;

  const dueDate = obligation?.due_date || transaction?.due_date;
  const refNo = transaction?.ref_no || (obligation ? `DUE-${obligation.id.slice(0, 8)}` : "—");

  const allocations = obligation?.allocations || transaction?.allocations || [];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="record-details-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-600" />
            <h3 id="record-details-title" className="font-bold text-sm text-slate-900">
              {obligation ? "Fee Obligation Details" : "Transaction Details"}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors"
            aria-label="Close details"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
          {/* Title & Metadata */}
          <div>
            <div className="text-base font-bold text-slate-900">{title}</div>
            <div className="flex flex-wrap items-center gap-2 mt-1.5 text-slate-500 font-medium">
              <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-semibold text-[11px]">
                {category}
              </span>
              <span>•</span>
              <span>Billing Period: {billingPeriod}</span>
              <span>•</span>
              <span>{academicYear}</span>
            </div>
          </div>

          {/* Financial Breakdown Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400">Original Gross</div>
              <div className="text-xs font-bold text-slate-900 tabular-nums mt-0.5">
                {formatPaise(grossPaise)}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400">Waived / Concession</div>
              <div className="text-xs font-bold text-teal-700 tabular-nums mt-0.5">
                {waivedPaise > 0 ? `-${formatPaise(waivedPaise)}` : "—"}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400">Paid Amount</div>
              <div className="text-xs font-bold text-emerald-700 tabular-nums mt-0.5">
                {paidPaise > 0 ? formatPaise(paidPaise) : "—"}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400">
                {obligation ? "Outstanding" : "Balance"}
              </div>
              <div className="text-xs font-bold text-amber-800 tabular-nums mt-0.5">
                {formatPaise(pendingPaise)}
              </div>
            </div>
          </div>

          {/* Payment & Allocation Details */}
          <div className="border border-slate-200 rounded-xl p-3.5 space-y-2.5">
            <div className="font-bold text-slate-900 flex items-center justify-between">
              <span>Settlement & Allocation Status</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${badge.className}`}>
                {badge.label}
              </span>
            </div>

            {allocations.length > 0 ? (
              <div className="space-y-1.5 pt-1">
                <div className="text-[11px] text-slate-500 font-medium">Linked Payment Receipts:</div>
                {allocations.map((alc, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2 rounded-lg bg-emerald-50/70 border border-emerald-100 text-[11px]"
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <div>
                        <span className="font-mono font-semibold text-slate-800">
                          {(alc as any).receipt_no || (alc as any).due_description}
                        </span>
                        {(alc as any).receipt_date && (
                          <span className="text-slate-500 ml-1.5">
                            ({formatDateDisplay((alc as any).receipt_date)})
                          </span>
                        )}
                        {(alc as any).payment_mode && (
                          <span className="text-slate-400 uppercase text-[10px] ml-1">
                            via {(alc as any).payment_mode}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="font-bold text-emerald-700 tabular-nums">
                      {formatPaise(alc.amount_paise)}
                    </span>
                  </div>
                ))}
              </div>
            ) : waivedPaise > 0 ? (
              <div className="p-2.5 rounded-lg bg-teal-50/70 border border-teal-200 text-teal-900 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold">Approved Concession Applied</div>
                  <div className="text-[11px] text-teal-700 mt-0.5">
                    This obligation was fully or partially waived pursuant to school/government quota rules.
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-slate-500 text-[11px] py-1">
                No payments have been allocated to this fee obligation yet.
              </div>
            )}
          </div>

          {/* Due Date & Reference Timeline */}
          <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <span className="text-slate-500">Official Due Date:</span>
              <div className="font-semibold text-slate-800 mt-0.5">
                {formatDateDisplay(dueDate)}
              </div>
            </div>
            <div>
              <span className="text-slate-500">Reference Number:</span>
              <div className="font-semibold text-slate-800 font-mono mt-0.5">
                {refNo}
              </div>
            </div>
          </div>

          {/* Audit & Technical Traceability */}
          <div className="p-3 bg-slate-100/70 rounded-xl border border-slate-200/80 space-y-1.5 text-[11px] text-slate-600">
            <div className="font-bold uppercase tracking-wider text-[10px] text-slate-500">
              Audit & System Traceability
            </div>
            <div className="flex justify-between">
              <span>Database Record ID:</span>
              <span className="font-mono text-slate-700">
                {obligation?.id || transaction?.raw_due_id || transaction?.id}
              </span>
            </div>
            {transaction?.internal_note && (
              <div>
                <span className="font-semibold text-slate-700">Audit Journal Note:</span>
                <div className="text-slate-600 font-mono text-[10px] mt-0.5 break-all">
                  {transaction.internal_note}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-200 hover:bg-slate-300 text-slate-700 cursor-pointer transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
