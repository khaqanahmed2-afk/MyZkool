import React, { useState, useEffect, useRef, useCallback, useId } from "react";
import { useNavigate, Link } from "react-router-dom";
import { OnboardingLayout } from "../../components/onboarding/OnboardingLayout";
import { useAuth } from "../../hooks/useAuth";
import {
  normalizeSubdomain,
  checkSubdomainAvailability,
  getSchoolForCurrentUser,
  saveSchoolProfile,
  RESERVED_SUBDOMAINS,
} from "../../services/schoolService";
import type {
  SchoolProfileInput,
  SchoolType,
  AffiliationBoard,
  SubdomainCheckResult,
} from "../../types/school";
import {
  Globe,
  Mail,
  MapPin,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  ArrowRight,
  RefreshCw,
  Info,
  GraduationCap,
  Building2,
  ArrowLeft,
  LifeBuoy,
} from "lucide-react";

const INDIAN_STATES = [
  "Andaman and Nicobar Islands",
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chandigarh",
  "Chhattisgarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jammu and Kashmir",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Ladakh",
  "Lakshadweep",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Puducherry",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Other / Outside India",
];

const SCHOOL_TYPES: { value: SchoolType; label: string; description: string }[] = [
  { value: "k12", label: "K-12 School", description: "Kindergarten through Grade 12" },
  { value: "primary", label: "Primary School", description: "Grades 1 – 5" },
  { value: "middle", label: "Middle School", description: "Grades 6 – 8" },
  { value: "secondary", label: "Secondary / High School", description: "Grades 9 – 10" },
  { value: "senior_secondary", label: "Senior Secondary", description: "Grades 11 – 12" },
  { value: "preschool", label: "Pre-school / Nursery", description: "Early childhood education" },
  { value: "other", label: "Other Institution", description: "Specialized or vocational" },
];

const AFFILIATION_BOARDS: { value: AffiliationBoard; label: string }[] = [
  { value: "cbse", label: "CBSE (Central Board of Secondary Education)" },
  { value: "icse", label: "ICSE / ISC (CISCE Board)" },
  { value: "state_board", label: "State Board" },
  { value: "cambridge", label: "Cambridge / IGCSE" },
  { value: "ib", label: "IB (International Baccalaureate)" },
  { value: "matriculation", label: "Matriculation" },
  { value: "other", label: "Other / Independent" },
];

/**
 * Validates an individual field
 */
function validateField(
  name: keyof SchoolProfileInput,
  value: string,
  subdomainState?: SubdomainCheckResult
): string {
  switch (name) {
    case "name":
      if (!value.trim()) return "Please enter your official school name.";
      if (value.trim().length < 2) return "School name must be at least 2 characters.";
      if (value.trim().length > 120) return "School name cannot exceed 120 characters.";
      return "";

    case "subdomain": {
      const trimmed = value.trim().toLowerCase();
      if (!trimmed) return "Please choose a portal subdomain for your school.";
      if (trimmed.length < 3) return "Portal address must be at least 3 characters.";
      if (trimmed.length > 48) return "Portal address cannot exceed 48 characters.";
      if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(trimmed)) {
        return "Letters, numbers, and hyphens only (cannot start or end with a hyphen).";
      }
      if (RESERVED_SUBDOMAINS.has(trimmed)) {
        return `'${trimmed}' is a reserved platform address. Please choose another name.`;
      }
      if (
        subdomainState &&
        !subdomainState.isAvailable &&
        subdomainState.status !== "idle" &&
        subdomainState.status !== "checking"
      ) {
        return subdomainState.message || "This portal address is not available.";
      }
      return "";
    }

    case "school_type":
      if (!value) return "Please select your school level / type.";
      return "";

    case "official_email": {
      const trimmed = value.trim();
      if (!trimmed) return "Please enter an official school email address.";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
        return "Please enter a valid email address (e.g. principal@school.edu.in).";
      }
      return "";
    }

    case "contact_phone": {
      const digits = value.replace(/\D/g, "");
      if (!value.trim()) return "Please enter a contact phone number.";
      if (digits.length < 10) return "Please enter a valid 10-digit contact phone number.";
      if (digits.length > 15) return "Phone number is too long (maximum 15 digits).";
      return "";
    }

    case "address":
      if (!value.trim()) return "Please enter the campus street address.";
      if (value.trim().length < 5) return "Please provide a complete campus street address.";
      return "";

    case "city":
      if (!value.trim()) return "Please enter the city or village.";
      if (value.trim().length < 2) return "City / Village must be at least 2 characters.";
      return "";

    case "district":
      if (!value.trim()) return "Please enter the district.";
      if (value.trim().length < 2) return "District must be at least 2 characters.";
      return "";

    case "state":
      if (!value.trim()) return "Please select a state or union territory.";
      return "";

    case "pin_code": {
      const clean = value.trim();
      if (!clean) return "Please enter the postal PIN code.";
      if (!/^\d{6}$/.test(clean)) return "Please enter a valid 6-digit postal PIN code (e.g. 110001).";
      return "";
    }

    default:
      return "";
  }
}

export default function SchoolProfile() {
  const { user, profile, refreshSession } = useAuth();
  const navigate = useNavigate();

  // Unique IDs for accessibility
  const nameId = useId();
  const subdomainId = useId();
  const typeId = useId();
  const boardId = useId();
  const emailId = useId();
  const phoneId = useId();
  const addressId = useId();
  const cityId = useId();
  const districtId = useId();
  const stateId = useId();
  const pinId = useId();

  // Form State
  const [formData, setFormData] = useState<SchoolProfileInput>({
    name: "",
    subdomain: "",
    school_type: "k12",
    affiliation_board: "cbse",
    official_email: user?.email || "",
    contact_phone: "",
    address: "",
    city: "",
    district: "",
    state: "",
    pin_code: "",
  });

  // Tracking existing school if resuming
  const [existingSchoolId, setExistingSchoolId] = useState<string | null>(null);
  const [existingOnboardingStep, setExistingOnboardingStep] = useState<number>(1);
  const [isSubdomainManuallyEdited, setIsSubdomainManuallyEdited] = useState(false);

  // Subdomain Validation State
  const [subdomainCheck, setSubdomainCheck] = useState<SubdomainCheckResult>({
    status: "idle",
    isAvailable: false,
    message: "",
    subdomain: "",
  });

  // UI & Interaction Tracking
  const [isLoadingExisting, setIsLoadingExisting] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Debounce ref for subdomain check
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestSubdomainRequestRef = useRef<string>("");

  // Redirect to /admin if school admin already finished onboarding
  useEffect(() => {
    if (profile?.onboarding_completed) {
      navigate("/admin", { replace: true });
    }
  }, [profile?.onboarding_completed, navigate]);

  // 1. Initial Load: Check for existing school record (Resume Onboarding)
  useEffect(() => {
    let isMounted = true;

    async function loadExistingSchool() {
      if (!user) return;

      try {
        setIsLoadingExisting(true);
        const { school } = await getSchoolForCurrentUser(user.id, profile?.school_id);

        if (isMounted && school) {
          setExistingSchoolId(school.id);
          setExistingOnboardingStep(school.onboarding_step || 1);
          setIsSubdomainManuallyEdited(true);

          setFormData({
            name: school.name || "",
            subdomain: school.subdomain || "",
            school_type: school.school_type || "k12",
            affiliation_board: (school.affiliation_board as AffiliationBoard) || "cbse",
            official_email: school.official_email || user.email || "",
            contact_phone: school.contact_phone || "",
            address: school.address || "",
            city: school.city || "",
            district: school.district || school.city || "",
            state: school.state || "Delhi",
            pin_code: school.pin_code || "",
          });

          // Verify current subdomain availability
          if (school.subdomain) {
            setSubdomainCheck({
              status: "available",
              isAvailable: true,
              message: "Your current school portal address ✓",
              subdomain: school.subdomain,
            });
          }
        } else if (isMounted) {
          // If fresh user, default official email to their authenticated account email
          if (user.email && !formData.official_email) {
            setFormData((prev) => ({ ...prev, official_email: user.email || "" }));
          }
        }
      } catch (err) {
        console.warn("Could not load initial school record:", err);
      } finally {
        if (isMounted) setIsLoadingExisting(false);
      }
    }

    loadExistingSchool();

    return () => {
      isMounted = false;
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [user, profile?.school_id]);

  // 2. Real-time debounced subdomain availability check
  const triggerSubdomainCheck = useCallback(
    (subdomainToTest: string, currentId?: string | null) => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

      const trimmed = subdomainToTest.trim().toLowerCase();
      latestSubdomainRequestRef.current = trimmed;

      if (!trimmed) {
        setSubdomainCheck({
          status: "idle",
          isAvailable: false,
          message: "",
          subdomain: "",
        });
        return;
      }

      // Check format first
      const formatErr = validateField("subdomain", trimmed);
      if (formatErr) {
        const isReserved = RESERVED_SUBDOMAINS.has(trimmed);
        setSubdomainCheck({
          status: isReserved ? "reserved" : "invalid",
          isAvailable: false,
          message: formatErr,
          subdomain: trimmed,
        });
        return;
      }

      setSubdomainCheck((prev) => ({
        ...prev,
        status: "checking",
        message: "Checking availability...",
        subdomain: trimmed,
      }));

      debounceTimerRef.current = setTimeout(async () => {
        try {
          const result = await checkSubdomainAvailability(trimmed, currentId);
          // Prevent race condition if user typed newer character
          if (latestSubdomainRequestRef.current === trimmed) {
            setSubdomainCheck(result);
            if (!result.isAvailable) {
              setFormErrors((prev) => ({ ...prev, subdomain: result.message }));
            } else {
              setFormErrors((prev) => ({ ...prev, subdomain: "" }));
            }
          }
        } catch {
          if (latestSubdomainRequestRef.current === trimmed) {
            setSubdomainCheck({
              status: "available",
              isAvailable: true,
              message: "Portal address is available",
              subdomain: trimmed,
            });
          }
        }
      }, 350);
    },
    []
  );

  // 3. Handle School Name changes (auto-suggest subdomain if not manually edited)
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setFormData((prev) => {
      const nextState = { ...prev, name: newName };
      if (!isSubdomainManuallyEdited) {
        const suggested = normalizeSubdomain(newName);
        nextState.subdomain = suggested;
        triggerSubdomainCheck(suggested, existingSchoolId);
      }
      return nextState;
    });

    const err = validateField("name", newName);
    setFormErrors((prev) => ({ ...prev, name: err }));
    setGlobalError(null);
  };

  // 4. Handle Subdomain manual edits
  const handleSubdomainChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsSubdomainManuallyEdited(true);
    // Instant sanitization: lowercase alphanumeric and hyphens only, max 48
    const rawVal = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 48);

    setFormData((prev) => ({ ...prev, subdomain: rawVal }));
    triggerSubdomainCheck(rawVal, existingSchoolId);

    const err = validateField("subdomain", rawVal);
    setFormErrors((prev) => ({ ...prev, subdomain: err }));
    setGlobalError(null);
  };

  // Reset Subdomain back to auto-generated from School Name
  const handleResetSubdomain = () => {
    setIsSubdomainManuallyEdited(false);
    const suggested = normalizeSubdomain(formData.name);
    setFormData((prev) => ({ ...prev, subdomain: suggested }));
    triggerSubdomainCheck(suggested, existingSchoolId);
    const err = validateField("subdomain", suggested);
    setFormErrors((prev) => ({ ...prev, subdomain: err }));
  };

  // 5. Generic form field handler
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    let finalValue = value;

    // Numerical sanitization for PIN code
    if (name === "pin_code") {
      finalValue = value.replace(/\D/g, "").slice(0, 6);
    }

    setFormData((prev) => ({ ...prev, [name]: finalValue }));

    const err = validateField(name as keyof SchoolProfileInput, finalValue, subdomainCheck);
    setFormErrors((prev) => ({ ...prev, [name]: err }));
    setGlobalError(null);
  };

  // Handle onBlur to mark field touched
  const handleBlur = (field: keyof SchoolProfileInput) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const err = validateField(field, formData[field] || "", subdomainCheck);
    setFormErrors((prev) => ({ ...prev, [field]: err }));
  };

  // Helper: check if a field error should be visibly rendered
  const isFieldInvalid = (field: keyof SchoolProfileInput): boolean => {
    const isInteracted = touched[field] || isSubmitted;
    return Boolean(isInteracted && formErrors[field]);
  };

  // 6. Comprehensive form validation
  const validateAll = (): boolean => {
    const errors: Record<string, string> = {};
    const allTouched: Record<string, boolean> = {};

    const fields: (keyof SchoolProfileInput)[] = [
      "name",
      "subdomain",
      "school_type",
      "official_email",
      "contact_phone",
      "address",
      "city",
      "district",
      "state",
      "pin_code",
    ];

    fields.forEach((field) => {
      allTouched[field] = true;
      const err = validateField(field, formData[field] || "", subdomainCheck);
      if (err) {
        errors[field] = err;
      }
    });

    setTouched(allTouched);
    setFormErrors(errors);

    return Object.keys(errors).length === 0;
  };

  // 7. Save & Continue
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitted(true);
    setGlobalError(null);

    const isValid = validateAll();
    if (!isValid) {
      // Focus on first invalid input
      const firstErrorField = [
        "name",
        "subdomain",
        "school_type",
        "official_email",
        "contact_phone",
        "address",
        "city",
        "district",
        "state",
        "pin_code",
      ].find(
        (f) =>
          formErrors[f] ||
          validateField(
            f as keyof SchoolProfileInput,
            formData[f as keyof SchoolProfileInput] || "",
            subdomainCheck
          )
      );

      if (firstErrorField) {
        const el = document.querySelector(`[name="${firstErrorField}"]`) as HTMLElement;
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          el.focus();
        }
      }
      return;
    }

    if (subdomainCheck.status === "checking") {
      setGlobalError("Please wait while we verify portal address availability.");
      return;
    }

    if (!user) {
      setGlobalError("You must be logged in to save your school profile.");
      return;
    }

    try {
      setIsSubmitting(true);

      const result = await saveSchoolProfile({
        userId: user.id,
        userEmail: user.email || "",
        profileInput: formData,
        existingSchoolId,
      });

      if (!result.success || !result.school) {
        setGlobalError(result.error || "Failed to save school profile. Please review the form and try again.");
        setIsSubmitting(false);
        return;
      }

      setSaveSuccess(true);

      // Sync context state
      await refreshSession();

      // Proceed to Step 2: Academic Setup
      navigate("/onboarding/academics");
    } catch (err: any) {
      console.error("Error submitting school profile:", err);
      setGlobalError(err?.message || "An unexpected error occurred while saving. Please try again.");
      setIsSubmitting(false);
    }
  };

  // SKELETON LOADING STATE
  if (isLoadingExisting) {
    return (
      <OnboardingLayout
        currentStepNumber={1}
        completedStepNumbers={[]}
        title="School profile"
        subtitle="Establish your school's foundational identity, portal address, and campus details."
        maxWidth="max-w-3xl"
        showCardWrapper={false}
      >
        <div className="space-y-5 animate-pulse">
          <div className="h-44 bg-white rounded-xl border border-[#E2E8F0] p-6 space-y-3">
            <div className="h-4 w-32 bg-slate-200 rounded"></div>
            <div className="h-10 bg-slate-100 rounded-lg"></div>
            <div className="h-10 bg-slate-100 rounded-lg"></div>
          </div>
          <div className="h-36 bg-white rounded-xl border border-[#E2E8F0] p-6 space-y-3">
            <div className="h-4 w-40 bg-slate-200 rounded"></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="h-10 bg-slate-100 rounded-lg"></div>
              <div className="h-10 bg-slate-100 rounded-lg"></div>
            </div>
          </div>
          <div className="h-48 bg-white rounded-xl border border-[#E2E8F0] p-6 space-y-3">
            <div className="h-4 w-36 bg-slate-200 rounded"></div>
            <div className="h-16 bg-slate-100 rounded-lg"></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="h-10 bg-slate-100 rounded-lg"></div>
              <div className="h-10 bg-slate-100 rounded-lg"></div>
            </div>
          </div>
        </div>
      </OnboardingLayout>
    );
  }

  return (
    <OnboardingLayout
      currentStepNumber={1}
      completedStepNumbers={existingOnboardingStep > 1 ? [1] : []}
      title=""
      subtitle=""
      maxWidth="max-w-3xl"
      showCardWrapper={false}
    >
      <div className="w-full">
        {/* Page Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-xl sm:text-2xl font-bold font-heading text-[#141A2E] tracking-tight">
              School Profile
            </h1>
            <span className="text-xs font-semibold text-[#2158E0] bg-[#2158E0]/10 px-2.5 py-1 rounded-full shrink-0">
              Step 1 of 6
            </span>
          </div>
          <p className="text-sm text-[#5B6478] mt-1">
            Set up your institution's official identity, custom portal address, and campus details to begin.
          </p>
        </div>

        {/* Resuming Onboarding Notification Banner */}
        {existingOnboardingStep > 1 && (
          <div className="mb-6 p-4 rounded-xl bg-blue-50/90 border border-blue-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <Info className="w-4 h-4 text-[#2158E0] shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-[#141A2E]">
                  School profile already saved
                </p>
                <p className="text-xs text-[#5B6478] mt-0.5">
                  You can update any field below or jump directly to the next onboarding step.
                </p>
              </div>
            </div>
            <Link
              to="/onboarding/academics"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#2158E0] hover:text-white bg-white hover:bg-[#2158E0] border border-[#2158E0]/30 rounded-lg transition-colors shrink-0 shadow-2xs"
            >
              <span>Academic Setup</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {/* Success Confirmation Banner */}
        {saveSuccess && (
          <div
            role="status"
            className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2.5 animate-fadeIn"
          >
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span className="font-semibold">
              School profile saved successfully! Advancing to Academic Setup...
            </span>
          </div>
        )}

        {/* Global Error Banner */}
        {globalError && (
          <div
            role="alert"
            className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-fadeIn"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
            <div className="flex-1 font-medium">{globalError}</div>
          </div>
        )}

        {/* Focused Minimal Onboarding Form */}
        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          {/* Section A: School Identity */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs p-5 sm:p-6 transition-colors">
            <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-[#F1F5F9]">
              <div className="w-8 h-8 rounded-lg bg-[#2158E0]/10 flex items-center justify-center text-[#2158E0]">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-[#141A2E]">
                  School Identity
                </h2>
                <p className="text-xs text-[#5B6478]">
                  Official institution name and unique web portal address
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Official School Name */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor={nameId}
                    className="block text-xs font-semibold text-[#141A2E]"
                  >
                    Official School Name <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[11px] text-[#94A3B8]">
                    {formData.name.length}/120
                  </span>
                </div>
                <input
                  id={nameId}
                  name="name"
                  type="text"
                  required
                  maxLength={120}
                  value={formData.name}
                  onChange={handleNameChange}
                  onBlur={() => handleBlur("name")}
                  placeholder="e.g. St. Xavier's High School"
                  aria-required="true"
                  aria-invalid={isFieldInvalid("name")}
                  aria-describedby={isFieldInvalid("name") ? "name-error" : undefined}
                  className={`w-full px-3.5 py-2.5 rounded-lg border text-sm transition-colors focus:outline-hidden ${
                    isFieldInvalid("name")
                      ? "border-rose-300 bg-rose-50/20 text-[#141A2E] focus:border-rose-500 focus:ring-2 focus:ring-rose-200"
                      : "border-[#E2E8F0] bg-white text-[#141A2E] hover:border-[#CBD5E1] focus:border-[#2158E0] focus:ring-2 focus:ring-[#2158E0]/15"
                  }`}
                />
                {isFieldInvalid("name") && (
                  <p id="name-error" role="alert" className="mt-1 text-xs text-rose-600 flex items-center gap-1 font-medium">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {formErrors.name}
                  </p>
                )}
              </div>

              {/* Subdomain (Portal Address) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor={subdomainId}
                    className="block text-xs font-semibold text-[#141A2E]"
                  >
                    School Portal Subdomain <span className="text-rose-500">*</span>
                  </label>
                  {isSubdomainManuallyEdited && (
                    <button
                      type="button"
                      onClick={handleResetSubdomain}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-[#2158E0] hover:text-[#1a4ec4] hover:underline cursor-pointer"
                      title="Auto-generate from school name"
                    >
                      <RefreshCw className="w-2.5 h-2.5" /> Auto-sync from name
                    </button>
                  )}
                </div>

                {/* Subdomain Input Group */}
                <div
                  className={`flex items-center rounded-lg border transition-colors overflow-hidden bg-white ${
                    isFieldInvalid("subdomain")
                      ? "border-rose-300 ring-2 ring-rose-100"
                      : subdomainCheck.status === "available"
                      ? "border-emerald-400 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-100"
                      : subdomainCheck.status === "taken" || subdomainCheck.status === "reserved"
                      ? "border-amber-400 focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-100"
                      : "border-[#E2E8F0] focus-within:border-[#2158E0] focus-within:ring-2 focus-within:ring-[#2158E0]/15"
                  }`}
                >
                  <div className="pl-3.5 pr-1.5 text-[#5B6478]">
                    <Globe className="w-4 h-4 text-[#5B6478]" />
                  </div>
                  <input
                    id={subdomainId}
                    name="subdomain"
                    type="text"
                    required
                    value={formData.subdomain}
                    onChange={handleSubdomainChange}
                    onBlur={() => handleBlur("subdomain")}
                    placeholder="st-xaviers"
                    aria-required="true"
                    aria-invalid={isFieldInvalid("subdomain")}
                    aria-describedby="subdomain-status-msg"
                    className="w-full py-2.5 px-2 text-sm text-[#141A2E] placeholder-[#94A3B8] focus:outline-hidden font-mono tracking-tight"
                  />
                  <span className="pr-3.5 text-xs font-semibold text-[#5B6478] select-none bg-[#F8FAFC] py-2.5 px-3 border-l border-[#E2E8F0]">
                    .myzkool.com
                  </span>
                </div>

                {/* Subdomain Feedback */}
                <div id="subdomain-status-msg" className="mt-1.5 flex flex-wrap items-center justify-between gap-1 text-xs min-h-[18px]">
                  {subdomainCheck.status === "checking" && (
                    <div className="flex items-center gap-1.5 text-[#5B6478]">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#2158E0]" />
                      <span>Checking availability...</span>
                    </div>
                  )}

                  {subdomainCheck.status === "available" && (
                    <div className="flex items-center gap-1.5 text-emerald-600 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>Portal address is available</span>
                    </div>
                  )}

                  {subdomainCheck.status === "taken" && (
                    <div className="flex items-center gap-1.5 text-rose-600 font-medium">
                      <XCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{subdomainCheck.message}</span>
                    </div>
                  )}

                  {subdomainCheck.status === "reserved" && (
                    <div className="flex items-center gap-1.5 text-amber-700 font-medium">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{subdomainCheck.message}</span>
                    </div>
                  )}

                  {subdomainCheck.status === "invalid" && (
                    <div className="flex items-center gap-1.5 text-rose-600 font-medium">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{subdomainCheck.message}</span>
                    </div>
                  )}

                  {subdomainCheck.status === "idle" && (
                    <span className="text-[11px] text-[#94A3B8]">
                      3–48 lowercase letters, numbers, and hyphens
                    </span>
                  )}

                  {subdomainCheck.status !== "idle" && (
                    <span className="text-[11px] text-[#94A3B8] ml-auto">
                      3–48 characters
                    </span>
                  )}
                </div>

                {isFieldInvalid("subdomain") && subdomainCheck.status === "idle" && (
                  <p role="alert" className="mt-1 text-xs text-rose-600 flex items-center gap-1 font-medium">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {formErrors.subdomain}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Section B: Academic Classification */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs p-5 sm:p-6 transition-colors">
            <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-[#F1F5F9]">
              <div className="w-8 h-8 rounded-lg bg-[#2158E0]/10 flex items-center justify-center text-[#2158E0]">
                <GraduationCap className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-[#141A2E]">
                  Academic Classification
                </h2>
                <p className="text-xs text-[#5B6478]">
                  Educational level and curriculum affiliation
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* School Level / Type */}
              <div>
                <label
                  htmlFor={typeId}
                  className="block text-xs font-semibold text-[#141A2E] mb-1.5"
                >
                  School Level / Type <span className="text-rose-500">*</span>
                </label>
                <select
                  id={typeId}
                  name="school_type"
                  value={formData.school_type}
                  onChange={handleChange}
                  onBlur={() => handleBlur("school_type")}
                  aria-required="true"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#E2E8F0] bg-white text-sm text-[#141A2E] hover:border-[#CBD5E1] focus:border-[#2158E0] focus:ring-2 focus:ring-[#2158E0]/15 focus:outline-hidden cursor-pointer"
                >
                  {SCHOOL_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
                {isFieldInvalid("school_type") && (
                  <p role="alert" className="mt-1 text-xs text-rose-600 flex items-center gap-1 font-medium">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {formErrors.school_type}
                  </p>
                )}
              </div>

              {/* Affiliation Board */}
              <div>
                <label
                  htmlFor={boardId}
                  className="block text-xs font-semibold text-[#141A2E] mb-1.5"
                >
                  Affiliation Board
                </label>
                <select
                  id={boardId}
                  name="affiliation_board"
                  value={formData.affiliation_board}
                  onChange={handleChange}
                  onBlur={() => handleBlur("affiliation_board")}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#E2E8F0] bg-white text-sm text-[#141A2E] hover:border-[#CBD5E1] focus:border-[#2158E0] focus:ring-2 focus:ring-[#2158E0]/15 focus:outline-hidden cursor-pointer"
                >
                  {AFFILIATION_BOARDS.map((board) => (
                    <option key={board.value} value={board.value}>
                      {board.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section C: Official Communication */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs p-5 sm:p-6 transition-colors">
            <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-[#F1F5F9]">
              <div className="w-8 h-8 rounded-lg bg-[#2158E0]/10 flex items-center justify-center text-[#2158E0]">
                <Mail className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-[#141A2E]">
                  Official Communication
                </h2>
                <p className="text-xs text-[#5B6478]">
                  Primary administrative contact details for notices and billing
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Official Email */}
              <div>
                <label
                  htmlFor={emailId}
                  className="block text-xs font-semibold text-[#141A2E] mb-1.5"
                >
                  Official School Email <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id={emailId}
                    name="official_email"
                    type="email"
                    required
                    value={formData.official_email}
                    onChange={handleChange}
                    onBlur={() => handleBlur("official_email")}
                    placeholder="principal@school.edu.in"
                    aria-required="true"
                    aria-invalid={isFieldInvalid("official_email")}
                    aria-describedby={isFieldInvalid("official_email") ? "email-error" : undefined}
                    className={`w-full pl-9 pr-3.5 py-2.5 rounded-lg border text-sm transition-colors focus:outline-hidden ${
                      isFieldInvalid("official_email")
                        ? "border-rose-300 bg-rose-50/20 text-[#141A2E] focus:border-rose-500 focus:ring-2 focus:ring-rose-200"
                        : "border-[#E2E8F0] bg-white text-[#141A2E] hover:border-[#CBD5E1] focus:border-[#2158E0] focus:ring-2 focus:ring-[#2158E0]/15"
                    }`}
                  />
                  <Mail className="w-4 h-4 text-[#94A3B8] absolute left-3 top-3 pointer-events-none" />
                </div>
                {isFieldInvalid("official_email") && (
                  <p id="email-error" role="alert" className="mt-1 text-xs text-rose-600 flex items-center gap-1 font-medium">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {formErrors.official_email}
                  </p>
                )}
              </div>

              {/* Contact Phone */}
              <div>
                <label
                  htmlFor={phoneId}
                  className="block text-xs font-semibold text-[#141A2E] mb-1.5"
                >
                  School Contact Phone <span className="text-rose-500">*</span>
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-3 flex items-center gap-1 text-xs font-semibold text-[#5B6478] pointer-events-none border-r border-[#E2E8F0] pr-2.5">
                    <span>+91</span>
                  </div>
                  <input
                    id={phoneId}
                    name="contact_phone"
                    type="tel"
                    required
                    value={formData.contact_phone}
                    onChange={handleChange}
                    onBlur={() => handleBlur("contact_phone")}
                    placeholder="98765 43210"
                    aria-required="true"
                    aria-invalid={isFieldInvalid("contact_phone")}
                    aria-describedby={isFieldInvalid("contact_phone") ? "phone-error" : undefined}
                    className={`w-full pl-14 pr-3.5 py-2.5 rounded-lg border text-sm transition-colors focus:outline-hidden ${
                      isFieldInvalid("contact_phone")
                        ? "border-rose-300 bg-rose-50/20 text-[#141A2E] focus:border-rose-500 focus:ring-2 focus:ring-rose-200"
                        : "border-[#E2E8F0] bg-white text-[#141A2E] hover:border-[#CBD5E1] focus:border-[#2158E0] focus:ring-2 focus:ring-[#2158E0]/15"
                    }`}
                  />
                </div>
                {isFieldInvalid("contact_phone") && (
                  <p id="phone-error" role="alert" className="mt-1 text-xs text-rose-600 flex items-center gap-1 font-medium">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {formErrors.contact_phone}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Section D: Campus Address */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs p-5 sm:p-6 transition-colors">
            <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-[#F1F5F9]">
              <div className="w-8 h-8 rounded-lg bg-[#2158E0]/10 flex items-center justify-center text-[#2158E0]">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-[#141A2E]">
                  Campus Address
                </h2>
                <p className="text-xs text-[#5B6478]">
                  Physical campus location for legal records, receipts, and certificates
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Street Address */}
              <div>
                <label
                  htmlFor={addressId}
                  className="block text-xs font-semibold text-[#141A2E] mb-1.5"
                >
                  Street Address <span className="text-rose-500">*</span>
                </label>
                <textarea
                  id={addressId}
                  name="address"
                  rows={2}
                  required
                  value={formData.address}
                  onChange={handleChange}
                  onBlur={() => handleBlur("address")}
                  placeholder="Building No., Street Name, Landmark"
                  aria-required="true"
                  aria-invalid={isFieldInvalid("address")}
                  aria-describedby={isFieldInvalid("address") ? "address-error" : undefined}
                  className={`w-full px-3.5 py-2.5 rounded-lg border text-sm transition-colors focus:outline-hidden resize-none ${
                    isFieldInvalid("address")
                      ? "border-rose-300 bg-rose-50/20 text-[#141A2E] focus:border-rose-500 focus:ring-2 focus:ring-rose-200"
                      : "border-[#E2E8F0] bg-white text-[#141A2E] hover:border-[#CBD5E1] focus:border-[#2158E0] focus:ring-2 focus:ring-[#2158E0]/15"
                  }`}
                />
                {isFieldInvalid("address") && (
                  <p id="address-error" role="alert" className="mt-1 text-xs text-rose-600 flex items-center gap-1 font-medium">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {formErrors.address}
                  </p>
                )}
              </div>

              {/* Compact Responsive Grid: City/Village, District, State/UT, PIN Code */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* City / Village */}
                <div>
                  <label
                    htmlFor={cityId}
                    className="block text-xs font-semibold text-[#141A2E] mb-1.5"
                  >
                    City / Village <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id={cityId}
                    name="city"
                    type="text"
                    required
                    value={formData.city}
                    onChange={handleChange}
                    onBlur={() => handleBlur("city")}
                    placeholder="e.g. New Delhi"
                    aria-required="true"
                    aria-invalid={isFieldInvalid("city")}
                    aria-describedby={isFieldInvalid("city") ? "city-error" : undefined}
                    className={`w-full px-3.5 py-2.5 rounded-lg border text-sm transition-colors focus:outline-hidden ${
                      isFieldInvalid("city")
                        ? "border-rose-300 bg-rose-50/20 text-[#141A2E] focus:border-rose-500 focus:ring-2 focus:ring-rose-200"
                        : "border-[#E2E8F0] bg-white text-[#141A2E] hover:border-[#CBD5E1] focus:border-[#2158E0] focus:ring-2 focus:ring-[#2158E0]/15"
                    }`}
                  />
                  {isFieldInvalid("city") && (
                    <p id="city-error" role="alert" className="mt-1 text-xs text-rose-600 flex items-center gap-1 font-medium">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {formErrors.city}
                    </p>
                  )}
                </div>

                {/* District */}
                <div>
                  <label
                    htmlFor={districtId}
                    className="block text-xs font-semibold text-[#141A2E] mb-1.5"
                  >
                    District <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id={districtId}
                    name="district"
                    type="text"
                    required
                    value={formData.district || ""}
                    onChange={handleChange}
                    onBlur={() => handleBlur("district")}
                    placeholder="e.g. South Delhi"
                    aria-required="true"
                    aria-invalid={isFieldInvalid("district")}
                    aria-describedby={isFieldInvalid("district") ? "district-error" : undefined}
                    className={`w-full px-3.5 py-2.5 rounded-lg border text-sm transition-colors focus:outline-hidden ${
                      isFieldInvalid("district")
                        ? "border-rose-300 bg-rose-50/20 text-[#141A2E] focus:border-rose-500 focus:ring-2 focus:ring-rose-200"
                        : "border-[#E2E8F0] bg-white text-[#141A2E] hover:border-[#CBD5E1] focus:border-[#2158E0] focus:ring-2 focus:ring-[#2158E0]/15"
                    }`}
                  />
                  {isFieldInvalid("district") && (
                    <p id="district-error" role="alert" className="mt-1 text-xs text-rose-600 flex items-center gap-1 font-medium">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {formErrors.district}
                    </p>
                  )}
                </div>

                {/* State / Union Territory */}
                <div>
                  <label
                    htmlFor={stateId}
                    className="block text-xs font-semibold text-[#141A2E] mb-1.5"
                  >
                    State / Union Territory <span className="text-rose-500">*</span>
                  </label>
                  <select
                    id={stateId}
                    name="state"
                    required
                    value={formData.state}
                    onChange={handleChange}
                    onBlur={() => handleBlur("state")}
                    aria-required="true"
                    aria-invalid={isFieldInvalid("state")}
                    aria-describedby={isFieldInvalid("state") ? "state-error" : undefined}
                    className={`w-full px-3.5 py-2.5 rounded-lg border text-sm transition-colors focus:outline-hidden cursor-pointer ${
                      isFieldInvalid("state")
                        ? "border-rose-300 bg-rose-50/20 text-[#141A2E] focus:border-rose-500 focus:ring-2 focus:ring-rose-200"
                        : "border-[#E2E8F0] bg-white text-[#141A2E] hover:border-[#CBD5E1] focus:border-[#2158E0] focus:ring-2 focus:ring-[#2158E0]/15"
                    }`}
                  >
                    <option value="">Select state or UT</option>
                    {INDIAN_STATES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                  {isFieldInvalid("state") && (
                    <p id="state-error" role="alert" className="mt-1 text-xs text-rose-600 flex items-center gap-1 font-medium">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {formErrors.state}
                    </p>
                  )}
                </div>

                {/* Postal PIN Code */}
                <div>
                  <label
                    htmlFor={pinId}
                    className="block text-xs font-semibold text-[#141A2E] mb-1.5"
                  >
                    Postal PIN Code <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id={pinId}
                    name="pin_code"
                    type="text"
                    inputMode="numeric"
                    required
                    maxLength={6}
                    value={formData.pin_code}
                    onChange={handleChange}
                    onBlur={() => handleBlur("pin_code")}
                    placeholder="110001"
                    aria-required="true"
                    aria-invalid={isFieldInvalid("pin_code")}
                    aria-describedby={isFieldInvalid("pin_code") ? "pin-error" : undefined}
                    className={`w-full px-3.5 py-2.5 rounded-lg border text-sm transition-colors focus:outline-hidden ${
                      isFieldInvalid("pin_code")
                        ? "border-rose-300 bg-rose-50/20 text-[#141A2E] focus:border-rose-500 focus:ring-2 focus:ring-rose-200"
                        : "border-[#E2E8F0] bg-white text-[#141A2E] hover:border-[#CBD5E1] focus:border-[#2158E0] focus:ring-2 focus:ring-[#2158E0]/15"
                    }`}
                  />
                  {isFieldInvalid("pin_code") && (
                    <p id="pin-error" role="alert" className="mt-1 text-xs text-rose-600 flex items-center gap-1 font-medium">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {formErrors.pin_code}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="pt-2 flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#5B6478] hover:text-[#141A2E] transition-colors py-2 px-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to home</span>
            </Link>

            <button
              type="submit"
              disabled={isSubmitting || subdomainCheck.status === "checking"}
              id="school-profile-submit-btn"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-2.5 text-sm font-semibold text-white bg-[#2158E0] hover:bg-[#1a4ec4] active:bg-[#153ea0] disabled:opacity-60 disabled:cursor-not-allowed rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving profile...</span>
                </>
              ) : (
                <>
                  <span>Save &amp; Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

          {/* Dedicated Simple Migration Assistance Link */}
          <div className="pt-4 border-t border-[#E2E8F0] text-center">
            <p className="text-xs text-[#5B6478]">
              Switching from offline registers or legacy software?{" "}
              <a
                href="mailto:support@myzkool.com?subject=Migration%20Assistance%20Request"
                className="inline-flex items-center gap-1 text-[#2158E0] hover:underline font-medium"
              >
                <LifeBuoy className="w-3.5 h-3.5" />
                <span>Contact migration support</span>
              </a>
            </p>
          </div>
        </form>
      </div>
    </OnboardingLayout>
  );
}
