import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { OnboardingLayout } from "../../components/onboarding/OnboardingLayout";
import { useAuth } from "../../hooks/useAuth";
import {
  normalizeSubdomain,
  checkSubdomainAvailability,
  getSchoolForCurrentUser,
  saveSchoolProfile,
} from "../../services/schoolService";
import type {
  SchoolProfileInput,
  SchoolType,
  AffiliationBoard,
  SubdomainCheckResult,
} from "../../types/school";
import {
  School as SchoolIcon,
  Globe,
  Mail,
  Phone,
  MapPin,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  ArrowRight,
  RefreshCw,
  Info,
} from "lucide-react";

const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Delhi / NCR",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jammu & Kashmir",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Ladakh",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Chandigarh",
  "Puducherry",
  "Other / International",
];

export default function SchoolProfile() {
  const { user, profile, refreshSession } = useAuth();
  const navigate = useNavigate();

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
    state: "Delhi / NCR",
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

  // UI state
  const [isLoadingExisting, setIsLoadingExisting] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);

  // Debounce ref for subdomain check
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

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
            state: school.state || "Delhi / NCR",
            pin_code: school.pin_code || "",
          });

          // Verify current subdomain availability
          if (school.subdomain) {
            setSubdomainCheck({
              status: "available",
              isAvailable: true,
              message: "Your current school website address ✓",
              subdomain: school.subdomain,
            });
          }
        } else if (isMounted) {
          // If fresh user, set default official email to account email
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
      if (!trimmed) {
        setSubdomainCheck({
          status: "idle",
          isAvailable: false,
          message: "",
          subdomain: "",
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
        const result = await checkSubdomainAvailability(trimmed, currentId);
        setSubdomainCheck(result);
      }, 400);
    },
    []
  );

  // 3. Handle School Name changes (auto-suggest subdomain if not customized)
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

    if (formErrors.name) {
      setFormErrors((prev) => ({ ...prev, name: "" }));
    }
  };

  // 4. Handle Subdomain manual edits
  const handleSubdomainChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsSubdomainManuallyEdited(true);
    const rawVal = e.target.value;
    const normalized = normalizeSubdomain(rawVal);

    setFormData((prev) => ({ ...prev, subdomain: normalized }));
    triggerSubdomainCheck(normalized, existingSchoolId);

    if (formErrors.subdomain) {
      setFormErrors((prev) => ({ ...prev, subdomain: "" }));
    }
  };

  // Reset Subdomain back to auto-generated from School Name
  const handleResetSubdomain = () => {
    setIsSubdomainManuallyEdited(false);
    const suggested = normalizeSubdomain(formData.name);
    setFormData((prev) => ({ ...prev, subdomain: suggested }));
    triggerSubdomainCheck(suggested, existingSchoolId);
  };

  // 5. Generic form field handler
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: "" }));
    }
    setGlobalError(null);
  };

  // 6. Form validation
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = "Please enter your school name.";
    }

    if (!formData.subdomain.trim()) {
      errors.subdomain = "Please configure a website address for your school.";
    } else if (formData.subdomain.length < 3) {
      errors.subdomain = "Website address must be at least 3 characters long.";
    } else if (!subdomainCheck.isAvailable && subdomainCheck.status !== "idle") {
      errors.subdomain = subdomainCheck.message || "Please choose an available website address.";
    }

    if (!formData.official_email.trim()) {
      errors.official_email = "Please enter an official school email address.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.official_email.trim())) {
      errors.official_email = "Please enter a valid email address.";
    }

    if (!formData.contact_phone.trim()) {
      errors.contact_phone = "Please enter a contact phone number.";
    } else if (formData.contact_phone.trim().replace(/\D/g, "").length < 7) {
      errors.contact_phone = "Please enter a valid phone number (at least 7 digits).";
    }

    if (!formData.address.trim()) {
      errors.address = "Please enter the school's street address.";
    }

    if (!formData.city.trim()) {
      errors.city = "Please enter the city.";
    }

    if (!formData.state.trim()) {
      errors.state = "Please select a state.";
    }

    if (!formData.pin_code.trim()) {
      errors.pin_code = "Please enter the postal PIN code.";
    } else if (!/^\d{4,10}$/.test(formData.pin_code.trim())) {
      errors.pin_code = "Please enter a valid postal code (e.g. 110001).";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // 7. Save & Continue
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGlobalError(null);

    if (!validateForm()) {
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
        setGlobalError(result.error || "Failed to save school profile. Please try again.");
        setIsSubmitting(false);
        return;
      }

      // Refresh session in context to sync new school_id and onboarding step
      await refreshSession();

      // Navigate to next onboarding step: Academic Setup
      navigate("/onboarding/academics");
    } catch (err) {
      console.error("Error submitting school profile:", err);
      setGlobalError("An unexpected error occurred while saving. Please try again.");
      setIsSubmitting(false);
    }
  };

  if (isLoadingExisting) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-[#2158E0] animate-spin" />
          <p className="text-sm font-medium text-[#5B6478]">
            Loading school onboarding details...
          </p>
        </div>
      </div>
    );
  }

  return (
    <OnboardingLayout
      currentStepNumber={1}
      completedStepNumbers={existingOnboardingStep > 1 ? [1] : []}
      title="Configure School Profile"
      subtitle="Establish your school's foundational identity, default website address, and official contact details."
    >
      {/* Resuming Onboarding Notification Banner */}
      {existingOnboardingStep > 1 && (
        <div className="mb-6 p-4 rounded-xl bg-blue-50/80 border border-blue-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <Info className="w-5 h-5 text-[#2158E0] shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-[#141A2E]">
                School Profile Already Saved
              </p>
              <p className="text-xs text-[#5B6478] mt-0.5">
                You can make adjustments below and click Continue, or skip ahead to your active step.
              </p>
            </div>
          </div>
          <Link
            to="/onboarding/academics"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-[#2158E0] hover:text-white bg-white hover:bg-[#2158E0] border border-[#2158E0]/30 rounded-lg transition-colors shrink-0 shadow-2xs"
          >
            Go to Academic Setup →
          </Link>
        </div>
      )}

      {/* Global Error Banner */}
      {globalError && (
        <div
          role="alert"
          className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5 animate-fadeIn"
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
          <div className="flex-1 font-medium">{globalError}</div>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        {/* Section 1: Basic Identity */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <SchoolIcon className="w-4 h-4 text-[#2158E0]" />
            <h2 className="text-sm font-bold text-[#141A2E] uppercase tracking-wider">
              School Identity
            </h2>
          </div>

          <div className="space-y-4">
            {/* School Name */}
            <div>
              <label
                htmlFor="school-name-input"
                className="block text-xs font-semibold text-[#141A2E] mb-1.5"
              >
                Official School Name <span className="text-red-500">*</span>
              </label>
              <input
                id="school-name-input"
                name="name"
                type="text"
                required
                value={formData.name}
                onChange={handleNameChange}
                placeholder="e.g. Greenwood International Academy"
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm transition-all focus:outline-hidden ${
                  formErrors.name
                    ? "border-red-300 bg-red-50/30 focus:border-red-500 focus:ring-2 focus:ring-red-200"
                    : "border-[#E6EAF3] bg-white hover:border-[#D1D5DB] focus:border-[#2158E0] focus:ring-2 focus:ring-[#2158E0]/15"
                }`}
              />
              {formErrors.name && (
                <p className="mt-1 text-xs text-red-600 flex items-center gap-1 font-medium">
                  <AlertCircle className="w-3 h-3" /> {formErrors.name}
                </p>
              )}
            </div>

            {/* School Subdomain (Unique Website Address) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="subdomain-input"
                  className="block text-xs font-semibold text-[#141A2E]"
                >
                  School Website Address (Subdomain) <span className="text-red-500">*</span>
                </label>
                {isSubdomainManuallyEdited && (
                  <button
                    type="button"
                    onClick={handleResetSubdomain}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-[#2158E0] hover:underline"
                    title="Auto-generate from school name"
                  >
                    <RefreshCw className="w-2.5 h-2.5" /> Auto-sync from Name
                  </button>
                )}
              </div>

              {/* Subdomain Input Group */}
              <div
                className={`flex items-center rounded-xl border transition-all overflow-hidden bg-white ${
                  formErrors.subdomain
                    ? "border-red-300 ring-2 ring-red-200"
                    : subdomainCheck.status === "available"
                    ? "border-emerald-400 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-200"
                    : subdomainCheck.status === "taken" || subdomainCheck.status === "reserved"
                    ? "border-amber-400 focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-200"
                    : "border-[#E6EAF3] focus-within:border-[#2158E0] focus-within:ring-2 focus-within:ring-[#2158E0]/15"
                }`}
              >
                <div className="pl-3.5 pr-1 text-[#5B6478]">
                  <Globe className="w-4 h-4 text-[#5B6478]" />
                </div>
                <input
                  id="subdomain-input"
                  name="subdomain"
                  type="text"
                  required
                  value={formData.subdomain}
                  onChange={handleSubdomainChange}
                  placeholder="greenwood-academy"
                  className="w-full py-2.5 px-2 text-sm text-[#141A2E] placeholder-[#94A3B8] focus:outline-hidden font-mono tracking-tight"
                />
                <span className="pr-3.5 text-xs font-medium text-[#5B6478] select-none bg-[#F8FAFC] py-2.5 px-3 border-l border-[#E6EAF3]">
                  .myzkool.com
                </span>
              </div>

              {/* Subdomain Status Feedback */}
              <div className="mt-1.5 flex items-center justify-between text-xs min-h-[20px]">
                {subdomainCheck.status === "checking" && (
                  <div className="flex items-center gap-1.5 text-[#5B6478]">
                    <Loader2 className="w-3 h-3 animate-spin text-[#2158E0]" />
                    <span>Checking availability...</span>
                  </div>
                )}

                {subdomainCheck.status === "available" && (
                  <div className="flex items-center gap-1.5 text-emerald-600 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{subdomainCheck.message}</span>
                  </div>
                )}

                {subdomainCheck.status === "taken" && (
                  <div className="flex items-center gap-1.5 text-red-600 font-medium">
                    <XCircle className="w-3.5 h-3.5" />
                    <span>{subdomainCheck.message}</span>
                  </div>
                )}

                {subdomainCheck.status === "reserved" && (
                  <div className="flex items-center gap-1.5 text-amber-600 font-medium">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{subdomainCheck.message}</span>
                  </div>
                )}

                {subdomainCheck.status === "invalid" && (
                  <div className="flex items-center gap-1.5 text-red-600 font-medium">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{subdomainCheck.message}</span>
                  </div>
                )}

                <span className="text-[11px] text-[#94A3B8] ml-auto">
                  Letters, numbers, and hyphens only
                </span>
              </div>

              {formErrors.subdomain && subdomainCheck.status === "idle" && (
                <p className="mt-1 text-xs text-red-600 flex items-center gap-1 font-medium">
                  <AlertCircle className="w-3 h-3" /> {formErrors.subdomain}
                </p>
              )}
            </div>

            {/* School Type & Affiliation Board (2-column layout) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="school-type-select"
                  className="block text-xs font-semibold text-[#141A2E] mb-1.5"
                >
                  School Level / Type <span className="text-red-500">*</span>
                </label>
                <select
                  id="school-type-select"
                  name="school_type"
                  value={formData.school_type}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E6EAF3] bg-white text-sm text-[#141A2E] hover:border-[#D1D5DB] focus:border-[#2158E0] focus:ring-2 focus:ring-[#2158E0]/15 focus:outline-hidden"
                >
                  <option value="k12">K-12 (Kindergarten to Grade 12)</option>
                  <option value="primary">Primary School (Grades 1 – 5)</option>
                  <option value="middle">Middle School (Grades 6 – 8)</option>
                  <option value="secondary">Secondary / High School (Grades 9 – 10)</option>
                  <option value="senior_secondary">Senior Secondary (Grades 11 – 12)</option>
                  <option value="preschool">Pre-School / Nursery / Playgroup</option>
                  <option value="other">Other Educational Institution</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="affiliation-board-select"
                  className="block text-xs font-semibold text-[#141A2E] mb-1.5"
                >
                  Affiliation Board
                </label>
                <select
                  id="affiliation-board-select"
                  name="affiliation_board"
                  value={formData.affiliation_board}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E6EAF3] bg-white text-sm text-[#141A2E] hover:border-[#D1D5DB] focus:border-[#2158E0] focus:ring-2 focus:ring-[#2158E0]/15 focus:outline-hidden"
                >
                  <option value="cbse">CBSE (Central Board of Secondary Education)</option>
                  <option value="icse">ICSE / ISC (CISCE Board)</option>
                  <option value="state_board">State Board</option>
                  <option value="cambridge">Cambridge / IGCSE</option>
                  <option value="ib">IB (International Baccalaureate)</option>
                  <option value="matriculation">Matriculation</option>
                  <option value="other">Other / Independent</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Contact Details */}
        <div className="pt-4 border-t border-[#F1F5F9]">
          <div className="flex items-center gap-2 mb-3">
            <Phone className="w-4 h-4 text-[#2158E0]" />
            <h2 className="text-sm font-bold text-[#141A2E] uppercase tracking-wider">
              Official Communication
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Official Email */}
            <div>
              <label
                htmlFor="official-email-input"
                className="block text-xs font-semibold text-[#141A2E] mb-1.5"
              >
                Official School Email <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="official-email-input"
                  name="official_email"
                  type="email"
                  required
                  value={formData.official_email}
                  onChange={handleChange}
                  placeholder="principal@school.edu.in"
                  className={`w-full pl-9 pr-3.5 py-2.5 rounded-xl border text-sm transition-all focus:outline-hidden ${
                    formErrors.official_email
                      ? "border-red-300 bg-red-50/30 focus:border-red-500 focus:ring-2 focus:ring-red-200"
                      : "border-[#E6EAF3] bg-white hover:border-[#D1D5DB] focus:border-[#2158E0] focus:ring-2 focus:ring-[#2158E0]/15"
                  }`}
                />
                <Mail className="w-4 h-4 text-[#94A3B8] absolute left-3 top-3" />
              </div>
              {formErrors.official_email && (
                <p className="mt-1 text-xs text-red-600 flex items-center gap-1 font-medium">
                  <AlertCircle className="w-3 h-3" /> {formErrors.official_email}
                </p>
              )}
            </div>

            {/* Contact Phone */}
            <div>
              <label
                htmlFor="contact-phone-input"
                className="block text-xs font-semibold text-[#141A2E] mb-1.5"
              >
                School Contact Phone <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="contact-phone-input"
                  name="contact_phone"
                  type="tel"
                  required
                  value={formData.contact_phone}
                  onChange={handleChange}
                  placeholder="+91 98765 43210"
                  className={`w-full pl-9 pr-3.5 py-2.5 rounded-xl border text-sm transition-all focus:outline-hidden ${
                    formErrors.contact_phone
                      ? "border-red-300 bg-red-50/30 focus:border-red-500 focus:ring-2 focus:ring-red-200"
                      : "border-[#E6EAF3] bg-white hover:border-[#D1D5DB] focus:border-[#2158E0] focus:ring-2 focus:ring-[#2158E0]/15"
                  }`}
                />
                <Phone className="w-4 h-4 text-[#94A3B8] absolute left-3 top-3" />
              </div>
              {formErrors.contact_phone && (
                <p className="mt-1 text-xs text-red-600 flex items-center gap-1 font-medium">
                  <AlertCircle className="w-3 h-3" /> {formErrors.contact_phone}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Section 3: Campus Location */}
        <div className="pt-4 border-t border-[#F1F5F9]">
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="w-4 h-4 text-[#2158E0]" />
            <h2 className="text-sm font-bold text-[#141A2E] uppercase tracking-wider">
              Campus Address
            </h2>
          </div>

          <div className="space-y-4">
            {/* Street Address */}
            <div>
              <label
                htmlFor="address-input"
                className="block text-xs font-semibold text-[#141A2E] mb-1.5"
              >
                Street / Campus Address <span className="text-red-500">*</span>
              </label>
              <textarea
                id="address-input"
                name="address"
                rows={2}
                required
                value={formData.address}
                onChange={handleChange}
                placeholder="Plot No. 12, Knowledge Park III, Sector 62"
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm transition-all focus:outline-hidden resize-none ${
                  formErrors.address
                    ? "border-red-300 bg-red-50/30 focus:border-red-500 focus:ring-2 focus:ring-red-200"
                    : "border-[#E6EAF3] bg-white hover:border-[#D1D5DB] focus:border-[#2158E0] focus:ring-2 focus:ring-[#2158E0]/15"
                }`}
              />
              {formErrors.address && (
                <p className="mt-1 text-xs text-red-600 flex items-center gap-1 font-medium">
                  <AlertCircle className="w-3 h-3" /> {formErrors.address}
                </p>
              )}
            </div>

            {/* City, State, PIN Code (3-column layout) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label
                  htmlFor="city-input"
                  className="block text-xs font-semibold text-[#141A2E] mb-1.5"
                >
                  City <span className="text-red-500">*</span>
                </label>
                <input
                  id="city-input"
                  name="city"
                  type="text"
                  required
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="New Delhi"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm transition-all focus:outline-hidden ${
                    formErrors.city
                      ? "border-red-300 bg-red-50/30 focus:border-red-500 focus:ring-2 focus:ring-red-200"
                      : "border-[#E6EAF3] bg-white hover:border-[#D1D5DB] focus:border-[#2158E0] focus:ring-2 focus:ring-[#2158E0]/15"
                  }`}
                />
                {formErrors.city && (
                  <p className="mt-1 text-xs text-red-600 flex items-center gap-1 font-medium">
                    <AlertCircle className="w-3 h-3" /> {formErrors.city}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="state-select"
                  className="block text-xs font-semibold text-[#141A2E] mb-1.5"
                >
                  State / Territory <span className="text-red-500">*</span>
                </label>
                <select
                  id="state-select"
                  name="state"
                  required
                  value={formData.state}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E6EAF3] bg-white text-sm text-[#141A2E] hover:border-[#D1D5DB] focus:border-[#2158E0] focus:ring-2 focus:ring-[#2158E0]/15 focus:outline-hidden"
                >
                  {INDIAN_STATES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
                {formErrors.state && (
                  <p className="mt-1 text-xs text-red-600 flex items-center gap-1 font-medium">
                    <AlertCircle className="w-3 h-3" /> {formErrors.state}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="pin-code-input"
                  className="block text-xs font-semibold text-[#141A2E] mb-1.5"
                >
                  PIN Code <span className="text-red-500">*</span>
                </label>
                <input
                  id="pin-code-input"
                  name="pin_code"
                  type="text"
                  required
                  maxLength={10}
                  value={formData.pin_code}
                  onChange={handleChange}
                  placeholder="110001"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm transition-all focus:outline-hidden ${
                    formErrors.pin_code
                      ? "border-red-300 bg-red-50/30 focus:border-red-500 focus:ring-2 focus:ring-red-200"
                      : "border-[#E6EAF3] bg-white hover:border-[#D1D5DB] focus:border-[#2158E0] focus:ring-2 focus:ring-[#2158E0]/15"
                  }`}
                />
                {formErrors.pin_code && (
                  <p className="mt-1 text-xs text-red-600 flex items-center gap-1 font-medium">
                    <AlertCircle className="w-3 h-3" /> {formErrors.pin_code}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-6 border-t border-[#F1F5F9] flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
          <Link
            to="/"
            className="text-xs font-semibold text-[#5B6478] hover:text-[#141A2E] transition-colors py-2 px-1"
          >
            ← Back to Home
          </Link>

          <button
            type="submit"
            disabled={isSubmitting || subdomainCheck.status === "checking"}
            id="school-profile-submit-btn"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3 text-sm font-semibold text-white bg-[#2158E0] hover:bg-[#1a4ec4] active:bg-[#153ea0] disabled:opacity-60 disabled:cursor-not-allowed rounded-full shadow-md shadow-[#2158E0]/20 transition-all cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving School Profile...</span>
              </>
            ) : (
              <>
                <span>Save &amp; Continue</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </OnboardingLayout>
  );
}
