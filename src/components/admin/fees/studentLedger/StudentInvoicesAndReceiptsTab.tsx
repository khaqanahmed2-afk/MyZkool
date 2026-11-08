import React, { useState } from "react";
import {
  FileText,
  Receipt,
  Printer,
  ChevronRight,
  ExternalLink,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Clock,
} from "lucide-react";
import { formatPaise, formatDateDisplay, getStatusBadgeConfig } from "./ledgerFormatters";
import type { StudentInvoice } from "../../../../types/fees";

interface PaymentItem {
  id: string;
  receipt_no: string;
  receipt_date: string;
  total_paise: number;
  payment_mode: string;
  collected_by_name?: string;
  remarks?: string;
  allocations?: Array<{
    due_id?: string;
    due_description?: string;
    amount_paise: number;
    billing_period?: string;
  }>;
}

interface Props {
  invoices: StudentInvoice[];
  payments: PaymentItem[];
  onPrintInvoice: (invoice: StudentInvoice) => void;
  onPrintReceipt: (payment: PaymentItem) => void;
  onCollectPayment?: () => void;
}

/**
 * Unified Invoices & Receipts Tab
 *
 * Provides a consolidated billing documents center for term invoices
 * and official fee receipts.
 */
export const StudentInvoicesAndReceiptsTab: React.FC<Props> = ({
  invoices,
  payments,
  onPrintInvoice,
  onPrintReceipt,
  onCollectPayment,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<"invoices" | "receipts">("invoices");
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<string | null>(null);
  const [expandedPaymentId, setExpandedPaymentId] = useState<string | null>(null);

  const toggleInvoice = (id: string) => {
    setExpandedInvoiceId((prev) => (prev === id ? null : id));
  };

  const togglePayment = (id: string) => {
    setExpandedPaymentId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="space-y-4">
      {/* Top Header & Segmented Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Billing Documents (Invoices & Receipts)
          </h4>
          <p className="text-[11px] text-slate-500">
            Official term-wise fee invoices and verified payment receipt vouchers
          </p>
        </div>

        {/* Segmented Switcher */}
        <div className="flex items-center p-1 bg-slate-100 rounded-xl text-xs font-semibold self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveSubTab("invoices")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              activeSubTab === "invoices"
                ? "bg-white text-blue-700 shadow-2xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Invoices</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200/70 text-slate-700 font-mono">
              {invoices.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab("receipts")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              activeSubTab === "receipts"
                ? "bg-white text-blue-700 shadow-2xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Receipts</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200/70 text-slate-700 font-mono">
              {payments.length}
            </span>
          </button>
        </div>
      </div>

      {/* View 1: Invoices */}
      {activeSubTab === "invoices" && (
        <div className="space-y-3">
          {invoices.length === 0 ? (
            <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200 space-y-1.5">
              <FileText className="w-7 h-7 mx-auto text-slate-300" />
              <p className="text-xs font-semibold text-slate-700">No invoices issued for this student yet.</p>
              <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                Term invoices are generated from assigned fee structures and transport charges.
              </p>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs bg-white">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[700px]">
                  <thead className="bg-slate-50/90 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3 w-8"></th>
                      <th className="py-2.5 px-3">Invoice #</th>
                      <th className="py-2.5 px-3">Billing Period</th>
                      <th className="py-2.5 px-3">Issue Date</th>
                      <th className="py-2.5 px-3">Due Date</th>
                      <th className="py-2.5 px-3 text-right">Total Amount</th>
                      <th className="py-2.5 px-3 text-right">Paid</th>
                      <th className="py-2.5 px-3 text-right">Balance</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {invoices.map((inv) => {
                      const isExpanded = expandedInvoiceId === inv.id;
                      const badge = getStatusBadgeConfig(inv.status);
                      const invoiceTotal = inv.gross_paise || inv.total_paise || 0;
                      const netPayable =
                        inv.net_paise !== undefined
                          ? inv.net_paise
                          : invoiceTotal - (inv.concession_paise || 0);

                      return (
                        <React.Fragment key={inv.id}>
                          <tr className={`hover:bg-slate-50/70 transition-colors ${isExpanded ? "bg-slate-50/60" : ""}`}>
                            <td className="py-2.5 px-2 text-center">
                              <button
                                type="button"
                                onClick={() => toggleInvoice(inv.id)}
                                className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
                                title={isExpanded ? "Hide line items" : `View ${inv.line_items?.length || 0} line items`}
                              >
                                <ChevronRight
                                  className={`w-3.5 h-3.5 transition-transform duration-150 ${
                                    isExpanded ? "rotate-90 text-blue-600" : ""
                                  }`}
                                />
                              </button>
                            </td>
                            <td className="py-2.5 px-3 font-mono font-bold text-slate-800 text-[11px]">
                              {inv.invoice_number}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 text-[11px]">
                              {inv.term_name || "Annual Session"}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 text-[11px] whitespace-nowrap">
                              {formatDateDisplay(inv.issue_date)}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 text-[11px] whitespace-nowrap">
                              {formatDateDisplay(inv.due_date)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-medium text-slate-800 tabular-nums text-[11px]">
                              {formatPaise(netPayable)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-medium text-emerald-700 tabular-nums text-[11px]">
                              {inv.paid_paise > 0 ? formatPaise(inv.paid_paise) : "—"}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-amber-800 tabular-nums text-[11px]">
                              {formatPaise(inv.balance_paise)}
                            </td>
                            <td className="py-2.5 px-3 text-center whitespace-nowrap">
                              <span
                                className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${badge.className}`}
                              >
                                {badge.label}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <button
                                type="button"
                                onClick={() => onPrintInvoice(inv)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-slate-600 hover:text-blue-700 hover:bg-blue-50/70 rounded-md border border-slate-200 text-[11px] font-medium transition-colors cursor-pointer"
                                title="Print Invoice"
                              >
                                <Printer className="w-3 h-3" />
                                <span>Print</span>
                              </button>
                            </td>
                          </tr>

                          {/* Line items accordion */}
                          {isExpanded && (
                            <tr>
                              <td colSpan={10} className="p-3 bg-slate-50/80 border-t border-b border-slate-200">
                                <div className="space-y-2">
                                  <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                                    Invoice Itemization & Dues Breakdown
                                  </div>
                                  <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                                    <table className="w-full text-left text-xs">
                                      <thead className="bg-slate-100/80 text-slate-600 font-bold uppercase text-[9px]">
                                        <tr>
                                          <th className="py-1.5 px-3">Description</th>
                                          <th className="py-1.5 px-3 text-right">Gross</th>
                                          <th className="py-1.5 px-3 text-right">Concession</th>
                                          <th className="py-1.5 px-3 text-right">Net Payable</th>
                                          <th className="py-1.5 px-3 text-right">Paid</th>
                                          <th className="py-1.5 px-3 text-right">Balance</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100 text-[11px]">
                                        {(inv.line_items || []).map((li: any, idx: number) => (
                                          <tr key={idx} className="hover:bg-slate-50">
                                            <td className="py-1.5 px-3 font-medium text-slate-800">
                                              {li.fee_head_name || li.head_name || "Fee Obligation"}
                                            </td>
                                            <td className="py-1.5 px-3 text-right tabular-nums text-slate-600">
                                              {formatPaise(li.gross_amount_paise || li.amount_paise || 0)}
                                            </td>
                                            <td className="py-1.5 px-3 text-right tabular-nums text-teal-700">
                                              {li.concession_paise > 0 ? `-${formatPaise(li.concession_paise)}` : "—"}
                                            </td>
                                            <td className="py-1.5 px-3 text-right tabular-nums font-semibold text-slate-900">
                                              {formatPaise(li.net_amount_paise || li.amount_paise || 0)}
                                            </td>
                                            <td className="py-1.5 px-3 text-right tabular-nums text-emerald-700">
                                              {li.paid_paise > 0 ? formatPaise(li.paid_paise) : "—"}
                                            </td>
                                            <td className="py-1.5 px-3 text-right tabular-nums font-bold text-amber-800">
                                              {formatPaise(li.balance_paise || 0)}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
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
      )}

      {/* View 2: Receipts */}
      {activeSubTab === "receipts" && (
        <div className="space-y-3">
          {payments.length === 0 ? (
            <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200 space-y-1.5">
              <Receipt className="w-7 h-7 mx-auto text-slate-300" />
              <p className="text-xs font-semibold text-slate-700">No payment receipts recorded yet.</p>
              <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                Official receipts will be displayed here as payments are collected.
              </p>
              {onCollectPayment && (
                <button
                  type="button"
                  onClick={onCollectPayment}
                  className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors cursor-pointer"
                >
                  Collect Payment
                </button>
              )}
            </div>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs bg-white">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[650px]">
                  <thead className="bg-slate-50/90 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3 w-8"></th>
                      <th className="py-2.5 px-3">Receipt #</th>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Payment Mode</th>
                      <th className="py-2.5 px-3 text-right">Amount Paid</th>
                      <th className="py-2.5 px-3">Collected By</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payments.map((p) => {
                      const isExpanded = expandedPaymentId === p.id;
                      const allocations = p.allocations || [];

                      return (
                        <React.Fragment key={p.id}>
                          <tr className={`hover:bg-slate-50/70 transition-colors ${isExpanded ? "bg-slate-50/60" : ""}`}>
                            <td className="py-2.5 px-2 text-center">
                              <button
                                type="button"
                                onClick={() => togglePayment(p.id)}
                                className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
                                title={isExpanded ? "Hide line items" : `View ${allocations.length} line allocations`}
                              >
                                <ChevronRight
                                  className={`w-3.5 h-3.5 transition-transform duration-150 ${
                                    isExpanded ? "rotate-90 text-blue-600" : ""
                                  }`}
                                />
                              </button>
                            </td>
                            <td className="py-2.5 px-3 font-mono font-bold text-slate-800 text-[11px]">
                              {p.receipt_no}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 text-[11px] whitespace-nowrap">
                              {formatDateDisplay(p.receipt_date)}
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 uppercase">
                                {p.payment_mode}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-emerald-700 tabular-nums text-[11px]">
                              {formatPaise(p.total_paise)}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 text-[11px]">
                              {p.collected_by_name || "School Office"}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <button
                                type="button"
                                onClick={() => onPrintReceipt(p)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-slate-600 hover:text-blue-700 hover:bg-blue-50/70 rounded-md border border-slate-200 text-[11px] font-medium transition-colors cursor-pointer"
                                title="Print Receipt"
                              >
                                <Printer className="w-3 h-3" />
                                <span>Print</span>
                              </button>
                            </td>
                          </tr>

                          {/* Allocations accordion */}
                          {isExpanded && (
                            <tr>
                              <td colSpan={7} className="p-3 bg-slate-50/80 border-t border-b border-slate-200">
                                <div className="space-y-2">
                                  <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                                    Payment Allocations Across Fee Dues
                                  </div>
                                  {allocations.length === 0 ? (
                                    <div className="p-2.5 text-center text-slate-400 bg-white rounded border border-slate-200 text-[11px]">
                                      No itemized line allocations recorded for this receipt.
                                    </div>
                                  ) : (
                                    <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                                      <table className="w-full text-left text-xs">
                                        <thead className="bg-slate-100/80 text-slate-600 font-bold uppercase text-[9px]">
                                          <tr>
                                            <th className="py-1.5 px-3">Obligation Description</th>
                                            <th className="py-1.5 px-3">Billing Period</th>
                                            <th className="py-1.5 px-3 text-right">Allocated Amount</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 text-[11px]">
                                          {allocations.map((a: any, idx: number) => (
                                            <tr key={idx} className="hover:bg-slate-50">
                                              <td className="py-1.5 px-3 font-medium text-slate-800">
                                                {a.due_description || "Fee Due Component"}
                                              </td>
                                              <td className="py-1.5 px-3 text-slate-600">
                                                {a.billing_period || "—"}
                                              </td>
                                              <td className="py-1.5 px-3 text-right tabular-nums font-bold text-emerald-700">
                                                {formatPaise(a.amount_paise || 0)}
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  )}
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
      )}
    </div>
  );
};

