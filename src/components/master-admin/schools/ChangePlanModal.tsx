import React, { useState } from "react";
import type { MasterAdminSchoolSummary } from "../../../services/masterAdminSchoolService";
import { X, ArrowUpCircle, Check, AlertCircle } from "lucide-react";

interface Props {
  school: MasterAdminSchoolSummary;
  onClose: () => void;
  onSuccess: () => void;
  token?: string | null;
}

export const ChangePlanModal: React.FC<Props> = ({ school, onClose, onSuccess, token }) => {
  const [selectedPlan, setSelectedPlan] = useState<"basic" | "pro" | "custom">("pro");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("yearly");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const plans = [
    {
      slug: "basic" as const,
      name: "Basic Plan",
      pricing: "₹999/mo (₹10,789/yr)",
      students: "Up to 800 students",
      storage: "25 GB Storage",
      modules: "Website, Admissions, Attendance, Fees, Communication",
    },
    {
      slug: "pro" as const,
      name: "Pro Plan",
      pricing: "₹1,799/mo (₹19,429/yr)",
      students: "Up to 1,800 students",
      storage: "50 GB Storage",
      modules: "Everything in Basic + Exams, Timetable, Bus Transport, Reports, Approvals",
      popular: true,
    },
    {
      slug: "custom" as const,
      name: "Custom Enterprise",
      pricing: "Tailored / Annual Invoice",
      students: "5,000+ students",
      storage: "100+ GB Storage",
      modules: "Full ERP + Multi-branch, Custom MIS, Dedicated Support",
    },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim() || reason.trim().length < 5) {
      setError("Please provide a valid administrative justification (min 5 characters).");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/master-admin/schools/${school.id}/subscription/change-plan`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token || "test-token-admin"}`,
        },
        body: JSON.stringify({
          newPlanSlug: selectedPlan,
          billingCycle,
          reason: reason.trim(),
        }),
      });

      const json = await res.json();
      if (json.success) {
        onSuccess();
        onClose();
      } else {
        setError(json.error || "Failed to update subscription plan.");
      }
    } catch (err: any) {
      setError(err.message || "Network request failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <ArrowUpCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 font-heading">
                Change Subscription Plan
              </h3>
              <p className="text-xs text-slate-500">
                {school.name} ({school.institution_code})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Current Plan Indicator */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex justify-between items-center">
            <span className="text-slate-500">Current Plan:</span>
            <span className="font-bold text-slate-800">{school.current_plan_name} ({school.billing_cycle})</span>
          </div>

          {/* Plan Options */}
          <div className="space-y-2.5">
            <label className="block text-xs font-bold text-slate-700">Select Target Plan</label>
            <div className="grid grid-cols-1 gap-2.5">
              {plans.map((p) => {
                const isSelected = selectedPlan === p.slug;
                return (
                  <button
                    type="button"
                    key={p.slug}
                    onClick={() => setSelectedPlan(p.slug)}
                    className={`p-3.5 rounded-xl border text-xs cursor-pointer transition-colors text-left w-full ${
                      isSelected
                        ? "border-indigo-600 bg-indigo-50/40 ring-1 ring-indigo-600"
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{p.name}</span>
                        {p.popular && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700">
                            Recommended
                          </span>
                        )}
                      </div>
                      <span className="font-semibold text-slate-700">{p.pricing}</span>
                    </div>
                    <p className="text-slate-600 font-medium">{p.students} • {p.storage}</p>
                    <p className="text-[11px] text-slate-500 mt-1">{p.modules}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Billing Cycle */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Billing Cadence</label>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setBillingCycle("monthly")}
                className={`py-2 px-3 rounded-xl border font-semibold transition-colors cursor-pointer ${
                  billingCycle === "monthly"
                    ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                Monthly Billing
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle("yearly")}
                className={`py-2 px-3 rounded-xl border font-semibold transition-colors cursor-pointer ${
                  billingCycle === "yearly"
                    ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                Annual Billing (Save ~10%)
              </button>
            </div>
          </div>

          {/* Administrative Reason */}
          <div>
            <label htmlFor="change-plan-reason" className="block text-xs font-bold text-slate-700 mb-1">
              Operational Justification <span className="text-rose-500">*</span>
            </label>
            <textarea
              id="change-plan-reason"
              name="reason"
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Institutional upgrade approved for academic year expansion..."
              className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs disabled:opacity-50 cursor-pointer transition-colors"
            >
              {submitting ? "Updating Plan..." : "Confirm & Execute Plan Change"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

