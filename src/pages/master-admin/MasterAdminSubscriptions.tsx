import React, { useState, useEffect } from "react";
import { useMasterAdminAuth } from "../../context/MasterAdminAuthContext";
import {
  CreditCard,
  Check,
  Edit2,
  Users,
  ShieldCheck,
  AlertCircle,
  Calendar,
  Layers,
  Sparkles,
} from "lucide-react";

export default function MasterAdminSubscriptions() {
  const { token, hasPermission } = useMasterAdminAuth();

  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit Modal State
  const [editingPlan, setEditingPlan] = useState<any | null>(null);
  const [editPriceMonthly, setEditPriceMonthly] = useState<number | string>("");
  const [editPriceSixMonths, setEditPriceSixMonths] = useState<number | string>("");
  const [editPriceYearly, setEditPriceYearly] = useState<number | string>("");
  const [editMaxStudents, setEditMaxStudents] = useState<number | string>("");
  const [editTrialDays, setEditTrialDays] = useState<number | string>(14);
  const [isSaving, setIsSaving] = useState(false);

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/master-admin/subscriptions/plans", {
        headers: {
          Authorization: `Bearer ${token || "test-token-admin"}`,
        },
      });
      const json = await res.json();
      if (json.success && json.data) {
        setPlans(json.data);
      }
    } catch (err) {
      console.warn("Failed to fetch subscription plans:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, [token]);

  const openEditModal = (plan: any) => {
    setEditingPlan(plan);
    setEditPriceMonthly(plan.price_monthly ?? "");
    setEditPriceSixMonths(plan.price_six_months ?? "");
    setEditPriceYearly(plan.price_yearly ?? "");
    setEditMaxStudents(plan.max_students ?? "");
    setEditTrialDays(plan.trial_days ?? 14);
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;
    setIsSaving(true);

    try {
      const res = await fetch(`/api/master-admin/subscriptions/plans/${editingPlan.id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token || "test-token-admin"}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          price_monthly: editPriceMonthly ? Number(editPriceMonthly) : null,
          price_six_months: editPriceSixMonths ? Number(editPriceSixMonths) : null,
          price_yearly: editPriceYearly ? Number(editPriceYearly) : null,
          max_students: editMaxStudents ? Number(editMaxStudents) : null,
          trial_days: Number(editTrialDays) || 14,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setEditingPlan(null);
        fetchPlans();
      } else {
        alert(json.error || "Failed to update subscription plan.");
      }
    } catch (err: any) {
      alert(err.message || "Request failed.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Page Header ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight font-heading">
            Subscription Plans & Entitlements
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Manage SaaS pricing tiers, student quotas, trial durations, and module access.
          </p>
        </div>
      </div>

      {/* ── Plan Cards Grid ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-3 py-16 text-center text-slate-400">Loading subscription plans...</div>
        ) : (
          plans.map((plan) => {
            const isPro = plan.slug === "pro";

            return (
              <div
                key={plan.id}
                className={`bg-white rounded-2xl border p-6 shadow-2xs flex flex-col justify-between relative transition-all duration-300 hover:shadow-md ${
                  isPro ? "border-blue-500/80 ring-2 ring-blue-500/20" : "border-slate-200/80"
                }`}
              >
                {isPro && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-bold tracking-wide shadow-sm uppercase">
                      <Sparkles className="w-3 h-3" /> Most Popular
                    </span>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-base font-bold text-slate-900 font-heading">{plan.name}</h3>
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold text-[10px]">
                      {plan.subscriber_count || 0} Schools
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 leading-relaxed mb-4 min-h-[36px]">
                    {plan.description}
                  </p>

                  {/* Pricing Display */}
                  <div className="mb-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
                    {plan.price_monthly ? (
                      <div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-bold text-slate-900 font-heading">
                            ₹{plan.price_monthly.toLocaleString("en-IN")}
                          </span>
                          <span className="text-xs text-slate-500">/ month</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1 space-y-0.5 font-medium">
                          <p>6 Months: ₹{plan.price_six_months?.toLocaleString("en-IN")} (5% off)</p>
                          <p>Annual: ₹{plan.price_yearly?.toLocaleString("en-IN")} (10% off)</p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-2">
                        <span className="text-lg font-bold text-slate-800">Custom Quote</span>
                        <p className="text-[11px] text-slate-400">Multi-branch enterprise agreements</p>
                      </div>
                    )}
                  </div>

                  {/* Quotas */}
                  <div className="space-y-2 mb-5 pb-5 border-b border-slate-100 text-xs">
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="font-medium">Student Capacity:</span>
                      <span className="font-bold text-slate-900">{plan.student_capacity_label}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="font-medium">Trial Duration:</span>
                      <span className="font-bold text-slate-900">{plan.trial_days} days</span>
                    </div>
                  </div>

                  {/* Features List */}
                  <div className="space-y-2 mb-6">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                      Included Entitlements
                    </p>
                    {Array.isArray(plan.features) &&
                      plan.features.map((feat: string, idx: number) => (
                        <div key={idx} className="flex items-start gap-2 text-xs text-slate-700">
                          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <span className="leading-snug font-medium">{feat}</span>
                        </div>
                      ))}
                  </div>
                </div>

                {hasPermission("subscriptions.manage") && (
                  <button
                    onClick={() => openEditModal(plan)}
                    className="w-full flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit Plan Terms & Quotas</span>
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ── Edit Plan Modal ─────────────────────────────────────────── */}
      {editingPlan && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 font-heading">
              Edit {editingPlan.name}
            </h3>

            <form onSubmit={handleSavePlan} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="plan-price-monthly" className="block text-xs font-semibold text-slate-700 mb-1">
                    Monthly Price (INR)
                  </label>
                  <input
                    id="plan-price-monthly"
                    name="priceMonthly"
                    type="number"
                    value={editPriceMonthly}
                    onChange={(e) => setEditPriceMonthly(e.target.value)}
                    placeholder="999"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label htmlFor="plan-price-six-months" className="block text-xs font-semibold text-slate-700 mb-1">
                    6 Months Price (INR)
                  </label>
                  <input
                    id="plan-price-six-months"
                    name="priceSixMonths"
                    type="number"
                    value={editPriceSixMonths}
                    onChange={(e) => setEditPriceSixMonths(e.target.value)}
                    placeholder="5694"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label htmlFor="plan-price-yearly" className="block text-xs font-semibold text-slate-700 mb-1">
                    Yearly Price (INR)
                  </label>
                  <input
                    id="plan-price-yearly"
                    name="priceYearly"
                    type="number"
                    value={editPriceYearly}
                    onChange={(e) => setEditPriceYearly(e.target.value)}
                    placeholder="10789"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label htmlFor="plan-max-students" className="block text-xs font-semibold text-slate-700 mb-1">
                    Max Students Limit
                  </label>
                  <input
                    id="plan-max-students"
                    name="maxStudents"
                    type="number"
                    value={editMaxStudents}
                    onChange={(e) => setEditMaxStudents(e.target.value)}
                    placeholder="800"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label htmlFor="plan-trial-days" className="block text-xs font-semibold text-slate-700 mb-1">
                    Trial Duration (Days)
                  </label>
                  <input
                    id="plan-trial-days"
                    name="trialDays"
                    type="number"
                    value={editTrialDays}
                    onChange={(e) => setEditTrialDays(e.target.value)}
                    placeholder="14"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingPlan(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isSaving ? "Saving Changes..." : "Save Plan Terms"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

