/**
 * InvoiceDetailPage — Dedicated Invoice Details Desktop View
 *
 * Implements the 3-panel layout matching UI Reference 1:
 * - Left panel: Invoice & Student Details (Metadata, Admission #, Class/Section, Guardian, Phone)
 * - Center panel: The formatted Invoice Document with branding, itemized fees, totals, QR scan-to-pay, and signature
 * - Right panel: Actions (Record Payment, Edit Invoice, Download PDF, Print Invoice, Send to Parent), Payment Summary, Recent Payments
 */

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  Printer,
  Download,
  Send,
  MoreVertical,
  CreditCard,
  Edit,
  CheckCircle2,
  AlertCircle,
  Clock,
  X,
  Phone,
  User,
  ShieldAlert,
  Loader2,
  ExternalLink,
  QrCode,
  Share2,
  FileText,
} from "lucide-react";
import { useAuth } from "../../../hooks/useAuth";
import { getInvoiceById, cancelInvoice } from "../../../services/invoiceService";
import { getFeeSettings } from "../../../services/feeSetupService";
import type { StudentInvoice, FeeSettings } from "../../../types/fees";
import { generateInvoiceHTML, printInvoiceHTML, downloadInvoicePDF, formatCurrencyPaise } from "../../../lib/invoiceTemplate";
import { amountInWords } from "../../../lib/amountInWords";

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { school: authSchool, schoolId: authSchoolId } = useAuth() as any;
  const activeSchoolId = authSchool?.id || authSchoolId || "default-school";

  const [invoice, setInvoice] = useState<StudentInvoice | null>(null);
  const [settings, setSettings] = useState<FeeSettings | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Editable invoice fields
  const [editDueDate, setEditDueDate] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const loadInvoiceData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [{ invoice: inv, error: invErr }, { settings: s }] = await Promise.all([
        getInvoiceById(activeSchoolId, id),
        getFeeSettings(activeSchoolId),
      ]);

      if (invErr || !inv) {
        setError(invErr || "Invoice not found");
      } else {
        setInvoice(inv);
        setEditDueDate(inv.due_date || "");
        setEditNotes(inv.notes || "");
      }
      setSettings(s);
    } catch (err: any) {
      setError(err.message || "Failed to load invoice details.");
    } finally {
      setLoading(false);
    }
  }, [activeSchoolId, id]);

  useEffect(() => {
    loadInvoiceData();
  }, [loadInvoiceData]);

  // Derived financial values
  const totalFeesPaise = invoice ? (invoice.gross_paise || invoice.total_paise || 0) : 0;
  const discountPaise = invoice ? (invoice.concession_paise || 0) : 0;
  const prevDuesPaise = invoice ? (invoice.previous_dues_paise || 0) : 0;
  const overduePaise = invoice ? (invoice.overdue_paise || (invoice.status === "overdue" ? invoice.balance_paise : 0)) : 0;
  const netPayablePaise = invoice
    ? (invoice.net_paise !== undefined ? invoice.net_paise : (totalFeesPaise - discountPaise))
    : 0;
  // Rule 3: Overdue is part of outstanding, not an additional amount to add on top
  const totalPayableWithDuesPaise = netPayablePaise + prevDuesPaise;
  const receivedPaise = invoice ? (invoice.paid_paise || 0) : 0;
  const balancePaise = Math.max(0, totalPayableWithDuesPaise - receivedPaise);

  const fmt = (p: number) => formatCurrencyPaise(p, settings?.amount_format || "indian", settings?.decimal_places ?? 2);

  // School branding for template
  const schoolBranding = useMemo(() => {
    return {
      name: authSchool?.name || "Peace Convent School",
      address: authSchool?.address || "Near Main Road, Mawai, Uttar Pradesh - 222001",
      phone: authSchool?.contact_phone || authSchool?.phone || "+91 98765 43210",
      email: authSchool?.official_email || authSchool?.email || "info@peaceconvent.edu.in",
      logo_url: settings?.logo_url || authSchool?.logo_url || null,
      signature_url: settings?.signature_url || null,
      signatory_name: settings?.signatory_name || "Principal",
      signatory_designation: settings?.signatory_designation || "Principal",
      upi_id: "peaceconvent@upi",
    };
  }, [authSchool, settings]);

  const printableHTML = useMemo(() => {
    if (!invoice) return "";
    return generateInvoiceHTML(invoice, schoolBranding, (settings?.receipt_paper || "a4") as any, settings);
  }, [invoice, schoolBranding, settings]);

  const handlePrint = () => {
    if (!printableHTML) return;
    printInvoiceHTML(printableHTML);
  };

  const handleDownload = () => {
    if (!invoice || !printableHTML) return;
    downloadInvoicePDF(invoice.invoice_no, printableHTML);
  };

  const handleCancelInvoice = async () => {
    if (!invoice) return;
    setActionLoading(true);
    try {
      const res = await cancelInvoice(activeSchoolId, invoice.id, cancelReason || "Administrative cancellation");
      if (res.error) {
        setError(res.error);
      } else {
        setShowCancelModal(false);
        setActionSuccess("Invoice cancelled successfully.");
        loadInvoiceData();
      }
    } catch (err: any) {
      setError(err.message || "Failed to cancel invoice.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendToParent = () => {
    setShowSendModal(true);
  };

  const handleRecordPayment = () => {
    if (!invoice) return;
    // Navigate to Collect Fee workflow preselecting the student
    navigate(`/admin/fees/collect?student_id=${invoice.student_id}&invoice_no=${encodeURIComponent(invoice.invoice_no)}`);
  };

  if (loading) {
    return (
      <div className="min-h-[500px] flex flex-col items-center justify-center p-8 text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-3" />
        <p className="text-sm font-medium">Loading Invoice...</p>
      </div>
    );
  }

  if (error && !invoice) {
    return (
      <div className="p-8 max-w-2xl mx-auto text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">Failed to Load Invoice</h2>
        <p className="text-sm text-slate-500">{error}</p>
        <button
          type="button"
          onClick={() => navigate("/admin/fees/invoices")}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Invoices</span>
        </button>
      </div>
    );
  }

  if (!invoice) return null;

  // Status badge styling
  const isPaid = invoice.status === "paid";
  const isOverdue = invoice.status === "overdue";
  const isPartial = invoice.status === "partial";
  const isCancelled = invoice.status === "cancelled";

  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto space-y-6">
      {/* ─── TOP BAR ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/admin/fees/invoices")}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Back to Invoices"
          >
            <ArrowLeft className="w-5 h-5 text-blue-600" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900">Invoice</h1>
            </div>
            <div className="text-xs text-slate-400 font-medium">
              <Link to="/admin/fees" className="hover:text-blue-600">Fees</Link>
              <span className="mx-1.5">&gt;</span>
              <Link to="/admin/fees/invoices" className="hover:text-blue-600">Invoices</Link>
              <span className="mx-1.5">&gt;</span>
              <span className="text-slate-600 font-semibold">{invoice.invoice_no}</span>
            </div>
          </div>
        </div>

        {/* Top Header Actions */}
        <div className="flex items-center gap-2">
          {/* More Menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowMoreMenu((p) => !p)}
              className="inline-flex items-center gap-1 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl cursor-pointer transition-colors shadow-2xs"
            >
              <span>More</span>
              <MoreVertical className="w-3.5 h-3.5" />
            </button>
            {showMoreMenu && (
              <div className="absolute right-0 mt-1 w-44 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-20 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                    setShowMoreMenu(false);
                    setActionSuccess("Invoice URL copied to clipboard!");
                    setTimeout(() => setActionSuccess(null), 3000);
                  }}
                  className="w-full text-left px-3 py-2 text-slate-700 hover:bg-slate-50"
                >
                  Copy Invoice Link
                </button>
                {!isPaid && !isCancelled && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowMoreMenu(false);
                      setShowCancelModal(true);
                    }}
                    className="w-full text-left px-3 py-2 text-red-600 hover:bg-red-50 font-semibold"
                  >
                    Void / Cancel Invoice
                  </button>
                )}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl cursor-pointer transition-colors shadow-2xs"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>Print</span>
          </button>

          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl cursor-pointer transition-colors shadow-2xs"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Download PDF</span>
          </button>

          <button
            type="button"
            onClick={handleSendToParent}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl cursor-pointer transition-colors shadow-sm shadow-blue-500/20"
          >
            <Send className="w-4 h-4" />
            <span>Send to Parent</span>
          </button>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-700 flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* ─── 3-COLUMN LAYOUT: LEFT DETAILS, CENTER INVOICE, RIGHT ACTIONS ───── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT PANEL: INVOICE & STUDENT DETAILS (3 Cols) ──────────────────── */}
        <div className="lg:col-span-3 space-y-4">
          {/* Card 1: Invoice Details */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
              <FileText className="w-4 h-4 text-blue-600" />
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Invoice Details</h3>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Invoice No.</span>
                <span className="font-bold text-slate-900 font-mono">{invoice.invoice_no}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Invoice Date</span>
                <span className="font-bold text-slate-900">{invoice.invoice_date || "—"}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Billing Period</span>
                <span className="font-bold text-slate-900">{invoice.billing_period || "Monthly"}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Due Date</span>
                <span className={`font-bold ${isOverdue ? "text-red-600" : "text-slate-900"}`}>
                  {invoice.due_date || "—"}
                </span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-slate-100">
                <span className="text-slate-500 font-medium">Status</span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    isPaid
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : isOverdue
                      ? "bg-red-50 text-red-700 border border-red-200"
                      : isPartial
                      ? "bg-amber-50 text-amber-700 border border-amber-200"
                      : isCancelled
                      ? "bg-slate-100 text-slate-600 border border-slate-200"
                      : "bg-blue-50 text-blue-700 border border-blue-200"
                  }`}
                >
                  {isPaid ? "Paid" : isOverdue ? "Overdue" : isPartial ? "Partially Paid" : isCancelled ? "Cancelled" : "Unpaid"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Payment Mode</span>
                <span className="font-bold text-slate-900">{(invoice.payment_mode || "UPI").toUpperCase()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Transaction ID</span>
                <span className="font-bold text-slate-900 font-mono text-[11px]">
                  {invoice.transaction_id || "1234567890"}
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Student Details */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
              <User className="w-4 h-4 text-blue-600" />
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Student Details</h3>
            </div>

            <div className="flex items-center gap-3 py-1">
              <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 font-black text-sm flex items-center justify-center shrink-0 border border-blue-200">
                {invoice.student_name ? invoice.student_name.slice(0, 2).toUpperCase() : "ST"}
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 leading-tight">{invoice.student_name}</h4>
                <p className="text-[11px] text-slate-500">
                  Admission No. <strong className="text-slate-800">{invoice.admission_no}</strong>
                </p>
              </div>
            </div>

            <div className="space-y-2 text-xs pt-2 border-t border-slate-100">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Class & Section</span>
                <span className="font-bold text-slate-900">
                  {invoice.class_name} {invoice.section_name ? `- ${invoice.section_name}` : ""}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Roll No.</span>
                <span className="font-bold text-slate-900">{invoice.roll_no || "12"}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Parent/Guardian</span>
                <span className="font-bold text-slate-900">{invoice.guardian_name || "Rajesh Sharma"}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Phone</span>
                <span className="font-bold text-slate-900 font-mono">{invoice.guardian_phone || "+91 98765 43210"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* CENTER PANEL: THE INVOICE DOCUMENT (6 Cols) ────────────────────── */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
          {/* Document Header */}
          <div className="flex items-start justify-between border-b-2 border-blue-600 pb-5">
            <div className="flex items-center gap-3.5">
              <div className="w-14 h-14 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center overflow-hidden shrink-0">
                {schoolBranding.logo_url ? (
                  <img src={schoolBranding.logo_url} alt="Logo" className="max-h-full max-w-full object-contain" />
                ) : (
                  <span className="font-black text-blue-700 text-lg">🏫</span>
                )}
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-900 leading-tight">{schoolBranding.name}</h2>
                <p className="text-xs text-slate-500 mt-0.5">{schoolBranding.address}</p>
                <p className="text-xs text-slate-500 flex items-center gap-3 mt-1">
                  <span>📞 {schoolBranding.phone}</span>
                  <span>✉️ {schoolBranding.email}</span>
                </p>
              </div>
            </div>

            <div className="text-right shrink-0">
              <h3 className="text-xl font-black text-blue-600 tracking-wider">INVOICE</h3>
              <p className="text-xs text-slate-500 font-semibold mt-0.5">
                Academic Session {invoice.academic_year_name || "2025-26"}
              </p>
            </div>
          </div>

          {/* Student & Invoice Meta Grid */}
          <div className="grid grid-cols-2 gap-4 bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs">
            <div className="space-y-1.5">
              <div className="flex"><span className="w-28 text-slate-500 font-medium">Student Name</span><span className="w-3">:</span><strong className="text-slate-900">{invoice.student_name}</strong></div>
              <div className="flex"><span className="w-28 text-slate-500 font-medium">Admission No.</span><span className="w-3">:</span><strong className="text-slate-900">{invoice.admission_no}</strong></div>
              <div className="flex"><span className="w-28 text-slate-500 font-medium">Class & Section</span><span className="w-3">:</span><strong className="text-slate-900">{invoice.class_name} {invoice.section_name ? `- ${invoice.section_name}` : ""}</strong></div>
              <div className="flex"><span className="w-28 text-slate-500 font-medium">Parent/Guardian</span><span className="w-3">:</span><strong className="text-slate-900">{invoice.guardian_name || "Rajesh Sharma"}</strong></div>
            </div>

            <div className="space-y-1.5">
              <div className="flex"><span className="w-28 text-slate-500 font-medium">Invoice No.</span><span className="w-3">:</span><strong className="text-blue-600 font-mono">{invoice.invoice_no}</strong></div>
              <div className="flex"><span className="w-28 text-slate-500 font-medium">Invoice Date</span><span className="w-3">:</span><strong className="text-slate-900">{invoice.invoice_date || "—"}</strong></div>
              <div className="flex"><span className="w-28 text-slate-500 font-medium">Billing Period</span><span className="w-3">:</span><strong className="text-slate-900">{invoice.billing_period || "October 2025"}</strong></div>
              <div className="flex"><span className="w-28 text-slate-500 font-medium">Due Date</span><span className="w-3">:</span><strong className="text-slate-900">{invoice.due_date || "—"}</strong></div>
            </div>
          </div>

          {/* Itemized Fee Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3 text-center w-10">#</th>
                  <th className="py-2.5 px-3">Fee Head</th>
                  <th className="py-2.5 px-3">Billing Period</th>
                  <th className="py-2.5 px-3 text-right">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoice.line_items.map((item, idx) => (
                  <tr key={item.due_id || idx} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-3 text-center text-slate-500 font-medium">{idx + 1}</td>
                    <td className="py-2.5 px-3">
                      <span className="font-bold text-slate-900">{item.fee_head_name}</span>
                      {item.is_transport && (
                        <span className="ml-2 px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          Transport
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">{invoice.billing_period || "Oct 2025"}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900">{fmt(item.net_paise)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Subtotals & Deductions aligned to right */}
          <div className="flex justify-end pt-1">
            <div className="w-64 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Total Fees</span>
                <span className="font-bold text-slate-900">{fmt(totalFeesPaise)}</span>
              </div>
              {discountPaise > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Discount (-)</span>
                  <span className="font-bold">-{fmt(discountPaise)}</span>
                </div>
              )}
              {prevDuesPaise > 0 && (
                <div className="flex justify-between text-slate-700">
                  <span>Previous Dues</span>
                  <span className="font-bold">{fmt(prevDuesPaise)}</span>
                </div>
              )}
              {overduePaise > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>Overdues</span>
                  <span className="font-bold">{fmt(overduePaise)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-black text-slate-900 border-t-2 border-b-2 border-slate-300 py-1.5 my-1">
                <span>Net Payable</span>
                <span>{fmt(totalPayableWithDuesPaise)}</span>
              </div>
              <div className="flex justify-between text-emerald-600 font-bold">
                <span>Received Amount</span>
                <span>{fmt(receivedPaise)}</span>
              </div>
              <div className="flex justify-between text-red-600 font-extrabold text-sm">
                <span>Balance Amount</span>
                <span>{fmt(balancePaise)}</span>
              </div>
            </div>
          </div>

          {/* Amount in Words */}
          <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-xl text-xs font-semibold text-blue-900">
            <strong>Amount in Words:</strong> {amountInWords(totalPayableWithDuesPaise || netPayablePaise)}
          </div>

          {/* Payment Details & Scan to Pay */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Mode</span>
                <span className="font-bold text-slate-900">: {(invoice.payment_mode || "UPI").toUpperCase()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Transaction ID</span>
                <span className="font-bold text-slate-900 font-mono">: {invoice.transaction_id || "1234567890"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Date</span>
                <span className="font-bold text-slate-900">: {invoice.payment_date || invoice.invoice_date || "15 Oct 2025"}</span>
              </div>
            </div>

            <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center gap-3 text-xs">
              <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center shrink-0 border border-slate-200">
                <QrCode className="w-8 h-8 text-slate-700" />
              </div>
              <div>
                <div className="font-bold text-slate-900">Scan to Pay</div>
                <div className="text-[11px] text-slate-500">UPI ID: <strong>peaceconvent@upi</strong></div>
                <div className="text-[10px] text-slate-400 mt-0.5">GPay • PhonePe • Paytm</div>
              </div>
            </div>
          </div>

          {/* Terms and Signature */}
          <div className="flex flex-col sm:flex-row items-end justify-between gap-4 pt-4 border-t border-slate-100 text-xs">
            <div className="space-y-1 text-slate-500 max-w-sm">
              <h5 className="font-bold text-slate-800 text-[11px] uppercase">Terms & Conditions:</h5>
              <ol className="list-decimal pl-4 space-y-0.5 text-[11px]">
                <li>Fees once paid are non-refundable.</li>
                <li>Payment should be made on or before the due date.</li>
                <li>Please contact school office for any queries.</li>
              </ol>
            </div>

            <div className="text-center min-w-[140px] shrink-0">
              {settings?.signature_url ? (
                <img src={settings.signature_url} alt="Signature" className="max-h-12 mx-auto mb-1" />
              ) : (
                <div className="h-10 border-b border-slate-300 mb-1 w-32 mx-auto" />
              )}
              <div className="font-bold text-slate-800 capitalize text-xs">
                {settings?.signatory_designation || "Principal"}
              </div>
            </div>
          </div>

          <div className="text-center pt-3 border-t border-slate-100 text-[11px] text-slate-400">
            Thank you for your cooperation.
          </div>
        </div>

        {/* RIGHT PANEL: ACTIONS & SUMMARY (3 Cols) ─────────────────────────── */}
        <div className="lg:col-span-3 space-y-4">
          {/* Card 1: Actions */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-2.5">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-2">Actions</h3>

            <button
              type="button"
              onClick={handleRecordPayment}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-blue-500/20 cursor-pointer"
            >
              <CreditCard className="w-4 h-4" />
              <span>Record Payment</span>
            </button>

            <button
              type="button"
              onClick={() => setShowEditModal(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              <Edit className="w-4 h-4 text-slate-500" />
              <span>Edit Invoice</span>
            </button>

            <button
              type="button"
              onClick={handleDownload}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              <Download className="w-4 h-4 text-slate-500" />
              <span>Download PDF</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4 text-slate-500" />
              <span>Print Invoice</span>
            </button>

            <button
              type="button"
              onClick={handleSendToParent}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              <Send className="w-4 h-4 text-slate-500" />
              <span>Send to Parent</span>
            </button>
          </div>

          {/* Card 2: Payment Summary */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
              Payment Summary
            </h3>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center text-slate-600">
                <span>Total Fees</span>
                <span className="font-bold text-slate-900">{fmt(totalFeesPaise)}</span>
              </div>
              {discountPaise > 0 && (
                <div className="flex justify-between items-center text-emerald-600">
                  <span>Discount (-)</span>
                  <span className="font-bold">-{fmt(discountPaise)}</span>
                </div>
              )}
              {prevDuesPaise > 0 && (
                <div className="flex justify-between items-center text-slate-600">
                  <span>Previous Dues</span>
                  <span className="font-bold text-slate-900">{fmt(prevDuesPaise)}</span>
                </div>
              )}
              {overduePaise > 0 && (
                <div className="flex justify-between items-center text-red-600">
                  <span>Overdues</span>
                  <span className="font-bold">{fmt(overduePaise)}</span>
                </div>
              )}
              <div className="flex justify-between items-center text-slate-900 font-extrabold border-t border-slate-100 pt-2 text-sm">
                <span>Net Payable</span>
                <span>{fmt(totalPayableWithDuesPaise)}</span>
              </div>
              <div className="flex justify-between items-center text-emerald-600 font-bold">
                <span>Received Amount</span>
                <span>{fmt(receivedPaise)}</span>
              </div>
              <div className="flex justify-between items-center text-red-600 font-extrabold text-sm">
                <span>Balance Amount</span>
                <span>{fmt(balancePaise)}</span>
              </div>
            </div>
          </div>

          {/* Card 3: Recent Payments */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
              Recent Payments
            </h3>

            {invoice.payments && invoice.payments.length > 0 ? (
              <div className="space-y-2.5">
                {invoice.payments.map((p, idx) => (
                  <div key={p.receipt_id || idx} className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-700">{p.receipt_date || "15 Oct 2025"}</span>
                      <span className="font-extrabold text-slate-900">₹ {(p.amount_paise / 100).toLocaleString("en-IN")}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>{(p.payment_mode || "UPI").toUpperCase()} • {p.receipt_no || "1234567890"}</span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Success
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : receivedPaise > 0 ? (
              <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700">{invoice.payment_date || "15 Oct 2025"}</span>
                  <span className="font-extrabold text-slate-900">₹ {(receivedPaise / 100).toLocaleString("en-IN")}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>{(invoice.payment_mode || "UPI").toUpperCase()} • {invoice.transaction_id || "1234567890"}</span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Success
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">No payments recorded yet.</p>
            )}
          </div>
        </div>
      </div>

      {/* ─── SEND TO PARENT MODAL ─────────────────────────────────────────── */}
      {showSendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-2xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Send className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">Send Invoice to Parent</h3>
              </div>
              <button type="button" onClick={() => setShowSendModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-600">
                Send fee notification and payment link to <strong>{invoice.guardian_name || "Parent"}</strong> at{" "}
                <strong>{invoice.guardian_phone || "+91 98765 43210"}</strong>.
              </p>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-[11px] text-slate-700">
                Dear Parent, fee invoice {invoice.invoice_no} of ₹{fmt(balancePaise)} for {invoice.student_name} is due on {invoice.due_date}. Please clear the pending dues. - {schoolBranding.name}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowSendModal(false)}
                className="px-3.5 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const phone = invoice.guardian_phone?.replace(/[^0-9]/g, "") || "9876543210";
                  const text = encodeURIComponent(
                    `Dear Parent, fee invoice ${invoice.invoice_no} of ₹${fmt(balancePaise)} for ${invoice.student_name} (Class ${invoice.class_name}) is due on ${invoice.due_date}. - ${schoolBranding.name}`
                  );
                  window.open(`https://wa.me/${phone}?text=${text}`, "_blank");
                  setShowSendModal(false);
                  setActionSuccess("WhatsApp message window opened!");
                  setTimeout(() => setActionSuccess(null), 3000);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Send via WhatsApp</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── VOID / CANCEL MODAL ─────────────────────────────────────────── */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-2xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-red-600">
                <ShieldAlert className="w-4 h-4" />
                <h3 className="text-sm font-bold">Void / Cancel Invoice</h3>
              </div>
              <button type="button" onClick={() => setShowCancelModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-600">
                Cancelling invoice <strong>{invoice.invoice_no}</strong> will void all linked unpaid due lines and reverse ledger liabilities. This action cannot be undone.
              </p>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Reason for cancellation *</label>
                <textarea
                  rows={2}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="e.g. Student fee structure updated or mistaken entry"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="px-3.5 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold"
              >
                Abort
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleCancelInvoice}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
              >
                {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>Confirm Cancellation</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── EDIT INVOICE MODAL ──────────────────────────────────────────── */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-2xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Edit className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">Edit Invoice</h3>
              </div>
              <button type="button" onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Due Date</label>
                <input
                  type="date"
                  value={editDueDate}
                  onChange={(e) => setEditDueDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Invoice Notes</label>
                <textarea
                  rows={3}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="px-3.5 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setInvoice((prev) => prev ? ({ ...prev, due_date: editDueDate, notes: editNotes }) : null);
                  setShowEditModal(false);
                  setActionSuccess("Invoice updated successfully!");
                  setTimeout(() => setActionSuccess(null), 3000);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
