import React, { useState } from "react";
import {
  Receipt,
  Printer,
  CheckCircle2,
  Calendar,
  CreditCard,
  ChevronDown,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { formatPaise, formatDateDisplay } from "./ledgerFormatters";
import type { PaymentMode } from "../../../../types/collection";

interface PaymentItem {
  id: string;
  receipt_no: string;
  receipt_date: string;
  total_paise: number;
  payment_mode: PaymentMode;
  collected_by_name?: string;
  remarks?: string;
  allocations?: Array<{
    due_id?: string;
    due_description?: string;
    amount_paise: number;
    billing_period?: string;
  }>;
}

interface UnreceiptedSettlement {
  total_settled_paise: number;
  status: 'legacy_settlement' | 'unbacked_allocations';
  description: string;
  settled_dues: Array<{
    due_id: string;
    due_description: string;
    paid_paise: number;
    billing_period: string;
  }>;
}

interface Props {
  payments: PaymentItem[];
  unreceiptedSettlement?: UnreceiptedSettlement;
  onPrintReceipt: (payment: PaymentItem) => void;
  onCollectPayment: () => void;
}

export const StudentPaymentsTab: React.FC<Props> = ({
  payments,
  unreceiptedSettlement,
  onPrintReceipt,
  onCollectPayment,
}) => {
  const [expandedPaymentId, setExpandedPaymentId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedPaymentId((prev) => (prev === id ? null : id));
  };

  const hasUnreceipted = Boolean(unreceiptedSettlement && unreceiptedSettlement.total_settled_paise > 0);

  return (
    <div className="space-y-4">
      {/* Tab Header */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Official Payment Receipts & Allocations
          </h4>
          <p className="text-[11px] text-slate-500">
            Recorded receipts and audited historical settlements against assessed fee obligations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium">
            {payments.length} receipt{payments.length === 1 ? "" : "s"} recorded
          </span>
          <button
            type="button"
            onClick={onCollectPayment}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors cursor-pointer shadow-2xs"
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Collect Payment</span>
          </button>
        </div>
      </div>

      {/* Audited Legacy / Direct Settlements Reconciliation Section */}
      {hasUnreceipted && unreceiptedSettlement && (
        <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-bold text-xs text-emerald-950">
                Audited Fee Settlements (Direct & Legacy Allocations)
              </span>
            </div>
            <span className="font-bold text-xs text-emerald-700 tabular-nums">
              Total Settled: {formatPaise(unreceiptedSettlement.total_settled_paise)}
            </span>
          </div>

          <p className="text-[11px] text-emerald-800 leading-relaxed">
            {unreceiptedSettlement.description} These allocations directly reduce the student&apos;s assessed fee liabilities.
            {payments.length === 0 && (
              <span className="block mt-1 font-medium text-emerald-900">
                Note: No standalone receipt vouchers exist for these historical settlements. They are accounted for directly in the obligation ledger below:
              </span>
            )}
          </p>

          <div className="border border-emerald-200/80 rounded-lg overflow-hidden bg-white">
            <table className="w-full text-left text-xs">
              <thead className="bg-emerald-100/40 text-emerald-900 font-semibold text-[10px] uppercase">
                <tr>
                  <th className="py-2 px-3">Obligation Description</th>
                  <th className="py-2 px-3">Billing Period</th>
                  <th className="py-2 px-3 text-right">Settled Amount</th>
                  <th className="py-2 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-50">
                {unreceiptedSettlement.settled_dues.map((s) => (
                  <tr key={s.due_id} className="hover:bg-emerald-50/30">
                    <td className="py-2 px-3 font-medium text-slate-800 text-[11px]">
                      {s.due_description}
                    </td>
                    <td className="py-2 px-3 text-slate-600 text-[11px]">
                      {s.billing_period}
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-emerald-700 tabular-nums text-[11px]">
                      {formatPaise(s.paid_paise)}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <span className="inline-block px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-emerald-100 text-emerald-800">
                        Settled
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {payments.length === 0 ? (
        !hasUnreceipted ? (
          <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200 space-y-2">
            <Receipt className="w-8 h-8 mx-auto text-slate-300" />
            <p className="text-xs font-semibold text-slate-700">No fee payments recorded for this student yet.</p>
            <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
              When a counter payment or online payment is collected, the receipt reference, mode, and line allocations appear here.
            </p>
            <button
              type="button"
              onClick={onCollectPayment}
              className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors cursor-pointer shadow-2xs"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Collect Payment</span>
            </button>
          </div>
        ) : null
      ) : (
        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[700px]">
              <thead className="bg-slate-50/90 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-2.5 px-3 w-8"></th>
                  <th className="py-2.5 px-3">Receipt #</th>
                  <th className="py-2.5 px-3">Payment Date</th>
                  <th className="py-2.5 px-3">Payment Mode</th>
                  <th className="py-2.5 px-3 text-right">Amount Received</th>
                  <th className="py-2.5 px-3">Allocation Status</th>
                  <th className="py-2.5 px-3">Collected By</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map((p) => {
                  const isExpanded = expandedPaymentId === p.id;
                  const allocations = p.allocations || [];
                  const isAllocated = allocations.length > 0;

                  return (
                    <React.Fragment key={p.id}>
                      <tr
                        className={`hover:bg-slate-50/70 transition-colors ${
                          isExpanded ? "bg-slate-50/60" : ""
                        }`}
                      >
                        {/* Toggle expand */}
                        <td className="py-2.5 px-2 text-center">
                          {isAllocated ? (
                            <button
                              type="button"
                              onClick={() => toggleExpand(p.id)}
                              className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
                              title={isExpanded ? "Hide allocation details" : `View ${allocations.length} allocations`}
                            >
                              <ChevronRight
                                className={`w-3.5 h-3.5 transition-transform duration-150 ${
                                  isExpanded ? "rotate-90 text-blue-600" : ""
                                }`}
                              />
                            </button>
                          ) : (
                            <span className="w-3.5 h-3.5 inline-block" />
                          )}
                        </td>

                        {/* Receipt No */}
                        <td className="py-2.5 px-3 font-semibold text-slate-900 font-mono text-[11px]">
                          {p.receipt_no}
                        </td>

                        {/* Payment Date */}
                        <td className="py-2.5 px-3 text-slate-600 text-[11px] whitespace-nowrap">
                          {formatDateDisplay(p.receipt_date)}
                        </td>

                        {/* Payment Mode */}
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-blue-50 text-blue-700 border border-blue-200/60">
                            {p.payment_mode}
                          </span>
                        </td>

                        {/* Amount Received */}
                        <td className="py-2.5 px-3 text-right font-bold text-emerald-700 tabular-nums text-[11px]">
                          {formatPaise(p.total_paise)}
                        </td>

                        {/* Allocation Status */}
                        <td className="py-2.5 px-3 text-[11px]">
                          {isAllocated ? (
                            <span className="inline-flex items-center gap-1 font-medium text-emerald-700">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>{allocations.length} obligation{allocations.length === 1 ? "" : "s"} settled</span>
                            </span>
                          ) : (
                            <span className="text-sky-700 font-medium">Unallocated / Advance Deposit</span>
                          )}
                        </td>

                        {/* Collected By */}
                        <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                          {p.collected_by_name || "School Office"}
                        </td>

                        {/* Actions */}
                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => onPrintReceipt(p)}
                              className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                              title="Print Receipt"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                            {isAllocated && (
                              <button
                                type="button"
                                onClick={() => toggleExpand(p.id)}
                                className="px-2 py-0.5 text-[10px] font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded transition-colors cursor-pointer"
                              >
                                {isExpanded ? "Hide" : "Allocations"}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Expandable Allocations Breakdown */}
                      {isExpanded && isAllocated && (
                        <tr className="bg-slate-50/90 border-b border-slate-200 animate-in fade-in duration-150">
                          <td colSpan={8} className="py-3 px-6">
                            <div className="bg-white rounded-lg border border-slate-200 p-3 space-y-2 shadow-2xs">
                              <div className="text-[11px] font-semibold text-slate-700 flex items-center justify-between">
                                <span>Obligation Settlements for Receipt {p.receipt_no}:</span>
                                <span className="font-bold text-emerald-700 tabular-nums">
                                  Total: {formatPaise(p.total_paise)}
                                </span>
                              </div>

                              <div className="divide-y divide-slate-100">
                                {allocations.map((alc, i) => (
                                  <div
                                    key={i}
                                    className="py-1.5 flex items-center justify-between text-[11px]"
                                  >
                                    <div className="flex items-center gap-2">
                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                      <span className="font-medium text-slate-800">
                                        {alc.due_description || "Assessed Due"}
                                      </span>
                                      {alc.billing_period && (
                                        <span className="text-slate-400">
                                          ({alc.billing_period})
                                        </span>
                                      )}
                                    </div>
                                    <span className="font-bold text-emerald-700 tabular-nums">
                                      {formatPaise(alc.amount_paise)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
