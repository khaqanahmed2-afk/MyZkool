import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Save, X, AlertCircle, FileText, CheckCircle2 } from "lucide-react";
import {
  AdmissionWizardPayload,
  Student,
  StudentDraft,
  DuplicateCheckResult,
} from "../../../../types/students";
import {
  saveStudentDraft,
  getStudentDraft,
  deleteStudentDraft,
  checkStudentDuplicate,
  admitStudentTransactional,
  getCurrentAcademicYear,
} from "../../../../services/studentService";
import { useAuth } from "../../../../context/AuthContext";
import { StudentWizardLiveSummary } from "./StudentWizardLiveSummary";
import { StudentWizardStep1Basic } from "./StudentWizardStep1Basic";
import { StudentWizardStep2Guardian } from "./StudentWizardStep2Guardian";
import { StudentWizardStep3Academic } from "./StudentWizardStep3Academic";
import { StudentWizardStep4Docs } from "./StudentWizardStep4Docs";
import { StudentWizardStep5Sensitive } from "./StudentWizardStep5Sensitive";
import { StudentWizardStep6Medical } from "./StudentWizardStep6Medical";
import { StudentWizardStep7Transport } from "./StudentWizardStep7Transport";
import { StudentWizardStep8Fee } from "./StudentWizardStep8Fee";
import { StudentWizardReview } from "./StudentWizardReview";
import { StudentAdmissionSuccess } from "./StudentAdmissionSuccess";

const INITIAL_PAYLOAD: AdmissionWizardPayload = {
  step1_basic: {
    first_name: "",
    last_name: "",
    dob: "",
    gender: "male",
    nationality: "Indian",
    category: "general",
  },
  step2_guardian: {
    father: {
      full_name: "",
      phone: "",
      relation: "father",
      is_primary_contact: true,
      whatsapp_consent: true,
    },
    current_address: {
      kind: "current",
      line1: "",
      city: "",
      district: "",
      state: "Uttar Pradesh",
      pin: "",
    },
    same_as_current: true,
  },
  step3_academic: {
    academic_year_id: "ay-2026-27",
    admission_date: new Date().toISOString().split("T")[0],
    class_id: "",
    admission_type: "new",
    is_rte: false,
    medium: "English",
  },
  step4_documents: [],
  step5_sensitive: {},
  step6_medical: {},
  step7_transport: { opt_in: false, pickup: true, dropoff: true },
  step8_fee: { fee_structure_id: "standard-2026", discount_concession: "none" },
};

const STEP_TITLES = [
  "Basic Info",
  "Guardian & Family",
  "Academic & Class",
  "Documents Vault",
  "Sensitive Identity",
  "Medical Details",
  "Transport",
  "Fee Assignment",
  "Review & Submit",
];

export const StudentAdmissionWizard: React.FC = () => {
  const navigate = useNavigate();
  const { schoolId, user } = useAuth();
  const currentSchoolId = schoolId || "demo-school";
  const currentUserId = user?.id || "admin-user";

  const [currentStep, setCurrentStep] = useState(1);
  const [payload, setPayload] = useState<AdmissionWizardPayload>(INITIAL_PAYLOAD);
  const [draftNotice, setDraftNotice] = useState<StudentDraft | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<DuplicateCheckResult | null>(null);
  const [duplicateBypassed, setDuplicateBypassed] = useState(false);
  const [stepErrors, setStepErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [admittedStudent, setAdmittedStudent] = useState<Student | null>(null);

  // Mock classes and sections
  const mockClasses = [
    { id: "cls-nursery", name: "Nursery" },
    { id: "cls-kg", name: "Kindergarten" },
    { id: "cls-1", name: "Class 1" },
    { id: "cls-2", name: "Class 2" },
    { id: "cls-3", name: "Class 3" },
    { id: "cls-4", name: "Class 4" },
    { id: "cls-5", name: "Class 5" },
  ];
  const mockSections = [
    { id: "sec-1a", class_id: "cls-1", name: "A" },
    { id: "sec-1b", class_id: "cls-1", name: "B" },
    { id: "sec-4a", class_id: "cls-4", name: "A" },
  ];

  // 1. Check for saved draft on mount
  useEffect(() => {
    async function loadDraft() {
      const { draft } = await getStudentDraft(currentSchoolId, currentUserId);
      if (draft && draft.payload) {
        setDraftNotice(draft);
      }
    }
    loadDraft();
  }, [currentSchoolId, currentUserId]);

  const handleResumeDraft = () => {
    if (draftNotice?.payload) {
      setPayload(draftNotice.payload as unknown as AdmissionWizardPayload);
      setCurrentStep(draftNotice.step || 1);
      setDraftNotice(null);
    }
  };

  const handleDiscardDraft = async () => {
    await deleteStudentDraft(currentSchoolId, currentUserId);
    setDraftNotice(null);
  };

  // 2. Autosave draft on step change
  const autosave = useCallback(
    async (step: number, currentPayload: AdmissionWizardPayload) => {
      await saveStudentDraft(currentSchoolId, currentUserId, {
        step,
        payload: currentPayload as unknown as Record<string, unknown>,
      });
    },
    [currentSchoolId, currentUserId]
  );

  // 3. Duplicate check trigger
  useEffect(() => {
    if (
      payload.step1_basic.first_name &&
      (payload.step1_basic.dob || payload.step2_guardian.father?.phone || payload.step5_sensitive?.aadhaar_number) &&
      !duplicateBypassed
    ) {
      const timer = setTimeout(async () => {
        const res = await checkStudentDuplicate(currentSchoolId, {
          first_name: payload.step1_basic.first_name,
          last_name: payload.step1_basic.last_name,
          dob: payload.step1_basic.dob,
          parent_phone: payload.step2_guardian.father?.phone || payload.step2_guardian.mother?.phone,
          mother_name: payload.step2_guardian.mother?.full_name,
          aadhaar_number: payload.step5_sensitive?.aadhaar_number,
        });
        if (res.is_duplicate) {
          setDuplicateWarning(res);
        } else {
          setDuplicateWarning(null);
        }
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [
    payload.step1_basic.first_name,
    payload.step1_basic.last_name,
    payload.step1_basic.dob,
    payload.step2_guardian.father?.phone,
    payload.step2_guardian.mother?.phone,
    payload.step2_guardian.mother?.full_name,
    payload.step5_sensitive?.aadhaar_number,
    currentSchoolId,
    duplicateBypassed,
  ]);

  // Validation per step
  const validateStep = (step: number): boolean => {
    const errs: Record<string, string> = {};

    if (step === 1) {
      if (!payload.step1_basic.first_name?.trim()) errs.first_name = "First name is required";
      if (!payload.step1_basic.last_name?.trim()) errs.last_name = "Last name is required";
      if (!payload.step1_basic.dob) {
        errs.dob = "Date of birth is required";
      } else {
        const birthYear = new Date(payload.step1_basic.dob).getFullYear();
        const age = new Date().getFullYear() - birthYear;
        if (age < 2 || age > 22) {
          errs.dob = "Age must be between 2 and 22 years";
        }
      }
    }

    if (step === 2) {
      const hasFather = Boolean(payload.step2_guardian.father?.phone);
      const hasMother = Boolean(payload.step2_guardian.mother?.phone);
      const hasGuardian = Boolean(payload.step2_guardian.guardian?.phone);

      if (!hasFather && !hasMother && !hasGuardian) {
        errs.guardian = "At least one parent or guardian phone number is required";
      }
      if (!payload.step2_guardian.current_address.line1?.trim()) {
        errs.address = "Address Line 1 is required";
      }
      if (!payload.step2_guardian.current_address.pin?.trim()) {
        errs.address = "PIN code is required";
      }
    }

    if (step === 3) {
      if (!payload.step3_academic.class_id) {
        errs.class_id = "Please select a class for the student";
      }
    }

    setStepErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      const next = Math.min(currentStep + 1, 9);
      setCurrentStep(next);
      autosave(next, payload);
    }
  };

  const handleBack = () => {
    const prev = Math.max(currentStep - 1, 1);
    setCurrentStep(prev);
    autosave(prev, payload);
  };

  const handleSaveAdmission = async () => {
    setIsSubmitting(true);
    try {
      const res = await admitStudentTransactional(
        currentSchoolId,
        payload,
        currentUserId,
        "admin"
      );

      if (res.student) {
        setAdmittedStudent(res.student);
        await deleteStudentDraft(currentSchoolId, currentUserId);
      } else {
        alert(res.error || "Failed to admit student");
      }
    } catch (err: any) {
      alert(err.message || "Admission failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 4. Keyboard Shortcuts: Enter advances, Esc prompts cancel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey && e.target instanceof HTMLInputElement) {
        // Prevent accidental form submits inside inputs
        e.preventDefault();
        handleNext();
      }
      if (e.key === "Escape") {
        if (window.confirm("Do you want to cancel admission and return to student list?")) {
          navigate("/admin/students");
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentStep, payload, navigate]);

  if (admittedStudent) {
    const assignedClass = mockClasses.find((c) => c.id === payload.step3_academic.class_id);
    const assignedSec = mockSections.find((s) => s.id === payload.step3_academic.section_id);

    return (
      <div className="p-6 max-w-5xl mx-auto">
        <StudentAdmissionSuccess
          student={admittedStudent}
          className={assignedClass?.name}
          sectionName={assignedSec?.name}
          onAddAnother={() => {
            setAdmittedStudent(null);
            setPayload(INITIAL_PAYLOAD);
            setCurrentStep(1);
          }}
          onAddSibling={() => {
            setAdmittedStudent(null);
            setPayload({
              ...INITIAL_PAYLOAD,
              step2_guardian: payload.step2_guardian,
              step3_academic: {
                ...INITIAL_PAYLOAD.step3_academic,
                previous_school: payload.step3_academic.previous_school,
              },
            });
            setCurrentStep(1);
          }}
        />
      </div>
    );
  }

  const selectedClass = mockClasses.find((c) => c.id === payload.step3_academic.class_id);
  const selectedSection = mockSections.find((s) => s.id === payload.step3_academic.section_id);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-24">
      {/* Top Bar Navigation */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-20 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/admin/students")}
            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-display font-bold text-slate-900 leading-tight">
              New Student Admission
            </h1>
            <p className="text-xs text-slate-500">Step {currentStep} of 9: {STEP_TITLES[currentStep - 1]}</p>
          </div>
        </div>

        {/* Step Indicator Badges (Desktop) */}
        <div className="hidden md:flex items-center gap-1.5">
          {STEP_TITLES.map((title, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                if (idx + 1 < currentStep || validateStep(currentStep)) {
                  setCurrentStep(idx + 1);
                }
              }}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                currentStep === idx + 1
                  ? "bg-[#2158E0] text-white"
                  : idx + 1 < currentStep
                  ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  : "text-slate-400 cursor-not-allowed"
              }`}
            >
              {idx + 1}
            </button>
          ))}
        </div>
      </div>

      {/* Resume Draft Banner */}
      {draftNotice && (
        <div className="bg-blue-600 text-white px-6 py-2.5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            <span>
              Unsaved admission draft found from {new Date(draftNotice.updated_at).toLocaleString()}.
            </span>
          </div>
          <div className="flex items-center gap-3 font-semibold">
            <button type="button" onClick={handleResumeDraft} className="underline hover:text-blue-100">
              Resume Draft
            </button>
            <button type="button" onClick={handleDiscardDraft} className="hover:text-blue-200">
              Discard
            </button>
          </div>
        </div>
      )}

      {/* Duplicate Check Warning Alert */}
      {duplicateWarning && (
        <div className="max-w-6xl mx-auto w-full px-6 mt-4">
          <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-sm text-amber-950">
                  Potential Duplicate Student Detected ({duplicateWarning.match_score}% Match)
                </h4>
                <p className="mt-1">
                  A matching student already exists in the system:
                </p>
                <div className="mt-2 space-y-1">
                  {duplicateWarning.matches.map((m) => (
                    <div key={m.id} className="font-medium">
                      • <strong>{m.first_name} {m.last_name}</strong> (Adm No: {m.admission_no}, DOB: {m.dob}) — {m.match_reason}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="shrink-0 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDuplicateBypassed(true)}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold text-xs"
              >
                Continue Anyway
              </button>
              <button
                type="button"
                onClick={() => setDuplicateWarning(null)}
                className="p-1 hover:bg-amber-100 rounded text-amber-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid Content */}
      <div className="max-w-6xl mx-auto w-full px-6 py-6 grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1">
        {/* Step Forms (Left 2 Columns) */}
        <div className="lg:col-span-2 space-y-6">
          {currentStep === 1 && (
            <StudentWizardStep1Basic
              data={payload.step1_basic}
              onChange={(f) => setPayload((p) => ({ ...p, step1_basic: { ...p.step1_basic, ...f } }))}
              errors={stepErrors}
            />
          )}
          {currentStep === 2 && (
            <StudentWizardStep2Guardian
              schoolId={currentSchoolId}
              data={payload.step2_guardian}
              onChange={(f) => setPayload((p) => ({ ...p, step2_guardian: { ...p.step2_guardian, ...f } }))}
              errors={stepErrors}
            />
          )}
          {currentStep === 3 && (
            <StudentWizardStep3Academic
              data={payload.step3_academic}
              classes={mockClasses}
              sections={mockSections}
              onChange={(f) => setPayload((p) => ({ ...p, step3_academic: { ...p.step3_academic, ...f } }))}
              errors={stepErrors}
            />
          )}
          {currentStep === 4 && (
            <StudentWizardStep4Docs
              documents={payload.step4_documents}
              category={payload.step1_basic.category}
              isRte={payload.step3_academic.is_rte}
              onChange={(docs) => setPayload((p) => ({ ...p, step4_documents: docs }))}
            />
          )}
          {currentStep === 5 && (
            <StudentWizardStep5Sensitive
              aadhaarNumber={payload.step5_sensitive?.aadhaar_number}
              onChange={(num) => setPayload((p) => ({ ...p, step5_sensitive: { aadhaar_number: num } }))}
            />
          )}
          {currentStep === 6 && (
            <StudentWizardStep6Medical
              medical={payload.step6_medical}
              canWriteMedical={true}
              onChange={(f) => setPayload((p) => ({ ...p, step6_medical: { ...p.step6_medical, ...f } }))}
            />
          )}
          {currentStep === 7 && (
            <StudentWizardStep7Transport
              transport={payload.step7_transport}
              onChange={(f) => setPayload((p) => ({ ...p, step7_transport: { ...p.step7_transport!, ...f } }))}
            />
          )}
          {currentStep === 8 && (
            <StudentWizardStep8Fee
              fee={payload.step8_fee}
              isRte={payload.step3_academic.is_rte}
              className={selectedClass?.name}
              onChange={(f) => setPayload((p) => ({ ...p, step8_fee: { ...p.step8_fee!, ...f } }))}
            />
          )}
          {currentStep === 9 && (
            <StudentWizardReview
              payload={payload}
              classNamePreview={selectedClass?.name}
              sectionNamePreview={selectedSection?.name}
              onGoToStep={(s) => setCurrentStep(s)}
              onSave={handleSaveAdmission}
              isSubmitting={isSubmitting}
            />
          )}
        </div>

        {/* Live Summary Card (Desktop Right Column) */}
        <div className="hidden lg:block">
          <StudentWizardLiveSummary
            currentStep={currentStep}
            payload={payload}
            classNamePreview={selectedClass?.name}
            sectionNamePreview={selectedSection?.name}
          />
        </div>
      </div>

      {/* Sticky Bottom Footer */}
      <div className="fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 px-6 py-3.5 z-20 shadow-lg flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleBack}
            disabled={currentStep === 1}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <button
            type="button"
            onClick={() => autosave(currentStep, payload)}
            className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 border border-transparent hover:border-slate-200 rounded-lg flex items-center gap-1.5"
          >
            <Save className="w-4 h-4" /> Save Draft
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              if (window.confirm("Discard changes and exit admission wizard?")) {
                navigate("/admin/students");
              }
            }}
            className="px-3.5 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800"
          >
            Cancel
          </button>

          {currentStep < 9 ? (
            <button
              type="button"
              onClick={handleNext}
              className="px-5 py-2 text-xs font-semibold text-white bg-[#2158E0] hover:bg-blue-700 rounded-lg shadow-sm flex items-center gap-1.5"
            >
              <span>{currentStep === 8 ? "Review Admission" : "Save & Continue"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSaveAdmission}
              disabled={isSubmitting}
              className="px-6 py-2 text-xs font-bold text-white bg-[#1FAE7A] hover:bg-emerald-600 rounded-lg shadow-sm flex items-center gap-1.5 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? "Admitting..." : "Save Student"}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
