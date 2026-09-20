/**
 * ReceiptsPage — /admin/fees/receipts
 * B5.4: Receipt list, drawer, print/PDF A5 + 80mm thermal, WhatsApp, cancel
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  Search, X, Download, Printer, MessageCircle, Ban, ChevronDown,
  Receipt, AlertTriangle, CheckCircle, XCircle, RefreshCw
} from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { getReceipts, getReceiptById, cancelReceipt } from "../../../services/collectionService";
import { amountInWords, formatPaise } from "../../../lib/amountInWords";
import { generateReceiptHTML } from "../../../lib/receiptTemplate";
import type { FeeReceipt, FeeReceiptItem, FeePayment } from "../../../types/collection";


// ─── Helpers ─────────────────────────────────────────────────────────────────

function statusChip(status: string) {
  if (status === "active") return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
      <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Active
    </span>
  );
  if (status === "cancelled") return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
      <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> Cancelled
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> {status}
    </span>
  );
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatAmt(p: number) {
  return "₹" + (p / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ─── Cancel dialog ────────────────────────────────────────────────────────────


function CancelDialog({
  receiptId, onDone, onClose,
}: { receiptId: string; onDone: () => void; onClose: () => void }) {
  const { schoolId, user } = useAuth();
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function submit() {
    if (!schoolId) return;
    if (reason.trim().length < 10) { setErr("Reason must be at least 10 characters."); return; }
    setLoading(true); setErr("");
    try {
      await cancelReceipt(schoolId, receiptId, { reason }, user?.id);
      onDone();
    } catch (e: any) { setErr(e.message); }
    finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
        <h3 className="font-bold text-slate-900 text-base">Cancel receipt</h3>
        <p className="text-sm text-slate-600">
          Cancelling this receipt will reverse all dues and ledger entries. This cannot be undone — you will need to collect again with a new receipt.
        </p>
        <div>
          <label className="text-xs font-medium text-slate-700">Reason (minimum 10 characters)</label>
          <textarea
            rows={3}
            className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Explain why this receipt is being cancelled…"
          />
          <div className="text-right text-xs text-slate-400">{reason.length}/10+</div>
        </div>
        {err && <p className="text-xs text-red-600">{err}</p>}
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Back
          </button>
          <button
            onClick={submit}
            disabled={loading}
            className="flex-1 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? "Cancelling…" : "Cancel receipt"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Receipt drawer ───────────────────────────────────────────────────────────

function ReceiptDrawer({
  receiptId,
  onClose,
  onRefresh,
}: { receiptId: string; onClose: () => void; onRefresh: () => void }) {
  const { schoolId } = useAuth();
  const [receipt, setReceipt] = useState<FeeReceipt | null>(null);
  const [items, setItems] = useState<FeeReceiptItem[]>([]);
  const [payments, setPayments] = useState<FeePayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCancel, setShowCancel] = useState(false);

  useEffect(() => {
    if (!schoolId) return;
    setLoading(true);
    getReceiptById(schoolId, receiptId).then(r => {
      if (r.receipt) setReceipt(r.receipt);
      if (r.items) setItems(r.items);
      if (r.payments) setPayments(r.payments);
    }).finally(() => setLoading(false));
  }, [schoolId, receiptId]);

  function printReceipt(paper: "a5" | "thermal80") {
    if (!receipt) return;
    const html = generateReceiptHTML(
      receipt,
      items,
      payments,
      {
        student_name: "Student",
        admission_no: "ADM",
      },
      {
        name: "MyZkool School",
      },
      paper,
      (receipt.print_count ?? 0) > 0
    );
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
  }


  if (loading) return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[480px] bg-white border-l border-slate-200 z-30 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[#2158E0] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!receipt) return null;

  const lineTotal = items.reduce((s, i) => s + i.amount_paise, 0);

  return (
    <>
      <div className="fixed inset-y-0 right-0 w-full sm:w-[480px] bg-white border-l border-slate-200 z-30 flex flex-col shadow-xl animate-in slide-in-from-right duration-180">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <div>
            <h2 className="font-bold text-slate-900 text-base">{receipt.receipt_no}</h2>
            <p className="text-xs text-slate-500">{formatDate(receipt.receipt_date)}</p>
          </div>
          <div className="flex items-center gap-2">
            {statusChip(receipt.status)}
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100">
              <X className="w-4 h-4 text-slate-500" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto px-5 py-4 space-y-4">
          {receipt.status === "cancelled" && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
              <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>
                <strong>Cancelled</strong>
                {receipt.cancel_reason && <p className="mt-1 text-red-600">{receipt.cancel_reason}</p>}
              </div>
            </div>
          )}

          {/* Items table */}
          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Fee lines</h3>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left px-3 py-2 text-xs font-medium text-slate-600">Description</th>
                    <th className="text-right px-3 py-2 text-xs font-medium text-slate-600">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(it => (
                    <tr key={it.id} className="border-t border-slate-100">
                      <td className="px-3 py-2 text-slate-800">{it.fee_head_id}</td>
                      <td className="px-3 py-2 text-right tabular-nums font-medium">{formatAmt(it.amount_paise)}</td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-slate-200 bg-slate-50">
                    <td className="px-3 py-2 font-bold">Total</td>
                    <td className="px-3 py-2 text-right tabular-nums font-bold">{formatAmt(receipt.total_paise)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Amount in words */}
          <p className="text-xs italic text-slate-500">
            {(() => { try { return amountInWords(receipt.total_paise); } catch { return ""; } })()}
          </p>

          {/* Payment details */}
          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Payment</h3>
            <div className="space-y-1">
              {payments.map(p => (
                <div key={p.id} className="flex justify-between text-sm px-3 py-2 bg-slate-50 rounded-lg">
                  <span className="capitalize text-slate-600">{p.mode.replace("_", " ")}{p.reference_no ? ` • ${p.reference_no}` : ""}</span>
                  <span className="font-semibold tabular-nums">{formatAmt(p.amount_paise)}</span>
                </div>
              ))}
            </div>
          </div>

          {receipt.remarks && (
            <p className="text-xs text-slate-500 italic">Remarks: {receipt.remarks}</p>
          )}
        </div>

        {/* Actions */}
        <div className="px-5 py-4 border-t border-slate-200 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => printReceipt("a5")}
              className="flex items-center justify-center gap-1.5 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              <Printer className="w-3.5 h-3.5" /> Print A5
            </button>
            <button
              onClick={() => printReceipt("thermal80")}
              className="flex items-center justify-center gap-1.5 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              <Printer className="w-3.5 h-3.5" /> Print 80mm
            </button>
            <button className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-[#1FAE7A] text-white text-xs font-medium hover:bg-[#1FAE7A]/90">
              <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
            </button>
            <button className="flex items-center justify-center gap-1.5 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50">
              <Download className="w-3.5 h-3.5" /> Download PDF
            </button>
          </div>
          {receipt.status === "active" && (
            <button
              onClick={() => setShowCancel(true)}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-red-200 text-xs font-medium text-red-600 hover:bg-red-50"
            >
              <Ban className="w-3.5 h-3.5" /> Cancel receipt
            </button>
          )}
        </div>
      </div>

      {showCancel && (
        <CancelDialog
          receiptId={receipt.id}
          onDone={() => { setShowCancel(false); onRefresh(); onClose(); }}
          onClose={() => setShowCancel(false)}
        />
      )}
    </>
  );
}

// ─── Main: ReceiptsPage ────────────────────────────────────────────────────────

export default function ReceiptsPage() {
  const { schoolId } = useAuth();
  const [receipts, setReceipts] = useState<FeeReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!schoolId) return;
    setLoading(true);
    const { receipts: r } = await getReceipts(schoolId);
    setReceipts(r);
    setLoading(false);
  }, [schoolId]);

  useEffect(() => { load(); }, [load]);

  const filtered = receipts.filter(r => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return r.receipt_no.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1">
            <h1 className="text-base font-bold text-slate-900 font-display">Receipts</h1>
            <p className="text-xs text-slate-500">{receipts.length} receipts</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {["all", "active", "cancelled", "bounced"].map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize ${
                  statusFilter === s ? "bg-[#2158E0] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-3 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by receipt number or student…"
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2158E0]"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-[#2158E0] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500">
            <Receipt className="w-10 h-10 mb-3 text-slate-300" />
            <p className="text-sm">No receipts found.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 sticky top-0 z-10">
              <tr className="border-b border-slate-200">
                {["Receipt no.", "Date", "Student", "Amount", "Mode", "Collector", "Status"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-600 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(r => (
                <tr
                  key={r.id}
                  className="hover:bg-slate-50 cursor-pointer"
                  style={{ height: 44 }}
                  onClick={() => setSelectedId(r.id)}
                >
                  <td className="px-4 py-2 font-medium text-[#2158E0] tabular-nums">{r.receipt_no}</td>
                  <td className="px-4 py-2 text-slate-600 whitespace-nowrap">{formatDate(r.receipt_date)}</td>
                  <td className="px-4 py-2 text-slate-600">—</td>
                  <td className="px-4 py-2 font-semibold tabular-nums">{formatAmt(r.total_paise)}</td>
                  <td className="px-4 py-2 text-slate-600 capitalize">{r.source}</td>
                  <td className="px-4 py-2 text-slate-600">—</td>
                  <td className="px-4 py-2">{statusChip(r.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Drawer */}
      {selectedId && (
        <>
          <div className="fixed inset-0 z-20 bg-black/20" onClick={() => setSelectedId(null)} />
          <ReceiptDrawer
            receiptId={selectedId}
            onClose={() => setSelectedId(null)}
            onRefresh={load}
          />
        </>
      )}
    </div>
  );
}

