import React, { useState } from "react";
import type { MasterAdminSchoolSummary } from "../../../services/masterAdminSchoolService";
import {
  Layers,
  X,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Loader2,
  Calendar,
  ShieldAlert,
  ArrowUpCircle,
} from "lucide-react";

interface Props {
  selectedSchools: MasterAdminSchoolSummary[];
  onClose: () => void;
  onSuccess: () => void;
  token?: string | null;
}

export const BulkActionModal: React.FC<Props> = ({
  selectedSchools,
  onClose,
  onSuccess,
  token,
}) => {
  const [action, setAction] = useState<"activate" | "suspend" | "change_plan" | "extend_subscription">("activate");
  const [reason, setReason] = useState("");
  const [planSlug, setPlanSlug] = useState<"basic" | "pro" | "custom">("pro");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "six_months" | "yearly">("yearly");
  const [additionalDays, setAdditionalDays] = useState(30);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultsSummary, setResultsSummary] = useState<{
    successful: number;
    failed: number;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason || reason.trim().length < 5) {
      setError("Please provide a detailed administrative justification (minimum 5 characters).");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const schoolIds = selectedSchools.map((s) => s.id);
      const res = await fetch("/api/master-admin/schools/bulk-action", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action,
          schoolIds,
          reason: reason.trim(),
          planSlug: action === "change_plan" ? planSlug : undefined,
          billingCycle: action === "change_plan" ? billingCycle : undefined,
          additionalDays: action === "extend_subscription" ? additionalDays : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Bulk action execution failed.");
      }

      setResultsSummary({
        successful: data.successful,
        failed: data.failed,
      });

      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Failed to execute bulk operation.");
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
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 font-heading">Bulk Institutional Action</h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Targeting <strong className="text-slate-800">{selectedSchools.length}</strong> selected institutions
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

        {resultsSummary ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-100">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-900">Bulk Operation Completed</h4>
            <p className="text-xs text-slate-600">
              Successfully updated <strong className="text-emerald-600">{resultsSummary.successful}</strong> institutions
              {resultsSummary.failed > 0 && (
                <> (<span className="text-rose-600">{resultsSummary.failed} failed</span>)</>
              )}.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Action Type Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Select Operation</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAction("activate")}
                  className={`p-2.5 rounded-xl border text-left text-xs font-semibold flex items-center gap-2 transition-all ${
                    action === "activate"
                      ? "border-emerald-500 bg-emerald-50/50 text-emerald-900 ring-2 ring-emerald-500/20"
                      : "border-slate-200 hover:bg-slate-50 text-slate-700"
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Bulk Activate</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAction("suspend")}
                  className={`p-2.5 rounded-xl border text-left text-xs font-semibold flex items-center gap-2 transition-all ${
                    action === "suspend"
                      ? "border-rose-500 bg-rose-50/50 text-rose-900 ring-2 ring-rose-500/20"
                      : "border-slate-200 hover:bg-slate-50 text-slate-700"
                  }`}
                >
                  <ShieldAlert className="w-4 h-4 text-rose-600" />
                  <span>Bulk Suspend</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAction("change_plan")}
                  className={`p-2.5 rounded-xl border text-left text-xs font-semibold flex items-center gap-2 transition-all ${
                    action === "change_plan"
                      ? "border-indigo-500 bg-indigo-50/50 text-indigo-900 ring-2 ring-indigo-500/20"
                      : "border-slate-200 hover:bg-slate-50 text-slate-700"
                  }`}
                >
                  <ArrowUpCircle className="w-4 h-4 text-indigo-600" />
                  <span>Change Plan Tier</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAction("extend_subscription")}
                  className={`p-2.5 rounded-xl border text-left text-xs font-semibold flex items-center gap-2 transition-all ${
                    action === "extend_subscription"
                      ? "border-purple-500 bg-purple-50/50 text-purple-900 ring-2 ring-purple-500/20"
                      : "border-slate-200 hover:bg-slate-50 text-slate-700"
                  }`}
                >
                  <Calendar className="w-4 h-4 text-purple-600" />
                  <span>Extend Validity</span>
                </button>
              </div>
            </div>

            {/* Action Specific Fields */}
            {action === "change_plan" && (
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700">Target Plan</label>
                  <select
                    value={planSlug}
                    onChange={(e) => setPlanSlug(e.target.value as any)}
                    className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg font-medium"
                  >
                    <option value="basic">Basic Plan (800 students)</option>
                    <option value="pro">Pro Plan (1,800 students)</option>
                    <option value="custom">Custom Enterprise (5,000 students)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700">Billing Cycle</label>
                  <select
                    value={billingCycle}
                    onChange={(e) => setBillingCycle(e.target.value as any)}
                    className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg font-medium"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="six_months">Semi-Annual</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
              </div>
            )}

            {action === "extend_subscription" && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                <label className="text-[11px] font-bold text-slate-700">Additional Days</label>
                <div className="flex gap-2">
                  {[15, 30, 60, 90, 180, 365].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setAdditionalDays(d)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border ${
                        additionalDays === d
                          ? "bg-purple-600 text-white border-purple-600"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      +{d}d
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Audit Justification */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <Lock className="w-3 h-3 text-amber-500" />
                <span>Administrative Justification (Mandatory Audit Trail)</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Reason for executing this bulk action across the selected institutions..."
                rows={3}
                className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 placeholder-slate-400 font-medium"
              />
            </div>

            {/* Selected Institutions List Preview */}
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 max-h-24 overflow-y-auto space-y-1">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Targeted Institutions:</p>
              <div className="flex flex-wrap gap-1">
                {selectedSchools.map((s) => (
                  <span key={s.id} className="text-[10px] font-medium bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-700">
                    {s.name} ({s.institution_code})
                  </span>
                ))}
              </div>
            </div>

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
                disabled={isSubmitting || !reason.trim()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Executing...</span>
                  </>
                ) : (
                  <span>Apply Bulk Action</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
