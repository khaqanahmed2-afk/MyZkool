import React, { useState } from "react";
import {
  CheckCircle2,
  User,
  Printer,
  Plus,
  Users,
  Copy,
  Check,
  ArrowRight,
  FileText,
  Calendar,
  AlertCircle,
  GraduationCap,
  CreditCard,
  Bus,
  Clock,
} from "lucide-react";
import { Student, AdmissionWizardPayload } from "../../../../types/students";
import { School } from "../../../../types/school";
import { useNavigate } from "react-router-dom";
import { PrintAdmissionForm } from "./PrintAdmissionForm";

interface SuccessProps {
  student: Student;
  school?: School | null;
  payload?: AdmissionWizardPayload | null;
  className?: string;
  sectionName?: string;
  feeStructureName?: string;
  isEditMode?: boolean;
  onAddAnother: () => void;
  onAddSibling: () => void;
}

export const StudentAdmissionSuccess: React.FC<SuccessProps> = ({
  student,
  school,
  payload,
  className,
  sectionName,
  feeStructureName,
  isEditMode,
  onAddAnother,
  onAddSibling,
}) => {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  const handleCopyAdmissionNo = () => {
    if (!student.admission_no) return;
    navigator.clipboard.writeText(student.admission_no);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const pendingDocs = payload?.step4_documents?.filter((d) => d.status === "pending") || [];
  const hasTransport = payload?.step7_transport?.opt_in;

  return (
    <div className="max-w-3xl mx-auto py-6 sm:py-10 space-y-6">
      {/* Printable Modal */}
      <PrintAdmissionForm
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        student={student}
        payload={payload}
        school={school}
        className={className}
        sectionName={sectionName}
        feeStructureName={feeStructureName}
      />

      {/* Success Banner */}
      <div className="text-center space-y-2">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-xs">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-slate-900 tracking-tight">
          {isEditMode ? "Student Profile Updated Successfully!" : "Student Admitted Successfully!"}
        </h1>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          {isEditMode
            ? "Student information and associated records have been successfully updated in the school registry."
            : "Permanent student record committed to the school registry and admission confirmation recorded."}
        </p>
      </div>

      {/* Prominent Admission Number & Student Identity Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
        {/* Admission Number Highlight Bar */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700">
              {isEditMode ? "Student Admission Number (Unchanged)" : "Assigned Admission Number"}
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="font-mono text-2xl font-black text-slate-900 tracking-wide select-all">
                {student.admission_no}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                Authoritative
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {isEditMode ? "Institutional identifier preserved without alteration." : "Permanent gap-free school registry sequence number."}
            </p>
          </div>

          <button
            type="button"
            onClick={handleCopyAdmissionNo}
            className="px-4 py-2 bg-white hover:bg-blue-50/50 border border-blue-300 text-blue-900 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition shadow-2xs shrink-0 cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                <span className="text-emerald-700 font-bold">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-blue-600" />
                <span>Copy Admission No</span>
              </>
            )}
          </button>
        </div>

        {/* Student Details Summary Row */}
        <div className="flex items-center space-x-4 pb-2 border-b border-slate-100">
          {student.photo_path ? (
            <img
              src={student.photo_path}
              alt={student.first_name}
              className="w-16 h-16 rounded-xl object-cover border border-slate-200 shadow-2xs shrink-0"
            />
          ) : (
            <div className="w-16 h-16 rounded-xl bg-blue-100 text-[#2158E0] flex items-center justify-center font-bold text-2xl shrink-0">
              {student.first_name[0]?.toUpperCase() || <User className="w-8 h-8" />}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-slate-900 truncate">
              {student.first_name} {student.middle_name ? `${student.middle_name} ` : ""}{student.last_name}
            </h2>
            <div className="flex items-center gap-2 text-xs text-slate-600 flex-wrap mt-0.5">
              <span className="font-semibold text-slate-800">
                Class {className || "Assigned"} {sectionName ? `(${sectionName})` : ""}
              </span>
              <span>•</span>
              <span>DOB: {student.dob}</span>
              <span>•</span>
              <span>Admission Date: {student.admission_date}</span>
              {student.is_rte && (
                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                  RTE Quota
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Workflow Status Tracking: Completed vs Pending Actions */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Admission Workflow Audit & Status
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {/* Completed Steps */}
            <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-xl space-y-1.5">
              <span className="font-semibold text-emerald-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Completed Actions
              </span>
              <ul className="space-y-1 text-slate-700 text-[11px] pl-5 list-disc">
                <li>Permanent student record created in registry</li>
                <li>Enrolled into Class {className || "Assigned"} for Academic Year</li>
                <li>Primary parent linked with communication consent</li>
                <li>Fee structure assigned ({feeStructureName || "Standard Plan"})</li>
              </ul>
            </div>

            {/* Pending Follow-ups */}
            <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl space-y-1.5">
              <span className="font-semibold text-amber-900 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-600" /> Pending Follow-up Items
              </span>
              {pendingDocs.length > 0 ? (
                <ul className="space-y-1 text-slate-700 text-[11px] pl-5 list-disc">
                  <li>
                    <strong>{pendingDocs.length} pending document(s)</strong> awaiting submission
                  </li>
                  {hasTransport && <li>Transport assignment active on bus route</li>}
                  <li>Student ID card ready to be printed</li>
                </ul>
              ) : (
                <p className="text-[11px] text-slate-600">
                  All mandatory admission documentation is up to date. You can now issue the student ID card or print the official form.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons Grid */}
        <div className="space-y-2 pt-3 border-t border-slate-100">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Quick Actions
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              onClick={() => navigate(`/admin/students/${student.id}`)}
              className="p-3.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl text-left transition flex items-center justify-between text-blue-900 group shadow-2xs cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold block">Return to Student Profile</span>
                  <span className="text-[11px] text-blue-700">View updated profile, ledger & documents</span>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-[#2158E0] group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              type="button"
              onClick={() => setIsPrintModalOpen(true)}
              className="p-3.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-left transition flex items-center justify-between text-slate-800 shadow-2xs cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-slate-800 text-white flex items-center justify-center">
                  <Printer className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold block">Print Admission Form</span>
                  <span className="text-[11px] text-slate-500">Official printable school document</span>
                </div>
              </div>
            </button>

            {!isEditMode && (
              <>
                <button
                  type="button"
                  onClick={onAddSibling}
                  className="p-3.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-left transition flex items-center justify-between text-slate-800 shadow-2xs cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold block">Add a Sibling</span>
                      <span className="text-[11px] text-slate-500">Auto-links parent & address details</span>
                    </div>
                  </div>
                  <Plus className="w-4 h-4 text-slate-400" />
                </button>

                <button
                  type="button"
                  onClick={onAddAnother}
                  className="p-3.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-left transition flex items-center justify-between text-slate-800 shadow-2xs cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#2158E0] text-white flex items-center justify-center">
                      <Plus className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold block">Admit Another Student</span>
                      <span className="text-[11px] text-slate-500">Start new blank admission</span>
                    </div>
                  </div>
                </button>
              </>
            )}

            {isEditMode && (
              <button
                type="button"
                onClick={() => navigate("/admin/students")}
                className="p-3.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-left transition flex items-center justify-between text-slate-800 shadow-2xs cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-slate-700 text-white flex items-center justify-center">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold block">Back to Students Directory</span>
                    <span className="text-[11px] text-slate-500">View all enrolled school students</span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
