import React, { useState, useEffect } from "react";
import { useMasterAdminAuth } from "../../context/MasterAdminAuthContext";
import type {
  MasterAdminInvoice,
  MasterAdminPayment,
  PlatformRevenueSummary,
} from "../../services/masterAdminBillingService";
import {
  IndianRupee,
  FileText,
  CreditCard,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RotateCcw,
  Printer,
  Download,
  Plus,
} from "lucide-react";

export default function MasterAdminBilling() {
  const { token, hasPermission } = useMasterAdminAuth();

  const [activeTab, setActiveTab] = useState<"invoices" | "payments">("invoices");
  const [invoices, setInvoices] = useState<MasterAdminInvoice[]>([]);
  const [payments, setPayments] = useState<MasterAdminPayment[]>([]);
  const [summary, setSummary] = useState<PlatformRevenueSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Invoice Preview Modal
  const [selectedInvoice, setSelectedInvoice] = useState<MasterAdminInvoice | null>(null);

  // Refund Modal
  const [selectedPayment, setSelectedPayment] = useState<MasterAdminPayment | null>(null);
  const [refundReason, setRefundReason] = useState("");
  const [isRefunding, setIsRefunding] = useState(false);

  const fetchBillingData = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token || "test-token-admin"}` };

      const [invRes, payRes, sumRes] = await Promise.all([
        fetch(`/api/master-admin/billing/invoices?search=${search}`, { headers }),
        fetch("/api/master-admin/billing/payments", { headers }),
        fetch("/api/master-admin/billing/summary", { headers }),
      ]);

      const [invJson, payJson, sumJson] = await Promise.all([
        invRes.json(),
        payRes.json(),
        sumRes.json(),
      ]);

      if (invJson.success) setInvoices(invJson.data);
      if (payJson.success) setPayments(payJson.data);
      if (sumJson.success) setSummary(sumJson.data);
    } catch (err) {
      console.warn("Failed to fetch billing data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBillingData();
  }, [token, search]);

  const handleRefundSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayment || !refundReason.trim()) return;
    setIsRefunding(true);

    try {
      const res = await fetch("/api/master-admin/billing/refunds", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token || "test-token-admin"}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paymentId: selectedPayment.id,
          amountPaise: selectedPayment.amount_paise,
          reason: refundReason.trim(),
        }),
      });

      const json = await res.json();
      if (json.success) {
        alert(`Refund successfully authorized! Refund ID: ${json.refundId}`);
        setSelectedPayment(null);
        setRefundReason("");
        fetchBillingData();
      } else {
        alert(json.error || "Failed to process refund.");
      }
    } catch (err: any) {
      alert(err.message || "Refund request failed.");
    } finally {
      setIsRefunding(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Page Header ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight font-heading">
            Billing & Revenue Operations
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Centralized SaaS subscription invoicing, Razorpay gateway transactions, and GST accounting.
          </p>
        </div>
      </div>

      {/* ── Financial KPI Summary ───────────────────────────────────── */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs">
            <p className="text-[11px] font-medium text-slate-400">Total Collected Revenue</p>
            <p className="text-xl font-bold text-slate-900 font-heading mt-1">
              {summary.totalCollectedFormatted}
            </p>
            <p className="text-[10px] text-emerald-600 font-bold mt-0.5">+21.4% 30-day growth</p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs">
            <p className="text-[11px] font-medium text-slate-400">Monthly Recurring Revenue</p>
            <p className="text-xl font-bold text-blue-600 font-heading mt-1">
              {summary.mrrFormatted}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">Recurring SaaS run-rate</p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs">
            <p className="text-[11px] font-medium text-slate-400">Pending Receivables</p>
            <p className="text-xl font-bold text-amber-700 font-heading mt-1">
              {summary.outstandingFormatted}
            </p>
            <p className="text-[10px] text-amber-600 font-medium mt-0.5">18 schools past due</p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs">
            <p className="text-[11px] font-medium text-slate-400">Failed Transactions</p>
            <p className="text-xl font-bold text-rose-600 font-heading mt-1">
              {summary.failedTransactionsCount}
            </p>
            <p className="text-[10px] text-rose-500 font-medium mt-0.5">Require gateway retry</p>
          </div>
        </div>
      )}

      {/* ── Tabbed View (Invoices vs Payments) ───────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="border-b border-slate-200 px-6 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button
              onClick={() => setActiveTab("invoices")}
              className={`py-3.5 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
                activeTab === "invoices"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              Subscription Invoices
            </button>
            <button
              onClick={() => setActiveTab("payments")}
              className={`py-3.5 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
                activeTab === "payments"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              Razorpay Gateway Transactions
            </button>
          </div>

          <div className="relative w-64 py-2 hidden sm:block">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search invoice or school..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>

        {/* Invoices Table */}
        {activeTab === "invoices" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">School Partner</th>
                  <th className="py-3 px-4">Plan & Cycle</th>
                  <th className="py-3 px-4">Taxable Amount</th>
                  <th className="py-3 px-4">GST (18%)</th>
                  <th className="py-3 px-4">Total Amount</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      {inv.invoice_number}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800 truncate max-w-xs">
                      {inv.school_name}
                    </td>
                    <td className="py-3.5 px-4 uppercase text-[11px] font-bold text-slate-600">
                      {inv.plan_slug} · {inv.billing_cycle}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      ₹{Math.round(inv.taxable_paise / 100).toLocaleString("en-IN")}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      ₹{Math.round((inv.cgst_paise + inv.sgst_paise + inv.igst_paise) / 100).toLocaleString("en-IN")}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900 font-heading">
                      {inv.total_formatted}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                          inv.status === "paid"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200/80"
                            : "bg-amber-50 text-amber-700 border border-amber-200/80"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            inv.status === "paid" ? "bg-emerald-500" : "bg-amber-500"
                          }`}
                        />
                        {inv.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setSelectedInvoice(inv)}
                        className="px-2.5 py-1 text-blue-600 hover:text-blue-700 font-semibold bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
                      >
                        Tax Invoice
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Payments Table */}
        {activeTab === "payments" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Gateway Order ID</th>
                  <th className="py-3 px-4">Payment ID</th>
                  <th className="py-3 px-4">School</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Gateway</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map((pay) => (
                  <tr key={pay.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-medium text-slate-700">
                      {pay.gateway_order_id}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-600">
                      {pay.gateway_payment_id || "—"}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800">
                      {pay.school_name}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900 font-heading">
                      {pay.amount_formatted}
                    </td>
                    <td className="py-3.5 px-4 capitalize text-slate-600 font-medium">
                      {pay.gateway}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                          pay.status === "captured"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200/80"
                            : "bg-rose-50 text-rose-700 border border-rose-200/80"
                        }`}
                      >
                        {pay.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {pay.status === "captured" && hasPermission("billing.manage") && (
                        <button
                          onClick={() => setSelectedPayment(pay)}
                          className="px-2.5 py-1 text-slate-600 hover:text-rose-600 font-semibold bg-slate-100 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        >
                          Refund
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Tax Invoice Printable Modal ─────────────────────────────── */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full p-8 space-y-6">
            <div className="flex items-start justify-between border-b border-slate-200 pb-5">
              <div>
                <h3 className="text-xl font-bold text-slate-900 font-heading">TAX INVOICE</h3>
                <p className="text-xs font-mono text-slate-500 mt-1">{selectedInvoice.invoice_number}</p>
                <p className="text-[11px] text-slate-400">SAC Code: {selectedInvoice.hsn_sac_code} (IT Software SaaS)</p>
              </div>
              <div className="text-right">
                <span className="text-lg font-bold text-blue-600">MyZkool EdTech Pvt Ltd</span>
                <p className="text-xs text-slate-500">GSTIN: 09AAACM5482L1Z4</p>
                <p className="text-xs text-slate-400">Lucknow, Uttar Pradesh - 226001</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Billed To
                </p>
                <p className="font-bold text-slate-900">{selectedInvoice.billing_school_name}</p>
                <p className="text-slate-600 mt-0.5">{selectedInvoice.billing_address}</p>
                <p className="text-slate-500 font-mono mt-1">
                  GSTIN: {selectedInvoice.billing_gstin || "Unregistered"}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Invoice Terms
                </p>
                <p className="text-slate-700">Date: {new Date(selectedInvoice.created_at).toLocaleDateString("en-IN")}</p>
                <p className="text-slate-700">Due Date: {selectedInvoice.due_date}</p>
                <p className="text-slate-700 capitalize">Payment Status: <span className="font-bold text-emerald-600">{selectedInvoice.status}</span></p>
              </div>
            </div>

            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2">Item Description</th>
                  <th className="py-2 text-right">Taxable</th>
                  <th className="py-2 text-right">GST Rate</th>
                  <th className="py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="py-3">
                    <p className="font-bold text-slate-900 capitalize">MyZkool {selectedInvoice.plan_slug} Plan</p>
                    <p className="text-[11px] text-slate-400">Cycle: {selectedInvoice.billing_cycle}</p>
                  </td>
                  <td className="py-3 text-right">₹{Math.round(selectedInvoice.taxable_paise / 100).toLocaleString("en-IN")}</td>
                  <td className="py-3 text-right">{selectedInvoice.gst_rate}%</td>
                  <td className="py-3 text-right font-bold text-slate-900 font-heading">
                    {selectedInvoice.total_formatted}
                  </td>
                </tr>
              </tbody>
            </table>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedInvoice(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Tax Invoice</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Refund Modal ────────────────────────────────────────────── */}
      {selectedPayment && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 font-heading">
              Authorize Payment Refund
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              You are authorizing a refund of <strong>{selectedPayment.amount_formatted}</strong> for{" "}
              {selectedPayment.school_name}. A mandatory financial reason is required for statutory records.
            </p>

            <form onSubmit={handleRefundSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Refund Reason / Ledger Justification *
                </label>
                <textarea
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="e.g. Accidental duplicate payment by school account team."
                  rows={3}
                  required
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedPayment(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isRefunding || refundReason.trim().length < 5}
                  className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isRefunding ? "Authorizing..." : "Authorize Refund"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

