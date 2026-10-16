import React, { useState } from "react";
import {
  X,
  Printer,
  Download,
  Send,
  CreditCard,
  Ban,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  School,
  Bus,
  User,
  Calendar,
  Receipt,
  Phone,
  Loader2,
  Check,
} from "lucide-react";
import { formatPaise } from "../../../lib/amountInWords";
import { generateInvoiceHTML } from "../../../lib/invoiceTemplate";
import { sendInvoiceToParent } from "../../../services/invoiceService";
import type { StudentInvoice, InvoiceStatus } from "../../../types/fees";

interface InvoiceDetailsModalProps {
  invoice: StudentInvoice | null;
  isOpen: boolean;
  onClose: () => void;
  schoolBranding: {
    name: string;
    address?: string;
    phone?: string;
    email?: string;
    logo_url?: string;
    affiliation_no?: string;
  };
  onCancelInvoice?: (invoice: StudentInvoice) => void;
  onCollectPayment?: (invoice: StudentInvoice) => void;
}

export function InvoiceDetailsModal({
  invoice,
  isOpen,
  onClose,
  schoolBranding,
  onCancelInvoice,
  onCollectPayment,
}: InvoiceDetailsModalProps) {
  const [whatsappSent, setWhatsappSent] = useState(false);
  const [sendingWhatsapp, setSendingWhatsapp] = useState(false);

  if (!isOpen || !invoice) return null;

  const handlePrint = () => {
    const html = generateInvoiceHTML(invoice, {
      name: schoolBranding.name || "School",
      address: schoolBranding.address,
      phone: schoolBranding.phone,
      email: schoolBranding.email,
      logo_url: schoolBranding.logo_url,
      affiliation_no: schoolBranding.affiliation_no,
    });
    const w = window.open("", "_blank");
    if (w) {
      w.document.open();
      w.document.write(html);
      w.document.close();
    }
  };

  const handleSendWhatsApp = async () => {
    setSendingWhatsapp(true);
    const res = await sendInvoiceToParent(invoice.school_id, invoice.id, "whatsapp");
    setSendingWhatsapp(false);
    if (res.success) {
      setWhatsappSent(true);
    } else {
      alert(res.error || "Failed to dispatch WhatsApp notice.");
    }
  };

  const renderStatusBadge = (status: InvoiceStatus) => {
    switch (status) {
      case "paid":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Paid
          </span>
        );
      case "partial":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3.5 h-3.5" />
            Partially Paid
          </span>
        );
      case "overdue":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertCircle className="w-3.5 h-3.5" />
            Overdue
          </span>
        );
      case "cancelled":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
            <Ban className="w-3.5 h-3.5" />
            Cancelled / Void
          </span>
        );
      case "unpaid":
      default:
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-orange-50 text-orange-700 border border-orange-200">
            <Clock className="w-3.5 h-3.5" />
            Pending
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={onClose} />

      <div className="relative bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden z-10 animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">{invoice.invoice_no}</h3>
                {renderStatusBadge(invoice.status)}
              </div>
              <p className="text-[11px] text-slate-500">
                Issued on {invoice.invoice_date} • Due on {invoice.due_date}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Student & Guardian Profile */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#F8FAFC] border border-slate-200/80 rounded-2xl p-4 text-xs">
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Student Information
              </span>
              <div className="font-bold text-slate-900 text-sm">{invoice.student_name}</div>
              <div className="text-slate-500 mt-0.5">
                Adm No: <span className="font-semibold text-slate-700">{invoice.admission_no}</span>
              </div>
              <div className="text-slate-500">
                Class: <span className="font-semibold text-slate-700">{invoice.class_name}</span>{" "}
                {invoice.section_name && `(${invoice.section_name})`}
              </div>
            </div>

            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Parent / Billing Info
              </span>
              <div className="font-semibold text-slate-800">{invoice.guardian_name || "Parent"}</div>
              {invoice.guardian_phone && (
                <div className="text-slate-500 flex items-center gap-1 mt-0.5">
                  <Phone className="w-3 h-3 text-slate-400" />
                  <span>{invoice.guardian_phone}</span>
                </div>
              )}
              <div className="text-slate-500 mt-0.5">
                Billing Period: <span className="font-semibold text-slate-700">{invoice.billing_period}</span>
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
            <div className="px-4 py-2.5 bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-700">
              Fee Components Breakdown
            </div>
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/50 text-[11px] text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="py-2.5 px-4">Component</th>
                  <th className="py-2.5 px-3 text-right">Gross</th>
                  <th className="py-2.5 px-3 text-right">Concession</th>
                  <th className="py-2.5 px-4 text-right">Net Demand</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoice.line_items && invoice.line_items.length > 0 ? (
                  invoice.line_items.map((li, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/40">
                      <td className="py-2.5 px-4 font-medium text-slate-900">
                        {li.fee_head_name}
                        {li.is_transport && (
                          <span className="ml-1.5 inline-block text-[10px] bg-amber-50 text-amber-700 px-1 rounded border border-amber-200">
                            Bus
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-600">{formatPaise(li.gross_paise)}</td>
                      <td className="py-2.5 px-3 text-right text-emerald-700">
                        {li.concession_paise > 0 ? `- ${formatPaise(li.concession_paise)}` : "—"}
                      </td>
                      <td className="py-2.5 px-4 text-right font-semibold text-slate-900">
                        {formatPaise(li.net_paise)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="py-2.5 px-4 font-medium text-slate-900">Tuition & Academic Fees</td>
                    <td className="py-2.5 px-3 text-right text-slate-600">{formatPaise(invoice.gross_paise)}</td>
                    <td className="py-2.5 px-3 text-right text-emerald-700">
                      {invoice.concession_paise > 0 ? `- ${formatPaise(invoice.concession_paise)}` : "—"}
                    </td>
                    <td className="py-2.5 px-4 text-right font-semibold text-slate-900">
                      {formatPaise(invoice.total_paise)}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Subtotal & Balance Summary Box */}
            <div className="p-4 bg-slate-50/70 border-t border-slate-200 space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-600">
                <span>Total Invoiced Demand:</span>
                <span className="font-semibold text-slate-800">{formatPaise(invoice.total_paise)}</span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>Paid Amount:</span>
                <span className="font-semibold text-emerald-700">{formatPaise(invoice.paid_paise)}</span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-sm font-bold">
                <span className="text-slate-900">Outstanding Balance Due:</span>
                <span className={`text-base ${invoice.balance_paise > 0 ? "text-rose-700" : "text-emerald-700"}`}>
                  {formatPaise(invoice.balance_paise)}
                </span>
              </div>
            </div>
          </div>

          {/* Linked Payments & Receipts */}
          {invoice.payments && invoice.payments.length > 0 && (
            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
              <div className="px-4 py-2 bg-emerald-50/60 border-b border-emerald-100 text-xs font-semibold text-emerald-900 flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5 text-emerald-700" />
                <span>Linked Payment Receipts ({invoice.payments.length})</span>
              </div>
              <div className="divide-y divide-slate-100 text-xs">
                {invoice.payments.map((p, i) => (
                  <div key={i} className="p-3 flex items-center justify-between hover:bg-slate-50">
                    <div>
                      <span className="font-bold text-slate-900">{p.receipt_no}</span>
                      <div className="text-[11px] text-slate-400">
                        {p.receipt_date} • Mode: {p.payment_mode.toUpperCase()}
                      </div>
                    </div>
                    <span className="font-bold text-emerald-800">{formatPaise(p.amount_paise)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            {invoice.status !== "cancelled" && invoice.paid_paise === 0 && onCancelInvoice && (
              <button
                type="button"
                onClick={() => onCancelInvoice(invoice)}
                className="flex items-center gap-1 px-3 py-2 text-rose-700 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold hover:bg-rose-100 cursor-pointer transition-colors"
              >
                <Ban className="w-3.5 h-3.5" />
                <span>Void Invoice</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span>Print / PDF</span>
            </button>

            <button
              type="button"
              onClick={handleSendWhatsApp}
              disabled={sendingWhatsapp || whatsappSent}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-semibold hover:bg-emerald-100 disabled:opacity-50 cursor-pointer shadow-2xs"
            >
              {sendingWhatsapp ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : whatsappSent ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              <span>{whatsappSent ? "Sent to WhatsApp" : "Send WhatsApp"}</span>
            </button>

            {invoice.balance_paise > 0 && onCollectPayment && (
              <button
                type="button"
                onClick={() => onCollectPayment(invoice)}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#047857] text-white rounded-xl text-xs font-semibold hover:bg-emerald-800 cursor-pointer shadow-xs"
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Collect Fee</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
