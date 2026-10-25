import React, { useState } from "react";
import {
  FileText,
  Printer,
  ChevronDown,
  ChevronRight,
  Calendar,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { formatPaise, formatDateDisplay, getStatusBadgeConfig } from "./ledgerFormatters";
import type { StudentInvoice } from "../../../../types/fees";

interface Props {
  invoices: StudentInvoice[];
  onPrintInvoice: (invoice: StudentInvoice) => void;
  onViewInvoiceDetails?: (invoice: StudentInvoice) => void;
}

export const StudentInvoicesTab: React.FC<Props> = ({
  invoices,
  onPrintInvoice,
  onViewInvoiceDetails,
}) => {
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedInvoiceId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="space-y-4">
      {/* Tab Header */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Issued Term Fee Invoices
          </h4>
          <p className="text-[11px] text-slate-500">
            Term-wise official invoices compiled from assigned fee structures and transport charges
          </p>
        </div>
        <span className="text-xs text-slate-500 font-medium">
          {invoices.length} invoice{invoices.length === 1 ? "" : "s"} issued
        </span>
      </div>

      {invoices.length === 0 ? (
        <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200 space-y-2">
          <FileText className="w-8 h-8 mx-auto text-slate-300" />
          <p className="text-xs font-semibold text-slate-700">No invoices issued for this student yet.</p>
          <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
            Fee invoices are generated term-wise from the student&apos;s assigned fee schedule or transport service.
          </p>
        </div>
      ) : (
        /* Compact Invoices Table/Rows */
        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[720px]">
              <thead className="bg-slate-50/90 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-2.5 px-3 w-8"></th>
                  <th className="py-2.5 px-3">Invoice #</th>
                  <th className="py-2.5 px-3">Billing Period</th>
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
                  const netPayable = inv.net_paise !== undefined ? inv.net_paise : (invoiceTotal - (inv.concession_paise || 0));

                  return (
                    <React.Fragment key={inv.id}>
                      <tr
                        className={`hover:bg-slate-50/70 transition-colors ${
                          isExpanded ? "bg-slate-50/60" : ""
                        }`}
                      >
                        {/* Toggle button */}
                        <td className="py-2.5 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => toggleExpand(inv.id)}
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

                        {/* Invoice Number */}
                        <td className="py-2.5 px-3 font-semibold text-slate-900 font-mono text-[11px]">
                          {inv.invoice_no}
                        </td>

                        {/* Billing Period */}
                        <td className="py-2.5 px-3 text-slate-600 text-[11px] whitespace-nowrap">
                          {inv.billing_period}
                        </td>

                        {/* Due Date */}
                        <td className="py-2.5 px-3 text-slate-600 text-[11px] whitespace-nowrap">
                          {formatDateDisplay(inv.due_date)}
                        </td>

                        {/* Total Amount */}
                        <td className="py-2.5 px-3 text-right font-medium text-slate-900 tabular-nums text-[11px]">
                          {formatPaise(netPayable)}
                          {inv.concession_paise > 0 && (
                            <span className="block text-[9px] text-teal-700 font-normal">
                              (Gross: {formatPaise(invoiceTotal)})
                            </span>
                          )}
                        </td>

                        {/* Paid */}
                        <td className="py-2.5 px-3 text-right font-medium text-emerald-700 tabular-nums text-[11px]">
                          {inv.paid_paise > 0 ? formatPaise(inv.paid_paise) : "—"}
                        </td>

                        {/* Balance */}
                        <td
                          className={`py-2.5 px-3 text-right font-bold tabular-nums text-[11px] ${
                            inv.balance_paise > 0
                              ? inv.status === "overdue"
                                ? "text-rose-600"
                                : "text-amber-800"
                              : "text-slate-400"
                          }`}
                        >
                          {formatPaise(inv.balance_paise)}
                        </td>

                        {/* Status */}
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${badge.className}`}
                          >
                            {badge.label}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => onPrintInvoice(inv)}
                              className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                              title="Print Invoice"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleExpand(inv.id)}
                              className="px-2 py-0.5 text-[10px] font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded transition-colors cursor-pointer"
                            >
                              {isExpanded ? "Hide Items" : "Line Items"}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expandable Line Items Table */}
                      {isExpanded && (
                        <tr className="bg-slate-50/90 border-b border-slate-200 animate-in fade-in duration-150">
                          <td colSpan={9} className="py-3 px-6">
                            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-2xs">
                              <div className="px-3 py-2 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between text-[11px] font-semibold text-slate-700">
                                <span>Invoice Breakdown ({inv.line_items?.length || 0} Components)</span>
                                <span>Issued for: {inv.billing_period}</span>
                              </div>
                              <table className="w-full text-left text-[11px]">
                                <thead className="text-[9px] uppercase tracking-wider bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                                  <tr>
                                    <th className="py-1.5 px-3">Fee Component</th>
                                    <th className="py-1.5 px-3 text-right">Gross</th>
                                    <th className="py-1.5 px-3 text-right">Concession</th>
                                    <th className="py-1.5 px-3 text-right">Net Payable</th>
                                    <th className="py-1.5 px-3 text-right">Paid</th>
                                    <th className="py-1.5 px-3 text-right">Balance</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {inv.line_items?.map((item) => (
                                    <tr key={item.due_id} className="hover:bg-slate-50/50">
                                      <td className="py-1.5 px-3 font-medium text-slate-800">
                                        <div className="flex items-center gap-1.5">
                                          <span>{item.fee_head_name}</span>
                                          {item.is_transport && (
                                            <span className="px-1 py-0.2 rounded text-[8px] bg-amber-100 text-amber-800 font-bold uppercase">
                                              Transport
                                            </span>
                                          )}
                                        </div>
                                      </td>
                                      <td className="py-1.5 px-3 text-right text-slate-600 tabular-nums">
                                        {formatPaise(item.gross_paise)}
                                      </td>
                                      <td className="py-1.5 px-3 text-right text-teal-700 tabular-nums">
                                        {item.concession_paise > 0 ? `-${formatPaise(item.concession_paise)}` : "—"}
                                      </td>
                                      <td className="py-1.5 px-3 text-right font-semibold text-slate-900 tabular-nums">
                                        {formatPaise(item.net_paise)}
                                      </td>
                                      <td className="py-1.5 px-3 text-right text-emerald-700 tabular-nums">
                                        {item.paid_paise > 0 ? formatPaise(item.paid_paise) : "—"}
                                      </td>
                                      <td className="py-1.5 px-3 text-right font-bold text-slate-900 tabular-nums">
                                        <span className={item.balance_paise > 0 ? "text-rose-600" : "text-slate-400"}>
                                          {formatPaise(item.balance_paise)}
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
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
