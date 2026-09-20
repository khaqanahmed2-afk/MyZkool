import React, { useEffect, useState, useCallback } from "react";
import { Loader2, CheckCircle2, XCircle, AlertCircle, Shield, KeyRound } from "lucide-react";
import {
  getPendingApprovals, getAllApprovals, approveRequest, rejectRequest, approveByOwnerPin,
} from "../../../services/approvalService";
import type { ApprovalRequest, ApprovalKind } from "../../../types/fees";
import { useAuth } from "../../../hooks/useAuth";

const KIND_LABELS: Record<ApprovalKind, string> = {
  discount: "Discount",
  receipt_cancel: "Receipt Cancellation",
  refund: "Refund",
  backdate: "Backdating",
  late_fee_waiver: "Late Fee Waiver",
  tc_override: "TC Override",
  structure_change: "Structure Change",
};

const KIND_COLORS: Record<ApprovalKind, string> = {
  discount: "bg-blue-50 text-blue-700",
  receipt_cancel: "bg-orange-50 text-orange-700",
  refund: "bg-purple-50 text-purple-700",
  backdate: "bg-yellow-50 text-yellow-700",
  late_fee_waiver: "bg-teal-50 text-teal-700",
  tc_override: "bg-red-50 text-red-700",
  structure_change: "bg-pink-50 text-pink-700",
};

export default function ApprovalsPage() {
  const { school, profile } = useAuth() as any;
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const [actionId, setActionId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [pinModal, setPinModal] = useState<{ open: boolean; requestId: string | null }>({ open: false, requestId: null });
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!school?.id) return;
    setLoading(true);
    const { requests: r } = filter === "pending"
      ? await getPendingApprovals(school.id)
      : await getAllApprovals(school.id);
    setRequests(r);
    setLoading(false);
  }, [school?.id, filter]);

  useEffect(() => { load(); }, [load]);

  async function handleApprove(id: string) {
    setActionLoading(id);
    const { error: e } = await approveRequest(school.id, id, profile?.id, note || undefined);
    if (e) setError(e); else await load();
    setActionLoading(null);
    setActionId(null);
    setNote("");
  }

  async function handleReject(id: string) {
    if (!note.trim()) { setError("A note is required to reject."); return; }
    setActionLoading(id);
    const { error: e } = await rejectRequest(school.id, id, profile?.id, note);
    if (e) setError(e); else await load();
    setActionLoading(null);
    setActionId(null);
    setNote("");
  }

  async function handlePinApprove() {
    if (!pinModal.requestId) return;
    setActionLoading(pinModal.requestId);
    const { ok, locked, error: e } = await approveByOwnerPin(school.id, pinModal.requestId, pin, profile?.id);
    if (!ok) {
      setPinError(e ?? "Invalid PIN");
      if (locked) { setPinModal({ open: false, requestId: null }); setPin(""); }
    } else {
      setPinModal({ open: false, requestId: null });
      setPin(""); setPinError(null);
      await load();
    }
    setActionLoading(null);
  }

  const pendingCount = requests.filter(r => r.status === "pending").length;

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-[#141A2E]">Approvals</h1>
          {pendingCount > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{pendingCount}</span>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={() => setFilter("pending")}
            className={`text-sm px-4 py-2 rounded-lg border transition-colors ${filter === "pending" ? "bg-[#2158E0] text-white border-[#2158E0]" : "border-[#E6EAF3] text-[#5B6478] hover:bg-gray-50"}`}>
            Pending
          </button>
          <button onClick={() => setFilter("all")}
            className={`text-sm px-4 py-2 rounded-lg border transition-colors ${filter === "all" ? "bg-[#2158E0] text-white border-[#2158E0]" : "border-[#E6EAF3] text-[#5B6478] hover:bg-gray-50"}`}>
            All
          </button>
        </div>
      </div>

      {error && <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 text-red-600 text-sm flex gap-2"><AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />{error}<button onClick={() => setError(null)} className="ml-auto text-red-400">×</button></div>}

      {loading ? (
        <div className="flex items-center justify-center py-20 text-[#5B6478]"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…</div>
      ) : requests.length === 0 ? (
        <div className="bg-white border border-[#E6EAF3] rounded-xl py-16 text-center">
          <Shield className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          <p className="text-[#141A2E] font-medium mb-1">
            {filter === "pending" ? "No pending approvals" : "No approval requests yet"}
          </p>
          <p className="text-[#5B6478] text-sm">
            {filter === "pending" ? "All caught up! Pending requests will appear here." : "Approval requests from discounts, cancellations and other actions will appear here."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map(req => (
            <div key={req.id} className="bg-white border border-[#E6EAF3] rounded-xl p-5">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex items-center gap-3">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${KIND_COLORS[req.kind]}`}>
                    {KIND_LABELS[req.kind]}
                  </span>
                  {req.status !== "pending" && (
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${req.status === "approved" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
                      {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                    </span>
                  )}
                </div>
                <span className="text-xs text-[#5B6478] shrink-0">
                  {new Date(req.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </span>
              </div>

              {req.payload?.impact_summary && (
                <p className="text-sm text-[#141A2E] mb-2">{String(req.payload.impact_summary)}</p>
              )}

              {req.decision_note && (
                <p className="text-xs text-[#5B6478] italic mb-2">"{req.decision_note}"</p>
              )}

              {req.status === "pending" && (
                <div className="mt-3 border-t border-[#E6EAF3] pt-3">
                  {actionId === req.id ? (
                    <div className="space-y-2">
                      <input
                        className="w-full border border-[#E6EAF3] rounded-lg px-3 py-2 text-sm focus:border-[#2158E0] outline-none"
                        placeholder="Note (required for rejection)"
                        value={note}
                        onChange={e => setNote(e.target.value)}
                      />
                      <div className="flex gap-2">
                        <button onClick={() => { setActionId(null); setNote(""); }} className="text-sm px-3 py-1.5 border border-[#E6EAF3] rounded-lg text-[#5B6478]">Cancel</button>
                        <button onClick={() => handleReject(req.id)} disabled={actionLoading === req.id}
                          className="text-sm px-3 py-1.5 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-60 flex items-center gap-1">
                          {actionLoading === req.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />} Reject
                        </button>
                        <button onClick={() => handleApprove(req.id)} disabled={actionLoading === req.id}
                          className="text-sm px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-60 flex items-center gap-1">
                          {actionLoading === req.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />} Approve
                        </button>
                        <button onClick={() => { setPinModal({ open: true, requestId: req.id }); setPin(""); setPinError(null); }}
                          className="text-sm px-3 py-1.5 border border-amber-200 text-amber-700 rounded-lg hover:bg-amber-50 flex items-center gap-1">
                          <KeyRound className="w-3.5 h-3.5" /> PIN Override
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setActionId(req.id)}
                      className="text-sm px-4 py-1.5 border border-[#E6EAF3] rounded-lg text-[#5B6478] hover:bg-gray-50">
                      Review
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* PIN modal */}
      {pinModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-80 p-6">
            <div className="flex items-center gap-2 mb-4">
              <KeyRound className="w-5 h-5 text-amber-600" />
              <h3 className="text-base font-bold text-[#141A2E]">Owner PIN Override</h3>
            </div>
            {pinError && <div className="mb-3 bg-red-50 border border-red-200 rounded-lg p-2 text-red-600 text-xs">{pinError}</div>}
            <p className="text-sm text-[#5B6478] mb-3">Enter the owner PIN to approve this request. Rate-limited to 5 attempts.</p>
            <input
              type="password"
              inputMode="numeric"
              maxLength={8}
              className="w-full border border-[#E6EAF3] rounded-lg px-3 py-2 text-sm focus:border-[#2158E0] outline-none text-center tracking-widest text-xl mb-4"
              value={pin}
              onChange={e => setPin(e.target.value.replace(/\D/g, ""))}
              placeholder="• • • •"
              autoFocus
            />
            <div className="flex gap-3">
              <button onClick={() => { setPinModal({ open: false, requestId: null }); setPin(""); setPinError(null); }}
                className="flex-1 px-4 py-2 border border-[#E6EAF3] rounded-lg text-sm text-[#5B6478]">Cancel</button>
              <button onClick={handlePinApprove} disabled={!pin || actionLoading !== null}
                className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium disabled:opacity-60 flex items-center justify-center gap-2">
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Approve
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

