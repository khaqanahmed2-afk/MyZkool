import React, { useState } from "react";
import type { MasterAdminSchoolSummary } from "../../../services/masterAdminSchoolService";
import {
  Rocket,
  X,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Loader2,
  Building,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Layers,
  ArrowRight,
} from "lucide-react";

interface Props {
  school: MasterAdminSchoolSummary;
  onClose: () => void;
  onSuccess: () => void;
  token?: string | null;
}

export const OnboardingReviewModal: React.FC<Props> = ({
  school,
  onClose,
  onSuccess,
  token,
}) => {
  const [decision, setDecision] = useState<"approve" | "reject">("approve");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (decision === "reject" && (!reason || reason.trim().length < 5)) {
      setError("Please provide a detailed rejection reason (minimum 5 characters).");
      return;
    }

    setIsSubmitting(true);

    try {
      const endpoint = decision === "approve"
        ? `/api/master-admin/schools/${school.id}/onboarding/approve`
        : `/api/master-admin/schools/${school.id}/onboarding/reject`;

      const payload = decision === "approve"
        ? { notes: notes.trim() }
        : { reason: reason.trim() };

      const res = await fetch(endpoint, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to process onboarding decision.");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to process onboarding decision.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
              <Rocket className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 font-heading">Onboarding Application Review</h3>
              <p className="text-[11px] text-slate-500 font-medium">
                {school.name} ({school.institution_code})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* School Details Brief */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-500">Board Affiliation:</span>
              <span className="font-bold text-slate-800 uppercase">{school.affiliation_board || "CBSE"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-500">Subdomain:</span>
              <span className="font-mono text-indigo-600 font-bold">{school.subdomain}.myzkool.com</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-500">Official Email:</span>
              <span className="font-medium text-slate-800">{school.official_email}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-500">Contact Phone:</span>
              <span className="font-medium text-slate-800">{school.contact_phone}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-500">Location:</span>
              <span className="font-medium text-slate-800">{school.city}, {school.state} - {school.pin_code}</span>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
              <span className="font-semibold text-slate-500">Onboarding Stage:</span>
              <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                Step {school.onboarding_step || 1} of 8
              </span>
            </div>
          </div>

          {/* Decision Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Administrative Decision</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDecision("approve")}
                className={`p-2.5 rounded-xl border text-left text-xs font-semibold flex items-center gap-2 transition-all ${
                  decision === "approve"
                    ? "border-emerald-500 bg-emerald-50/50 text-emerald-900 ring-2 ring-emerald-500/20"
                    : "border-slate-200 hover:bg-slate-50 text-slate-700"
                }`}
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Approve & Activate</span>
              </button>

              <button
                type="button"
                onClick={() => setDecision("reject")}
                className={`p-2.5 rounded-xl border text-left text-xs font-semibold flex items-center gap-2 transition-all ${
                  decision === "reject"
                    ? "border-rose-500 bg-rose-50/50 text-rose-900 ring-2 ring-rose-500/20"
                    : "border-slate-200 hover:bg-slate-50 text-slate-700"
                }`}
              >
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>Reject / Flag Issues</span>
              </button>
            </div>
          </div>

          {decision === "approve" ? (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Approval Notes (Optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Institutional profile verified, KYC verified, tenant activated..."
                rows={3}
                className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-800 placeholder-slate-400 font-medium"
              />
            </div>
          ) : (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-rose-700 flex items-center gap-1">
                <Lock className="w-3 h-3 text-rose-500" />
                <span>Rejection Reason (Mandatory Audit Trail)</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Discrepancy in affiliation documents or contact details..."
                rows={3}
                className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-slate-800 placeholder-slate-400 font-medium"
              />
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || (decision === "reject" && !reason.trim())}
              className={`px-4 py-2 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer ${
                decision === "approve"
                  ? "bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
                  : "bg-rose-600 hover:bg-rose-700 disabled:opacity-50"
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : decision === "approve" ? (
                <span>Complete Approval & Activate</span>
              ) : (
                <span>Confirm Rejection</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
