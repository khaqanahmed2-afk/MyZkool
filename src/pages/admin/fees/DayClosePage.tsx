/**
 * DayClosePage — /admin/fees/day-close
 * Spec B5.9:
 * - Day totals by mode and collector
 * - Expected cash (opening cash + cash receipts - cash refunds)
 * - Denomination counter (notes and coins)
 * - Counted cash vs expected cash difference indicator (red/green)
 * - "Close day" locks the date (blocks creation/cancellation)
 * - "Reopen day" (owner only with reason)
 * - Print day book
 */

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Lock, Unlock, Printer, AlertTriangle, CheckCircle2,
  Banknote, Coins, Calendar, RefreshCw, X, ShieldAlert
} from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import {
  getDaySummary, closeDay, reopenDay, calculateDenominationTotal
} from "../../../services/dayCloseService";
import { FeeNavHeader } from "../../../components/admin/fees/FeeNavHeader";
import type { DaySummary } from "../../../services/dayCloseService";
import type { DenominationCount } from "../../../types/feeOperations";

function fmt(paise: number): string {
  return "₹" + (paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function DayClosePage() {
  const { schoolId, user, role } = useAuth();
  const navigate = useNavigate();

  const [dateStr, setDateStr] = useState(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<DaySummary | null>(null);

  // Denominations
  const [denominations, setDenominations] = useState<DenominationCount>({
    notes_500: 0,
    notes_200: 0,
    notes_100: 0,
    notes_50: 0,
    notes_20: 0,
    notes_10: 0,
    coins_10: 0,
    coins_5: 0,
    coins_2: 0,
    coins_1: 0,
  });

  const [countedPaise, setCountedPaise] = useState(0);
  const [closingNotes, setClosingNotes] = useState("");
  const [showReopenModal, setShowReopenModal] = useState(false);
  const [reopenReason, setReopenReason] = useState("");
  const [reopenError, setReopenError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const loadSummary = async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      const data = await getDaySummary(schoolId, dateStr);
      setSummary(data);
      if (data.closing?.denominations) {
        setDenominations(data.closing.denominations);
        setCountedPaise(data.closing.counted_cash_paise || 0);
      } else {
        setCountedPaise(0);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSummary();
  }, [schoolId, dateStr]);

  const updateCount = (key: keyof DenominationCount, countStr: string) => {
    const val = parseInt(countStr) || 0;
    const next = { ...denominations, [key]: val };
    setDenominations(next);
    setCountedPaise(calculateDenominationTotal(next));
  };

  const differencePaise = summary ? countedPaise - summary.expected_cash_paise : 0;

  const handleCloseDay = async () => {
    if (!schoolId) return;
    setActionLoading(true);
    try {
      await closeDay(schoolId, {
        business_date: dateStr,
        denominations,
        counted_cash_paise: countedPaise,
        notes: closingNotes,
      }, user?.id);
      await loadSummary();
    } finally {
      setActionLoading(false);
    }
  };

  const handleReopenDay = async () => {
    if (!schoolId) return;
    setReopenError("");
    setActionLoading(true);
    try {
      const res = await reopenDay(schoolId, dateStr, reopenReason, (role as any) || "owner", user?.id);
      if (res.success) {
        setShowReopenModal(false);
        setReopenReason("");
        await loadSummary();
      } else {
        setReopenError(res.error || "Failed to reopen day");
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handlePrintDayBook = () => {
    window.print();
  };

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      <FeeNavHeader
        title="Day Closing & Cash Balance"
        subtitle="Lock business day, count physical cash denominations, and reconcile day book."
        action={
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateStr}
              onChange={e => setDateStr(e.target.value)}
              className="text-xs border border-[#E6EAF3] bg-white rounded-xl px-3 py-1.5 font-medium focus:outline-none focus:border-[#2158E0]"
            />
            <button
              type="button"
              onClick={handlePrintDayBook}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E6EAF3] bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" /> Print Day Book
            </button>
          </div>
        }
      />

      {/* Lock status banner */}
      {summary?.is_closed ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-emerald-800 text-xs font-semibold">
            <Lock className="w-4 h-4 text-emerald-600" />
            <span>Business date {dateStr} is CLOSED and locked. No collections or cancellations allowed.</span>
          </div>
          <button
            type="button"
            onClick={() => setShowReopenModal(true)}
            className="text-xs font-semibold text-emerald-700 underline cursor-pointer"
          >
            Reopen Day (Owner only)
          </button>
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-2 text-amber-800 text-xs font-semibold">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          <span>Business date {dateStr} is OPEN. Count cash and close day at the end of business hours.</span>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-[#E6EAF3] rounded-2xl p-4 shadow-2xs">
          <span className="text-xs text-slate-500 block">Opening Cash</span>
          <span className="text-lg font-bold text-slate-800 font-display tabular-nums mt-1 block">
            {fmt(summary?.opening_cash_paise || 0)}
          </span>
        </div>
        <div className="bg-white border border-[#E6EAF3] rounded-2xl p-4 shadow-2xs">
          <span className="text-xs text-slate-500 block">Cash Receipts Today</span>
          <span className="text-lg font-bold text-[#1FAE7A] font-display tabular-nums mt-1 block">
            +{fmt(summary?.cash_receipts_paise || 0)}
          </span>
        </div>
        <div className="bg-white border border-[#E6EAF3] rounded-2xl p-4 shadow-2xs">
          <span className="text-xs text-slate-500 block">Cash Refunds</span>
          <span className="text-lg font-bold text-red-600 font-display tabular-nums mt-1 block">
            -{fmt(summary?.cash_refunds_paise || 0)}
          </span>
        </div>
        <div className="bg-white border border-[#E6EAF3] rounded-2xl p-4 shadow-2xs">
          <span className="text-xs text-slate-500 block font-semibold">Expected Cash in Hand</span>
          <span className="text-lg font-bold text-[#2158E0] font-display tabular-nums mt-1 block">
            {fmt(summary?.expected_cash_paise || 0)}
          </span>
        </div>
      </div>

      {/* Main Grid: Denomination Counter (Left) & Reconcile / Close Panel (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Denomination Counter */}
        <div className="lg:col-span-2 bg-white border border-[#E6EAF3] rounded-2xl p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Banknote className="w-5 h-5 text-slate-600" />
              <h2 className="text-sm font-bold text-slate-900 font-display">Cash Denomination Count</h2>
            </div>
            <div className="text-xs font-semibold text-slate-600">
              Counted Total: <span className="text-slate-900 font-bold tabular-nums">{fmt(countedPaise)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { key: "notes_500", label: "₹500 note", mult: 500 },
              { key: "notes_200", label: "₹200 note", mult: 200 },
              { key: "notes_100", label: "₹100 note", mult: 100 },
              { key: "notes_50", label: "₹50 note", mult: 50 },
              { key: "notes_20", label: "₹20 note", mult: 20 },
              { key: "notes_10", label: "₹10 note", mult: 10 },
              { key: "coins_10", label: "₹10 coin", mult: 10 },
              { key: "coins_5", label: "₹5 coin", mult: 5 },
              { key: "coins_2", label: "₹2 coin", mult: 2 },
              { key: "coins_1", label: "₹1 coin", mult: 1 },
            ].map(item => {
              const count = (denominations as any)[item.key] || 0;
              const subtotal = count * item.mult * 100;
              return (
                <div key={item.key} className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-700">{item.label}</span>
                    <span className="text-[11px] text-slate-400 tabular-nums">{fmt(subtotal)}</span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    disabled={summary?.is_closed}
                    value={count || ""}
                    onChange={e => updateCount(item.key as any, e.target.value)}
                    placeholder="0"
                    className="w-full text-xs border border-slate-200 rounded-lg p-1.5 bg-white text-center font-bold focus:outline-none focus:border-[#2158E0]"
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Reconcile & Day Close Action */}
        <div className="bg-white border border-[#E6EAF3] rounded-2xl p-5 shadow-2xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 font-display">Reconciliation & Lock</h2>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Expected Cash:</span>
              <span className="font-semibold tabular-nums">{fmt(summary?.expected_cash_paise || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Counted Cash:</span>
              <span className="font-semibold tabular-nums">{fmt(countedPaise)}</span>
            </div>

            <div className={`p-3 rounded-xl border flex items-center justify-between font-bold text-xs ${
              differencePaise === 0
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-red-50 border-red-200 text-red-800"
            }`}>
              <span>Difference / Variance:</span>
              <span className="tabular-nums">
                {differencePaise === 0 ? "₹0.00 (Balanced)" : `${differencePaise > 0 ? "+" : ""}${fmt(differencePaise)}`}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Day Close Notes</label>
            <textarea
              rows={3}
              disabled={summary?.is_closed}
              value={closingNotes}
              onChange={e => setClosingNotes(e.target.value)}
              placeholder="Notes on cash drawer or differences..."
              className="w-full text-xs border border-slate-200 rounded-lg p-2 focus:outline-none focus:border-[#2158E0] resize-none"
            />
          </div>

          {!summary?.is_closed ? (
            <button
              type="button"
              onClick={handleCloseDay}
              disabled={actionLoading}
              className="w-full py-3 rounded-xl bg-[#2158E0] hover:bg-[#1A46B8] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>{actionLoading ? "Closing..." : "Close Day & Lock Date"}</span>
            </button>
          ) : (
            <div className="text-center py-2 text-xs font-semibold text-emerald-700 flex items-center justify-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> Day Closed & Locked
            </div>
          )}
        </div>
      </div>

      {/* Reopen Modal (Owner only) */}
      {showReopenModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-slate-900 text-base">Reopen Business Day</h3>
              </div>
              <button type="button" onClick={() => setShowReopenModal(false)} className="p-1 text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Only the school owner can reopen a closed business day. Reopening allows corrections to receipts and cancellations.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Reason for Reopening (Min 10 characters)</label>
              <textarea
                rows={3}
                value={reopenReason}
                onChange={e => setReopenReason(e.target.value)}
                placeholder="Reason for reopening this locked day..."
                className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-[#2158E0] resize-none"
              />
            </div>

            {reopenError && <p className="text-xs text-red-600">{reopenError}</p>}

            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowReopenModal(false)}
                className="flex-1 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReopenDay}
                disabled={actionLoading}
                className="flex-1 py-2 rounded-xl bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 cursor-pointer disabled:opacity-50"
              >
                {actionLoading ? "Reopening..." : "Reopen Day"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

