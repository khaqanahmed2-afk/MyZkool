import React, { useState } from "react";
import { Trash2, AlertTriangle, X, ShieldAlert, CheckCircle2, Archive } from "lucide-react";
import { deleteStudentAndData, bulkDeleteStudentsAndData } from "../../../services/studentOperationsService";
import { useAuth } from "../../../context/AuthContext";

export interface DeleteStudentTarget {
  id: string;
  name: string;
  admission_no: string;
  class_name?: string;
}

interface DeleteStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  schoolId: string;
  student?: DeleteStudentTarget | null;
  bulkStudents?: DeleteStudentTarget[];
  onSuccess: () => void;
}

export function DeleteStudentModal({
  isOpen,
  onClose,
  schoolId,
  student,
  bulkStudents,
  onSuccess,
}: DeleteStudentModalProps) {
  const { user, profile } = useAuth();
  const [mode, setMode] = useState<"permanent" | "archive">("permanent");
  const [reason, setReason] = useState("Erroneous entry / cleanup");
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const isBulk = Boolean(bulkStudents && bulkStudents.length > 0);
  const count = isBulk ? bulkStudents!.length : 1;
  const expectedConfirmation = isBulk ? "DELETE" : (student?.admission_no || "DELETE");
  const isConfirmed = confirmText.trim().toUpperCase() === expectedConfirmation.trim().toUpperCase();

  const actorId = user?.id || (profile as any)?.id || "admin";
  const actorRole = (profile?.role || "admin").toLowerCase().trim().replace(/[\s-]+/g, "_");

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConfirmed) return;

    setIsDeleting(true);
    setError(null);

    try {
      const isPermanent = mode === "permanent";
      if (isBulk && bulkStudents) {
        const ids = bulkStudents.map((s) => s.id);
        const res = await bulkDeleteStudentsAndData(schoolId, ids, {
          permanent: isPermanent,
          reason,
          actorId,
          actorRole,
        });

        if (!res.success && res.errors.length > 0) {
          throw new Error(res.errors.join("; "));
        }
      } else if (student) {
        const res = await deleteStudentAndData(schoolId, student.id, {
          permanent: isPermanent,
          reason,
          actorId,
          actorRole,
        });

        if (!res.success) {
          throw new Error(res.error || "Failed to delete student");
        }
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during deletion.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-red-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="p-5 bg-red-50/70 border-b border-red-100 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 border border-red-200 text-red-600 flex items-center justify-center shrink-0">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                {isBulk ? `Delete ${count} Students & Data` : `Delete Student: ${student?.name}`}
              </h3>
              <p className="text-xs text-red-700 mt-0.5">
                {isBulk
                  ? `${count} students selected for data removal`
                  : `Admission No: ${student?.admission_no} • ${student?.class_name || "Enrolled Student"}`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-red-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleDelete} className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Warning summary */}
          <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1.5">
            <div className="font-semibold flex items-center gap-1.5 text-amber-800">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>Associated data will be affected:</span>
            </div>
            <ul className="list-disc pl-5 space-y-0.5 text-[11px] text-amber-800">
              <li>Academic enrollments and class roster assignments</li>
              <li>Parent links and guardian records (orphaned contacts cleaned)</li>
              <li>Transport bus allocations, routes & stops</li>
              <li>Fee dues, fee structures & payment history</li>
              <li>Identity documents, medical entries & certificates</li>
            </ul>
          </div>

          {/* Deletion Mode Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 block">Choose Deletion Type:</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Permanent Purge */}
              <div
                onClick={() => setMode("permanent")}
                className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                  mode === "permanent"
                    ? "border-red-500 bg-red-50/40 text-red-900"
                    : "border-slate-200 hover:border-slate-300 text-slate-700"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <Trash2 className="w-3.5 h-3.5 text-red-600" />
                    <span>Permanent Purge</span>
                  </div>
                  {mode === "permanent" && <CheckCircle2 className="w-4 h-4 text-red-600" />}
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">
                  Completely wipes the student & all records. Cannot be restored.
                </p>
              </div>

              {/* Archive / Soft Delete */}
              <div
                onClick={() => setMode("archive")}
                className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                  mode === "archive"
                    ? "border-blue-600 bg-blue-50/40 text-blue-900"
                    : "border-slate-200 hover:border-slate-300 text-slate-700"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <Archive className="w-3.5 h-3.5 text-blue-600" />
                    <span>Archive / Soft Delete</span>
                  </div>
                  {mode === "archive" && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">
                  Hides student from active lists; preserves history in archive.
                </p>
              </div>
            </div>
          </div>

          {/* Reason Input */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 block">Reason for deletion:</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-red-500"
            >
              <option value="Erroneous entry / cleanup">Erroneous entry / cleanup</option>
              <option value="Duplicate student profile">Duplicate student profile</option>
              <option value="Import error rollback">Import error rollback</option>
              <option value="Student withdrew without joining">Student withdrew without joining</option>
              <option value="Admin testing data removal">Admin testing data removal</option>
            </select>
          </div>

          {/* Type to confirm safeguard */}
          <div className="space-y-1.5 pt-1">
            <label className="text-xs font-semibold text-slate-800 block">
              To confirm, type <span className="font-mono font-bold text-red-600 select-all">{expectedConfirmation}</span> below:
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={`Type "${expectedConfirmation}"`}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 font-mono"
              autoFocus
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isConfirmed || isDeleting}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white rounded-lg shadow-sm transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                mode === "permanent" ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>
                {isDeleting
                  ? "Deleting..."
                  : mode === "permanent"
                  ? isBulk
                    ? `Purge ${count} Students & All Data`
                    : "Permanently Delete Student & Data"
                  : isBulk
                  ? `Archive ${count} Students`
                  : "Archive Student"}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
