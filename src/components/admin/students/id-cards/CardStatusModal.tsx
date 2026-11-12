import React, { useState } from "react";
import { X, CheckCircle2, AlertTriangle, ShieldAlert, Loader2 } from "lucide-react";
import { EnrichedStudentIdCard, CardStatus, updateStudentCardStatus } from "../../../../services/idCardService";

interface CardStatusModalProps {
  card: EnrichedStudentIdCard;
  schoolId: string;
  onClose: () => void;
  onStatusUpdated: (updatedStatus: CardStatus, revocationReason?: string) => void;
}

export const CardStatusModal: React.FC<CardStatusModalProps> = ({
  card,
  schoolId,
  onClose,
  onStatusUpdated,
}) => {
  const [selectedStatus, setSelectedStatus] = useState<CardStatus>(card.card_status);
  const [reason, setReason] = useState<string>(card.revocation_reason || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await updateStudentCardStatus(
      schoolId,
      card.student_id,
      selectedStatus,
      selectedStatus === "revoked" ? reason : undefined
    );

    setLoading(false);

    if (res.success) {
      onStatusUpdated(selectedStatus, selectedStatus === "revoked" ? reason : undefined);
      onClose();
    } else {
      setError(res.error || "Failed to update card status.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-blue-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">Manage ID Card Status</h3>
              <p className="text-[11px] text-slate-500">
                {card.full_name} ({card.admission_no})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              Select Card Status
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setSelectedStatus("active")}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 text-xs font-bold transition cursor-pointer ${
                  selectedStatus === "active"
                    ? "bg-emerald-50 text-emerald-800 border-emerald-500 shadow-xs"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                }`}
              >
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>Active</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedStatus("inactive")}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 text-xs font-bold transition cursor-pointer ${
                  selectedStatus === "inactive"
                    ? "bg-amber-50 text-amber-800 border-amber-500 shadow-xs"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                }`}
              >
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <span>Inactive</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedStatus("revoked")}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 text-xs font-bold transition cursor-pointer ${
                  selectedStatus === "revoked"
                    ? "bg-rose-50 text-rose-800 border-rose-500 shadow-xs"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                }`}
              >
                <ShieldAlert className="w-5 h-5 text-rose-600" />
                <span>Revoked</span>
              </button>
            </div>
          </div>

          {selectedStatus === "revoked" && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Revocation Reason
              </label>
              <textarea
                required
                rows={2}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Card reported lost by student; replaced with new duplicate."
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-rose-500"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                This notice will be displayed to anyone scanning the card's QR code.
              </span>
            </div>
          )}

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Save Status</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
