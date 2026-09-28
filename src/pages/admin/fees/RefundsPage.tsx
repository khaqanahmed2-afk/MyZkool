/**
 * RefundsPage — /admin/fees/refunds
 * Spec B5.8:
 * Status flow: requested, approved, paid (or rejected).
 * Actions: Request refund, Approve/Reject, Disburse refund (creates ledger entry).
 */

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Plus, RefreshCw, CheckCircle, XCircle, AlertCircle,
  Clock, DollarSign, Banknote, X
} from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { getRefunds, requestRefund, approveRefund, payRefund } from "../../../services/refundService";
import type { FeeRefund } from "../../../types/feeOperations";
import { FeeNavHeader } from "../../../components/admin/fees/FeeNavHeader";

function fmt(paise: number): string {
  return "₹" + (paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function RefundsPage() {
  const { schoolId, user } = useAuth();
  const navigate = useNavigate();

  const [refunds, setRefunds] = useState<FeeRefund[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("all");

  // Modal state
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [studentId, setStudentId] = useState("");
  const [amountRs, setAmountRs] = useState("");
  const [reason, setReason] = useState("");
  const [mode, setMode] = useState<"cash" | "bank_transfer" | "cheque" | "upi">("cash");
  const [yearId, setYearId] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!schoolId) return;
    const years = JSON.parse(localStorage.getItem(`myzkool_academic_years_${schoolId}`) || "[]");
    const cur = years.find((y: any) => y.is_current);
    if (cur) setYearId(cur.id);
  }, [schoolId]);

  const loadRefunds = async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      const data = await getRefunds(schoolId);
      setRefunds(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRefunds();
  }, [schoolId]);

  const filtered = refunds.filter(r => {
    if (activeTab === "all") return true;
    return r.status === activeTab;
  });

  const handleCreateRefund = async () => {
    if (!schoolId || !yearId) return;
    const paise = parseFloat(amountRs) ? Math.round(parseFloat(amountRs) * 100) : 0;
    if (paise <= 0) {
      setErrorMsg("Please enter a valid refund amount");
      return;
    }
    if (!reason || reason.trim().length < 5) {
      setErrorMsg("Reason is required (min 5 characters)");
      return;
    }

    const res = await requestRefund(schoolId, {
      student_id: studentId || "std-general",
      academic_year_id: yearId,
      amount_paise: paise,
      reason,
      payment_mode: mode,
    }, user?.id);

    if (res.success) {
      setShowRequestModal(false);
      setAmountRs("");
      setReason("");
      setStudentId("");
      await loadRefunds();
    } else {
      setErrorMsg(res.error || "Failed to submit refund request");
    }
  };

  const handleApprove = async (id: string) => {
    if (!schoolId) return;
    await approveRefund(schoolId, id, true, user?.id);
    await loadRefunds();
  };

  const handleReject = async (id: string) => {
    if (!schoolId) return;
    await approveRefund(schoolId, id, false, user?.id);
    await loadRefunds();
  };

  const handlePay = async (id: string) => {
    if (!schoolId) return;
    await payRefund(schoolId, id, "REF-" + Date.now().toString().slice(-6), user?.id);
    await loadRefunds();
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      <FeeNavHeader
        title="Refunds & Caution Deposits"
        subtitle="Manage caution deposit releases, excess credit refunds, and approvals."
        action={
          <button
            type="button"
            onClick={() => setShowRequestModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" /> Request Refund
          </button>
        }
      />

      {/* Tabs */}
      <div className="flex border-b border-[#E6EAF3] bg-white rounded-t-2xl px-4 pt-2">
        {["all", "requested", "approved", "paid", "rejected"].map(tab => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-3 text-xs font-semibold capitalize border-b-2 -mb-px cursor-pointer ${
              activeTab === tab
                ? "border-[#2158E0] text-[#2158E0]"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white border border-[#E6EAF3] rounded-2xl overflow-hidden shadow-2xs">
        {loading ? (
          <div className="py-16 text-center text-xs text-slate-400">Loading refunds...</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-slate-500 text-xs">No refunds found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#E6EAF3] bg-slate-50 text-slate-600 text-left">
                  <th className="py-3 px-4 font-semibold">Date</th>
                  <th className="py-3 px-4 font-semibold">Reason</th>
                  <th className="py-3 px-4 font-semibold">Mode</th>
                  <th className="py-3 px-4 font-semibold text-right">Amount</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6EAF3] text-slate-800">
                {filtered.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 text-slate-600">{r.created_at.split("T")[0]}</td>
                    <td className="py-3 px-4 font-medium text-slate-800">{r.reason}</td>
                    <td className="py-3 px-4 uppercase text-slate-600">{r.payment_mode}</td>
                    <td className="py-3 px-4 text-right font-bold tabular-nums text-slate-900">{fmt(r.amount_paise)}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize ${
                        r.status === "paid" ? "bg-green-50 text-green-700" :
                        r.status === "approved" ? "bg-blue-50 text-blue-700" :
                        r.status === "rejected" ? "bg-red-50 text-red-700" :
                        "bg-amber-50 text-amber-700"
                      }`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {r.status === "requested" && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleApprove(r.id)}
                              className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-semibold hover:bg-emerald-100 cursor-pointer"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => handleReject(r.id)}
                              className="px-2 py-1 rounded-lg bg-red-50 text-red-700 font-semibold hover:bg-red-100 cursor-pointer"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {r.status === "approved" && (
                          <button
                            type="button"
                            onClick={() => handlePay(r.id)}
                            className="px-2.5 py-1 rounded-lg bg-[#2158E0] text-white font-semibold hover:bg-[#1A46B8] cursor-pointer"
                          >
                            Disburse Cash / Transfer
                          </button>
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

      {/* Request Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">Request Fee Refund</h3>
              <button type="button" onClick={() => setShowRequestModal(false)} className="p-1 text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Amount (₹)</label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={amountRs}
                  onChange={e => setAmountRs(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-[#2158E0]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Disbursement Mode</label>
                <select
                  value={mode}
                  onChange={e => setMode(e.target.value as any)}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-white focus:outline-none focus:border-[#2158E0]"
                >
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cheque">Cheque</option>
                  <option value="upi">UPI</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Reason (Required)</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Caution deposit refund on graduation / Withdrawal"
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-[#2158E0] resize-none"
                />
              </div>

              {errorMsg && <p className="text-xs text-red-600">{errorMsg}</p>}
            </div>

            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowRequestModal(false)}
                className="flex-1 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateRefund}
                className="flex-1 py-2 rounded-xl bg-[#2158E0] text-white text-xs font-semibold hover:bg-[#1A46B8] cursor-pointer"
              >
                Submit Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

