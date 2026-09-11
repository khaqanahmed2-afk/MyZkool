import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { OnboardingLayout } from "../../components/onboarding/OnboardingLayout";
import { getSchoolForCurrentUser } from "../../services/schoolService";
import {
  validateAcademicYearInput,
  getDefaultAcademicYear,
  getAcademicYearsForSchool,
  saveAcademicSetup,
} from "../../services/academicService";
import { ACADEMIC_CALENDAR_PRESETS } from "../../types/academic";
import type { AcademicYearInput, AcademicYearValidationErrors } from "../../types/academic";
import type { School } from "../../types/school";
import {
  Calendar,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Info,
  Building2,
  RefreshCw,
} from "lucide-react";

export default function AcademicSetup() {
  const { user, profile, refreshSession } = useAuth();
  const navigate = useNavigate();

  // School context state
  const [school, setSchool] = useState<School | null>(null);
  const [existingYearId, setExistingYearId] = useState<string | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [missingSchoolError, setMissingSchoolError] = useState(false);

  // Form input state
  const [formData, setFormData] = useState<AcademicYearInput>(() => getDefaultAcademicYear());
  const [isCustomLabel, setIsCustomLabel] = useState(false);

  // Form submission state
  const [errors, setErrors] = useState<AcademicYearValidationErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Active preset tracker (if user clicked one)
  const [activePresetId, setActivePresetId] = useState<string | null>("apr_mar");

  // Redirect to /admin if school admin already finished onboarding
  useEffect(() => {
    if (profile?.onboarding_completed) {
      navigate("/admin", { replace: true });
    }
  }, [profile?.onboarding_completed, navigate]);

  // 1. Load School and Existing Academic Configuration on Mount
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      if (!user) return;
      setIsInitialLoading(true);

      try {
        // Fetch current school
        const { school: loadedSchool } = await getSchoolForCurrentUser(
          user.id,
          profile?.school_id
        );

        if (!isMounted) return;

        if (!loadedSchool) {
          setMissingSchoolError(true);
          setIsInitialLoading(false);
          return;
        }

        setSchool(loadedSchool);

        // Fetch existing academic years for this school
        const { academicYears } = await getAcademicYearsForSchool(loadedSchool.id);

        if (!isMounted) return;

        if (academicYears && academicYears.length > 0) {
          // Resume mode: load active or most recent academic year
          const activeYear =
            academicYears.find((y) => y.is_current) || academicYears[0];

          setExistingYearId(activeYear.id);
          setFormData({
            start_year: activeYear.start_year,
            end_year: activeYear.end_year,
            label: activeYear.label,
            start_date: activeYear.start_date,
            end_date: activeYear.end_date,
            is_current: activeYear.is_current,
          });

          // Check if custom label
          if (activeYear.label !== `${activeYear.start_year}–${activeYear.end_year}`) {
            setIsCustomLabel(true);
          }
          setActivePresetId(null);
        } else {
          // No prior academic year saved: populate default suggestion
          const defaults = getDefaultAcademicYear();
          setFormData(defaults);
        }
      } catch (err) {
        console.warn("Failed to load academic setup data:", err);
      } finally {
        if (isMounted) {
          setIsInitialLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [user, profile?.school_id]);

  // 2. Auto-sync Label with Start/End Year unless user customized it
  const handleStartYearChange = (newYear: number) => {
    setFormData((prev) => {
      const updated = {
        ...prev,
        start_year: newYear,
        end_year: prev.end_year <= newYear ? newYear + 1 : prev.end_year,
      };
      if (!isCustomLabel) {
        updated.label = `${updated.start_year}–${updated.end_year}`;
      }
      return updated;
    });

    if (errors.start_year || errors.end_year) {
      setErrors((prev) => ({ ...prev, start_year: undefined, end_year: undefined }));
    }
  };

  const handleEndYearChange = (newYear: number) => {
    setFormData((prev) => {
      const updated = {
        ...prev,
        end_year: newYear,
      };
      if (!isCustomLabel) {
        updated.label = `${updated.start_year}–${updated.end_year}`;
      }
      return updated;
    });

    if (errors.end_year) {
      setErrors((prev) => ({ ...prev, end_year: undefined }));
    }
  };

  const handleLabelChange = (val: string) => {
    setIsCustomLabel(true);
    setFormData((prev) => ({ ...prev, label: val }));
    if (errors.label) {
      setErrors((prev) => ({ ...prev, label: undefined }));
    }
  };

  const handleResetLabel = () => {
    setIsCustomLabel(false);
    setFormData((prev) => ({
      ...prev,
      label: `${prev.start_year}–${prev.end_year}`,
    }));
  };

  // 3. Apply Calendar Preset
  const applyPreset = (presetId: string) => {
    const preset = ACADEMIC_CALENDAR_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;

    setActivePresetId(presetId);

    const sYear = formData.start_year;
    let eYear = formData.end_year;

    // For Jan-Dec, start and end year can be the same, but schema supports standard cycles
    // If start month > end month (e.g. Apr-Mar, Jun-May, Sep-Jun), end year is start year + 1
    if (preset.startMonth > preset.endMonth) {
      eYear = sYear + 1;
    } else {
      eYear = sYear; // e.g. Jan-Dec
    }

    // Format dates with leading zeros
    const sMonth = String(preset.startMonth).padStart(2, "0");
    const sDay = String(preset.startDay).padStart(2, "0");
    const eMonth = String(preset.endMonth).padStart(2, "0");
    const eDay = String(preset.endDay).padStart(2, "0");

    const startDateStr = `${sYear}-${sMonth}-${sDay}`;
    const endDateStr = `${eYear}-${eMonth}-${eDay}`;

    setFormData((prev) => ({
      ...prev,
      end_year: eYear > sYear ? eYear : sYear + 1,
      label: !isCustomLabel
        ? `${sYear}–${eYear > sYear ? eYear : sYear + 1}`
        : prev.label,
      start_date: startDateStr,
      end_date: endDateStr,
    }));

    setErrors((prev) => ({ ...prev, start_date: undefined, end_date: undefined }));
  };

  // 4. Form Submission & Step Progression
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!user) {
      setSubmitError("Authentication session expired. Please log in again.");
      return;
    }

    if (!school) {
      setSubmitError("School profile not found. Please complete Step 1 first.");
      return;
    }

    // Client-side validation
    const validation = validateAcademicYearInput(formData);
    if (!validation.isValid) {
      setErrors(validation.errors);
      const firstErrorMsg = Object.values(validation.errors)[0];
      setSubmitError(firstErrorMsg || "Please correct the highlighted errors.");
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      const result = await saveAcademicSetup({
        schoolId: school.id,
        userId: user.id,
        input: formData,
        existingAcademicYearId: existingYearId,
      });

      if (!result.success) {
        setSubmitError(result.error || "Failed to save academic setup. Please try again.");
        setIsSubmitting(false);
        return;
      }

      setSaveSuccess(true);

      // Refresh auth session so that updated onboarding progress is reflected
      await refreshSession();

      // Proceed to Step 3: Classes & Sections
      navigate("/onboarding/classes");
    } catch (err) {
      console.error("Save academic setup error:", err);
      setSubmitError("An unexpected error occurred while saving your academic calendar.");
      setIsSubmitting(false);
    }
  };

  // Initial loading state
  if (isInitialLoading) {
    return (
      <OnboardingLayout
        currentStepNumber={2}
        completedStepNumbers={[1]}
        title="Set up your academic year"
        subtitle="Configure your school's current academic calendar and terms."
      >
        <div className="py-16 text-center space-y-3">
          <div className="w-8 h-8 border-2 border-[#2158E0] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-medium text-[#141A2E]">
            Loading academic configuration...
          </p>
          <p className="text-xs text-[#5B6478]">
            Retrieving school calendar settings from secure storage.
          </p>
        </div>
      </OnboardingLayout>
    );
  }

  // Missing Step 1 Warning
  if (missingSchoolError || !school) {
    return (
      <OnboardingLayout
        currentStepNumber={2}
        completedStepNumbers={[]}
        title="Set up your academic year"
        subtitle="Configure your school's current academic calendar and terms."
      >
        <div className="p-6 rounded-2xl bg-amber-50/80 border border-amber-200 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 mx-auto flex items-center justify-center">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-amber-900">
              School Profile Incomplete
            </h2>
            <p className="text-xs text-amber-700 mt-1 max-w-md mx-auto">
              Before configuring your academic calendar, your school profile and domain address must be registered in Step 1.
            </p>
          </div>
          <Link
            to="/onboarding/school"
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-[#2158E0] hover:bg-[#1a4ec4] rounded-full transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Go to Step 1: School Profile
          </Link>
        </div>
      </OnboardingLayout>
    );
  }

  const isEditingExisting = Boolean(existingYearId);
  const isAlreadyPastStep2 = Boolean(school && school.onboarding_step > 2);

  return (
    <OnboardingLayout
      currentStepNumber={2}
      completedStepNumbers={[1]}
      title="Set up your academic year"
      subtitle="Establish your school's active academic calendar, start and end dates, and cycle label."
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        {/* Step 1 Completion Banner & Active School Confirmation */}
        <div className="p-3.5 rounded-xl bg-emerald-50/90 border border-emerald-200/80 flex items-center justify-between text-xs text-emerald-900">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              Configuring calendar for{" "}
              <strong className="font-semibold text-emerald-950">
                {school.name}
              </strong>{" "}
              <code className="text-[11px] bg-emerald-100/70 text-emerald-800 px-1.5 py-0.5 rounded ml-1">
                {school.subdomain}.myzkool.com
              </code>
            </span>
          </div>
          <Link
            to="/onboarding/school"
            className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 hover:underline hidden sm:inline"
            title="Edit school profile"
          >
            Edit School Profile
          </Link>
        </div>

        {/* Informational Guidance */}
        <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-100 flex items-start gap-2.5 text-xs text-[#2158E0]">
          <Info className="w-4 h-4 shrink-0 mt-0.5 text-[#2158E0]" />
          <p className="text-[#3b4766] leading-relaxed">
            This academic calendar anchors all core ERP operations: student attendance records, fee collections, grading terms, and class promotions. You can customize dates at any time.
          </p>
        </div>

        {/* Resume Notice if Editing */}
        {isEditingExisting && (
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs text-[#5B6478]">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#2158E0]" />
              Previously saved academic calendar loaded. Updating will save changes in-place.
            </span>
            {isAlreadyPastStep2 && (
              <Link
                to="/onboarding/classes"
                className="text-[11px] font-semibold text-[#2158E0] hover:underline"
              >
                Skip to Step 3 →
              </Link>
            )}
          </div>
        )}

        {/* Global Error Alert */}
        {submitError && (
          <div
            id="academic-submit-error"
            role="alert"
            className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3 text-xs text-red-700"
          >
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-semibold">Validation Error</span>
              <p>{submitError}</p>
            </div>
          </div>
        )}

        {/* Presets Bar */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-[#5B6478] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#2158E0]" />
              Quick Calendar Presets
            </label>
            <span className="text-[11px] text-[#94A3B8]">
              Click to prefill dates (fully customizable)
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {ACADEMIC_CALENDAR_PRESETS.map((preset) => {
              const isSelected = activePresetId === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  id={`preset-${preset.id}`}
                  onClick={() => applyPreset(preset.id)}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    isSelected
                      ? "border-[#2158E0] bg-blue-50/50 ring-2 ring-[#2158E0]/15"
                      : "border-[#E6EAF3] bg-white hover:border-[#CBD5E1] hover:bg-slate-50"
                  }`}
                >
                  <span
                    className={`block text-xs font-bold leading-tight ${
                      isSelected ? "text-[#2158E0]" : "text-[#141A2E]"
                    }`}
                  >
                    {preset.name}
                  </span>
                  <span className="block text-[10px] text-[#64748B] mt-0.5 truncate">
                    {preset.description}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* SECTION 1: Academic Year Range & Label */}
        <div className="bg-[#F8FAFC]/80 rounded-xl p-4 sm:p-5 border border-[#E6EAF3] space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#141A2E] flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#2158E0]" />
            1. Academic Year
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Start Year */}
            <div>
              <label
                htmlFor="start_year"
                className="block text-xs font-semibold text-[#141A2E] mb-1.5"
              >
                Start Year <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                id="start_year"
                name="start_year"
                min={1990}
                max={2100}
                value={formData.start_year || ""}
                onChange={(e) => handleStartYearChange(parseInt(e.target.value, 10))}
                className={`w-full px-3.5 py-2.5 text-sm rounded-xl border bg-white text-[#141A2E] transition-colors focus:outline-none focus:ring-2 ${
                  errors.start_year
                    ? "border-red-300 focus:ring-red-200"
                    : "border-[#E6EAF3] focus:border-[#2158E0] focus:ring-[#2158E0]/15"
                }`}
                placeholder="2026"
                required
              />
              {errors.start_year ? (
                <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" /> {errors.start_year}
                </p>
              ) : (
                <p className="text-[11px] text-[#5B6478] mt-1">
                  Calendar year in which this academic cycle commences.
                </p>
              )}
            </div>

            {/* End Year */}
            <div>
              <label
                htmlFor="end_year"
                className="block text-xs font-semibold text-[#141A2E] mb-1.5"
              >
                End Year <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                id="end_year"
                name="end_year"
                min={1990}
                max={2100}
                value={formData.end_year || ""}
                onChange={(e) => handleEndYearChange(parseInt(e.target.value, 10))}
                className={`w-full px-3.5 py-2.5 text-sm rounded-xl border bg-white text-[#141A2E] transition-colors focus:outline-none focus:ring-2 ${
                  errors.end_year
                    ? "border-red-300 focus:ring-red-200"
                    : "border-[#E6EAF3] focus:border-[#2158E0] focus:ring-[#2158E0]/15"
                }`}
                placeholder="2027"
                required
              />
              {errors.end_year ? (
                <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" /> {errors.end_year}
                </p>
              ) : (
                <p className="text-[11px] text-[#5B6478] mt-1">
                  Calendar year in which this academic cycle concludes.
                </p>
              )}
            </div>
          </div>

          {/* Academic Year Label */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="academic_year_label"
                className="block text-xs font-semibold text-[#141A2E]"
              >
                Academic Year Display Label <span className="text-red-500">*</span>
              </label>
              {isCustomLabel && (
                <button
                  type="button"
                  onClick={handleResetLabel}
                  className="inline-flex items-center gap-1 text-[11px] text-[#2158E0] hover:underline"
                  title="Reset to default format"
                >
                  <RefreshCw className="w-3 h-3" /> Auto-sync with years
                </button>
              )}
            </div>
            <input
              type="text"
              id="academic_year_label"
              name="label"
              value={formData.label}
              onChange={(e) => handleLabelChange(e.target.value)}
              className={`w-full px-3.5 py-2.5 text-sm rounded-xl border bg-white text-[#141A2E] font-medium transition-colors focus:outline-none focus:ring-2 ${
                errors.label
                  ? "border-red-300 focus:ring-red-200"
                  : "border-[#E6EAF3] focus:border-[#2158E0] focus:ring-[#2158E0]/15"
              }`}
              placeholder="e.g. 2026–2027 or AY 2026-27"
              required
            />
            {errors.label ? (
              <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3 shrink-0" /> {errors.label}
              </p>
            ) : (
              <p className="text-[11px] text-[#5B6478] mt-1">
                How this academic year will appear on report cards, fee receipts, and official transcripts.
              </p>
            )}
          </div>
        </div>

        {/* SECTION 2: Calendar Dates */}
        <div className="bg-[#F8FAFC]/80 rounded-xl p-4 sm:p-5 border border-[#E6EAF3] space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#141A2E] flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#2158E0]" />
            2. Calendar Dates
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Start Date */}
            <div>
              <label
                htmlFor="start_date"
                className="block text-xs font-semibold text-[#141A2E] mb-1.5"
              >
                Academic Year Start Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                id="start_date"
                name="start_date"
                value={formData.start_date}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, start_date: e.target.value }));
                  setActivePresetId(null);
                  if (errors.start_date || errors.end_date) {
                    setErrors((prev) => ({
                      ...prev,
                      start_date: undefined,
                      end_date: undefined,
                    }));
                  }
                }}
                className={`w-full px-3.5 py-2.5 text-sm rounded-xl border bg-white text-[#141A2E] transition-colors focus:outline-none focus:ring-2 ${
                  errors.start_date
                    ? "border-red-300 focus:ring-red-200"
                    : "border-[#E6EAF3] focus:border-[#2158E0] focus:ring-[#2158E0]/15"
                }`}
                required
              />
              {errors.start_date ? (
                <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" /> {errors.start_date}
                </p>
              ) : (
                <p className="text-[11px] text-[#5B6478] mt-1">
                  First official day of classes / faculty commencement.
                </p>
              )}
            </div>

            {/* End Date */}
            <div>
              <label
                htmlFor="end_date"
                className="block text-xs font-semibold text-[#141A2E] mb-1.5"
              >
                Academic Year End Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                id="end_date"
                name="end_date"
                value={formData.end_date}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, end_date: e.target.value }));
                  setActivePresetId(null);
                  if (errors.end_date) {
                    setErrors((prev) => ({ ...prev, end_date: undefined }));
                  }
                }}
                className={`w-full px-3.5 py-2.5 text-sm rounded-xl border bg-white text-[#141A2E] transition-colors focus:outline-none focus:ring-2 ${
                  errors.end_date
                    ? "border-red-300 focus:ring-red-200"
                    : "border-[#E6EAF3] focus:border-[#2158E0] focus:ring-[#2158E0]/15"
                }`}
                required
              />
              {errors.end_date ? (
                <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" /> {errors.end_date}
                </p>
              ) : (
                <p className="text-[11px] text-[#5B6478] mt-1">
                  Final day of academic terms before next annual session.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* SECTION 3: Current Academic Year Toggle */}
        <div className="p-4 rounded-xl border border-[#E6EAF3] bg-white flex items-start gap-3">
          <input
            type="checkbox"
            id="is_current_checkbox"
            name="is_current"
            checked={formData.is_current}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, is_current: e.target.checked }))
            }
            className="w-4 h-4 mt-1 rounded text-[#2158E0] border-[#CBD5E1] focus:ring-[#2158E0]/20"
          />
          <div className="text-xs">
            <label
              htmlFor="is_current_checkbox"
              className="font-bold text-[#141A2E] cursor-pointer block"
            >
              Set as the current active academic year for {school.name}
            </label>
            <p className="text-[#5B6478] mt-0.5">
              Active academic years serve as the default session for student registrations, attendance registers, timetable slots, and fee structures.
            </p>
          </div>
        </div>

        {/* Navigation Action Buttons */}
        <div className="pt-4 border-t border-[#F1F5F9] flex flex-col sm:flex-row items-center justify-between gap-3">
          <Link
            to="/onboarding/school"
            id="academic-back-btn"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-[#5B6478] hover:text-[#141A2E] hover:bg-[#F1F5F9] rounded-xl transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to School Profile
          </Link>

          <button
            type="submit"
            id="academic-continue-btn"
            disabled={isSubmitting}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-2.5 text-xs font-semibold text-white bg-[#2158E0] hover:bg-[#1a4ec4] disabled:opacity-60 disabled:cursor-not-allowed rounded-full shadow-sm transition-all"
          >
            {isSubmitting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Saving academic setup...</span>
              </>
            ) : saveSuccess ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Saved! Proceeding...</span>
              </>
            ) : (
              <>
                <span>Continue to Classes &amp; Sections</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </OnboardingLayout>
  );
}
