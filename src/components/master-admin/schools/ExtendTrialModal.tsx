import React, { useState } from "react";
import type { MasterAdminSchoolSummary } from "../../../services/masterAdminSchoolService";
import { X, Clock, Calendar, AlertCircle } from "lucide-react";

interface Props {
  school: MasterAdminSchoolSummary;
  onClose: () => void;
  onSuccess: () => void;
  token?: string | null;
}

export const ExtendTrialModal: React.FC<Props> = ({ school, onClose, onSuccess, token }) => {
  const [days, setDays] = useState<number>(7);
  const [customDays, setCustomDays] = useState<string>("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const effectiveDays = customDays ? parseInt(customDays, 10) || 0 : days;

  // Calculate new expiration date
  const currentExpiry = school.trial_ends_at ? new Date(school.trial_ends_at) : new Date();
  const baseTime = currentExpiry.getTime() > Date.now() ? currentExpiry.getTime() : Date.now();
  const calculatedNewExpiry = new Date(baseTime + effectiveDays * 86400000);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (effectiveDays <= 0) {
      setError("Please choose or enter a valid number of trial extension days.");
      return;
    }
    if (!reason.trim() || reason.trim().length < 5) {
      setError("Please provide a valid operational reason (min 5 characters).");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/master-admin/schools/${school.id}/subscription/extend-trial`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token || "test-token-admin"}`,
        },
        body: JSON.stringify({
          additionalDays: effectiveDays,
          reason: reason.trim(),
        }),
      });

      const json = await res.json();
      if (json.success) {
        onSuccess();
        onClose();
      } else {
        setError(json.error || "Failed to extend trial period.");
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
            <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 font-heading">
                Extend Free Trial
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

          {/* Quick Option Pills */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              Additional Duration
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[3, 7, 15, 30].map((d) => (
                <button
                  type="button"
                  key={d}
                  onClick={() => {
                    setDays(d);
                    setCustomDays("");
                  }}
                  className={`py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                    days === d && !customDays
                      ? "border-sky-600 bg-sky-50 text-sky-700 shadow-2xs"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  +{d} days
                </button>
              ))}
            </div>

            {/* Custom Input */}
            <div className="mt-2.5">
              <input
                id="extend-trial-custom-days"
                name="customDays"
                type="number"
                min="1"
                max="90"
                value={customDays}
                onChange={(e) => {
                  setCustomDays(e.target.value);
                  setDays(0);
                }}
                aria-label="Custom number of days to extend"
                placeholder="Or enter custom number of days..."
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-slate-800"
              />
            </div>
          </div>

          {/* Calculated Preview Box */}
          <div className="p-3.5 rounded-xl bg-sky-50/70 border border-sky-100 text-xs space-y-1.5">
            <div className="flex justify-between items-center text-slate-600">
              <span>Current Trial Expiry:</span>
              <span className="font-semibold text-slate-800">
                {school.subscription_valid_till_formatted}
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-600">
              <span>Extension:</span>
              <span className="font-bold text-sky-700">+{effectiveDays} days</span>
            </div>
            <div className="pt-1.5 border-t border-sky-200/60 flex justify-between items-center font-bold text-slate-900">
              <span>New Trial Expiry:</span>
              <span className="text-sky-700 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {calculatedNewExpiry.toLocaleDateString("en-US", {
                  month: "short",
                  day: "2-digit",
                  year: "numeric",
                })}
              </span>
            </div>
          </div>

          {/* Reason */}
          <div>
            <label htmlFor="extend-trial-reason" className="block text-xs font-bold text-slate-700 mb-1">
              Extension Justification <span className="text-rose-500">*</span>
            </label>
            <textarea
              id="extend-trial-reason"
              name="reason"
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Granted 7 extra days for board curriculum committee evaluation..."
              className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-slate-800"
            />
          </div>

          {/* Buttons */}
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
              disabled={submitting || effectiveDays <= 0}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold shadow-xs disabled:opacity-50 cursor-pointer transition-colors"
            >
              {submitting ? "Extending..." : "Confirm Trial Extension"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

