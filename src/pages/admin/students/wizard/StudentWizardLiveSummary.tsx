import React from "react";
import { User, CheckCircle2, ShieldCheck, Bus, CreditCard, FileText } from "lucide-react";
import { AdmissionWizardPayload } from "../../../../types/students";
import { maskAadhaar } from "../../../../utils/aadhaarValidation";

interface StudentWizardLiveSummaryProps {
  currentStep: number;
  payload: AdmissionWizardPayload;
  classNamePreview?: string;
  sectionNamePreview?: string;
}

const STEP_LABELS = [
  "Basic Info",
  "Guardian & Family",
  "Academic & Class",
  "Documents Vault",
  "Sensitive / Aadhaar",
  "Medical",
  "Transport",
  "Fee Assignment",
  "Review & Submit",
];

export const StudentWizardLiveSummary: React.FC<StudentWizardLiveSummaryProps> = ({
  currentStep,
  payload,
  classNamePreview,
  sectionNamePreview,
}) => {
  const { step1_basic, step2_guardian, step3_academic, step5_sensitive, step7_transport, step8_fee } = payload;
  const fullName = `${step1_basic.first_name || ""} ${step1_basic.last_name || ""}`.trim() || "New Student";

  const primaryParent = step2_guardian.father?.is_primary_contact
    ? step2_guardian.father
    : step2_guardian.mother?.is_primary_contact
    ? step2_guardian.mother
    : step2_guardian.guardian || step2_guardian.father || step2_guardian.mother;

  const aadhaarMasked = step5_sensitive?.aadhaar_number
    ? maskAadhaar(step5_sensitive.aadhaar_number)
    : "Not provided";

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 sticky top-6 space-y-6">
      {/* Header Profile Snippet */}
      <div className="flex items-center space-x-4">
        {step1_basic.photo_path ? (
          <img
            src={step1_basic.photo_path}
            alt="Preview"
            className="w-16 h-16 rounded-xl object-cover border border-slate-200"
          />
        ) : (
          <div className="w-16 h-16 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-bold text-xl">
            {step1_basic.first_name ? step1_basic.first_name[0].toUpperCase() : <User className="w-8 h-8 text-blue-400" />}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-display font-bold text-slate-900 text-lg truncate">
            {fullName}
          </h3>
          <p className="text-xs text-slate-500 font-medium">
            {classNamePreview ? `Class ${classNamePreview}` : "Class not selected"}
            {sectionNamePreview ? ` - ${sectionNamePreview}` : ""}
          </p>
          <div className="mt-1 flex items-center gap-1.5 flex-wrap">
            {step3_academic.is_rte && (
              <span className="px-1.5 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                RTE Quota
              </span>
            )}
            {step1_basic.gender && (
              <span className="px-1.5 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-600 capitalize">
                {step1_basic.gender}
              </span>
            )}
            {step1_basic.category && (
              <span className="px-1.5 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-600 uppercase">
                {step1_basic.category}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Progress Track */}
      <div>
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="font-semibold text-slate-700">
            Step {Math.min(currentStep, 8)} of 8: {STEP_LABELS[currentStep - 1] || "Review"}
          </span>
          <span className="text-slate-500 font-medium">{Math.round((Math.min(currentStep, 8) / 8) * 100)}%</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
          <div
            className="bg-[#2158E0] h-2 rounded-full transition-all duration-300"
            style={{ width: `${(Math.min(currentStep, 8) / 8) * 100}%` }}
          />
        </div>
      </div>

      {/* Quick Fact Highlights */}
      <div className="space-y-3 pt-2 border-t border-slate-100 text-xs">
        {/* Parent & Contact */}
        <div className="flex items-start justify-between">
          <span className="text-slate-500">Primary Contact:</span>
          <span className="text-slate-900 font-medium text-right truncate max-w-[170px]">
            {primaryParent?.full_name ? `${primaryParent.full_name} (${primaryParent.phone || "No phone"})` : "None"}
          </span>
        </div>

        {/* WhatsApp Consent */}
        <div className="flex items-center justify-between">
          <span className="text-slate-500">WhatsApp Updates:</span>
          <span className={`font-medium ${primaryParent?.whatsapp_consent !== false ? "text-emerald-600" : "text-amber-600"}`}>
            {primaryParent?.whatsapp_consent !== false ? "Opted In" : "Opted Out"}
          </span>
        </div>

        {/* Aadhaar Vault */}
        <div className="flex items-center justify-between">
          <span className="text-slate-500 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" /> Aadhaar:
          </span>
          <span className="font-mono text-slate-800 font-medium">{aadhaarMasked}</span>
        </div>

        {/* Transport */}
        <div className="flex items-center justify-between">
          <span className="text-slate-500 flex items-center gap-1">
            <Bus className="w-3.5 h-3.5 text-slate-500" /> Transport:
          </span>
          <span className="text-slate-800 font-medium">
            {step7_transport?.opt_in ? "Opted In" : "Not using"}
          </span>
        </div>

        {/* Fee Preview */}
        <div className="flex items-center justify-between">
          <span className="text-slate-500 flex items-center gap-1">
            <CreditCard className="w-3.5 h-3.5 text-slate-500" /> Fee Structure:
          </span>
          <span className="text-slate-800 font-medium">
            {step8_fee?.fee_structure_id ? "Standard Plan" : (step3_academic.is_rte ? "RTE Concession" : "Pending Assign")}
          </span>
        </div>

        {/* Documents */}
        <div className="flex items-center justify-between">
          <span className="text-slate-500 flex items-center gap-1">
            <FileText className="w-3.5 h-3.5 text-slate-500" /> Documents:
          </span>
          <span className="text-slate-800 font-medium">
            {payload.step4_documents.length} recorded
          </span>
        </div>
      </div>
    </div>
  );
};
