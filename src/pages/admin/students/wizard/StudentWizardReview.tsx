import React from "react";
import {
  User,
  Users,
  GraduationCap,
  AlertCircle,
  Edit3,
  CheckCircle2,
  ShieldCheck,
  Bus,
  CreditCard,
  FileText,
  HeartPulse,
  Home,
  Hash,
  Loader2,
} from "lucide-react";
import { AdmissionWizardPayload } from "../../../../types/students";
import { maskAadhaar } from "../../../../utils/aadhaarValidation";

interface ReviewProps {
  payload: AdmissionWizardPayload;
  classNamePreview?: string;
  sectionNamePreview?: string;
  feeStructureNamePreview?: string;
  transportDetailsPreview?: {
    routeName?: string;
    stopName?: string;
  };
  isEditMode?: boolean;
  onGoToStep: (step: number) => void;
  onSave: () => void;
  isSubmitting: boolean;
  submissionError?: string | null;
}

export const StudentWizardReview: React.FC<ReviewProps> = ({
  payload,
  classNamePreview,
  sectionNamePreview,
  feeStructureNamePreview,
  transportDetailsPreview,
  isEditMode,
  onGoToStep,
  onSave,
  isSubmitting,
  submissionError,
}) => {
  const {
    step1_basic,
    step2_guardian,
    step3_academic,
    step4_documents,
    step5_sensitive,
    step6_medical,
    step7_transport,
    step8_fee,
  } = payload;

  const warnings: string[] = [];
  const pendingDocs = step4_documents.filter((d) => d.status === "pending");
  if (pendingDocs.length > 0) {
    warnings.push(`${pendingDocs.length} document(s) marked pending submission.`);
  }
  if (!step3_academic.section_id) {
    warnings.push("Section not assigned yet (can be assigned later).");
  }
  const primaryParent = step2_guardian.father?.is_primary_contact
    ? step2_guardian.father
    : step2_guardian.mother?.is_primary_contact
    ? step2_guardian.mother
    : step2_guardian.guardian || step2_guardian.father;
  if (primaryParent && primaryParent.whatsapp_consent === false) {
    warnings.push("Primary contact opted out of WhatsApp updates.");
  }

  const currentAddr = step2_guardian.current_address;
  const permAddr = step2_guardian.same_as_current ? currentAddr : (step2_guardian.permanent_address || currentAddr);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-display font-bold text-slate-900">
          {isEditMode ? "Step 9: Review & Save Changes" : "Step 9: Review & Confirm Admission"}
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          {isEditMode
            ? "Review all modified student information before persisting changes to the registry. Click Edit on any section to return to that step."
            : "Review all collected information before committing the student record to the school registry."}
        </p>
      </div>

      {/* Submission Error Banner */}
      {submissionError && (
        <div className="p-4 bg-rose-50 border border-rose-300 rounded-xl space-y-1 text-xs text-rose-900">
          <div className="flex items-center gap-2 font-bold text-rose-800">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{isEditMode ? "Save Changes Failed" : "Admission Submission Failed"}</span>
          </div>
          <p className="pl-6 text-rose-700">{submissionError}</p>
        </div>
      )}

      {/* Admission Number Prominent Announcement */}
      <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl flex items-start gap-3.5">
        <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
          <Hash className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-800">
              {isEditMode ? "Student Admission Number (Locked)" : "Admission Number Allocation"}
            </span>
            <button
              type="button"
              onClick={() => onGoToStep(1)}
              className="text-xs font-semibold text-blue-700 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Edit3 className="w-3 h-3" /> Edit
            </button>
          </div>
          {isEditMode ? (
            <div className="mt-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-base font-bold text-slate-900">
                  {step1_basic.admission_no}
                </span>
                <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
                  Preserved & Immutable
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Institutional admission number remains unchanged during profile editing.
              </p>
            </div>
          ) : step1_basic.admission_no ? (
            <div className="mt-1 flex items-center gap-2">
              <span className="font-mono text-base font-bold text-slate-900">
                {step1_basic.admission_no}
              </span>
              <span className="text-[10px] font-semibold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                Pre-assigned / Custom Number
              </span>
            </div>
          ) : (
            <p className="mt-1 text-xs font-medium text-slate-800">
              An authoritative, gap-free admission number (e.g. <span className="font-mono font-bold text-blue-900">ADM-{new Date().getFullYear()}-0001</span>) will be automatically generated by the database sequence upon final confirmation.
            </p>
          )}
        </div>
      </div>

      {/* Non-blocking notices */}
      {warnings.length > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2 text-xs text-amber-900">
          <div className="flex items-center gap-2 font-bold text-amber-950">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Notices (Non-blocking):</span>
          </div>
          <ul className="list-disc pl-5 space-y-1 text-slate-700">
            {warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Structured Review Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Card 1: Student Basic Info */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-[#2158E0]" />
                <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Student Profile</h3>
              </div>
              <button
                type="button"
                onClick={() => onGoToStep(1)}
                className="text-xs font-semibold text-[#2158E0] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Edit3 className="w-3 h-3" /> Edit
              </button>
            </div>

            <div className="space-y-2 text-xs pt-2">
              <div>
                <span className="text-slate-500 text-[11px]">Legal Full Name:</span>
                <p className="font-bold text-slate-900 text-sm">
                  {step1_basic.first_name} {step1_basic.middle_name ? `${step1_basic.middle_name} ` : ""}{step1_basic.last_name}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-slate-500 text-[11px]">Date of Birth:</span>
                  <p className="font-medium text-slate-800">{step1_basic.dob || "-"}</p>
                </div>
                <div>
                  <span className="text-slate-500 text-[11px]">Gender:</span>
                  <p className="font-medium text-slate-800 capitalize">{step1_basic.gender || "-"}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-slate-500 text-[11px]">Category:</span>
                  <p className="font-medium text-slate-800 uppercase">{step1_basic.category || "General"}</p>
                </div>
                <div>
                  <span className="text-slate-500 text-[11px]">Blood Group:</span>
                  <p className="font-medium text-slate-800">{step1_basic.blood_group || "-"}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-slate-500 text-[11px]">SR Number:</span>
                  <p className="font-mono text-slate-800">{step1_basic.sr_no || "-"}</p>
                </div>
                <div>
                  <span className="text-slate-500 text-[11px]">APAAR ID:</span>
                  <p className="font-mono text-slate-800">{step1_basic.apaar_id || "-"}</p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <span className="text-slate-500 text-[11px] flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-blue-600" /> Aadhaar:
                  </span>
                  <p className="font-mono font-medium text-slate-800">
                    {step5_sensitive?.aadhaar_number ? maskAadhaar(step5_sensitive.aadhaar_number) : "Not provided"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onGoToStep(5)}
                  className="text-[11px] font-semibold text-blue-700 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Edit3 className="w-3 h-3" /> Edit
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Family & Contacts */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#2158E0]" />
                <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Family & Guardians</h3>
              </div>
              <button
                type="button"
                onClick={() => onGoToStep(2)}
                className="text-xs font-semibold text-[#2158E0] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Edit3 className="w-3 h-3" /> Edit
              </button>
            </div>

            <div className="space-y-2 text-xs pt-2">
              {step2_guardian.father?.phone && (
                <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="flex items-center justify-between font-semibold text-slate-800">
                    <span>Father: {step2_guardian.father.full_name}</span>
                    {step2_guardian.father.is_primary_contact && (
                      <span className="text-[10px] text-blue-700 bg-blue-100 px-1.5 py-0.2 rounded font-bold">
                        Primary
                      </span>
                    )}
                  </div>
                  <p className="text-slate-600 font-mono text-[11px] mt-0.5">
                    +91 {step2_guardian.father.phone}
                  </p>
                </div>
              )}

              {step2_guardian.mother?.phone && (
                <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="flex items-center justify-between font-semibold text-slate-800">
                    <span>Mother: {step2_guardian.mother.full_name}</span>
                    {step2_guardian.mother.is_primary_contact && (
                      <span className="text-[10px] text-blue-700 bg-blue-100 px-1.5 py-0.2 rounded font-bold">
                        Primary
                      </span>
                    )}
                  </div>
                  <p className="text-slate-600 font-mono text-[11px] mt-0.5">
                    +91 {step2_guardian.mother.phone}
                  </p>
                </div>
              )}

              {step2_guardian.guardian?.phone && (
                <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="flex items-center justify-between font-semibold text-slate-800">
                    <span>Guardian: {step2_guardian.guardian.full_name}</span>
                  </div>
                  <p className="text-slate-600 font-mono text-[11px] mt-0.5">
                    +91 {step2_guardian.guardian.phone}
                  </p>
                </div>
              )}

              <div className="pt-1">
                <span className="text-slate-500 text-[11px] block">WhatsApp Consent:</span>
                <span className="font-semibold text-emerald-700">
                  {primaryParent?.whatsapp_consent !== false ? "Opted In (Updates active)" : "Opted Out"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Residential Address */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Home className="w-4 h-4 text-[#2158E0]" />
                <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Address Details</h3>
              </div>
              <button
                type="button"
                onClick={() => onGoToStep(2)}
                className="text-xs font-semibold text-[#2158E0] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Edit3 className="w-3 h-3" /> Edit
              </button>
            </div>

            <div className="space-y-2 text-xs pt-2">
              <div>
                <span className="text-slate-500 text-[11px]">Current Address:</span>
                <p className="font-medium text-slate-800">
                  {currentAddr.line1}
                  {currentAddr.landmark ? `, Near ${currentAddr.landmark}` : ""}
                </p>
                <p className="text-slate-600 text-[11px]">
                  {currentAddr.city}, {currentAddr.state} - {currentAddr.pin}
                </p>
              </div>

              <div className="pt-1 border-t border-slate-100">
                <span className="text-slate-500 text-[11px]">Permanent Address:</span>
                <p className="font-medium text-slate-800">
                  {permAddr.line1}
                </p>
                <p className="text-slate-600 text-[11px]">
                  {permAddr.city}, {permAddr.state} - {permAddr.pin}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Card 4: Academic Placement & Previous Education */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-[#2158E0]" />
                <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Class & Academic</h3>
              </div>
              <button
                type="button"
                onClick={() => onGoToStep(3)}
                className="text-xs font-semibold text-[#2158E0] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Edit3 className="w-3 h-3" /> Edit
              </button>
            </div>

            <div className="space-y-2 text-xs pt-2">
              <div>
                <span className="text-slate-500 text-[11px]">Class & Section:</span>
                <p className="font-bold text-slate-900 text-sm">
                  Class {classNamePreview || step3_academic.class_id} {sectionNamePreview ? `(${sectionNamePreview})` : "(No section)"}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-slate-500 text-[11px]">Admission Date:</span>
                  <p className="font-medium text-slate-800">{step3_academic.admission_date}</p>
                </div>
                <div>
                  <span className="text-slate-500 text-[11px]">Medium:</span>
                  <p className="font-medium text-slate-800">{step3_academic.medium || "English"}</p>
                </div>
              </div>

              <div>
                <span className="text-slate-500 text-[11px]">RTE 12(1)(c) Quota:</span>
                <p className="font-semibold text-slate-800">
                  {step3_academic.is_rte ? "Yes (100% Tuition Waiver)" : "No"}
                </p>
              </div>

              {step3_academic.previous_school?.school_name && (
                <div className="pt-1 border-t border-slate-100">
                  <span className="text-slate-500 text-[11px]">Previous School:</span>
                  <p className="font-medium text-slate-800 truncate">
                    {step3_academic.previous_school.school_name} ({step3_academic.previous_school.board || "CBSE"})
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Card 5: Documents Vault */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#2158E0]" />
                <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Documents Vault</h3>
              </div>
              <button
                type="button"
                onClick={() => onGoToStep(4)}
                className="text-xs font-semibold text-[#2158E0] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Edit3 className="w-3 h-3" /> Edit
              </button>
            </div>

            <div className="space-y-1.5 text-xs pt-2">
              <p className="font-medium text-slate-800">
                {step4_documents.length} document records filed
              </p>
              <div className="space-y-1 text-[11px]">
                {step4_documents.slice(0, 4).map((d) => (
                  <div key={d.doc_type} className="flex items-center justify-between text-slate-600">
                    <span className="capitalize truncate max-w-[150px]">{d.doc_type.replace(/_/g, " ")}:</span>
                    <span className={d.status === "uploaded" ? "font-bold text-emerald-700" : "font-semibold text-amber-700"}>
                      {d.status === "uploaded" ? "Uploaded" : `Pending (${d.expected_on || "Due"})`}
                    </span>
                  </div>
                ))}
                {step4_documents.length > 4 && (
                  <p className="text-[10px] text-slate-500 pt-1">
                    + {step4_documents.length - 4} more document records
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Card 6: Transport, Fees & Medical */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-[#2158E0]" />
                <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Billing & Services</h3>
              </div>
              <button
                type="button"
                onClick={() => onGoToStep(8)}
                className="text-xs font-semibold text-[#2158E0] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Edit3 className="w-3 h-3" /> Edit
              </button>
            </div>

            <div className="space-y-2 text-xs pt-2">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-slate-500 text-[11px]">Assigned Fee Structure:</span>
                  <p className="font-bold text-slate-900">
                    {step3_academic.is_rte
                      ? "RTE 100% Tuition Waiver"
                      : feeStructureNamePreview || "Standard Annual Plan"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onGoToStep(8)}
                  className="text-[11px] font-semibold text-blue-700 hover:underline flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <Edit3 className="w-3 h-3" /> Edit
                </button>
              </div>

              <div className="flex items-start justify-between pt-1 border-t border-slate-100">
                <div>
                  <span className="text-slate-500 text-[11px] flex items-center gap-1">
                    <Bus className="w-3 h-3 text-slate-500" /> School Transport:
                  </span>
                  <p className="font-medium text-slate-800">
                    {step7_transport?.opt_in
                      ? `Opted In ${transportDetailsPreview?.stopName ? `(${transportDetailsPreview.stopName})` : ""}`
                      : "Self Transport (Opted Out)"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onGoToStep(7)}
                  className="text-[11px] font-semibold text-blue-700 hover:underline flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <Edit3 className="w-3 h-3" /> Edit
                </button>
              </div>

              {step6_medical && (step6_medical.allergies || step6_medical.doctor_name) && (
                <div className="flex items-start justify-between pt-1 border-t border-slate-100">
                  <div>
                    <span className="text-slate-500 text-[11px] flex items-center gap-1">
                      <HeartPulse className="w-3 h-3 text-rose-500" /> Medical Record:
                    </span>
                    <p className="font-medium text-slate-800 text-[11px]">
                      {step6_medical.allergies ? `Allergies: ${step6_medical.allergies}` : "Health recorded"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onGoToStep(6)}
                    className="text-[11px] font-semibold text-blue-700 hover:underline flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    <Edit3 className="w-3 h-3" /> Edit
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation & Commitment Box */}
      <div className="bg-slate-100/80 rounded-xl p-4 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h4 className="font-bold text-sm text-slate-900">
            {isEditMode ? "Ready to save profile changes?" : "Ready to complete admission?"}
          </h4>
          <p className="text-xs text-slate-600 mt-0.5">
            {isEditMode
              ? "Clicking Update Student will save changes to this student's records without affecting unchanged fields."
              : "Clicking Save Student will commit the record to the school database and generate the official admission certificate."}
          </p>
        </div>

        <button
          type="button"
          onClick={onSave}
          disabled={isSubmitting}
          className="px-6 py-2.5 text-xs font-bold text-white bg-[#1FAE7A] hover:bg-emerald-600 rounded-xl shadow-xs flex items-center justify-center gap-2 transition disabled:opacity-50 shrink-0 cursor-pointer"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{isEditMode ? "Updating Profile..." : "Admitting Student..."}</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4" />
              <span>{isEditMode ? "Update Student" : "Save Student"}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
