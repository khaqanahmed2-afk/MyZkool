import React from "react";
import { X, Printer, FileText, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import type { StudentInvoice } from "../../../types/fees";
import { generateInvoiceHTML } from "../../../lib/invoiceTemplate";

interface InvoiceDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: StudentInvoice | null;
  schoolName: string;
}

export function InvoiceDetailModal({
  isOpen,
  onClose,
  invoice,
  schoolName,
}: InvoiceDetailModalProps) {
  if (!isOpen || !invoice) return null;

  const handlePrint = () => {
    const html = generateInvoiceHTML(invoice, { name: schoolName || "Sunrise International School" });
    const win = window.open("", "_blank");
    if (win) {
      win.document.write(html);
      win.document.close();
      win.focus();
      win.print();
    }
  };

  const getStatusBadge = () => {
    if (invoice.status === "paid") {
      return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">Paid in Full</span>;
    }
    if (invoice.status === "overdue") {
      return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200">Overdue</span>;
    }
    if (invoice.status === "partial") {
      return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">Partially Paid</span>;
    }
    return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">Pending</span>;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-2xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E6EAF3] flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-[#141A2E]">{invoice.invoice_no}</h3>
                {getStatusBadge()}
              </div>
              <p className="text-[11px] text-[#5B6478]">
                {invoice.student_name} • {invoice.class_name} • {invoice.admission_no}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#E6EAF3] hover:bg-slate-50 text-[#141A2E] text-xs font-semibold rounded-xl"
            >
              <Printer className="w-3.5 h-3.5" /> Print
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          {/* Metadata Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
            <div>
              <span className="text-[10px] text-gray-400 font-semibold uppercase">Billing Period</span>
              <p className="font-bold text-[#141A2E]">{invoice.billing_period || "Annual"}</p>
            </div>
            <div>
              <span className="text-[10px] text-gray-400 font-semibold uppercase">Invoice Date</span>
              <p className="font-bold text-[#141A2E]">{invoice.invoice_date || "-"}</p>
            </div>
            <div>
              <span className="text-[10px] text-gray-400 font-semibold uppercase">Due Date</span>
              <p className="font-bold text-red-600">{invoice.due_date || "-"}</p>
            </div>
            <div>
              <span className="text-[10px] text-gray-400 font-semibold uppercase">Parent / Phone</span>
              <p className="font-bold text-[#141A2E] truncate">{invoice.guardian_phone || "-"}</p>
            </div>
          </div>

          {/* Line items table */}
          <div>
            <h4 className="font-bold text-[#141A2E] mb-2">Invoice Components</h4>
            <div className="border border-[#E6EAF3] rounded-xl overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-[#E6EAF3] text-[11px] font-semibold text-[#5B6478]">
                    <th className="py-2.5 px-3">Fee Head</th>
                    <th className="py-2.5 px-3 text-right">Gross</th>
                    <th className="py-2.5 px-3 text-right">Concession</th>
                    <th className="py-2.5 px-3 text-right">Net Payable</th>
                    <th className="py-2.5 px-3 text-right">Paid</th>
                    <th className="py-2.5 px-3 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E6EAF3]">
                  {invoice.line_items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3">
                        <p className="font-semibold text-[#141A2E]">{item.fee_head_name}</p>
                        {item.description && <p className="text-[10px] text-gray-400">{item.description}</p>}
                      </td>
                      <td className="py-2.5 px-3 text-right text-gray-500">₹{(item.gross_paise / 100).toLocaleString("en-IN")}</td>
                      <td className="py-2.5 px-3 text-right text-emerald-600">
                        {item.concession_paise > 0 ? `-₹${(item.concession_paise / 100).toLocaleString("en-IN")}` : "—"}
                      </td>
                      <td className="py-2.5 px-3 text-right font-medium text-[#141A2E]">₹{(item.net_paise / 100).toLocaleString("en-IN")}</td>
                      <td className="py-2.5 px-3 text-right text-emerald-700">₹{(item.paid_paise / 100).toLocaleString("en-IN")}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-red-600">₹{(item.balance_paise / 100).toLocaleString("en-IN")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Payment History */}
          {invoice.payments && invoice.payments.length > 0 && (
            <div>
              <h4 className="font-bold text-[#141A2E] mb-2">Payments Received</h4>
              <div className="border border-[#E6EAF3] rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-[#E6EAF3] text-[11px] font-semibold text-[#5B6478]">
                      <th className="py-2 px-3">Receipt No</th>
                      <th className="py-2 px-3">Date</th>
                      <th className="py-2 px-3">Mode</th>
                      <th className="py-2 px-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E6EAF3]">
                    {invoice.payments.map((p, idx) => (
                      <tr key={idx}>
                        <td className="py-2 px-3 font-semibold text-blue-600">{p.receipt_no}</td>
                        <td className="py-2 px-3 text-gray-600">{p.receipt_date}</td>
                        <td className="py-2 px-3 capitalize text-gray-600">{p.payment_mode}</td>
                        <td className="py-2 px-3 text-right font-bold text-emerald-700">₹{(p.amount_paise / 100).toLocaleString("en-IN")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Financial Summary Box */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex justify-between text-gray-600">
              <span>Gross Fee Total:</span>
              <span>₹{(invoice.gross_paise / 100).toLocaleString("en-IN")}</span>
            </div>
            {invoice.concession_paise > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>Total Concession:</span>
                <span>-₹{(invoice.concession_paise / 100).toLocaleString("en-IN")}</span>
              </div>
            )}
            <div className="flex justify-between text-[#141A2E] font-medium pt-1 border-t border-slate-200">
              <span>Net Invoiced Amount:</span>
              <span>₹{((invoice.total_paise || (invoice.gross_paise - invoice.concession_paise)) / 100).toLocaleString("en-IN")}</span>
            </div>
            <div className="flex justify-between text-emerald-700 font-medium">
              <span>Total Amount Paid:</span>
              <span>₹{(invoice.paid_paise / 100).toLocaleString("en-IN")}</span>
            </div>
            <div className="flex justify-between text-[#141A2E] font-bold text-sm pt-2 border-t border-slate-200">
              <span>Outstanding Balance Due:</span>
              <span className="text-red-600">₹{(invoice.balance_paise / 100).toLocaleString("en-IN")}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#E6EAF3] bg-slate-50 flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-white border border-[#E6EAF3] rounded-xl text-xs font-semibold text-[#5B6478] hover:bg-slate-100"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
