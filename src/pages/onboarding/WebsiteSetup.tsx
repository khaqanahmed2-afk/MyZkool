import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { OnboardingLayout } from "../../components/onboarding/OnboardingLayout";
import { getSchoolForCurrentUser } from "../../services/schoolService";
import {
  initializeSchoolWebsite,
  updateSchoolWebsite,
  reorderWebsitePages,
  toggleWebsitePage,
  createWebsitePage,
  saveWebsiteSetupProgress,
  formatSchoolWebsiteUrl,
  formatParentPortalUrl,
  isValidHexColor,
  isValidEmail,
} from "../../services/websiteService";
import type { School } from "../../types/school";
import {
  type SchoolWebsite,
  type WebsitePage,
  type WebsiteColorPreset,
  WEBSITE_COLOR_PRESETS,
} from "../../types/website";
import {
  Globe,
  Palette,
  Layout,
  Layers,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
  Copy,
  Check,
  Eye,
  Lock,
  ChevronUp,
  ChevronDown,
  Plus,
  Trash2,
  Sparkles,
  ShieldCheck,
  School as SchoolIcon,
  Phone,
  Mail,
  MapPin,
  Smartphone,
  Monitor,
} from "lucide-react";

export default function WebsiteSetup() {
  const { user, profile, refreshSession } = useAuth();
  const navigate = useNavigate();

  // Core Data State
  const [school, setSchool] = useState<School | null>(null);
  const [website, setWebsite] = useState<SchoolWebsite | null>(null);
  const [pages, setPages] = useState<WebsitePage[]>([]);

  // Form Fields State
  const [siteName, setSiteName] = useState<string>("");
  const [tagline, setTagline] = useState<string>("");
  const [aboutText, setAboutText] = useState<string>("");
  const [primaryColor, setPrimaryColor] = useState<string>("#2158E0");
  const [secondaryColor, setSecondaryColor] = useState<string>("#141A2E");
  const [accentColor, setAccentColor] = useState<string>("#10B981");
  const [logoUrl, setLogoUrl] = useState<string>("");
  const [contactEmail, setContactEmail] = useState<string>("");
  const [contactPhone, setContactPhone] = useState<string>("");
  const [address, setAddress] = useState<string>("");
  const [city, setCity] = useState<string>("");
  const [state, setState] = useState<string>("");
  const [postalCode, setPostalCode] = useState<string>("");
  const [admissionEnabled, setAdmissionEnabled] = useState<boolean>(true);
  const [parentPortalEnabled, setParentPortalEnabled] = useState<boolean>(true);
  const [published, setPublished] = useState<boolean>(false);

  // New Custom Page Form Modal / State
  const [showAddPage, setShowAddPage] = useState<boolean>(false);
  const [newPageTitle, setNewPageTitle] = useState<string>("");
  const [newPageSlug, setNewPageSlug] = useState<string>("");
  const [addPageError, setAddPageError] = useState<string | null>(null);

  // UI / Interaction State
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<boolean>(false);
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
  const [prerequisiteError, setPrerequisiteError] = useState<{
    msg: string;
    route: string;
    linkText: string;
  } | null>(null);

  // 1. Initial Load: Fetch School & Initialize Website Record
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        if (!user) {
          setIsLoading(false);
          return;
        }

        // Fetch School Profile
        const { school: currentSchool, error: schoolErr } = await getSchoolForCurrentUser(
          user.id,
          profile?.school_id
        );

        if (!isMounted) return;

        if (schoolErr || !currentSchool) {
          setPrerequisiteError({
            msg: "School profile not found. Please complete Step 1 (School Profile) first.",
            route: "/onboarding/school",
            linkText: "Go to Step 1: School Profile",
          });
          setIsLoading(false);
          return;
        }

        setSchool(currentSchool);

        // Initialize or load school website record (idempotent)
        const initResult = await initializeSchoolWebsite({
          school: currentSchool,
          userId: user.id,
          userRole: profile?.role || "school_admin",
        });

        if (!isMounted) return;

        if (initResult.error || !initResult.website) {
          setErrorMessage(initResult.error || "Failed to initialize website setup.");
          setIsLoading(false);
          return;
        }

        const site = initResult.website;
        setWebsite(site);
        setPages(initResult.pages || site.pages || []);

        // Populate Form Fields
        setSiteName(site.site_name || currentSchool.name || "");
        setTagline(
          site.tagline ||
            "Empowering Students for Academic Excellence & Moral Leadership"
        );
        setAboutText(
          site.about_text ||
            `${currentSchool.name} is dedicated to nurturing holistic growth, academic inquiry, and ethical leadership in a supportive learning community.`
        );
        setPrimaryColor(site.primary_color || "#2158E0");
        setSecondaryColor(site.secondary_color || "#141A2E");
        setAccentColor(site.accent_color || "#10B981");
        setLogoUrl(site.logo_url || currentSchool.logo_url || "");
        setContactEmail(site.contact_email || currentSchool.official_email || "");
        setContactPhone(site.contact_phone || currentSchool.contact_phone || "");
        setAddress(site.address || currentSchool.address || "");
        setCity(site.city || currentSchool.city || "");
        setState(site.state || currentSchool.state || "");
        setPostalCode(site.postal_code || currentSchool.pin_code || "");
        setAdmissionEnabled(site.admission_enabled !== false);
        setParentPortalEnabled(site.parent_portal_enabled !== false);
        setPublished(site.published === true);
      } catch (err: unknown) {
        if (!isMounted) return;
        const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
        setErrorMessage(msg);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [user, profile?.school_id, profile?.role]);

  // Handle Preset Palette Selection
  const handleSelectPreset = (preset: WebsiteColorPreset) => {
    setPrimaryColor(preset.primary);
    setSecondaryColor(preset.secondary);
    setAccentColor(preset.accent);
  };

  // Copy Public Website URL
  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  // Move Page Up
  const handleMovePageUp = async (index: number) => {
    if (index === 0 || !website || !school) return;
    const reordered = [...pages];
    const temp = reordered[index - 1];
    reordered[index - 1] = reordered[index];
    reordered[index] = temp;

    setPages(reordered);
    const orderedIds = reordered.map((p) => p.id);
    await reorderWebsitePages({
      schoolId: school.id,
      websiteId: website.id,
      orderedPageIds: orderedIds,
      userRole: profile?.role || "school_admin",
    });
  };

  // Move Page Down
  const handleMovePageDown = async (index: number) => {
    if (index === pages.length - 1 || !website || !school) return;
    const reordered = [...pages];
    const temp = reordered[index + 1];
    reordered[index + 1] = reordered[index];
    reordered[index] = temp;

    setPages(reordered);
    const orderedIds = reordered.map((p) => p.id);
    await reorderWebsitePages({
      schoolId: school.id,
      websiteId: website.id,
      orderedPageIds: orderedIds,
      userRole: profile?.role || "school_admin",
    });
  };

  // Toggle Page Visibility
  const handleTogglePage = async (pageId: string, currentEnabled: boolean) => {
    if (!website || !school) return;
    const target = pages.find((p) => p.id === pageId);
    if (target?.slug === "home" && currentEnabled) {
      setErrorMessage("The Home page cannot be disabled as it is your site landing page.");
      return;
    }

    const nextState = !currentEnabled;
    setPages((prev) =>
      prev.map((p) => (p.id === pageId ? { ...p, is_enabled: nextState } : p))
    );

    const res = await toggleWebsitePage({
      schoolId: school.id,
      websiteId: website.id,
      pageId,
      isEnabled: nextState,
      userRole: profile?.role || "school_admin",
    });

    if (!res.success) {
      setErrorMessage(res.error || "Failed to update page status.");
      // revert
      setPages((prev) =>
        prev.map((p) => (p.id === pageId ? { ...p, is_enabled: currentEnabled } : p))
      );
    }
  };

  // Add Custom Page
  const handleAddCustomPage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!website || !school) return;
    setAddPageError(null);

    const cleanTitle = newPageTitle.trim();
    if (!cleanTitle) {
      setAddPageError("Please enter a page title.");
      return;
    }

    const res = await createWebsitePage({
      schoolId: school.id,
      websiteId: website.id,
      slug: newPageSlug || cleanTitle,
      title: cleanTitle,
      pageType: "custom",
      userRole: profile?.role || "school_admin",
    });

    if (!res.success || !res.page) {
      setAddPageError(res.error || "Failed to add page.");
      return;
    }

    setPages((prev) => [...prev, res.page!]);
    setNewPageTitle("");
    setNewPageSlug("");
    setShowAddPage(false);
  };

  // Form Submission: Save Website Configuration & Advance Onboarding Step
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessBanner(null);

    if (!school || !website || !user) {
      setErrorMessage("Required school or website session is missing.");
      return;
    }

    // Validations
    if (!siteName.trim()) {
      setErrorMessage("Please provide a website display name.");
      return;
    }

    if (!isValidHexColor(primaryColor)) {
      setErrorMessage("Primary brand color must be a valid hex code (e.g. #2158E0).");
      return;
    }

    if (contactEmail && !isValidEmail(contactEmail)) {
      setErrorMessage("Please provide a valid contact email address.");
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Save Website Settings
      const updateRes = await updateSchoolWebsite({
        schoolId: school.id,
        websiteId: website.id,
        input: {
          site_name: siteName.trim(),
          tagline: tagline.trim(),
          about_text: aboutText.trim(),
          primary_color: primaryColor,
          secondary_color: secondaryColor,
          accent_color: accentColor,
          logo_url: logoUrl.trim() || undefined,
          contact_email: contactEmail.trim() || undefined,
          contact_phone: contactPhone.trim() || undefined,
          address: address.trim() || undefined,
          city: city.trim() || undefined,
          state: state.trim() || undefined,
          postal_code: postalCode.trim() || undefined,
          admission_enabled: admissionEnabled,
          parent_portal_enabled: parentPortalEnabled,
          published,
        },
        userRole: profile?.role || "school_admin",
      });

      if (!updateRes.success) {
        setErrorMessage(updateRes.error || "Failed to update website settings.");
        setIsSubmitting(false);
        return;
      }

      // 2. Advance onboarding progress non-regressively: Step 6 -> Step 7 (/onboarding/staff)
      const progressRes = await saveWebsiteSetupProgress({
        schoolId: school.id,
        userId: user.id,
      });

      if (!progressRes.success) {
        setErrorMessage(progressRes.error || "Failed to update onboarding step.");
        setIsSubmitting(false);
        return;
      }

      if (refreshSession) {
        await refreshSession();
      }

      // Navigate to Step 7: Staff Setup
      navigate("/onboarding/staff");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save website settings.";
      setErrorMessage(msg);
      setIsSubmitting(false);
    }
  };

  const publicWebsiteUrl = school ? formatSchoolWebsiteUrl(school.subdomain) : "";
  const parentPortalUrl = school ? formatParentPortalUrl(school.subdomain) : "";

  // ----------------------------------------------------
  // Render Loading State
  // ----------------------------------------------------
  if (isLoading) {
    return (
      <OnboardingLayout
        currentStepNumber={6}
        completedStepNumbers={[1, 2, 3, 4, 5]}
        title="Set Up Your School Website"
        subtitle="Loading your school's public website settings and domain..."
      >
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-9 h-9 text-[#2158E0] animate-spin mb-4" />
          <p className="text-sm font-medium text-[#141A2E]">
            Preparing tenant website settings...
          </p>
          <p className="text-xs text-[#5B6478] mt-1">
            Deriving identity, colors, and navigation from your school profile.
          </p>
        </div>
      </OnboardingLayout>
    );
  }

  // ----------------------------------------------------
  // Render Prerequisite Error
  // ----------------------------------------------------
  if (prerequisiteError) {
    return (
      <OnboardingLayout
        currentStepNumber={6}
        completedStepNumbers={[1, 2, 3, 4, 5]}
        title="Set Up Your School Website"
        subtitle="School Profile Required"
      >
        <div className="max-w-xl mx-auto p-6 bg-white rounded-2xl border border-red-100 shadow-sm text-center">
          <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-3">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-[#141A2E] mb-1">
            Prerequisite Incomplete
          </h2>
          <p className="text-xs text-[#5B6478] mb-5">{prerequisiteError.msg}</p>
          <Link
            to={prerequisiteError.route}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-semibold text-white bg-[#2158E0] hover:bg-[#1a4ec4] transition-colors"
          >
            <span>{prerequisiteError.linkText}</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </OnboardingLayout>
    );
  }

  return (
    <OnboardingLayout
      currentStepNumber={6}
      completedStepNumbers={[1, 2, 3, 4, 5]}
      title="Set Up Your School Website"
      subtitle="Configure your institution's public-facing website, official branding, page navigation, and parent portal entry point."
    >
      <form onSubmit={handleSubmit} className="space-y-8 max-w-5xl mx-auto">
        {/* Onboarding Stage Tracker Pill */}
        <div className="flex items-center justify-between flex-wrap gap-3 pb-2 border-b border-[#E6EAF3]">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Steps 1 – 5 Completed
            </span>
            <span className="text-xs text-[#5B6478]">
              Next: Staff & Faculty Setup (Step 7)
            </span>
          </div>

          {/* Subdomain synced indicator */}
          {school && (
            <div className="flex items-center gap-2 text-xs text-[#5B6478]">
              <span className="font-mono bg-[#F1F5F9] px-2.5 py-1 rounded-md text-[#141A2E] font-medium border border-[#E2E8F0]">
                {school.subdomain}.myzkool.com
              </span>
              <button
                type="button"
                onClick={() => handleCopyUrl(publicWebsiteUrl)}
                className="inline-flex items-center gap-1 text-[#2158E0] hover:text-[#1a4ec4] font-medium cursor-pointer"
                title="Copy website link"
              >
                {copiedUrl ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span className="text-emerald-600">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy URL</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Global Error Banner */}
        {errorMessage && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="text-xs text-red-800">
              <p className="font-semibold">Unable to proceed</p>
              <p className="mt-0.5">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Global Success Banner */}
        {successBanner && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-xs text-emerald-800">
              <p className="font-semibold">{successBanner}</p>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* SECTION A: Website Identity & Story                  */}
        {/* ==================================================== */}
        <div className="bg-white rounded-2xl border border-[#E6EAF3] shadow-xs p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#2158E0] flex items-center justify-center">
              <SchoolIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-[#141A2E]">
                Website Identity & Public Profile
              </h2>
              <p className="text-xs text-[#5B6478]">
                Display name, motto, and introductory summary visible on your public home page.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Site Display Name */}
            <div>
              <label
                htmlFor="site-name-input"
                className="block text-xs font-semibold text-[#141A2E] mb-1.5"
              >
                Website Display Name <span className="text-red-500">*</span>
              </label>
              <input
                id="site-name-input"
                type="text"
                required
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                placeholder="e.g. Greenwood International Academy"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E6EAF3] bg-white text-sm text-[#141A2E] placeholder-[#94A3B8] hover:border-[#D1D5DB] focus:border-[#2158E0] focus:ring-2 focus:ring-[#2158E0]/15 focus:outline-hidden"
              />
              <span className="text-[11px] text-[#5B6478] mt-1 block">
                Official institution name displayed across the website header and title tags.
              </span>
            </div>

            {/* School Tagline / Motto */}
            <div>
              <label
                htmlFor="tagline-input"
                className="block text-xs font-semibold text-[#141A2E] mb-1.5"
              >
                Motto / Tagline
              </label>
              <input
                id="tagline-input"
                type="text"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="e.g. Inspiring Excellence, Cultivating Character"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E6EAF3] bg-white text-sm text-[#141A2E] placeholder-[#94A3B8] hover:border-[#D1D5DB] focus:border-[#2158E0] focus:ring-2 focus:ring-[#2158E0]/15 focus:outline-hidden"
              />
              <span className="text-[11px] text-[#5B6478] mt-1 block">
                Short institutional motto showcased prominently in the hero banner.
              </span>
            </div>

            {/* About / Welcome Text */}
            <div className="md:col-span-2">
              <label
                htmlFor="about-text-input"
                className="block text-xs font-semibold text-[#141A2E] mb-1.5"
              >
                Brief Introduction / Welcome Text
              </label>
              <textarea
                id="about-text-input"
                rows={3}
                value={aboutText}
                onChange={(e) => setAboutText(e.target.value)}
                placeholder="Write a warm introduction greeting prospective parents and students..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E6EAF3] bg-white text-sm text-[#141A2E] placeholder-[#94A3B8] hover:border-[#D1D5DB] focus:border-[#2158E0] focus:ring-2 focus:ring-[#2158E0]/15 focus:outline-hidden resize-y"
              />
              <span className="text-[11px] text-[#5B6478] mt-1 block">
                Appears in the &quot;About Our School&quot; introductory section on the website homepage.
              </span>
            </div>
          </div>
        </div>

        {/* ==================================================== */}
        {/* SECTION B: Brand Colors & Visual Identity            */}
        {/* ==================================================== */}
        <div className="bg-white rounded-2xl border border-[#E6EAF3] shadow-xs p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-[#141A2E]">
                Brand Colors & Theme Palette
              </h2>
              <p className="text-xs text-[#5B6478]">
                Select from curated school themes or configure custom institutional color hex codes.
              </p>
            </div>
          </div>

          {/* Curated Presets */}
          <div className="mb-6">
            <p className="text-xs font-semibold text-[#141A2E] mb-2.5">
              Quick Theme Palettes (Curated for Indian Schools):
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {WEBSITE_COLOR_PRESETS.map((preset) => {
                const isSelected =
                  primaryColor.toLowerCase() === preset.primary.toLowerCase() &&
                  secondaryColor.toLowerCase() === preset.secondary.toLowerCase();

                return (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? "border-[#2158E0] bg-blue-50/50 ring-2 ring-[#2158E0]/15"
                        : "border-[#E6EAF3] bg-white hover:border-[#CBD5E1]"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-[#141A2E]">
                        {preset.name}
                      </span>
                      {isSelected && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#2158E0]" />
                      )}
                    </div>

                    {/* Color Swatch Trio */}
                    <div className="flex items-center gap-1.5 mb-2">
                      <div
                        className="w-6 h-6 rounded-md shadow-xs border border-black/10"
                        style={{ backgroundColor: preset.primary }}
                        title={`Primary: ${preset.primary}`}
                      />
                      <div
                        className="w-6 h-6 rounded-md shadow-xs border border-black/10"
                        style={{ backgroundColor: preset.secondary }}
                        title={`Secondary: ${preset.secondary}`}
                      />
                      <div
                        className="w-6 h-6 rounded-md shadow-xs border border-black/10"
                        style={{ backgroundColor: preset.accent }}
                        title={`Accent: ${preset.accent}`}
                      />
                    </div>

                    <p className="text-[11px] text-[#5B6478] leading-tight">
                      {preset.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Hex Color Pickers */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-[#E6EAF3]">
            {/* Primary Color */}
            <div>
              <label
                htmlFor="primary-color-input"
                className="block text-xs font-semibold text-[#141A2E] mb-1.5"
              >
                Primary Brand Color <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-10 h-10 p-1 rounded-lg border border-[#E6EAF3] cursor-pointer bg-white"
                  title="Choose primary color"
                />
                <input
                  id="primary-color-input"
                  type="text"
                  required
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  placeholder="#2158E0"
                  className="w-full px-3 py-2 rounded-xl border border-[#E6EAF3] text-xs font-mono text-[#141A2E] hover:border-[#D1D5DB] focus:border-[#2158E0] focus:outline-hidden"
                />
              </div>
              <span className="text-[11px] text-[#5B6478] mt-1 block">
                Header, main buttons, and primary accents.
              </span>
            </div>

            {/* Secondary Color */}
            <div>
              <label
                htmlFor="secondary-color-input"
                className="block text-xs font-semibold text-[#141A2E] mb-1.5"
              >
                Secondary Color
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="w-10 h-10 p-1 rounded-lg border border-[#E6EAF3] cursor-pointer bg-white"
                  title="Choose secondary color"
                />
                <input
                  id="secondary-color-input"
                  type="text"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  placeholder="#141A2E"
                  className="w-full px-3 py-2 rounded-xl border border-[#E6EAF3] text-xs font-mono text-[#141A2E] hover:border-[#D1D5DB] focus:border-[#2158E0] focus:outline-hidden"
                />
              </div>
              <span className="text-[11px] text-[#5B6478] mt-1 block">
                Dark footer, contrast panels, headings.
              </span>
            </div>

            {/* Accent Color */}
            <div>
              <label
                htmlFor="accent-color-input"
                className="block text-xs font-semibold text-[#141A2E] mb-1.5"
              >
                Accent Highlight Color
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="w-10 h-10 p-1 rounded-lg border border-[#E6EAF3] cursor-pointer bg-white"
                  title="Choose accent color"
                />
                <input
                  id="accent-color-input"
                  type="text"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  placeholder="#10B981"
                  className="w-full px-3 py-2 rounded-xl border border-[#E6EAF3] text-xs font-mono text-[#141A2E] hover:border-[#D1D5DB] focus:border-[#2158E0] focus:outline-hidden"
                />
              </div>
              <span className="text-[11px] text-[#5B6478] mt-1 block">
                Badges, admission badges, callout highlights.
              </span>
            </div>
          </div>
        </div>

        {/* ==================================================== */}
        {/* SECTION C: Public Contact & Campus Location          */}
        {/* ==================================================== */}
        <div className="bg-white rounded-2xl border border-[#E6EAF3] shadow-xs p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-[#141A2E]">
                Public Contact & Campus Directory
              </h2>
              <p className="text-xs text-[#5B6478]">
                Pre-filled from your school profile; edit if website contact details differ.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label
                htmlFor="contact-email-input"
                className="block text-xs font-semibold text-[#141A2E] mb-1.5"
              >
                Public Enquiries Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#94A3B8] absolute left-3 top-3" />
                <input
                  id="contact-email-input"
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="admissions@school.edu"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-[#E6EAF3] bg-white text-xs text-[#141A2E] hover:border-[#D1D5DB] focus:border-[#2158E0] focus:outline-hidden"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="contact-phone-input"
                className="block text-xs font-semibold text-[#141A2E] mb-1.5"
              >
                Front Desk Telephone
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-[#94A3B8] absolute left-3 top-3" />
                <input
                  id="contact-phone-input"
                  type="tel"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-[#E6EAF3] bg-white text-xs text-[#141A2E] hover:border-[#D1D5DB] focus:border-[#2158E0] focus:outline-hidden"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="postal-code-input"
                className="block text-xs font-semibold text-[#141A2E] mb-1.5"
              >
                Postal Code (PIN)
              </label>
              <input
                id="postal-code-input"
                type="text"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                placeholder="400001"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E6EAF3] bg-white text-xs text-[#141A2E] hover:border-[#D1D5DB] focus:border-[#2158E0] focus:outline-hidden"
              />
            </div>

            <div className="sm:col-span-2">
              <label
                htmlFor="address-input"
                className="block text-xs font-semibold text-[#141A2E] mb-1.5"
              >
                Campus Street Address
              </label>
              <input
                id="address-input"
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Plot 12, Vidya Vihar, MG Road"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E6EAF3] bg-white text-xs text-[#141A2E] hover:border-[#D1D5DB] focus:border-[#2158E0] focus:outline-hidden"
              />
            </div>

            <div>
              <label
                htmlFor="city-input"
                className="block text-xs font-semibold text-[#141A2E] mb-1.5"
              >
                City & State
              </label>
              <input
                id="city-input"
                type="text"
                value={`${city ? city : ""}${city && state ? ", " : ""}${state ? state : ""}`}
                onChange={(e) => {
                  const parts = e.target.value.split(",");
                  setCity(parts[0]?.trim() || "");
                  if (parts[1]) setState(parts[1].trim());
                }}
                placeholder="e.g. Pune, Maharashtra"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E6EAF3] bg-white text-xs text-[#141A2E] hover:border-[#D1D5DB] focus:border-[#2158E0] focus:outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* ==================================================== */}
        {/* SECTION D: Navigation Pages Structure (Data-Driven)  */}
        {/* ==================================================== */}
        <div className="bg-white rounded-2xl border border-[#E6EAF3] shadow-xs p-6">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                <Layout className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-[#141A2E]">
                  Public Navigation Pages
                </h2>
                <p className="text-xs text-[#5B6478]">
                  Manage the pages appearing in your website navigation bar. Re-order or toggle visibility.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowAddPage(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#2158E0] bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Custom Page</span>
            </button>
          </div>

          {/* Add Page Modal / Inline Box */}
          {showAddPage && (
            <div className="mb-4 p-4 rounded-xl bg-blue-50/70 border border-blue-200">
              <h3 className="text-xs font-bold text-[#141A2E] mb-2">
                Add New Navigation Page
              </h3>
              {addPageError && (
                <p className="text-xs text-red-600 mb-2 font-medium">
                  {addPageError}
                </p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#141A2E] mb-1">
                    Page Title
                  </label>
                  <input
                    type="text"
                    value={newPageTitle}
                    onChange={(e) => {
                      setNewPageTitle(e.target.value);
                      if (!newPageSlug) {
                        setNewPageSlug(
                          e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "-")
                        );
                      }
                    }}
                    placeholder="e.g. Gallery or Facilities"
                    className="w-full px-3 py-2 rounded-lg border border-[#E6EAF3] bg-white text-xs text-[#141A2E]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#141A2E] mb-1">
                    URL Slug
                  </label>
                  <div className="flex items-center">
                    <span className="text-xs text-[#5B6478] bg-[#F1F5F9] px-2 py-2 border border-r-0 border-[#E6EAF3] rounded-l-lg">
                      /
                    </span>
                    <input
                      type="text"
                      value={newPageSlug}
                      onChange={(e) => setNewPageSlug(e.target.value)}
                      placeholder="facilities"
                      className="w-full px-3 py-2 rounded-r-lg border border-[#E6EAF3] bg-white text-xs text-[#141A2E]"
                    />
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddPage(false)}
                  className="px-3 py-1.5 text-xs text-[#5B6478] hover:text-[#141A2E]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddCustomPage}
                  className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#2158E0] hover:bg-[#1a4ec4]"
                >
                  Add Page
                </button>
              </div>
            </div>
          )}

          {/* Pages Table / List */}
          <div className="overflow-x-auto border border-[#E6EAF3] rounded-xl">
            <table className="w-full text-left text-xs text-[#141A2E]">
              <thead className="bg-[#F8FAFC] border-b border-[#E6EAF3] text-[11px] font-semibold text-[#5B6478] uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">Order</th>
                  <th className="py-3 px-4">Page Title</th>
                  <th className="py-3 px-4">URL Route</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Reorder</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6EAF3]">
                {pages.map((page, index) => {
                  const isHome = page.slug === "home";

                  return (
                    <tr
                      key={page.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        !page.is_enabled ? "opacity-60 bg-slate-50/40" : ""
                      }`}
                    >
                      {/* Sort Order */}
                      <td className="py-3 px-4 text-center font-mono font-medium text-[#5B6478]">
                        {index + 1}
                      </td>

                      {/* Title */}
                      <td className="py-3 px-4 font-semibold text-[#141A2E]">
                        <div className="flex items-center gap-2">
                          <span>{page.title}</span>
                          {isHome && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-[#2158E0]">
                              LANDING
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Route Slug */}
                      <td className="py-3 px-4 font-mono text-[#5B6478]">
                        /{page.slug === "home" ? "" : page.slug}
                      </td>

                      {/* Page Type */}
                      <td className="py-3 px-4 text-[#5B6478] capitalize">
                        {page.page_type}
                      </td>

                      {/* Enable/Disable Toggle */}
                      <td className="py-3 px-4 text-center">
                        <label className="inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={page.is_enabled}
                            disabled={isHome}
                            onChange={() =>
                              handleTogglePage(page.id, page.is_enabled)
                            }
                            className="sr-only peer"
                          />
                          <div className="relative w-9 h-5 bg-gray-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#2158E0] peer-disabled:opacity-50"></div>
                        </label>
                      </td>

                      {/* Reorder Buttons */}
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            disabled={index === 0}
                            onClick={() => handleMovePageUp(index)}
                            className="p-1 rounded-md text-[#5B6478] hover:text-[#141A2E] hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                            title="Move Up"
                          >
                            <ChevronUp className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            disabled={index === pages.length - 1}
                            onClick={() => handleMovePageDown(index)}
                            className="p-1 rounded-md text-[#5B6478] hover:text-[#141A2E] hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                            title="Move Down"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ==================================================== */}
        {/* SECTION E: Admissions & Parent Portal Entry Point     */}
        {/* ==================================================== */}
        <div className="bg-white rounded-2xl border border-[#E6EAF3] shadow-xs p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-[#141A2E]">
                Online Admissions & Parent Portal Entry Point
              </h2>
              <p className="text-xs text-[#5B6478]">
                Configure digital lead capture and tenant-specific parent login access.
              </p>
            </div>
          </div>

          <div className="space-y-5">
            {/* Feature 1: Online Admissions */}
            <div className="flex items-start justify-between gap-4 p-4 rounded-xl border border-[#E6EAF3] bg-[#F8FAFC]">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#141A2E]">
                    Digital Admissions Enquiry Form
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    Lead Pipeline
                  </span>
                </div>
                <p className="text-xs text-[#5B6478] max-w-2xl leading-relaxed">
                  Embeds a responsive student admissions enquiry widget on your website. Prospective parents can submit student details, preferred grade, and parent contact info directly to your administration desk.
                </p>
              </div>

              <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                <input
                  type="checkbox"
                  checked={admissionEnabled}
                  onChange={(e) => setAdmissionEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#2158E0]"></div>
              </label>
            </div>

            {/* Feature 2: Parent Portal Entry Point */}
            <div className="p-4 rounded-xl border border-[#E6EAF3] bg-[#F8FAFC] space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#141A2E]">
                      Tenant Parent Portal Entry Point
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-[#2158E0]">
                      Tenant-Isolated
                    </span>
                  </div>
                  <p className="text-xs text-[#5B6478] max-w-2xl leading-relaxed">
                    Provides a dedicated &quot;Parent Portal&quot; navigation button on your school website header.
                  </p>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                  <input
                    type="checkbox"
                    checked={parentPortalEnabled}
                    onChange={(e) => setParentPortalEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#2158E0]"></div>
                </label>
              </div>

              {/* Architectural Notice on Parent Auth */}
              <div className="p-3 rounded-lg bg-blue-50/80 border border-blue-100 text-[11px] text-[#141A2E] space-y-1.5">
                <div className="flex items-center gap-1.5 text-[#2158E0] font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Important Multi-Tenant Architecture Note</span>
                </div>
                <p className="text-[#5B6478]">
                  Parent authentication occurs directly on your school&apos;s tenant web address:
                </p>
                <div className="font-mono text-xs text-[#2158E0] font-semibold bg-white p-2 rounded border border-blue-200 flex items-center justify-between">
                  <span>{parentPortalUrl}</span>
                  <button
                    type="button"
                    onClick={() => handleCopyUrl(parentPortalUrl)}
                    className="text-[11px] font-sans text-[#2158E0] hover:underline cursor-pointer"
                  >
                    Copy Link
                  </button>
                </div>
                <p className="text-[#5B6478]">
                  Parents log in using their student&apos;s <strong>Class + Roll Number + Date of Birth</strong>. They never access the central MyZkool administration portal, ensuring strict multi-tenant isolation.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ==================================================== */}
        {/* SECTION F: Publication Mode & Launch Status          */}
        {/* ==================================================== */}
        <div className="bg-white rounded-2xl border border-[#E6EAF3] shadow-xs p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                  published ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-600"
                }`}
              >
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm sm:text-base font-bold text-[#141A2E]">
                    Website Publication State
                  </h2>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      published
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {published ? "PUBLISHED & LIVE" : "DRAFT MODE (NOT PUBLISHED)"}
                  </span>
                </div>
                <p className="text-xs text-[#5B6478]">
                  {published
                    ? "Your website is live and publicly accessible on your school subdomain."
                    : "Your website is currently in draft mode. Only school administrators can view it."}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-[#141A2E]">
                {published ? "Live Online" : "Draft Setup Ready"}
              </span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={published}
                  onChange={(e) => setPublished(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-12 h-6 bg-gray-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* ==================================================== */}
        {/* SECTION G: Live Interactive Website Preview          */}
        {/* ==================================================== */}
        <div className="bg-white rounded-2xl border border-[#E6EAF3] shadow-xs p-6">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-[#2158E0]" />
              <h2 className="text-xs sm:text-sm font-bold text-[#141A2E]">
                Real-Time Public Website Preview
              </h2>
            </div>

            <div className="flex items-center gap-1 bg-[#F1F5F9] p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setPreviewDevice("desktop")}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors ${
                  previewDevice === "desktop"
                    ? "bg-white text-[#141A2E] shadow-xs font-semibold"
                    : "text-[#5B6478] hover:text-[#141A2E]"
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>Desktop</span>
              </button>
              <button
                type="button"
                onClick={() => setPreviewDevice("mobile")}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors ${
                  previewDevice === "mobile"
                    ? "bg-white text-[#141A2E] shadow-xs font-semibold"
                    : "text-[#5B6478] hover:text-[#141A2E]"
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Mobile</span>
              </button>
            </div>
          </div>

          {/* Device Mockup Shell */}
          <div className="flex justify-center bg-[#F8FAFC] p-4 sm:p-6 rounded-xl border border-[#E6EAF3]">
            <div
              className={`transition-all duration-300 bg-white rounded-xl shadow-md border border-[#E2E8F0] overflow-hidden ${
                previewDevice === "mobile"
                  ? "w-full max-w-sm"
                  : "w-full max-w-4xl"
              }`}
            >
              {/* Browser Header Bar */}
              <div className="bg-[#1E293B] text-white px-4 py-2 flex items-center gap-2 text-[11px]">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                </div>
                <div className="flex-1 text-center font-mono text-[10px] text-slate-300 bg-[#0F172A] py-1 px-3 rounded truncate">
                  {publicWebsiteUrl}
                </div>
              </div>

              {/* School Website Top Bar */}
              <div
                className="px-4 py-3 text-white transition-colors flex items-center justify-between flex-wrap gap-2"
                style={{ backgroundColor: primaryColor }}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center font-bold text-xs">
                    {siteName ? siteName.charAt(0) : "S"}
                  </div>
                  <div>
                    <h3 className="font-bold text-xs sm:text-sm tracking-tight leading-none">
                      {siteName || "School Name"}
                    </h3>
                    <p className="text-[10px] text-white/80 font-light truncate max-w-[200px]">
                      {tagline}
                    </p>
                  </div>
                </div>

                {/* Navigation links (enabled pages only) */}
                <div className="flex items-center gap-3 text-xs">
                  {previewDevice === "desktop" && (
                    <div className="hidden sm:flex items-center gap-3 text-[11px] font-medium text-white/90">
                      {pages
                        .filter((p) => p.is_enabled)
                        .slice(0, 5)
                        .map((p) => (
                          <span key={p.id} className="hover:underline cursor-pointer">
                            {p.title}
                          </span>
                        ))}
                    </div>
                  )}

                  {parentPortalEnabled && (
                    <span className="text-[10px] bg-white/20 hover:bg-white/30 px-2.5 py-1 rounded-full font-medium">
                      Parent Portal
                    </span>
                  )}
                  {admissionEnabled && (
                    <span
                      className="text-[10px] px-2.5 py-1 rounded-full font-bold shadow-xs text-white"
                      style={{ backgroundColor: accentColor }}
                    >
                      Apply Now
                    </span>
                  )}
                </div>
              </div>

              {/* Hero Banner Showcase */}
              <div
                className="p-6 sm:p-10 text-white text-center"
                style={{ backgroundColor: secondaryColor }}
              >
                <span
                  className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider mb-2"
                  style={{ backgroundColor: accentColor }}
                >
                  {admissionEnabled ? "Admissions Open 2026–27" : "Academic Session 2026–27"}
                </span>
                <h2 className="text-base sm:text-xl font-extrabold mb-1">
                  {siteName || "Your School Name"}
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 max-w-lg mx-auto font-light mb-4">
                  {tagline}
                </p>
                {admissionEnabled && (
                  <button
                    type="button"
                    className="px-4 py-2 rounded-full text-xs font-semibold text-white shadow-xs cursor-default"
                    style={{ backgroundColor: primaryColor }}
                  >
                    Enquire for Admission →
                  </button>
                )}
              </div>

              {/* About Section */}
              <div className="p-5 sm:p-8 bg-white">
                <h4
                  className="text-xs font-bold uppercase tracking-wider mb-2"
                  style={{ color: primaryColor }}
                >
                  Welcome to Our Institution
                </h4>
                <p className="text-xs text-[#5B6478] leading-relaxed line-clamp-3">
                  {aboutText}
                </p>
              </div>

              {/* Website Footer Preview */}
              <div className="px-5 py-4 bg-[#0F172A] text-slate-400 text-[11px] flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-slate-800">
                <div className="flex items-center gap-2">
                  <MapPin className="w-3 h-3 text-slate-400" />
                  <span>
                    {city || "City"}, {state || "State"} {postalCode ? `– ${postalCode}` : ""}
                  </span>
                </div>
                <div>
                  {contactPhone && <span>Tel: {contactPhone}</span>}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ==================================================== */}
        {/* Navigation & Action Bar                              */}
        {/* ==================================================== */}
        <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-4 pt-4 border-t border-[#E6EAF3]">
          <Link
            to="/onboarding/subscription"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-semibold text-[#5B6478] hover:text-[#141A2E] hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Step 5 (Subscription)</span>
          </Link>

          <button
            type="submit"
            id="continue-to-staff-btn"
            disabled={isSubmitting}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3 text-xs sm:text-sm font-semibold text-white bg-[#2158E0] hover:bg-[#1a4ec4] disabled:bg-[#94A3B8] rounded-full transition-all shadow-sm cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving Website Configuration...</span>
              </>
            ) : (
              <>
                <span>Save & Continue to Staff Setup</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </OnboardingLayout>
  );
}
