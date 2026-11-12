import React, { useState } from "react";
import type { MasterAdminSchoolSummary } from "../../../services/masterAdminSchoolService";
import { X, CalendarPlus, Calendar, AlertCircle, CreditCard, Gift, ShieldCheck } from "lucide-react";

interface Props {
  school: MasterAdminSchoolSummary;
  onClose: () => void;
  onSuccess: () => void;
  token?: string | null;
}

export const ExtendSubscriptionModal: React.FC<Props> = ({
  school,
  onClose,
  onSuccess,
  token,
}) => {
  const [days, setDays] = useState<number>(30);
  const [customDays, setCustomDays] = useState<string>("");
  const [classification, setClassification] = useState<"paid" | "complimentary">("complimentary");
  const [paymentReference, setPaymentReference] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const effectiveDays = customDays ? parseInt(customDays, 10) || 0 : days;

  // Calculate new validity expiration date
  const currentExpiry = school.subscription_valid_till
    ? new Date(school.subscription_valid_till)
    : new Date();
  const baseTime = currentExpiry.getTime() > Date.now() ? currentExpiry.getTime() : Date.now();
  const calculatedNewExpiry = new Date(baseTime + effectiveDays * 86400000);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (effectiveDays <= 0) {
      setError("Please choose or enter a valid number of subscription extension days.");
      return;
    }
    if (classification === "paid" && (!paymentReference.trim() || paymentReference.trim().length < 4)) {
      setError("Please provide a valid verified payment transaction reference / receipt ID.");
      return;
    }
    if (!reason.trim() || reason.trim().length < 5) {
      setError("Please provide an administrative justification (min 5 characters).");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/master-admin/schools/${school.id}/subscription/extend-validity`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token || "test-token-admin"}`,
        },
        body: JSON.stringify({
          additionalDays: effectiveDays,
          classification,
          paymentReference: classification === "paid" ? paymentReference.trim() : undefined,
          reason: reason.trim(),
        }),
      });

      const json = await res.json();
      if (json.success) {
        onSuccess();
        onClose();
      } else {
        setError(json.error || "Failed to extend subscription validity.");
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
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <CalendarPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 font-heading">
                Extend Subscription Validity
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Current Expiry Info */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Current Plan:</span>
              <span className="font-bold text-slate-800">{school.current_plan_name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Current Valid Till:</span>
              <span className="font-bold text-slate-900">
                {school.subscription_valid_till_formatted || "N/A"}
              </span>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-slate-200/80">
              <span className="text-purple-700 font-semibold">New Calculated Expiry:</span>
              <span className="font-bold text-purple-700 font-mono">
                {calculatedNewExpiry.toLocaleDateString("en-US", {
                  month: "short",
                  day: "2-digit",
                  year: "numeric",
                })}
              </span>
            </div>
          </div>

          {/* Extension Duration Chips */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Add Validity Duration</label>
            <div className="grid grid-cols-4 gap-2">
              {[7, 15, 30, 90].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => {
                    setDays(d);
                    setCustomDays("");
                  }}
                  className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                    !customDays && days === d
                      ? "bg-purple-600 border-purple-600 text-white shadow-xs"
                      : "bg-white border-slate-200 text-slate-700 hover:border-purple-300"
                  }`}
                >
                  +{d} days
                </button>
              ))}
            </div>
            <div className="mt-2">
              <input
                id="extend-sub-custom-days"
                name="customDays"
                type="number"
                min="1"
                aria-label="Custom number of days"
                placeholder="Or enter custom number of days..."
                value={customDays}
                onChange={(e) => setCustomDays(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
              />
            </div>
          </div>

          {/* Classification: Paid vs Complimentary */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Operation Classification</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setClassification("complimentary")}
                className={`p-2.5 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                  classification === "complimentary"
                    ? "bg-purple-50/70 border-purple-300 text-purple-900"
                    : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
                }`}
              >
                <Gift className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold">Complimentary</p>
                  <p className="text-[10px] text-slate-500">Administrative concession</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setClassification("paid")}
                className={`p-2.5 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                  classification === "paid"
                    ? "bg-emerald-50/70 border-emerald-300 text-emerald-900"
                    : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
                }`}
              >
                <CreditCard className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold">Paid Extension</p>
                  <p className="text-[10px] text-slate-500">Invoice / Wire receipt</p>
                </div>
              </button>
            </div>
          </div>

          {/* Payment Reference (if paid) */}
          {classification === "paid" && (
            <div className="space-y-1.5 animate-in fade-in duration-150">
              <label htmlFor="extend-sub-payment-ref" className="text-xs font-bold text-slate-700">Payment Reference / UTR / Receipt No</label>
              <input
                id="extend-sub-payment-ref"
                name="paymentReference"
                type="text"
                required
                placeholder="e.g. UTR-HDFC-9842104928"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>
          )}

          {/* Administrative Reason */}
          <div className="space-y-1.5">
            <label htmlFor="extend-sub-reason" className="text-xs font-bold text-slate-700">Administrative Reason & Notes</label>
            <textarea
              id="extend-sub-reason"
              name="reason"
              required
              rows={2}
              placeholder="e.g. Approved 30-day goodwill grace period pending board approval..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 resize-none"
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
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{submitting ? "Extending..." : `Grant +${effectiveDays} Days`}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
