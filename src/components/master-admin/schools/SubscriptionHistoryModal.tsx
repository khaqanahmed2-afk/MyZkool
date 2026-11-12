import React, { useState, useEffect } from "react";
import type { MasterAdminSchoolSummary, SubscriptionHistoryRecord } from "../../../services/masterAdminSchoolService";
import { X, History, FileText, ArrowRight, Calendar, CreditCard, ShieldCheck, Clock, Gift, ShieldAlert } from "lucide-react";

interface Props {
  school: MasterAdminSchoolSummary;
  onClose: () => void;
  token?: string | null;
}

export const SubscriptionHistoryModal: React.FC<Props> = ({
  school,
  onClose,
  token,
}) => {
  const [history, setHistory] = useState<SubscriptionHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/master-admin/schools/${school.id}/subscription/history`, {
      headers: { Authorization: `Bearer ${token || "test-token-admin"}` },
    })
      .then((r) => r.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          setHistory(json.data);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [school.id, token]);

  const formatDate = (isoString?: string | null) => {
    if (!isoString) return "N/A";
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return isoString;
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
      });
    } catch {
      return isoString;
    }
  };

  const formatDateTime = (isoString?: string) => {
    if (!isoString) return "N/A";
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return isoString;
      return d.toLocaleString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoString;
    }
  };

  const getOpBadge = (op: string) => {
    switch (op) {
      case "plan_change":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">Plan Change</span>;
      case "trial_extended":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">Trial Extension</span>;
      case "validity_extended":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">Validity Extension</span>;
      case "status_change":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">Status Change</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-50 text-slate-700 border border-slate-200">{op}</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 font-heading">
                Subscription & Lifecycle History
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

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400">
              Loading immutable subscription ledger...
            </div>
          ) : history.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              No historical subscription changes recorded yet.
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((record) => (
                <div
                  key={record.id}
                  className="p-4 rounded-xl border border-slate-200/90 bg-white hover:border-slate-300 transition-all shadow-2xs space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {getOpBadge(record.operation_type)}
                      <span className="text-[11px] font-semibold text-slate-600 capitalize">
                        {record.classification}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-slate-400">
                      {formatDateTime(record.created_at)}
                    </span>
                  </div>

                  {/* Plan / Expiry transition */}
                  {(record.previous_plan_slug || record.new_plan_slug || record.previous_expiry || record.new_expiry) && (
                    <div className="p-2.5 bg-slate-50 rounded-lg text-xs flex flex-wrap items-center gap-3">
                      {(record.previous_plan_slug || record.new_plan_slug) && (
                        <div className="flex items-center gap-1.5 font-medium">
                          <span className="text-slate-500 uppercase">{record.previous_plan_slug || "none"}</span>
                          <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-bold text-purple-700 uppercase">{record.new_plan_slug}</span>
                        </div>
                      )}

                      {(record.previous_expiry || record.new_expiry) && (
                        <div className="flex items-center gap-1.5 text-slate-600 ml-auto">
                          <span>{formatDate(record.previous_expiry)}</span>
                          <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-bold text-slate-900">{formatDate(record.new_expiry)}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Justification reason */}
                  <p className="text-xs text-slate-700 leading-relaxed">
                    <strong className="text-slate-900 font-semibold">Reason: </strong>
                    {record.reason}
                  </p>

                  {/* Payment reference if present */}
                  {record.payment_reference && (
                    <p className="text-[11px] font-mono text-emerald-700">
                      Payment Ref: {record.payment_reference}
                    </p>
                  )}

                  {/* Operator attribution */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                    <span>Authorized by: {record.admin_email}</span>
                    <span className="font-mono">ID: {record.id.slice(0, 12)}...</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
