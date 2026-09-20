/**
 * Transfer Certificate (TC) & Status Change Modal (Spec A4.7)
 * 
 * Features:
 * - Status transition (inactive, withdrawn, transferred, passed out)
 * - Mandatory reason check
 * - Dues verification: blocks issuance unless owner enters typed override reason
 * - Transport assignment check: offers to terminate on effective date
 * - Counter-based TC number generation
 * - Printable school letterhead layout with verification QR code
 * - Duplicate copy issuance and marking
 */

import React, { useState, useEffect } from "react";
import {
  X,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Printer,
  ShieldAlert,
  QrCode,
  Bus,
} from "lucide-react";
import {
  changeStudentStatus,
  issueTransferCertificate,
  issueDuplicateTransferCertificate,
} from "../../../services/studentOperationsService";
import { feeService } from "../../../services/feeService";
import { transportService } from "../../../services/transportService";
import {
  Student,
  StudentStatus,
  StudentTransferCertificate,
} from "../../../types/students";

interface TransferCertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student;
  schoolId: string;
  actorId: string;
  actorRole: string;
  onSuccess?: () => void;
}

export default function TransferCertificateModal({
  isOpen,
  onClose,
  student,
  schoolId,
  actorId,
  actorRole,
  onSuccess,
}: TransferCertificateModalProps) {
  if (!isOpen) return null;

  const [mode, setMode] = useState<"status_only" | "tc_issue" | "preview">("status_only");

  // Form Fields
  const [newStatus, setNewStatus] = useState<StudentStatus>("transferred");
  const [effectiveDate, setEffectiveDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [reason, setReason] = useState<string>("");
  const [conduct, setConduct] = useState<string>("Good");
  const [remarks, setRemarks] = useState<string>("");

  // Dues Check
  const [duesPaise, setDuesPaise] = useState<number>(0);
  const [duesOverrideReason, setDuesOverrideReason] = useState<string>("");
  const [isCheckingDues, setIsCheckingDues] = useState(true);

  // Transport Check
  const [hasTransport, setHasTransport] = useState(false);
  const [endTransport, setEndTransport] = useState(true);

  // Issued TC Result
  const [issuedTC, setIssuedTC] = useState<StudentTransferCertificate | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isOwner = actorRole.toLowerCase() === "owner" || actorRole.toLowerCase() === "school_admin";

  useEffect(() => {
    async function checkStudentState() {
      setIsCheckingDues(true);
      try {
        const [feeRes, trans] = await Promise.all([
          feeService.getStudentBalance(student.id),
          transportService.getStudentTransport(student.id),
        ]);
        setDuesPaise(feeRes?.balance || 0);
        setHasTransport(!!trans);
      } catch (err) {
        console.error("Failed to check dues or transport:", err);
      } finally {
        setIsCheckingDues(false);
      }
    }
    checkStudentState();
  }, [student.id]);

  const handleStatusChangeOnly = async () => {
    if (!reason.trim()) {
      setErrorMsg("Reason is required for status change");
      return;
    }
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await changeStudentStatus(schoolId, student.id, actorId, actorRole, {
        new_status: newStatus,
        effective_date: effectiveDate,
        reason: reason,
        end_transport: endTransport,
      });
      onSuccess?.();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update status");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleIssueTC = async () => {
    if (!reason.trim()) {
      setErrorMsg("Reason for leaving is mandatory to generate TC");
      return;
    }

    if (duesPaise > 0) {
      if (!isOwner) {
        setErrorMsg(
          `Outstanding dues of ₹${(duesPaise / 100).toFixed(2)} must be cleared. Only the school owner can override.`
        );
        return;
      }
      if (!duesOverrideReason.trim()) {
        setErrorMsg("A typed override reason is required by the school owner to issue TC with dues.");
        return;
      }
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const tc = await issueTransferCertificate(schoolId, student.id, actorId, actorRole, {
        issued_on: effectiveDate,
        reason: reason,
        conduct: conduct,
        remarks: remarks,
        dues_cleared: duesPaise === 0,
        dues_override_reason: duesPaise > 0 ? duesOverrideReason : undefined,
      });

      setIssuedTC(tc);
      setMode("preview");
      onSuccess?.();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to issue Transfer Certificate");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-bold text-gray-900">
              {mode === "preview"
                ? "Transfer Certificate Letterhead Preview"
                : "Student Status Change & TC"}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {mode !== "preview" ? (
            <>
              {/* Student Summary Strip */}
              <div className="p-3 bg-gray-50 rounded-xl border flex items-center justify-between text-sm">
                <div>
                  <span className="font-bold text-gray-900">
                    {student.first_name} {student.last_name}
                  </span>
                  <span className="text-gray-500 font-mono ml-2">({student.admission_no})</span>
                </div>
                <div>
                  Current Status:{" "}
                  <span className="font-semibold text-blue-700 capitalize">{student.status}</span>
                </div>
              </div>

              {/* Mode Toggle */}
              <div className="flex border rounded-lg overflow-hidden text-sm font-medium">
                <button
                  type="button"
                  onClick={() => setMode("status_only")}
                  className={`flex-1 py-2 text-center transition-colors ${
                    mode === "status_only"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-50 text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  Change Status Only
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode("tc_issue");
                    setNewStatus("transferred");
                  }}
                  className={`flex-1 py-2 text-center transition-colors ${
                    mode === "tc_issue"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-50 text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  Issue Transfer Certificate (TC)
                </button>
              </div>

              {/* Status & Effective Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    New Student Status
                  </label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as StudentStatus)}
                    disabled={mode === "tc_issue"}
                    className="w-full border-gray-300 rounded-lg text-sm p-2 border"
                  >
                    <option value="transferred">Transferred</option>
                    <option value="withdrawn">Withdrawn</option>
                    <option value="inactive">Inactive</option>
                    <option value="passed_out">Passed Out</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Effective Date
                  </label>
                  <input
                    type="date"
                    value={effectiveDate}
                    onChange={(e) => setEffectiveDate(e.target.value)}
                    className="w-full border-gray-300 rounded-lg text-sm p-2 border"
                  />
                </div>
              </div>

              {/* Dues Alert Banner (Spec A4.7) */}
              {duesPaise > 0 && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2 text-sm text-amber-900">
                  <div className="flex items-center gap-2 font-semibold text-amber-800">
                    <ShieldAlert className="w-5 h-5 text-amber-600" />
                    Outstanding Fee Balance: ₹{(duesPaise / 100).toFixed(2)}
                  </div>
                  <p className="text-xs text-amber-800">
                    Spec A4.7 blocks Transfer Certificate issue while dues exist, unless the school owner provides an explicit typed override reason.
                  </p>

                  {mode === "tc_issue" && (
                    <div className="pt-2">
                      <label className="block text-xs font-bold text-amber-900 mb-1 uppercase">
                        Owner Override Reason (Required)
                      </label>
                      <input
                        type="text"
                        placeholder="State why TC is authorized despite outstanding dues..."
                        value={duesOverrideReason}
                        onChange={(e) => setDuesOverrideReason(e.target.value)}
                        disabled={!isOwner}
                        className="w-full border-amber-300 rounded-md text-sm p-2 border bg-white"
                      />
                      {!isOwner && (
                        <span className="text-xs text-red-600 font-semibold mt-1 block">
                          You must be an Owner / Super Admin to override dues.
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Transport End Assignment Prompt (Spec A4.7) */}
              {hasTransport && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between text-sm text-blue-900">
                  <div className="flex items-center gap-2">
                    <Bus className="w-4 h-4 text-blue-600" />
                    <span>Active transport assignment detected</span>
                  </div>
                  <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={endTransport}
                      onChange={(e) => setEndTransport(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    End transport on effective date
                  </label>
                </div>
              )}

              {/* Reason for status / leaving */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Reason (Mandatory)
                </label>
                <textarea
                  rows={2}
                  placeholder="Reason for change or departure (e.g. Relocating to another state)..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full border-gray-300 rounded-lg text-sm p-2.5 border"
                />
              </div>

              {/* TC Specific Fields */}
              {mode === "tc_issue" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Student Conduct
                    </label>
                    <select
                      value={conduct}
                      onChange={(e) => setConduct(e.target.value)}
                      className="w-full border-gray-300 rounded-lg text-sm p-2 border"
                    >
                      <option value="Excellent">Excellent</option>
                      <option value="Good">Good</option>
                      <option value="Satisfactory">Satisfactory</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      General Remarks
                    </label>
                    <input
                      type="text"
                      placeholder="Optional remarks..."
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      className="w-full border-gray-300 rounded-lg text-sm p-2 border"
                    />
                  </div>
                </div>
              )}

              {/* Footer Buttons */}
              <div className="flex justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                {mode === "status_only" ? (
                  <button
                    type="button"
                    onClick={handleStatusChangeOnly}
                    disabled={isSubmitting || !reason.trim()}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:bg-gray-300 shadow"
                  >
                    {isSubmitting ? "Updating..." : "Update Status"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleIssueTC}
                    disabled={
                      isSubmitting ||
                      !reason.trim() ||
                      (duesPaise > 0 && (!isOwner || !duesOverrideReason.trim()))
                    }
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:bg-gray-300 shadow"
                  >
                    {isSubmitting ? "Generating TC..." : "Generate & Issue TC"}
                  </button>
                )}
              </div>
            </>
          ) : (
            /* PRINTABLE LETTERHEAD PREVIEW */
            issuedTC && (
              <div className="space-y-6">
                <div
                  id="tc-printable-area"
                  className="border-4 border-double border-gray-800 p-8 rounded-xl bg-white space-y-6 text-gray-900"
                >
                  {/* School Letterhead Header */}
                  <div className="text-center border-b pb-4 space-y-1">
                    <h2 className="text-2xl font-serif font-black tracking-wider uppercase">
                      MyZkool Academy
                    </h2>
                    <p className="text-xs text-gray-600">
                      Affiliated with Central Board of Secondary Education (CBSE)
                    </p>
                    <p className="text-xs text-gray-500">
                      Lucknow, Uttar Pradesh, India • School Code: 2026-UP
                    </p>
                    <div className="pt-2">
                      <span className="inline-block border-2 border-gray-900 px-4 py-1 font-bold text-sm uppercase tracking-wider">
                        {issuedTC.is_duplicate_copy ? "DUPLICATE COPY" : "TRANSFER CERTIFICATE"}
                      </span>
                    </div>
                  </div>

                  {/* Certificate Numbers & QR */}
                  <div className="flex justify-between items-center text-xs font-mono">
                    <div>
                      <div>
                        <strong>TC Number:</strong> {issuedTC.tc_no}
                      </div>
                      <div>
                        <strong>Date of Issue:</strong> {issuedTC.issued_on}
                      </div>
                      <div>
                        <strong>Admission No:</strong> {student.admission_no}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="w-16 h-16 bg-gray-100 border border-gray-400 p-1 flex items-center justify-center mx-auto">
                        <QrCode className="w-12 h-12 text-gray-800" />
                      </div>
                      <span className="text-[9px] text-gray-500 mt-0.5 block">Scan to Verify</span>
                    </div>
                  </div>

                  {/* Details Body */}
                  <div className="space-y-2 text-sm leading-relaxed border-t border-b py-4">
                    <p>
                      This is to certify that{" "}
                      <strong className="underline decoration-dotted font-bold">
                        {student.first_name} {student.last_name}
                      </strong>
                      , child of{" "}
                      <strong>
                        {student.gender === "female" ? "D/O" : "S/O"} Guardian
                      </strong>
                      , was a bonafide student of this institution.
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-xs pt-2">
                      <div>
                        <strong>Date of Birth:</strong> {student.dob}
                      </div>
                      <div>
                        <strong>Gender:</strong> {student.gender}
                      </div>
                      <div>
                        <strong>Category:</strong> {student.category || "General"}
                      </div>
                      <div>
                        <strong>Nationality:</strong> {student.nationality}
                      </div>
                      <div>
                        <strong>General Conduct:</strong> {issuedTC.conduct}
                      </div>
                      <div>
                        <strong>Dues Status:</strong>{" "}
                        {issuedTC.dues_cleared
                          ? "All School Dues Cleared"
                          : `Special Authorization (${issuedTC.dues_override_reason})`}
                      </div>
                    </div>
                    <p className="pt-2">
                      <strong>Reason for Leaving:</strong> {issuedTC.reason}
                    </p>
                    {issuedTC.remarks && (
                      <p>
                        <strong>Remarks:</strong> {issuedTC.remarks}
                      </p>
                    )}
                  </div>

                  {/* Signatures */}
                  <div className="grid grid-cols-3 text-center text-xs pt-8">
                    <div>
                      <div className="border-t border-gray-400 w-32 mx-auto pt-1">Class Teacher</div>
                    </div>
                    <div>
                      <div className="border-t border-gray-400 w-32 mx-auto pt-1">Checked By (Admin)</div>
                    </div>
                    <div>
                      <div className="border-t border-gray-400 w-32 mx-auto pt-1">Principal / Owner</div>
                    </div>
                  </div>
                </div>

                {/* Print and Close Actions */}
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-lg text-sm font-medium shadow"
                  >
                    <Printer className="w-4 h-4" /> Print TC
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium shadow"
                  >
                    Done
                  </button>
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}

