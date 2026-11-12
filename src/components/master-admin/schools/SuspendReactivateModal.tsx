import React, { useState } from "react";
import type { MasterAdminSchoolSummary } from "../../../services/masterAdminSchoolService";
import { X, ShieldAlert, CheckCircle2, AlertTriangle, ShieldCheck, Lock } from "lucide-react";

interface Props {
  school: MasterAdminSchoolSummary;
  targetAction: "suspend" | "reactivate";
  onClose: () => void;
  onSuccess: () => void;
  token?: string | null;
}

export const SuspendReactivateModal: React.FC<Props> = ({
  school,
  targetAction,
  onClose,
  onSuccess,
  token,
}) => {
  const isSuspending = targetAction === "suspend";
  const [reasonCategory, setReasonCategory] = useState(
    isSuspending ? "Payment overdue" : "Administrative review"
  );
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const suspensionReasons = [
    "Payment overdue",
    "Terms violation",
    "Security concern",
    "Administrative review",
    "Institution request",
    "Other operational reason",
  ];

  const reactivationReasons = [
    "Payment verified and reconciled",
    "Security verification completed",
    "Administrative review resolved",
    "Contract renewal signed",
    "Institution request approved",
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalReason = notes.trim()
      ? `${reasonCategory}: ${notes.trim()}`
      : reasonCategory;

    if (!finalReason || finalReason.trim().length < 4) {
      setError("Please provide a valid operational justification.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/master-admin/schools/${school.id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token || "test-token-admin"}`,
        },
        body: JSON.stringify({
          status: isSuspending ? "suspended" : "active",
          reason: finalReason,
          notes: notes.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (json.success) {
        onSuccess();
        onClose();
      } else {
        setError(json.error || "Failed to update institution lifecycle status.");
      }
    } catch (err: any) {
      setError(err.message || "Network request failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                isSuspending
                  ? "bg-rose-50 text-rose-600"
                  : "bg-emerald-50 text-emerald-600"
              }`}
            >
              {isSuspending ? <ShieldAlert className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 font-heading">
                {isSuspending ? "Suspend Institution" : "Reactivate Institution"}
              </h3>
              <p className="text-xs text-slate-500">
                {school.name} ({school.institution_code})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Operational Behavior Notice */}
          {isSuspending ? (
            <div className="p-3.5 bg-rose-50/80 border border-rose-200/90 rounded-xl space-y-2 text-xs text-rose-900">
              <div className="flex items-center gap-2 font-bold text-rose-800">
                <Lock className="w-4 h-4" />
                <span>Suspension Lifecycle Safeguards</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-rose-700">
                <li>Immediate access restriction for School Admin, Teachers & Staff.</li>
                <li>Prevents new admissions, fee receipts, or student balance modifications.</li>
                <li>
                  <strong className="font-semibold text-rose-900">Zero data deletion:</strong> All records, invoices, student ledgers, and attendance remain fully preserved.
                </li>
              </ul>
            </div>
          ) : (
            <div className="p-3.5 bg-emerald-50/80 border border-emerald-200/90 rounded-xl space-y-2 text-xs text-emerald-900">
              <div className="flex items-center gap-2 font-bold text-emerald-800">
                <ShieldCheck className="w-4 h-4" />
                <span>Reactivation Verification</span>
              </div>
              <p className="text-[11px] text-emerald-700">
                School administrators and authorized staff will regain portal access. Note that expired subscriptions will remain expired and still require renewal.
              </p>
            </div>
          )}

          {/* Reason Category Dropdown */}
          <div className="space-y-1.5">
            <label htmlFor="suspend-reactivate-category" className="text-xs font-bold text-slate-700">Primary Reason</label>
            <select
              id="suspend-reactivate-category"
              name="reasonCategory"
              value={reasonCategory}
              onChange={(e) => setReasonCategory(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              {(isSuspending ? suspensionReasons : reactivationReasons).map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* Additional Notes */}
          <div className="space-y-1.5">
            <label htmlFor="suspend-reactivate-notes" className="text-xs font-bold text-slate-700">
              Additional Documentation & Notes
            </label>
            <textarea
              id="suspend-reactivate-notes"
              name="notes"
              rows={3}
              placeholder={
                isSuspending
                  ? "Detail the specific policy infraction, invoice overdue notice number, or administrative determination..."
                  : "Detail proof of resolution, payment wire reference, or approval ticket number..."
              }
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={`px-4 py-2 text-white rounded-xl text-xs font-bold shadow-xs transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer ${
                isSuspending
                  ? "bg-rose-600 hover:bg-rose-700"
                  : "bg-emerald-600 hover:bg-emerald-700"
              }`}
            >
              {isSuspending ? (
                <>
                  <ShieldAlert className="w-4 h-4" />
                  <span>{submitting ? "Suspending..." : "Confirm Suspension"}</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{submitting ? "Reactivating..." : "Reactivate Institution"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
