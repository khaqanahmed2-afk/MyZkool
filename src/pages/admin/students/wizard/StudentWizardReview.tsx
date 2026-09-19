import React from "react";
import { User, Users, GraduationCap, AlertCircle, Edit3, CheckCircle2, ShieldCheck, Bus, CreditCard } from "lucide-react";
import { AdmissionWizardPayload } from "../../../../types/students";
import { maskAadhaar } from "../../../../utils/aadhaarValidation";

interface ReviewProps {
  payload: AdmissionWizardPayload;
  classNamePreview?: string;
  sectionNamePreview?: string;
  onGoToStep: (step: number) => void;
  onSave: () => void;
  isSubmitting: boolean;
}

export const StudentWizardReview: React.FC<ReviewProps> = ({
  payload,
  classNamePreview,
  sectionNamePreview,
  onGoToStep,
  onSave,
  isSubmitting,
}) => {
  const { step1_basic, step2_guardian, step3_academic, step4_documents, step5_sensitive, step7_transport, step8_fee } = payload;

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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-display font-bold text-slate-900">Review Admission Details</h2>
        <p className="text-sm text-slate-500 mt-1">
          Review all information before finalizing admission. Click Edit on any section to make changes.
        </p>
      </div>

      {/* Warnings Checklist */}
      {warnings.length > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2 text-xs text-amber-900">
          <div className="flex items-center gap-2 font-semibold">
            <AlertCircle className="w-4 h-4 text-amber-600" />
            <span>Notices (Non-blocking):</span>
          </div>
          <ul className="list-disc pl-5 space-y-1">
            {warnings.map((w, idx) => (
              <li key={idx}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 3 Columns Review Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Column 1: Student Details */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-sm">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-[#2158E0]" />
              <h3 className="font-semibold text-slate-900 text-sm">Student</h3>
            </div>
            <button
              type="button"
              onClick={() => onGoToStep(1)}
              className="text-xs font-semibold text-[#2158E0] hover:underline flex items-center gap-1"
            >
              <Edit3 className="w-3 h-3" /> Edit
            </button>
          </div>

          <div className="space-y-2 text-xs">
            <div>
              <span className="text-slate-500">Full Name:</span>
              <p className="font-semibold text-slate-800 text-sm">
                {step1_basic.first_name} {step1_basic.middle_name || ""} {step1_basic.last_name}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-slate-500">DOB:</span>
                <p className="font-medium text-slate-800">{step1_basic.dob || "-"}</p>
              </div>
              <div>
                <span className="text-slate-500">Gender:</span>
                <p className="font-medium text-slate-800 capitalize">{step1_basic.gender || "-"}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-slate-500">Category:</span>
                <p className="font-medium text-slate-800 uppercase">{step1_basic.category || "General"}</p>
              </div>
              <div>
                <span className="text-slate-500">Blood Group:</span>
                <p className="font-medium text-slate-800">{step1_basic.blood_group || "-"}</p>
              </div>
            </div>
            <div>
              <span className="text-slate-500 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600" /> Aadhaar:
              </span>
              <p className="font-mono font-medium text-slate-800">
                {step5_sensitive?.aadhaar_number ? maskAadhaar(step5_sensitive.aadhaar_number) : "Not provided"}
              </p>
            </div>
            <div>
              <span className="text-slate-500">Address:</span>
              <p className="font-medium text-slate-800">
                {step2_guardian.current_address.line1}, {step2_guardian.current_address.city} - {step2_guardian.current_address.pin}
              </p>
            </div>
          </div>
        </div>

        {/* Column 2: Family & Contacts */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-sm">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[#2158E0]" />
              <h3 className="font-semibold text-slate-900 text-sm">Family & Guardian</h3>
            </div>
            <button
              type="button"
              onClick={() => onGoToStep(2)}
              className="text-xs font-semibold text-[#2158E0] hover:underline flex items-center gap-1"
            >
              <Edit3 className="w-3 h-3" /> Edit
            </button>
          </div>

          <div className="space-y-3 text-xs">
            {step2_guardian.father?.phone && (
              <div className="p-2 rounded bg-slate-50 border border-slate-100">
                <div className="flex items-center justify-between font-semibold text-slate-800">
                  <span>Father: {step2_guardian.father.full_name}</span>
                  {step2_guardian.father.is_primary_contact && (
                    <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">Primary</span>
                  )}
                </div>
                <p className="text-slate-600 font-mono mt-0.5">Phone: +91 {step2_guardian.father.phone}</p>
                <p className="text-[11px] text-emerald-700 mt-0.5">
                  WhatsApp: {step2_guardian.father.whatsapp_consent !== false ? "Consented" : "Opted Out"}
                </p>
              </div>
            )}

            {step2_guardian.mother?.phone && (
              <div className="p-2 rounded bg-slate-50 border border-slate-100">
                <div className="flex items-center justify-between font-semibold text-slate-800">
                  <span>Mother: {step2_guardian.mother.full_name}</span>
                  {step2_guardian.mother.is_primary_contact && (
                    <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">Primary</span>
                  )}
                </div>
                <p className="text-slate-600 font-mono mt-0.5">Phone: +91 {step2_guardian.mother.phone}</p>
              </div>
            )}

            {step2_guardian.guardian?.phone && (
              <div className="p-2 rounded bg-slate-50 border border-slate-100">
                <div className="flex items-center justify-between font-semibold text-slate-800">
                  <span>Guardian: {step2_guardian.guardian.full_name}</span>
                </div>
                <p className="text-slate-600 font-mono mt-0.5">Phone: +91 {step2_guardian.guardian.phone}</p>
              </div>
            )}
          </div>
        </div>

        {/* Column 3: Academic, Fees & Services */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-sm">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-[#2158E0]" />
              <h3 className="font-semibold text-slate-900 text-sm">Academic & Services</h3>
            </div>
            <button
              type="button"
              onClick={() => onGoToStep(3)}
              className="text-xs font-semibold text-[#2158E0] hover:underline flex items-center gap-1"
            >
              <Edit3 className="w-3 h-3" /> Edit
            </button>
          </div>

          <div className="space-y-2 text-xs">
            <div>
              <span className="text-slate-500">Class & Section:</span>
              <p className="font-semibold text-slate-800 text-sm">
                Class {classNamePreview || step3_academic.class_id} {sectionNamePreview ? `(${sectionNamePreview})` : ""}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-slate-500">Admission Date:</span>
                <p className="font-medium text-slate-800">{step3_academic.admission_date}</p>
              </div>
              <div>
                <span className="text-slate-500">RTE Quota:</span>
                <p className="font-medium text-slate-800">{step3_academic.is_rte ? "Yes (100% Concession)" : "No"}</p>
              </div>
            </div>
            <div>
              <span className="text-slate-500 flex items-center gap-1">
                <Bus className="w-3.5 h-3.5 text-slate-500" /> Transport:
              </span>
              <p className="font-medium text-slate-800">
                {step7_transport?.opt_in ? "Opted In (School Bus)" : "Self Transport"}
              </p>
            </div>
            <div>
              <span className="text-slate-500 flex items-center gap-1">
                <CreditCard className="w-3.5 h-3.5 text-slate-500" /> Fee Structure:
              </span>
              <p className="font-medium text-slate-800">
                {step3_academic.is_rte ? "RTE Concession" : (step8_fee?.fee_structure_id || "Standard 2026-27")}
              </p>
            </div>
            <div>
              <span className="text-slate-500">Documents Vault:</span>
              <p className="font-medium text-slate-800">
                {step4_documents.length} records ({step4_documents.filter(d => d.status === 'uploaded').length} uploaded, {step4_documents.filter(d => d.status === 'pending').length} pending)
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
