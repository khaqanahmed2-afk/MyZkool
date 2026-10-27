import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Save, X, AlertCircle, FileText, CheckCircle2, Loader2, Check } from "lucide-react";
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
  getStudentWizardData,
  updateStudentFromWizard,
} from "../../../../services/studentService";
import { resolveWizardStep, STEP_TITLES } from "./wizardStepConfig";
import { getClassesWithSections } from "../../../../services/classSectionService";
import { getFeeStructures } from "../../../../services/feeSetupService";
import { getRoutes } from "../../../../services/transportCoreService";
import type { FeeStructure } from "../../../../types/fees";
import type { EnrichedRoute } from "../../../../types/transport";
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
    academic_year_id: "",
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
  step8_fee: { fee_structure_id: "", discount_concession: "none" },
};

export const StudentAdmissionWizard: React.FC = () => {
  const navigate = useNavigate();
  const { id: routeStudentId } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const queryStudentId = searchParams.get("studentId") || searchParams.get("id");
  const studentId = routeStudentId || queryStudentId || null;
  const isEditMode = Boolean(studentId);

  const stepQueryParam = searchParams.get("step") || searchParams.get("section");
  const initialStep = resolveWizardStep(stepQueryParam);

  const { schoolId, user, role, school } = useAuth();
  const userId = user?.id;

  const [currentStep, setCurrentStep] = useState(initialStep);
  const [isLoadingStudent, setIsLoadingStudent] = useState(isEditMode);
  const [studentLoadError, setStudentLoadError] = useState<string | null>(null);
  const [existingAadhaarLast4, setExistingAadhaarLast4] = useState<string | null>(null);
  const [isStepSaving, setIsStepSaving] = useState(false);
  const [stepSaveSuccess, setStepSaveSuccess] = useState(false);

  const [payload, setPayload] = useState<AdmissionWizardPayload>(INITIAL_PAYLOAD);
  const [draftNotice, setDraftNotice] = useState<StudentDraft | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<DuplicateCheckResult | null>(null);
  const [duplicateBypassed, setDuplicateBypassed] = useState(false);
  const [stepErrors, setStepErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [admittedStudent, setAdmittedStudent] = useState<Student | null>(null);

  // Reference data state
  const [classes, setClasses] = useState<Array<{ id: string; name: string }>>([]);
  const [sections, setSections] = useState<Array<{ id: string; class_id: string; name: string }>>([]);
  const [feeStructures, setFeeStructures] = useState<FeeStructure[]>([]);
  const [transportRoutes, setTransportRoutes] = useState<EnrichedRoute[]>([]);

  // Load current academic year on mount
  useEffect(() => {
    if (!schoolId) return;
    getCurrentAcademicYear(schoolId).then((res) => {
      const activeAyId = (res as any).year?.id || (res as any).academicYear?.id;
      if (activeAyId) {
        setPayload((prev) => ({
          ...prev,
          step3_academic: {
            ...prev.step3_academic,
            academic_year_id: prev.step3_academic.academic_year_id || activeAyId,
          },
        }));
      }
    }).catch((err) => {
      console.warn("Failed to load academic year:", err);
    });
  }, [schoolId]);

  // Load real classes and sections from database
  useEffect(() => {
    if (!schoolId) return;
    let isMounted = true;

    async function loadSchoolClasses() {
      try {
        const res = await getClassesWithSections(
          schoolId!,
          payload.step3_academic.academic_year_id || undefined
        );
        if (!isMounted) return;

        if (res.classes && res.classes.length > 0) {
          setClasses(res.classes.map((c) => ({ id: c.id, name: c.name })));
          const allSecs: Array<{ id: string; class_id: string; name: string }> = [];
          res.classes.forEach((c) => {
            if (c.sections) {
              c.sections.forEach((s) => {
                allSecs.push({ id: s.id, class_id: s.class_id, name: s.name });
              });
            }
          });
          setSections(allSecs);
        }
      } catch (err) {
        console.warn("Failed to load school classes for admission wizard:", err);
      }
    }
    loadSchoolClasses();

    return () => {
      isMounted = false;
    };
  }, [schoolId, payload.step3_academic.academic_year_id]);

  // Load fee structures for name resolution in preview
  useEffect(() => {
    if (!schoolId) return;
    getFeeStructures(schoolId, payload.step3_academic.academic_year_id || undefined)
      .then((res) => {
        if (res.structures) {
          setFeeStructures(res.structures);
        }
      })
      .catch((err) => {
        console.warn("Failed to load fee structures for preview:", err);
      });
  }, [schoolId, payload.step3_academic.academic_year_id]);

  // Load transport routes for name resolution in preview
  useEffect(() => {
    if (!schoolId) return;
    getRoutes(schoolId)
      .then((res) => {
        if (res) setTransportRoutes(res);
      })
      .catch((err) => {
        console.warn("Failed to load transport routes for preview:", err);
      });
  }, [schoolId]);

  // Load existing student data in edit mode
  useEffect(() => {
    if (!isEditMode || !schoolId || !studentId) {
      return;
    }
    let isMounted = true;
    setIsLoadingStudent(true);
    setStudentLoadError(null);

    getStudentWizardData(schoolId, studentId)
      .then((res) => {
        if (!isMounted) return;
        if (res.error || !res.payload) {
          setStudentLoadError(res.error || "Unable to load student record for editing");
        } else {
          setPayload(res.payload);
          setExistingAadhaarLast4(res.existingAadhaarLast4 || null);
          if (stepQueryParam) {
            setCurrentStep(resolveWizardStep(stepQueryParam));
          }
        }
      })
      .catch((err) => {
        if (isMounted) {
          setStudentLoadError(err.message || "An unexpected error occurred while loading student");
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingStudent(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [schoolId, studentId, isEditMode, stepQueryParam]);

  // 1. Check for saved draft on mount (create mode only)
  useEffect(() => {
    if (isEditMode || !schoolId || !userId) return;
    let isMounted = true;

    async function loadDraft() {
      const { draft } = await getStudentDraft(schoolId!, userId!);
      if (!isMounted) return;
      if (draft && draft.payload) {
        setDraftNotice(draft);
      }
    }
    loadDraft();

    return () => {
      isMounted = false;
    };
  }, [schoolId, userId, isEditMode]);

  const handleResumeDraft = () => {
    if (draftNotice?.payload) {
      setPayload(draftNotice.payload as unknown as AdmissionWizardPayload);
      setCurrentStep(draftNotice.step || 1);
      setDraftNotice(null);
    }
  };

  const handleDiscardDraft = async () => {
    if (schoolId && userId) {
      await deleteStudentDraft(schoolId, userId);
    }
    setDraftNotice(null);
  };

  // 2. Autosave draft on step change (create mode only)
  const autosave = useCallback(
    async (step: number, currentPayload: AdmissionWizardPayload) => {
      if (isEditMode || !schoolId || !userId) return;
      await saveStudentDraft(schoolId, userId, {
        step,
        payload: currentPayload as unknown as Record<string, unknown>,
      });
    },
    [schoolId, userId, isEditMode]
  );

  // 3. Duplicate check trigger (create mode only)
  useEffect(() => {
    if (
      !isEditMode &&
      schoolId &&
      payload.step1_basic.first_name &&
      (payload.step1_basic.dob || payload.step2_guardian.father?.phone || payload.step5_sensitive?.aadhaar_number) &&
      !duplicateBypassed
    ) {
      const timer = setTimeout(async () => {
        const res = await checkStudentDuplicate(schoolId, {
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
    schoolId,
    duplicateBypassed,
    isEditMode,
  ]);

  // Pure step validation logic (no side-effects / no setState)
  const getStepValidationErrors = useCallback((step: number): Record<string, string> => {
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
      const fatherPhone = payload.step2_guardian.father?.phone?.trim() || "";
      const motherPhone = payload.step2_guardian.mother?.phone?.trim() || "";
      const guardianPhone = payload.step2_guardian.guardian?.phone?.trim() || "";

      const hasFather = Boolean(fatherPhone);
      const hasMother = Boolean(motherPhone);
      const hasGuardian = Boolean(guardianPhone);

      if (!hasFather && !hasMother && !hasGuardian) {
        errs.guardian = "At least one parent or guardian mobile phone number is required";
      }

      const phoneRegex = /^\d{10}$/;
      if (fatherPhone && !phoneRegex.test(fatherPhone)) {
        errs.guardian = "Father's mobile number must be exactly 10 digits";
      }
      if (motherPhone && !phoneRegex.test(motherPhone)) {
        errs.guardian = "Mother's mobile number must be exactly 10 digits";
      }
      if (guardianPhone && !phoneRegex.test(guardianPhone)) {
        errs.guardian = "Guardian's mobile number must be exactly 10 digits";
      }

      if (!payload.step2_guardian.current_address.line1?.trim()) {
        errs.address = "Current Address Line 1 is required";
      }
      if (!payload.step2_guardian.current_address.city?.trim()) {
        errs.address = "Current Address City / Town is required";
      }
      if (!payload.step2_guardian.current_address.pin?.trim()) {
        errs.address = "Current Address PIN code is required";
      }

      if (payload.step2_guardian.same_as_current === false) {
        const perm = payload.step2_guardian.permanent_address;
        if (!perm?.line1?.trim()) {
          errs.address = "Permanent Address Line 1 is required";
        }
        if (!perm?.city?.trim()) {
          errs.address = "Permanent Address City / Town is required";
        }
        if (!perm?.pin?.trim()) {
          errs.address = "Permanent Address PIN code is required";
        }
      }
    }

    if (step === 3) {
      if (!payload.step3_academic.class_id) {
        errs.class_id = "Please select a class for the student";
      }
    }

    if (step === 7) {
      if (payload.step7_transport?.opt_in) {
        const t = payload.step7_transport;
        if (!t.route_id) {
          errs.transport = "Please select a bus route or opt out of transport";
        }
        if (t.pickup === false && t.dropoff === false) {
          errs.transport = "Please select at least one of Morning Pickup or Afternoon Drop-off";
        }
      }
    }

    return errs;
  }, [payload]);

  // Pure validity check - SAFE to call during render (no setState)
  const isStepValid = useCallback((step: number): boolean => {
    return Object.keys(getStepValidationErrors(step)).length === 0;
  }, [getStepValidationErrors]);

  // Validation with error state update - ONLY call on user action (handleNext, handleQuickSave, step jumps)
  const validateStep = useCallback((step: number): boolean => {
    const errs = getStepValidationErrors(step);
    setStepErrors(errs);
    return Object.keys(errs).length === 0;
  }, [getStepValidationErrors]);

  const handleNext = useCallback(async () => {
    if (!validateStep(currentStep)) return;

    if (isEditMode && schoolId && studentId && user?.id) {
      setIsStepSaving(true);
      setSubmissionError(null);
      try {
        const res = await updateStudentFromWizard(
          schoolId,
          studentId,
          payload,
          user.id,
          role || "school_admin",
          currentStep
        );
        if (!res.student) {
          setSubmissionError(res.error || "Failed to save changes for this step.");
          setIsStepSaving(false);
          return;
        }
      } catch (err: any) {
        setSubmissionError(err.message || "Failed to save changes for this step.");
        setIsStepSaving(false);
        return;
      } finally {
        setIsStepSaving(false);
      }
    }

    const next = Math.min(currentStep + 1, 9);
    setCurrentStep(next);
    autosave(next, payload);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentStep, payload, validateStep, autosave, isEditMode, schoolId, studentId, user, role]);

  const handleBack = () => {
    const prev = Math.max(currentStep - 1, 1);
    setCurrentStep(prev);
    autosave(prev, payload);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleQuickSave = async () => {
    if (!isEditMode || !schoolId || !studentId || !user?.id) return;
    if (!validateStep(currentStep)) return;
    setIsStepSaving(true);
    setSubmissionError(null);
    try {
      const res = await updateStudentFromWizard(
        schoolId,
        studentId,
        payload,
        user.id,
        role || "school_admin",
        currentStep
      );
      if (res.student) {
        setStepSaveSuccess(true);
        setTimeout(() => setStepSaveSuccess(false), 3000);
      } else {
        setSubmissionError(res.error || "Failed to save step changes.");
      }
    } catch (err: any) {
      setSubmissionError(err.message || "Failed to save step changes.");
    } finally {
      setIsStepSaving(false);
    }
  };

  const handleSaveAdmission = async () => {
    if (!schoolId || !user?.id) {
      alert("Authentication session expired. Please re-login.");
      return;
    }
    setIsSubmitting(true);
    setSubmissionError(null);
    try {
      if (isEditMode && studentId) {
        const res = await updateStudentFromWizard(
          schoolId,
          studentId,
          payload,
          user.id,
          role || "school_admin"
        );
        if (res.student) {
          setAdmittedStudent(res.student);
        } else {
          setSubmissionError(res.error || "Failed to update student profile. Please review inputs.");
        }
      } else {
        const res = await admitStudentTransactional(
          schoolId,
          payload,
          user.id,
          role || "school_admin"
        );

        if (res.student) {
          setAdmittedStudent(res.student);
          await deleteStudentDraft(schoolId, user.id);
        } else {
          setSubmissionError(res.error || "Failed to admit student. Please review inputs and try again.");
        }
      }
    } catch (err: any) {
      setSubmissionError(err.message || (isEditMode ? "Student update failed unexpectedly." : "Admission transaction failed unexpectedly."));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Keyboard Navigation: Enter advances on inputs (except textarea)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey && e.target instanceof HTMLInputElement && e.target.type !== "file") {
        e.preventDefault();
        handleNext();
      }
      if (e.key === "Escape") {
        if (window.confirm(isEditMode ? "Do you want to cancel editing and return to student profile?" : "Do you want to cancel admission and return to student list?")) {
          navigate(isEditMode && studentId ? `/admin/students/${studentId}` : "/admin/students");
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleNext, navigate, isEditMode, studentId]);

  // Derived previews
  const selectedClass = classes.find((c) => c.id === payload.step3_academic.class_id);
  const selectedSection = sections.find((s) => s.id === payload.step3_academic.section_id);
  const selectedFeeStructure = feeStructures.find((f) => f.id === payload.step8_fee?.fee_structure_id);
  const selectedTransportRoute = transportRoutes.find((r) => r.id === payload.step7_transport?.route_id);
  const selectedTransportStop = selectedTransportRoute?.stops?.find((s) => s.id === payload.step7_transport?.stop_id);

  if (!schoolId || !user?.id) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 max-w-md w-full text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Authentication Required</h2>
          <p className="text-sm text-slate-600">
            You must be signed in with an active school account to manage students.
          </p>
          <button
            onClick={() => navigate("/login")}
            className="w-full py-2.5 px-4 bg-[#2158E0] hover:bg-blue-700 text-white font-semibold text-sm rounded-xl transition-colors shadow-sm cursor-pointer"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  if (isEditMode && isLoadingStudent) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 max-w-md w-full text-center space-y-4 shadow-sm">
          <Loader2 className="w-10 h-10 text-[#2158E0] animate-spin mx-auto" />
          <h2 className="text-lg font-bold text-slate-900">Loading Student Information...</h2>
          <p className="text-sm text-slate-500">
            Fetching student profile, enrollment, documents, transport, and fee assignments.
          </p>
        </div>
      </div>
    );
  }

  if (isEditMode && studentLoadError) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-red-200 p-8 max-w-md w-full text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Failed to Load Student</h2>
          <p className="text-sm text-slate-600">
            {studentLoadError}
          </p>
          <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-center">
            <button
              type="button"
              onClick={() => navigate(studentId ? `/admin/students/${studentId}` : "/admin/students")}
              className="py-2.5 px-4 bg-[#2158E0] hover:bg-blue-700 text-white font-semibold text-sm rounded-xl transition-colors shadow-sm cursor-pointer"
            >
              Back to Student Profile
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm rounded-xl transition-colors cursor-pointer"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (admittedStudent) {
    const assignedClass = classes.find((c) => c.id === payload.step3_academic.class_id);
    const assignedSec = sections.find((s) => s.id === payload.step3_academic.section_id);

    return (
      <div className="p-4 sm:p-6 max-w-5xl mx-auto">
        <StudentAdmissionSuccess
          student={admittedStudent}
          school={school}
          payload={payload}
          isEditMode={isEditMode}
          className={assignedClass?.name}
          sectionName={assignedSec?.name}
          feeStructureName={selectedFeeStructure?.name}
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

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-36">
      {/* Top Bar Navigation */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-20 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <button
            aria-label={isEditMode ? "Go back to student profile" : "Go back to student directory"}
            type="button"
            onClick={() => navigate(isEditMode && studentId ? `/admin/students/${studentId}` : "/admin/students")}
            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-display font-bold text-slate-900 leading-tight">
                {isEditMode ? "Edit Student Information" : "New Student Admission"}
              </h1>
              {isEditMode && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-800 border border-blue-200">
                  Edit Mode {payload.step1_basic.admission_no ? `• ${payload.step1_basic.admission_no}` : ""}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              Step {currentStep} of 9: {STEP_TITLES[currentStep - 1]}
            </p>
          </div>
        </div>

        {/* Step Indicator Badges (Desktop) */}
        <div className="hidden md:flex items-center gap-1.5">
          {STEP_TITLES.map((title, idx) => {
            const stepNum = idx + 1;
            const isClickable = isEditMode || stepNum <= currentStep || isStepValid(currentStep);
            return (
              <button
                key={title}
                type="button"
                onClick={() => {
                  if (stepNum === currentStep) return;
                  if (!isEditMode && stepNum > currentStep) {
                    if (!validateStep(currentStep)) return;
                  }
                  if (isClickable) {
                    setCurrentStep(stepNum);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }
                }}
                title={`Step ${stepNum}: ${title}`}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition cursor-pointer ${
                  currentStep === stepNum
                    ? "bg-[#2158E0] text-white shadow-2xs"
                    : isClickable
                    ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    : "text-slate-400 cursor-not-allowed"
                }`}
              >
                {stepNum}
              </button>
            );
          })}
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
            <button type="button" onClick={handleResumeDraft} className="underline hover:text-blue-100 cursor-pointer">
              Resume Draft
            </button>
            <button type="button" onClick={handleDiscardDraft} className="hover:text-blue-200 cursor-pointer">
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
                  A matching student already exists in the school registry:
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
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold text-xs cursor-pointer shadow-2xs"
              >
                Continue Anyway
              </button>
              <button
                aria-label="Dismiss warning"
                type="button"
                onClick={() => setDuplicateWarning(null)}
                className="p-1 hover:bg-amber-100 rounded text-amber-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step Saving Error Alert */}
      {submissionError && currentStep < 9 && (
        <div className="max-w-6xl mx-auto w-full px-6 mt-4">
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{submissionError}</span>
            </div>
            <button
              type="button"
              onClick={() => setSubmissionError(null)}
              className="p-1 hover:bg-red-100 rounded text-red-700"
            >
              <X className="w-3.5 h-3.5" />
            </button>
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
              isEditMode={isEditMode}
              onChange={(f) => setPayload((p) => ({ ...p, step1_basic: { ...p.step1_basic, ...f } }))}
              errors={stepErrors}
            />
          )}
          {currentStep === 2 && (
            <StudentWizardStep2Guardian
              schoolId={schoolId}
              data={payload.step2_guardian}
              onChange={(f) => setPayload((p) => ({ ...p, step2_guardian: { ...p.step2_guardian, ...f } }))}
              errors={stepErrors}
            />
          )}
          {currentStep === 3 && (
            <StudentWizardStep3Academic
              data={payload.step3_academic}
              classes={classes}
              sections={sections}
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
              existingAadhaarLast4={existingAadhaarLast4}
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
              schoolId={schoolId}
              transport={payload.step7_transport}
              onChange={(f) => setPayload((p) => ({ ...p, step7_transport: { ...p.step7_transport!, ...f } }))}
            />
          )}
          {currentStep === 8 && (
            <StudentWizardStep8Fee
              schoolId={schoolId}
              academicYearId={payload.step3_academic.academic_year_id}
              fee={payload.step8_fee}
              isRte={payload.step3_academic.is_rte}
              className={selectedClass?.name}
              onChange={(f) => setPayload((p) => ({ ...p, step8_fee: { ...p.step8_fee!, ...f } }))}
              onFeeStructuresLoaded={(structures) => setFeeStructures(structures)}
            />
          )}
          {currentStep === 9 && (
            <StudentWizardReview
              payload={payload}
              isEditMode={isEditMode}
              classNamePreview={selectedClass?.name}
              sectionNamePreview={selectedSection?.name}
              feeStructureNamePreview={selectedFeeStructure?.name}
              transportDetailsPreview={{
                routeName: selectedTransportRoute?.name,
                stopName: selectedTransportStop?.name,
              }}
              onGoToStep={(s) => {
                setCurrentStep(s);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              onSave={handleSaveAdmission}
              isSubmitting={isSubmitting}
              submissionError={submissionError}
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
            feeStructureNamePreview={selectedFeeStructure?.name}
          />
        </div>
      </div>

      {/* Sticky Bottom Footer - Accounts for desktop sidebar offset */}
      <div className="fixed bottom-0 left-0 right-0 md:left-64 bg-white border-t border-slate-200 px-6 py-3.5 z-20 shadow-lg flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleBack}
            disabled={currentStep === 1}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>

          {isEditMode ? (
            <button
              type="button"
              onClick={handleQuickSave}
              disabled={isStepSaving}
              className="px-3.5 py-2 text-xs font-semibold text-blue-700 hover:text-blue-900 border border-blue-200 bg-blue-50/70 hover:bg-blue-100/70 rounded-lg flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isStepSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                </>
              ) : stepSaveSuccess ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" /> Saved!
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" /> Save Step Changes
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => autosave(currentStep, payload)}
              className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 border border-transparent hover:border-slate-200 rounded-lg flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-4 h-4" /> Save Draft
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              if (window.confirm(isEditMode ? "Discard unsaved changes and return to student profile?" : "Discard unsaved changes and exit admission wizard?")) {
                navigate(isEditMode && studentId ? `/admin/students/${studentId}` : "/admin/students");
              }
            }}
            className="px-3.5 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
          >
            {isEditMode ? "Cancel & Return" : "Cancel"}
          </button>

          {currentStep < 9 ? (
            <button
              type="button"
              onClick={handleNext}
              disabled={isStepSaving}
              className="px-5 py-2 text-xs font-semibold text-white bg-[#2158E0] hover:bg-blue-700 rounded-lg shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isStepSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <span>{currentStep === 8 ? "Review & Confirm" : (isEditMode ? "Save & Next" : "Save & Continue")}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSaveAdmission}
              disabled={isSubmitting}
              className="px-6 py-2 text-xs font-bold text-white bg-[#1FAE7A] hover:bg-emerald-600 rounded-lg shadow-sm flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{isEditMode ? "Updating..." : "Admitting..."}</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isEditMode ? "Update Student" : "Save Student"}</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
