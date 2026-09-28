/**
 * ChequeRegisterPage — /admin/fees/cheques
 * Spec B5.7:
 * Tabs by status: received, deposited, cleared, bounced.
 * Rows: cheque number, bank, date, amount, student, receipt.
 * Actions: Deposit, Clear, Mark Bounced (modal asking for bounce charge and reason, triggering bounce flow).
 */

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Search, CheckSquare, AlertTriangle, CheckCircle, Clock,
  DollarSign, Banknote, X, RefreshCw, AlertCircle
} from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { getCheques, updateChequeStatus, bounceCheque } from "../../../services/chequeService";
import type { ChequeItem } from "../../../types/feeOperations";
import { FeeNavHeader } from "../../../components/admin/fees/FeeNavHeader";

function fmt(paise: number): string {
  return "₹" + (paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function ChequeRegisterPage() {
  const { schoolId, user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [cheques, setCheques] = useState<ChequeItem[]>([]);
  const [activeTab, setActiveTab] = useState<"received" | "deposited" | "cleared" | "bounced">("received");
  const [searchQuery, setSearchQuery] = useState("");

  // Bounce modal
  const [showBounceModal, setShowBounceModal] = useState(false);
  const [selectedCheque, setSelectedCheque] = useState<ChequeItem | null>(null);
  const [bounceReason, setBounceReason] = useState("");
  const [bounceChargeRs, setBounceChargeRs] = useState("500");
  const [bouncing, setBouncing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const loadCheques = async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      const data = await getCheques(schoolId);
      setCheques(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCheques();
  }, [schoolId]);

  const filtered = cheques.filter(c => {
    if (c.status !== activeTab) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        c.cheque_no.toLowerCase().includes(q) ||
        c.bank_name.toLowerCase().includes(q) ||
        c.student_name.toLowerCase().includes(q) ||
        c.receipt_no.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleDeposit = async (id: string) => {
    if (!schoolId) return;
    await updateChequeStatus(schoolId, id, "deposited", user?.id);
    await loadCheques();
  };

  const handleClear = async (id: string) => {
    if (!schoolId) return;
    await updateChequeStatus(schoolId, id, "cleared", user?.id);
    await loadCheques();
  };

  const handleConfirmBounce = async () => {
    if (!schoolId || !selectedCheque) return;
    if (!bounceReason || bounceReason.trim().length < 5) {
      setErrorMsg("Please enter a valid bounce reason (min 5 characters)");
      return;
    }
    setBouncing(true);
    setErrorMsg("");

    try {
      const chargePaise = parseFloat(bounceChargeRs) ? Math.round(parseFloat(bounceChargeRs) * 100) : 0;
      await bounceCheque(schoolId, selectedCheque.payment_id, {
        bounce_reason: bounceReason,
        bounce_charge_paise: chargePaise,
      }, user?.id);

      setShowBounceModal(false);
      setSelectedCheque(null);
      setBounceReason("");
      await loadCheques();
    } catch (e: any) {
      setErrorMsg(e.message || "Failed to process bounce");
    } finally {
      setBouncing(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      <FeeNavHeader
        title="Cheque Register"
        subtitle="Track cheques from receipt to bank clearance or bounce reversal."
        action={
          <button
            type="button"
            onClick={loadCheques}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E6EAF3] bg-white hover:bg-slate-50 text-slate-600 text-xs font-semibold cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        }
      />

      {/* Tabs */}
      <div className="flex border-b border-[#E6EAF3] bg-white rounded-t-2xl px-4 pt-2">
        {(["received", "deposited", "cleared", "bounced"] as const).map(tab => {
          const count = cheques.filter(c => c.status === tab).length;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 text-xs font-semibold capitalize border-b-2 -mb-px flex items-center gap-2 cursor-pointer ${
                activeTab === tab
                  ? "border-[#2158E0] text-[#2158E0]"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              <span>{tab}</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                activeTab === tab ? "bg-blue-100 text-[#2158E0]" : "bg-slate-100 text-slate-600"
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="bg-white border border-[#E6EAF3] rounded-2xl p-4 shadow-2xs">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by cheque no, bank, student, receipt..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-[#E6EAF3] rounded-xl focus:outline-none focus:border-[#2158E0] bg-slate-50/50"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-[#E6EAF3] rounded-2xl overflow-hidden shadow-2xs">
        {loading ? (
          <div className="py-16 text-center text-xs text-slate-400">Loading cheques...</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-slate-500 text-xs">No cheques in '{activeTab}' status.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#E6EAF3] bg-slate-50 text-slate-600 text-left">
                  <th className="py-3 px-4 font-semibold">Cheque Details</th>
                  <th className="py-3 px-4 font-semibold">Bank</th>
                  <th className="py-3 px-4 font-semibold">Date</th>
                  <th className="py-3 px-4 font-semibold">Student</th>
                  <th className="py-3 px-4 font-semibold">Receipt</th>
                  <th className="py-3 px-4 font-semibold text-right">Amount</th>
                  <th className="py-3 px-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6EAF3] text-slate-800">
                {filtered.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                      {c.cheque_no}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-700">
                      {c.bank_name}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {c.cheque_date}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{c.student_name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{c.admission_no}</div>
                    </td>
                    <td className="py-3 px-4 font-mono text-[#2158E0]">
                      {c.receipt_no}
                    </td>
                    <td className="py-3 px-4 text-right font-bold tabular-nums">
                      {fmt(c.amount_paise)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {c.status === "received" && (
                          <button
                            type="button"
                            onClick={() => handleDeposit(c.id)}
                            className="px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 font-semibold hover:bg-blue-100 cursor-pointer"
                          >
                            Deposit
                          </button>
                        )}
                        {c.status === "deposited" && (
                          <button
                            type="button"
                            onClick={() => handleClear(c.id)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold hover:bg-emerald-100 cursor-pointer"
                          >
                            Mark Cleared
                          </button>
                        )}
                        {(c.status === "received" || c.status === "deposited") && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCheque(c);
                              setShowBounceModal(true);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-red-50 border border-red-200 text-red-700 font-semibold hover:bg-red-100 cursor-pointer"
                          >
                            Bounce
                          </button>
                        )}
                        {c.status === "bounced" && (
                          <span className="text-red-600 font-medium">Bounced & Reopened</span>
                        )}
                        {c.status === "cleared" && (
                          <span className="text-emerald-700 font-medium flex items-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5" /> Cleared
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bounce Modal */}
      {showBounceModal && selectedCheque && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <h3 className="font-bold text-slate-900 text-base">Mark Cheque Bounced</h3>
              </div>
              <button type="button" onClick={() => setShowBounceModal(false)} className="p-1 text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-800 space-y-1">
              <div className="font-semibold">Important Reversal Flow:</div>
              <p>
                Bouncing will reverse this payment, restore the original dues to unpaid/partial status,
                and mark receipt {selectedCheque.receipt_no} as bounced.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Reason for Bounce</label>
                <input
                  type="text"
                  placeholder="e.g. Insufficient funds / Signature mismatch"
                  value={bounceReason}
                  onChange={e => setBounceReason(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Add Bounce Charge to Student Dues (₹)
                </label>
                <input
                  type="number"
                  placeholder="500"
                  value={bounceChargeRs}
                  onChange={e => setBounceChargeRs(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-red-500"
                />
              </div>

              {errorMsg && <p className="text-xs text-red-600">{errorMsg}</p>}
            </div>

            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowBounceModal(false)}
                className="flex-1 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmBounce}
                disabled={bouncing}
                className="flex-1 py-2 rounded-xl bg-red-600 text-white text-xs font-semibold hover:bg-red-700 cursor-pointer disabled:opacity-50"
              >
                {bouncing ? "Processing..." : "Confirm Bounce"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

