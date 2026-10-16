import React, { useState } from "react";
import { X, Calendar, MessageSquare, Check, Clock } from "lucide-react";
import type { DuesReminderRow } from "../../../types/duesReminders";
import { addStudentFollowup } from "../../../services/duesRemindersService";

interface StudentFollowupModalProps {
  isOpen: boolean;
  onClose: () => void;
  row: DuesReminderRow | null;
  schoolId: string;
  onSaved: () => void;
}

export function StudentFollowupModal({
  isOpen,
  onClose,
  row,
  schoolId,
  onSaved,
}: StudentFollowupModalProps) {
  const [note, setNote] = useState<string>(row?.followupNote || "");
  const [promiseDate, setPromiseDate] = useState<string>("");
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !row) return null;

  const handleSave = async () => {
    if (!note.trim()) {
      setError("Please enter a follow-up note");
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      await addStudentFollowup(schoolId, row.studentId, note, promiseDate || null);
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to save follow-up");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-2xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#E6EAF3] flex items-center justify-between bg-white">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#141A2E]">Fee Follow-up Note</h3>
              <p className="text-[11px] text-[#5B6478]">{row.studentName} ({row.classSection})</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-3.5">
          {error && (
            <div className="p-2.5 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs">
              {error}
            </div>
          )}

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-[#5B6478]">Outstanding Due:</span>
              <span className="font-bold text-[#141A2E]">₹{(row.balancePaise / 100).toLocaleString("en-IN")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#5B6478]">Invoice No:</span>
              <span className="font-medium text-[#141A2E]">{row.invoiceNo}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#5B6478]">Parent Phone:</span>
              <span className="font-medium text-[#141A2E]">{row.parentPhone || "Not recorded"}</span>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#5B6478] mb-1">
              Discussion / Follow-up Note <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Spoke to father; requested 1 week extension due to family emergency..."
              className="w-full p-2.5 bg-white border border-[#E6EAF3] rounded-xl text-xs text-[#141A2E] focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#5B6478] mb-1">
              Promised Payment Date (Optional)
            </label>
            <div className="relative">
              <input
                type="date"
                value={promiseDate}
                onChange={(e) => setPromiseDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#E6EAF3] rounded-xl text-xs text-[#141A2E] focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#E6EAF3] bg-slate-50 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-[#E6EAF3] rounded-xl text-xs font-semibold text-[#5B6478] hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2 bg-[#0B7B49] text-white rounded-xl text-xs font-bold hover:bg-[#096a3e] transition-colors"
          >
            {isSaving ? "Saving..." : "Save Note"}
          </button>
        </div>
      </div>
    </div>
  );
}
