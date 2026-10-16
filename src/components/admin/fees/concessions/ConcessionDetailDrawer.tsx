import React, { useState } from "react";
import {
  X,
  CheckCircle,
  XCircle,
  Ban,
  Trash2,
  Calendar,
  FileText,
  User,
  ShieldCheck,
  AlertTriangle,
  ExternalLink,
  Loader2,
} from "lucide-react";
import type { StudentConcession } from "../../../../types/fees";

interface ConcessionDetailDrawerProps {
  concession: StudentConcession | null;
  isOpen: boolean;
  onClose: () => void;
  onApprove: (concessionId: string, note?: string) => Promise<void>;
  onReject: (concessionId: string, reason: string) => Promise<void>;
  onRevoke: (concessionId: string, reason?: string) => Promise<void>;
  onDelete: (concessionId: string) => Promise<void>;
}

export function ConcessionDetailDrawer({
  concession,
  isOpen,
  onClose,
  onApprove,
  onReject,
  onRevoke,
  onDelete,
}: ConcessionDetailDrawerProps) {
  const [actionLoading, setActionLoading] = useState(false);
  const [noteInput, setNoteInput] = useState("");
  const [rejectMode, setRejectMode] = useState(false);
  const [revokeMode, setRevokeMode] = useState(false);

  if (!isOpen || !concession) return null;

  const handleApprove = async () => {
    setActionLoading(true);
    await onApprove(concession.id, noteInput);
    setActionLoading(false);
    onClose();
  };

  const handleReject = async () => {
    if (!noteInput.trim()) return;
    setActionLoading(true);
    await onReject(concession.id, noteInput);
    setActionLoading(false);
    onClose();
  };

  const handleRevoke = async () => {
    setActionLoading(true);
    await onRevoke(concession.id, noteInput);
    setActionLoading(false);
    onClose();
  };

  const handleDelete = async () => {
    if (window.confirm("Are you sure you want to delete this concession record?")) {
      setActionLoading(true);
      await onDelete(concession.id);
      setActionLoading(false);
      onClose();
    }
  };

  const discountDisplay =
    concession.type === "percent"
      ? `${concession.value}%`
      : `₹${Number(concession.value).toLocaleString("en-IN")}`;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-xs" onClick={onClose} />

      <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E6EAF3]">
          <div>
            <h2 className="text-base font-bold text-slate-900">Concession Details</h2>
            <p className="text-xs text-slate-400 mt-0.5">ID: {concession.id.slice(0, 8)}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Student Profile Card */}
          <div className="p-4 bg-slate-50 border border-[#E6EAF3] rounded-xl flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-teal-100 text-teal-800 font-bold text-sm flex items-center justify-center shrink-0">
              {concession.student_name?.slice(0, 2).toUpperCase() || "ST"}
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">{concession.student_name}</h3>
              <p className="text-xs text-slate-500">
                {concession.admission_no} | Class {concession.class_name} {concession.section_name}
              </p>
            </div>
          </div>

          {/* Key Attributes Grid */}
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="p-3 bg-white border border-[#E6EAF3] rounded-xl">
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Type</span>
              <span className="text-slate-900 font-semibold capitalize mt-0.5 block">
                {(concession.concession_type || "other").replace("_", " ")}
              </span>
            </div>

            <div className="p-3 bg-white border border-[#E6EAF3] rounded-xl">
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Discount</span>
              <span className="text-emerald-700 font-bold text-sm mt-0.5 block">
                {discountDisplay}
              </span>
            </div>

            <div className="p-3 bg-white border border-[#E6EAF3] rounded-xl">
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Status</span>
              <span className="text-slate-800 font-semibold capitalize mt-0.5 block">
                {concession.status}
              </span>
            </div>

            <div className="p-3 bg-white border border-[#E6EAF3] rounded-xl">
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Billing Period</span>
              <span className="text-slate-800 font-semibold capitalize mt-0.5 block">
                {concession.billing_period || "Monthly"}
              </span>
            </div>
          </div>

          {/* Validity */}
          <div className="p-3.5 bg-white border border-[#E6EAF3] rounded-xl space-y-1 text-xs">
            <div className="flex items-center gap-1.5 text-slate-400 font-bold text-[10px] uppercase">
              <Calendar className="w-3.5 h-3.5" />
              <span>Validity Period</span>
            </div>
            <p className="text-slate-900 font-medium">
              {concession.valid_from || "Start of Year"} to {concession.valid_to || "End of Year"}
            </p>
          </div>

          {/* Reason & Notes */}
          <div className="p-3.5 bg-white border border-[#E6EAF3] rounded-xl space-y-2 text-xs">
            <div>
              <span className="text-slate-400 font-bold text-[10px] uppercase block">Reason</span>
              <p className="text-slate-700 mt-0.5">{concession.reason || "Not specified"}</p>
            </div>
            {concession.notes && (
              <div className="pt-2 border-t border-slate-100">
                <span className="text-slate-400 font-bold text-[10px] uppercase block">Internal Notes</span>
                <p className="text-slate-600 mt-0.5">{concession.notes}</p>
              </div>
            )}
            {concession.rejection_reason && (
              <div className="pt-2 border-t border-rose-100 text-rose-700">
                <span className="text-rose-400 font-bold text-[10px] uppercase block">Rejection Reason</span>
                <p className="mt-0.5">{concession.rejection_reason}</p>
              </div>
            )}
          </div>

          {/* Supporting Document */}
          {concession.document_url && (
            <div className="p-3.5 bg-slate-50 border border-[#E6EAF3] rounded-xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-600" />
                <span className="font-medium text-slate-800 truncate max-w-[200px]">
                  {concession.document_name || "Supporting Document"}
                </span>
              </div>
              <a
                href={concession.document_url}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-semibold text-[#00875A] hover:underline flex items-center gap-1"
              >
                <span>View</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}

          {/* Actions & Decision Forms */}
          {concession.status === "pending" && (
            <div className="space-y-3 pt-2">
              <label className="block text-xs font-bold text-slate-800">
                {rejectMode ? "Rejection Reason *" : "Decision Notes (Optional)"}
              </label>
              <textarea
                rows={2}
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                placeholder={
                  rejectMode
                    ? "Enter reason for rejecting this concession..."
                    : "Add approval note or instruction..."
                }
                className="w-full px-3 py-2 border border-[#E6EAF3] rounded-lg text-xs focus:outline-none focus:border-[#00875A]"
              />

              {!rejectMode ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={handleApprove}
                    className="flex-1 py-2 bg-[#00875A] hover:bg-[#007048] text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
                  >
                    {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                    <span>Approve Concession</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRejectMode(true)}
                    className="px-4 py-2 border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    Reject
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={actionLoading || !noteInput.trim()}
                    onClick={handleReject}
                    className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
                  >
                    {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                    <span>Confirm Rejection</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRejectMode(false);
                      setNoteInput("");
                    }}
                    className="px-3 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}

          {(concession.status === "active" || concession.status === "scheduled") && (
            <div className="space-y-3 pt-2">
              {revokeMode ? (
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-800">
                    Reason for Revoking *
                  </label>
                  <textarea
                    rows={2}
                    value={noteInput}
                    onChange={(e) => setNoteInput(e.target.value)}
                    placeholder="Enter reason for revoking (will restore un-paid dues)..."
                    className="w-full px-3 py-2 border border-[#E6EAF3] rounded-lg text-xs focus:outline-none focus:border-[#00875A]"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={handleRevoke}
                      className="flex-1 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
                    >
                      {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5" />}
                      <span>Confirm Revocation</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRevokeMode(false)}
                      className="px-3 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setRevokeMode(true)}
                  className="w-full py-2 border border-amber-300 text-amber-800 hover:bg-amber-50 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Ban className="w-3.5 h-3.5 text-amber-600" />
                  <span>Revoke Concession</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#E6EAF3] bg-slate-50 flex items-center justify-between">
          <button
            type="button"
            onClick={handleDelete}
            className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 hover:text-rose-800 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Record</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-white border border-[#E6EAF3] rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
