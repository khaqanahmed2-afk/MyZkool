import React, { useState, useEffect, useCallback, useId } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { OnboardingLayout } from "../../components/onboarding/OnboardingLayout";
import { getSchoolForCurrentUser } from "../../services/schoolService";
import {
  validateAcademicYearInput,
  getDefaultAcademicYear,
  getAcademicYearsForSchool,
  saveAcademicSetup,
  formatDefaultAcademicYearLabel,
  isValidCalendarDate,
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
  Building2,
  RefreshCw,
  Sparkles,
  Info,
  Check,
  Tag,
} from "lucide-react";

export default function AcademicSetup() {
  const { user, profile, refreshSession, signOut } = useAuth();
  const navigate = useNavigate();

  // Generated accessible IDs
  const startDateId = useId();
  const endDateId = useId();
  const startYearId = useId();
  const endYearId = useId();
  const labelId = useId();

  // School context state
  const [school, setSchool] = useState<School | null>(null);
  const [existingYearId, setExistingYearId] = useState<string | null>(null);
  const [existingYearSummary, setExistingYearSummary] = useState<{
    label: string;
    startDate: string;
    endDate: string;
  } | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [missingSchoolError, setMissingSchoolError] = useState(false);

  // Form input state
  const [formData, setFormData] = useState<AcademicYearInput>(() => getDefaultAcademicYear());
  const [isCustomLabel, setIsCustomLabel] = useState(false);
  const [isFormDirty, setIsFormDirty] = useState(false);

  // Active preset tracker
  const [activePresetId, setActivePresetId] = useState<string | null>("apr_mar");

  // Form submission and error states
  const [errors, setErrors] = useState<AcademicYearValidationErrors>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingAndExiting, setIsSavingAndExiting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Redirect to /admin if school admin already finished onboarding
  useEffect(() => {
    if (profile?.onboarding_completed) {
      navigate("/admin", { replace: true });
    }
  }, [profile?.onboarding_completed, navigate]);

  // Determine which preset matches given start and end dates
  const matchPresetFromDates = useCallback((sDate: string, eDate: string): string | null => {
    if (!isValidCalendarDate(sDate) || !isValidCalendarDate(eDate)) return null;
    const [, sMonth, sDay] = sDate.split("-").map(Number);
    const [, eMonth, eDay] = eDate.split("-").map(Number);

    const matched = ACADEMIC_CALENDAR_PRESETS.find(
      (p) =>
        p.startMonth === sMonth &&
        p.startDay === sDay &&
        p.endMonth === eMonth &&
        p.endDay === eDay
    );
    return matched ? matched.id : null;
  }, []);

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
          setExistingYearSummary({
            label: activeYear.label,
            startDate: activeYear.start_date,
            endDate: activeYear.end_date,
          });

          setFormData({
            start_year: activeYear.start_year,
            end_year: activeYear.end_year,
            label: activeYear.label,
            start_date: activeYear.start_date,
            end_date: activeYear.end_date,
            is_current: activeYear.is_current,
          });

          const defaultExpectedLabel = formatDefaultAcademicYearLabel(
            activeYear.start_year,
            activeYear.end_year
          );
          const hasCustomLabel = activeYear.label !== defaultExpectedLabel;
          setIsCustomLabel(hasCustomLabel);

          // Detect active preset
          const detectedPreset = matchPresetFromDates(
            activeYear.start_date,
            activeYear.end_date
          );
          setActivePresetId(detectedPreset);
        } else {
          // No prior academic year saved: populate default suggestion
          const defaults = getDefaultAcademicYear();
          setFormData(defaults);
          setActivePresetId("apr_mar");
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
  }, [user, profile?.school_id, matchPresetFromDates]);

  // 2. Preset Selection Handler
  const handleApplyPreset = (presetId: string) => {
    const preset = ACADEMIC_CALENDAR_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;

    setIsFormDirty(true);
    setActivePresetId(presetId);

    const sYear = formData.start_year || new Date().getFullYear();
    // In cycles where startMonth > endMonth (e.g. Apr 4 -> Mar 3, Jun 6 -> May 5, Sep 9 -> Jun 6),
    // the end year is start_year + 1. For Jan 1 -> Dec 12, end_year equals start_year.
    const eYear = preset.startMonth > preset.endMonth ? sYear + 1 : sYear;

    const sMonthStr = String(preset.startMonth).padStart(2, "0");
    const sDayStr = String(preset.startDay).padStart(2, "0");
    const eMonthStr = String(preset.endMonth).padStart(2, "0");
    const eDayStr = String(preset.endDay).padStart(2, "0");

    const newStartDate = `${sYear}-${sMonthStr}-${sDayStr}`;
    const newEndDate = `${eYear}-${eMonthStr}-${eDayStr}`;

    setFormData((prev) => {
      const updatedLabel = isCustomLabel
        ? prev.label
        : formatDefaultAcademicYearLabel(sYear, eYear);

      return {
        ...prev,
        start_year: sYear,
        end_year: eYear,
        start_date: newStartDate,
        end_date: newEndDate,
        label: updatedLabel,
      };
    });

    setErrors((prev) => ({
      ...prev,
      start_date: undefined,
      end_date: undefined,
      start_year: undefined,
      end_year: undefined,
      label: isCustomLabel ? prev.label : undefined,
    }));
  };

  // 3. Date Change Handlers with Smart Synchronization
  const handleStartDateChange = (val: string) => {
    setIsFormDirty(true);
    setFormData((prev) => {
      let newStartYear = prev.start_year;
      if (isValidCalendarDate(val)) {
        newStartYear = parseInt(val.split("-")[0], 10);
      }

      // Check if preset matches
      const matched = matchPresetFromDates(val, prev.end_date);
      setActivePresetId(matched);

      const updatedLabel = isCustomLabel
        ? prev.label
        : formatDefaultAcademicYearLabel(newStartYear, prev.end_year);

      return {
        ...prev,
        start_date: val,
        start_year: newStartYear,
        label: updatedLabel,
      };
    });

    if (errors.start_date || errors.start_year || errors.end_date) {
      setErrors((prev) => ({
        ...prev,
        start_date: undefined,
        start_year: undefined,
        end_date: undefined,
      }));
    }
  };

  const handleEndDateChange = (val: string) => {
    setIsFormDirty(true);
    setFormData((prev) => {
      let newEndYear = prev.end_year;
      if (isValidCalendarDate(val)) {
        newEndYear = parseInt(val.split("-")[0], 10);
      }

      const matched = matchPresetFromDates(prev.start_date, val);
      setActivePresetId(matched);

      const updatedLabel = isCustomLabel
        ? prev.label
        : formatDefaultAcademicYearLabel(prev.start_year, newEndYear);

      return {
        ...prev,
        end_date: val,
        end_year: newEndYear,
        label: updatedLabel,
      };
    });

    if (errors.end_date || errors.end_year) {
      setErrors((prev) => ({
        ...prev,
        end_date: undefined,
        end_year: undefined,
      }));
    }
  };

  // 4. Year Field Change Handlers (Keep Dates in Sync)
  const handleStartYearChange = (newYear: number) => {
    setIsFormDirty(true);
    setFormData((prev) => {
      // If start_date exists and newYear is valid 4-digit number, update its year portion
      let updatedStartDate = prev.start_date;
      if (Number.isFinite(newYear) && newYear >= 1000 && prev.start_date && /^\d{4}-\d{2}-\d{2}$/.test(prev.start_date)) {
        const parts = prev.start_date.split("-");
        updatedStartDate = `${newYear}-${parts[1]}-${parts[2]}`;
      }

      const matched = matchPresetFromDates(updatedStartDate, prev.end_date);
      setActivePresetId(matched);

      const updatedLabel = isCustomLabel
        ? prev.label
        : formatDefaultAcademicYearLabel(newYear, prev.end_year);

      return {
        ...prev,
        start_year: Number.isNaN(newYear) ? ("" as any) : newYear,
        start_date: updatedStartDate,
        label: updatedLabel,
      };
    });

    if (errors.start_year || errors.start_date) {
      setErrors((prev) => ({
        ...prev,
        start_year: undefined,
        start_date: undefined,
      }));
    }
  };

  const handleEndYearChange = (newYear: number) => {
    setIsFormDirty(true);
    setFormData((prev) => {
      let updatedEndDate = prev.end_date;
      if (Number.isFinite(newYear) && newYear >= 1000 && prev.end_date && /^\d{4}-\d{2}-\d{2}$/.test(prev.end_date)) {
        const parts = prev.end_date.split("-");
        updatedEndDate = `${newYear}-${parts[1]}-${parts[2]}`;
      }

      const matched = matchPresetFromDates(prev.start_date, updatedEndDate);
      setActivePresetId(matched);

      const updatedLabel = isCustomLabel
        ? prev.label
        : formatDefaultAcademicYearLabel(prev.start_year, newYear);

      return {
        ...prev,
        end_year: Number.isNaN(newYear) ? ("" as any) : newYear,
        end_date: updatedEndDate,
        label: updatedLabel,
      };
    });

    if (errors.end_year || errors.end_date) {
      setErrors((prev) => ({
        ...prev,
        end_year: undefined,
        end_date: undefined,
      }));
    }
  };

  // 5. Label Handlers
  const handleLabelChange = (val: string) => {
    setIsFormDirty(true);
    setIsCustomLabel(true);
    setFormData((prev) => ({ ...prev, label: val }));
    if (errors.label) {
      setErrors((prev) => ({ ...prev, label: undefined }));
    }
  };

  const handleResetLabelToAuto = () => {
    setIsFormDirty(true);
    setIsCustomLabel(false);
    const autoLabel = formatDefaultAcademicYearLabel(
      formData.start_year,
      formData.end_year
    );
    setFormData((prev) => ({ ...prev, label: autoLabel }));
    if (errors.label) {
      setErrors((prev) => ({ ...prev, label: undefined }));
    }
  };

  // 6. Submission & Progression
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGlobalError(null);

    if (!user) {
      setGlobalError("Authentication session expired. Please log in again.");
      return;
    }

    if (!school) {
      setGlobalError("School profile not found. Please complete Step 1 first.");
      return;
    }

    // Client-side deterministic validation
    const validation = validateAcademicYearInput(formData);
    if (!validation.isValid) {
      setErrors(validation.errors);
      const firstErrorMsg =
        Object.values(validation.errors)[0] || "Please correct the highlighted errors.";
      setGlobalError(firstErrorMsg);
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      const result = await saveAcademicSetup({
        schoolId: school.id,
        userId: user.id,
        input: { ...formData, is_current: true },
        existingAcademicYearId: existingYearId,
      });

      if (!result.success) {
        setGlobalError(result.error || "Failed to save academic setup. Please try again.");
        setIsSubmitting(false);
        return;
      }

      setSaveSuccess(true);
      setIsFormDirty(false);

      // Refresh auth session so that updated onboarding progress is reflected
      await refreshSession();

      // Proceed to Step 3: Classes & Sections
      navigate("/onboarding/classes");
    } catch (err: any) {
      console.error("Save academic setup error:", err);
      setGlobalError(
        err?.message || "An unexpected error occurred while saving your academic calendar."
      );
      setIsSubmitting(false);
    }
  };

  // 7. Save & Exit Handler
  const handleSaveAndExit = async () => {
    if (!isFormDirty || !school || !user) {
      await signOut();
      navigate("/login");
      return;
    }

    // If valid, save before exiting
    const validation = validateAcademicYearInput(formData);
    if (validation.isValid) {
      setIsSavingAndExiting(true);
      try {
        await saveAcademicSetup({
          schoolId: school.id,
          userId: user.id,
          input: { ...formData, is_current: true },
          existingAcademicYearId: existingYearId,
        });
      } catch (err) {
        console.warn("Background save on exit encountered error:", err);
      }
    }

    await signOut();
    navigate("/login");
  };

  // Initial Loading State
  if (isInitialLoading) {
    return (
      <OnboardingLayout
        currentStepNumber={2}
        completedStepNumbers={[1]}
        title=""
        subtitle=""
        maxWidth="max-w-3xl"
        showCardWrapper={false}
      >
        <div className="py-20 text-center space-y-3">
          <div className="w-8 h-8 border-2 border-[#2158E0] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold text-[#141A2E]">
            Loading academic configuration...
          </p>
          <p className="text-xs text-[#5B6478]">
            Retrieving school calendar settings from database.
          </p>
        </div>
      </OnboardingLayout>
    );
  }

  // Missing School Profile Warning
  if (missingSchoolError || !school) {
    return (
      <OnboardingLayout
        currentStepNumber={2}
        completedStepNumbers={[]}
        title=""
        subtitle=""
        maxWidth="max-w-3xl"
        showCardWrapper={false}
      >
        <div className="p-8 rounded-xl bg-amber-50/90 border border-amber-200 text-center space-y-4 max-w-lg mx-auto">
          <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 mx-auto flex items-center justify-center">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-amber-900">
              School Profile Required
            </h2>
            <p className="text-xs text-amber-700 mt-1.5 leading-relaxed">
              Before setting up your academic year calendar, please establish your school identity and campus profile in Step 1.
            </p>
          </div>
          <Link
            to="/onboarding/school"
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-[#2158E0] hover:bg-[#1a4ec4] rounded-lg transition-colors shadow-2xs"
          >
            <ArrowLeft className="w-4 h-4" /> Go to Step 1: School Profile
          </Link>
        </div>
      </OnboardingLayout>
    );
  }

  return (
    <OnboardingLayout
      currentStepNumber={2}
      completedStepNumbers={[1]}
      title=""
      subtitle=""
      maxWidth="max-w-3xl"
      showCardWrapper={false}
      onSaveAndExit={handleSaveAndExit}
      isSavingAndExiting={isSavingAndExiting}
    >
      <div className="w-full">
        {/* Page Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-xl sm:text-2xl font-bold font-heading text-[#141A2E] tracking-tight">
              Academic Year Setup
            </h1>
            <span className="text-xs font-semibold text-[#2158E0] bg-[#2158E0]/10 px-2.5 py-1 rounded-full shrink-0">
              Step 2 of 6
            </span>
          </div>
          <p className="text-sm text-[#5B6478] mt-1">
            Establish your school's operating academic calendar, dates, and official session label.
          </p>
        </div>

        {/* Resuming Onboarding Notification Banner */}
        {existingYearSummary && (
          <div className="mb-6 p-4 rounded-xl bg-blue-50/90 border border-blue-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <Info className="w-4 h-4 text-[#2158E0] shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-[#141A2E]">
                  Active academic calendar configured: {existingYearSummary.label}
                </p>
                <p className="text-xs text-[#5B6478] mt-0.5">
                  Spans {existingYearSummary.startDate} to {existingYearSummary.endDate}. You can adjust settings below or proceed.
                </p>
              </div>
            </div>
            <Link
              to="/onboarding/classes"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#2158E0] hover:text-white bg-white hover:bg-[#2158E0] border border-[#2158E0]/30 rounded-lg transition-colors shrink-0 shadow-2xs"
            >
              <span>Classes &amp; Sections</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {/* Success Confirmation Banner */}
        {saveSuccess && (
          <div
            role="status"
            className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2.5"
          >
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span className="font-semibold">
              Academic calendar saved successfully! Advancing to Classes &amp; Sections...
            </span>
          </div>
        )}

        {/* Global Error Banner */}
        {globalError && (
          <div
            id="academic-submit-error"
            role="alert"
            className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
            <div className="flex-1">
              <p className="font-semibold">Validation issue</p>
              <p className="mt-0.5">{globalError}</p>
            </div>
          </div>
        )}

        {/* Academic Setup Form */}
        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          {/* Card 1: Calendar Presets */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs p-5 sm:p-6 transition-colors">
            <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-[#F1F5F9]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#2158E0]/10 flex items-center justify-center text-[#2158E0]">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-[#141A2E]">
                    Standard Calendar Presets
                  </h2>
                  <p className="text-xs text-[#5B6478]">
                    Select a cycle to prefill dates (customize anytime below)
                  </p>
                </div>
              </div>
              {activePresetId ? (
                <span className="text-[11px] font-semibold text-[#2158E0] bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                  Preset active
                </span>
              ) : (
                <span className="text-[11px] font-medium text-[#64748B] bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200">
                  Custom calendar
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {ACADEMIC_CALENDAR_PRESETS.map((preset) => {
                const isSelected = activePresetId === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    id={`preset-${preset.id}`}
                    onClick={() => handleApplyPreset(preset.id)}
                    className={`p-3 rounded-lg border text-left transition-all cursor-pointer relative ${
                      isSelected
                        ? "border-[#2158E0] bg-blue-50/50 ring-1 ring-[#2158E0]/30 shadow-2xs"
                        : "border-[#E2E8F0] bg-white hover:border-[#CBD5E1] hover:bg-[#F8FAFC]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span
                        className={`text-xs font-bold leading-tight ${
                          isSelected ? "text-[#2158E0]" : "text-[#141A2E]"
                        }`}
                      >
                        {preset.name}
                      </span>
                      {isSelected && (
                        <div className="w-4 h-4 rounded-full bg-[#2158E0] text-white flex items-center justify-center shrink-0">
                          <Check className="w-2.5 h-2.5" />
                        </div>
                      )}
                    </div>
                    <span className="block text-[11px] text-[#64748B] mt-1 line-clamp-1">
                      {preset.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Card 2: Academic Period Dates */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs p-5 sm:p-6 transition-colors">
            <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-[#F1F5F9]">
              <div className="w-8 h-8 rounded-lg bg-[#2158E0]/10 flex items-center justify-center text-[#2158E0]">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-[#141A2E]">
                  Academic Period Dates
                </h2>
                <p className="text-xs text-[#5B6478]">
                  Start and end dates defining this operating academic cycle
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Start Date */}
              <div>
                <label
                  htmlFor={startDateId}
                  className="block text-xs font-semibold text-[#141A2E] mb-1.5"
                >
                  Academic Year Start Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  id={startDateId}
                  name="start_date"
                  required
                  value={formData.start_date}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                  aria-required="true"
                  aria-invalid={Boolean(errors.start_date)}
                  className={`w-full px-3.5 py-2.5 text-sm rounded-lg border bg-white text-[#141A2E] transition-colors focus:outline-hidden ${
                    errors.start_date
                      ? "border-rose-300 bg-rose-50/20 text-[#141A2E] focus:border-rose-500 focus:ring-2 focus:ring-rose-200"
                      : "border-[#E2E8F0] hover:border-[#CBD5E1] focus:border-[#2158E0] focus:ring-2 focus:ring-[#2158E0]/15"
                  }`}
                />
                {errors.start_date ? (
                  <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1 font-medium">
                    <AlertCircle className="w-3 h-3 shrink-0" /> {errors.start_date}
                  </p>
                ) : (
                  <p className="text-[11px] text-[#5B6478] mt-1">
                    First day of instructional classes / term commencement.
                  </p>
                )}
              </div>

              {/* End Date */}
              <div>
                <label
                  htmlFor={endDateId}
                  className="block text-xs font-semibold text-[#141A2E] mb-1.5"
                >
                  Academic Year End Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  id={endDateId}
                  name="end_date"
                  required
                  value={formData.end_date}
                  onChange={(e) => handleEndDateChange(e.target.value)}
                  aria-required="true"
                  aria-invalid={Boolean(errors.end_date)}
                  className={`w-full px-3.5 py-2.5 text-sm rounded-lg border bg-white text-[#141A2E] transition-colors focus:outline-hidden ${
                    errors.end_date
                      ? "border-rose-300 bg-rose-50/20 text-[#141A2E] focus:border-rose-500 focus:ring-2 focus:ring-rose-200"
                      : "border-[#E2E8F0] hover:border-[#CBD5E1] focus:border-[#2158E0] focus:ring-2 focus:ring-[#2158E0]/15"
                  }`}
                />
                {errors.end_date ? (
                  <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1 font-medium">
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

          {/* Card 3: Year Range & Official Session Label */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs p-5 sm:p-6 transition-colors">
            <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-[#F1F5F9]">
              <div className="w-8 h-8 rounded-lg bg-[#2158E0]/10 flex items-center justify-center text-[#2158E0]">
                <Tag className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-[#141A2E]">
                  Year Range &amp; Display Label
                </h2>
                <p className="text-xs text-[#5B6478]">
                  Configures numerical boundaries and public transcript naming
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Start Year */}
                <div>
                  <label
                    htmlFor={startYearId}
                    className="block text-xs font-semibold text-[#141A2E] mb-1.5"
                  >
                    Start Year <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    id={startYearId}
                    name="start_year"
                    min={1990}
                    max={2100}
                    required
                    value={Number.isNaN(formData.start_year) ? "" : (formData.start_year ?? "")}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      handleStartYearChange(isNaN(val) ? ("" as any) : val);
                    }}
                    placeholder="2026"
                    aria-required="true"
                    aria-invalid={Boolean(errors.start_year)}
                    className={`w-full px-3.5 py-2.5 text-sm rounded-lg border bg-white text-[#141A2E] font-medium transition-colors focus:outline-hidden ${
                      errors.start_year
                        ? "border-rose-300 bg-rose-50/20 text-[#141A2E] focus:border-rose-500 focus:ring-2 focus:ring-rose-200"
                        : "border-[#E2E8F0] hover:border-[#CBD5E1] focus:border-[#2158E0] focus:ring-2 focus:ring-[#2158E0]/15"
                    }`}
                  />
                  {errors.start_year ? (
                    <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1 font-medium">
                      <AlertCircle className="w-3 h-3 shrink-0" /> {errors.start_year}
                    </p>
                  ) : (
                    <p className="text-[11px] text-[#5B6478] mt-1">
                      Calendar year of session opening.
                    </p>
                  )}
                </div>

                {/* End Year */}
                <div>
                  <label
                    htmlFor={endYearId}
                    className="block text-xs font-semibold text-[#141A2E] mb-1.5"
                  >
                    End Year <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    id={endYearId}
                    name="end_year"
                    min={1990}
                    max={2100}
                    required
                    value={Number.isNaN(formData.end_year) ? "" : (formData.end_year ?? "")}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      handleEndYearChange(isNaN(val) ? ("" as any) : val);
                    }}
                    placeholder="2027"
                    aria-required="true"
                    aria-invalid={Boolean(errors.end_year)}
                    className={`w-full px-3.5 py-2.5 text-sm rounded-lg border bg-white text-[#141A2E] font-medium transition-colors focus:outline-hidden ${
                      errors.end_year
                        ? "border-rose-300 bg-rose-50/20 text-[#141A2E] focus:border-rose-500 focus:ring-2 focus:ring-rose-200"
                        : "border-[#E2E8F0] hover:border-[#CBD5E1] focus:border-[#2158E0] focus:ring-2 focus:ring-[#2158E0]/15"
                    }`}
                  />
                  {errors.end_year ? (
                    <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1 font-medium">
                      <AlertCircle className="w-3 h-3 shrink-0" /> {errors.end_year}
                    </p>
                  ) : (
                    <p className="text-[11px] text-[#5B6478] mt-1">
                      Calendar year of session closing.
                    </p>
                  )}
                </div>
              </div>

              {/* Display Label */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor={labelId}
                    className="block text-xs font-semibold text-[#141A2E]"
                  >
                    Academic Year Display Label <span className="text-rose-500">*</span>
                  </label>
                  {isCustomLabel && (
                    <button
                      type="button"
                      onClick={handleResetLabelToAuto}
                      className="inline-flex items-center gap-1 text-[11px] text-[#2158E0] hover:underline font-medium cursor-pointer"
                      title="Reset to default format derived from years"
                    >
                      <RefreshCw className="w-3 h-3" /> Auto-sync with years
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  id={labelId}
                  name="label"
                  maxLength={60}
                  required
                  value={formData.label}
                  onChange={(e) => handleLabelChange(e.target.value)}
                  placeholder="e.g. 2026–2027 or AY 2026-27"
                  aria-required="true"
                  aria-invalid={Boolean(errors.label)}
                  className={`w-full px-3.5 py-2.5 text-sm rounded-lg border bg-white text-[#141A2E] font-semibold tracking-tight transition-colors focus:outline-hidden ${
                    errors.label
                      ? "border-rose-300 bg-rose-50/20 text-[#141A2E] focus:border-rose-500 focus:ring-2 focus:ring-rose-200"
                      : "border-[#E2E8F0] hover:border-[#CBD5E1] focus:border-[#2158E0] focus:ring-2 focus:ring-[#2158E0]/15"
                  }`}
                />
                {errors.label ? (
                  <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1 font-medium">
                    <AlertCircle className="w-3 h-3 shrink-0" /> {errors.label}
                  </p>
                ) : (
                  <p className="text-[11px] text-[#5B6478] mt-1">
                    Format displayed on student ID cards, report cards, fee receipts, and official transcripts.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Navigation Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
            <Link
              to="/onboarding/school"
              id="academic-back-btn"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-[#5B6478] hover:text-[#141A2E] hover:bg-[#F1F5F9] rounded-lg transition-colors border border-transparent hover:border-[#E2E8F0]"
            >
              <ArrowLeft className="w-4 h-4" /> Back to School Profile
            </Link>

            <button
              type="submit"
              id="academic-continue-btn"
              disabled={isSubmitting}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 text-xs font-semibold text-white bg-[#2158E0] hover:bg-[#1a4ec4] disabled:opacity-60 disabled:cursor-not-allowed rounded-lg shadow-2xs transition-all cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Saving Academic Calendar...</span>
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
      </div>
    </OnboardingLayout>
  );
}
