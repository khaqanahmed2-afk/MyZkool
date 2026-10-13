import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { OnboardingLayout } from "../../components/onboarding/OnboardingLayout";
import { getSchoolForCurrentUser } from "../../services/schoolService";
import {
  initializeSchoolWebsite,
  updateSchoolWebsite,
  saveWebsiteSetupProgress,
  getHomePageContent,
  saveHomePageContent,
  getDefaultHomePageContent,
} from "../../services/websiteService";
import type { School } from "../../types/school";
import {
  type SchoolWebsite,
  type WebsiteColorPreset,
  type HomePageContent,
  type FacilityItem,
  type GalleryImageItem,
  type StatItem,
  type WebsiteSectionToggle,
  WEBSITE_COLOR_PRESETS,
} from "../../types/website";
import {
  WebsiteBuilderSidebar,
  type WebsiteBuilderTab,
} from "../../components/onboarding/website/WebsiteBuilderSidebar";
import { ImageUploadField } from "../../components/onboarding/website/ImageUploadField";
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Building2,
  Globe,
  Palette,
  Eye,
  Info,
  Save,
  Plus,
  Trash2,
  Copy,
  Check,
  ChevronUp,
  ChevronDown,
  Facebook,
  Twitter,
  Instagram,
  Youtube,
  Linkedin,
  MapPin,
  Phone,
  Mail,
  ShieldCheck,
  Sparkles,
  ExternalLink,
} from "lucide-react";

export default function WebsiteSetup() {
  const { user, profile, refreshSession } = useAuth();
  const navigate = useNavigate();

  // Core state
  const [school, setSchool] = useState<School | null>(null);
  const [website, setWebsite] = useState<SchoolWebsite | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSavingDraft, setIsSavingDraft] = useState<boolean>(false);
  const [isDraftSaved, setIsDraftSaved] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [missingSchoolError, setMissingSchoolError] = useState(false);

  // Active builder navigation tab
  const [activeTab, setActiveTab] = useState<WebsiteBuilderTab>("identity");

  // Form Fields - Identity & Branding
  const [siteName, setSiteName] = useState<string>("");
  const [tagline, setTagline] = useState<string>("");
  const [logoUrl, setLogoUrl] = useState<string>("");
  const [aboutText, setAboutText] = useState<string>("");

  // Form Fields - Color Themes
  const [primaryColor, setPrimaryColor] = useState<string>("#2158E0");
  const [secondaryColor, setSecondaryColor] = useState<string>("#141A2E");
  const [accentColor, setAccentColor] = useState<string>("#10B981");

  // Form Fields - Rich Home Page Content
  const [homeContent, setHomeContent] = useState<HomePageContent>(() =>
    getDefaultHomePageContent()
  );

  // Copy subdomain link state
  const [subdomainCopied, setSubdomainCopied] = useState(false);

  // Facility adder modal / inline state
  const [newFacilityTitle, setNewFacilityTitle] = useState("");
  const [newFacilityDesc, setNewFacilityDesc] = useState("");

  // Redirect if already completed onboarding
  useEffect(() => {
    if (profile?.onboarding_completed) {
      navigate("/admin", { replace: true });
    }
  }, [profile?.onboarding_completed, navigate]);

  // Load School & Initialize Website Record
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      if (!user) return;
      setIsLoading(true);

      try {
        const { school: loadedSchool } = await getSchoolForCurrentUser(
          user.id,
          profile?.school_id
        );

        if (!isMounted) return;

        if (!loadedSchool) {
          setMissingSchoolError(true);
          setIsLoading(false);
          return;
        }

        setSchool(loadedSchool);

        const initResult = await initializeSchoolWebsite({
          school: loadedSchool,
          userId: user.id,
          userRole: profile?.role || "school_admin",
        });

        if (!isMounted) return;

        if (initResult.website) {
          const web = initResult.website;
          setWebsite(web);
          setSiteName(web.site_name || loadedSchool.name || "");
          setTagline(web.tagline || "");
          setLogoUrl(web.logo_url || loadedSchool.logo_url || "");
          setAboutText(web.about_text || "");
          setPrimaryColor(web.primary_color || "#2158E0");
          setSecondaryColor(web.secondary_color || "#141A2E");
          setAccentColor(web.accent_color || "#10B981");

          // Load rich home page content
          const richContent = await getHomePageContent(web.id, loadedSchool);
          if (isMounted) {
            setHomeContent(richContent);
          }
        } else {
          setSiteName(loadedSchool.name || "");
          setHomeContent(getDefaultHomePageContent(loadedSchool));
        }
      } catch (err) {
        console.warn("Error loading website setup:", err);
        if (isMounted) setError("Failed to load school website settings.");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [user, profile?.school_id, profile?.role]);

  // Mark draft as dirty on edit
  const markDirty = () => {
    if (isDraftSaved) setIsDraftSaved(false);
  };

  const handleSelectPreset = (preset: WebsiteColorPreset) => {
    setPrimaryColor(preset.primary);
    setSecondaryColor(preset.secondary);
    setAccentColor(preset.accent);
    markDirty();
  };

  const handleCopySubdomain = () => {
    if (!school) return;
    navigator.clipboard.writeText(`https://${school.subdomain}.myzkool.com`);
    setSubdomainCopied(true);
    setTimeout(() => setSubdomainCopied(false), 2500);
  };

  // Section toggle handler
  const handleToggleSection = (key: string) => {
    setHomeContent((prev) => ({
      ...prev,
      sections: prev.sections.map((sec) =>
        sec.key === key && sec.canDisable !== false
          ? { ...sec, isEnabled: !sec.isEnabled }
          : sec
      ),
    }));
    markDirty();
  };

  // Section reorder handler
  const handleMoveSection = (index: number, direction: "up" | "down") => {
    setHomeContent((prev) => {
      const list = [...prev.sections];
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= list.length) return prev;
      const temp = list[index];
      list[index] = list[targetIndex];
      list[targetIndex] = temp;
      return { ...prev, sections: list };
    });
    markDirty();
  };

  // Facility management
  const handleAddFacility = () => {
    if (!newFacilityTitle.trim()) return;
    const newFacility: FacilityItem = {
      id: `fac-${Date.now()}`,
      title: newFacilityTitle.trim(),
      description: newFacilityDesc.trim() || "Modern campus amenity.",
      imageUrl: "",
    };
    setHomeContent((prev) => ({
      ...prev,
      facilities: [...prev.facilities, newFacility],
    }));
    setNewFacilityTitle("");
    setNewFacilityDesc("");
    markDirty();
  };

  const handleRemoveFacility = (id: string) => {
    setHomeContent((prev) => ({
      ...prev,
      facilities: prev.facilities.filter((f) => f.id !== id),
    }));
    markDirty();
  };

  // Gallery management
  const handleAddGalleryImage = (url: string) => {
    if (!url) return;
    const newImg: GalleryImageItem = {
      id: `img-${Date.now()}`,
      imageUrl: url,
      title: "Campus Photo",
      category: "Campus",
    };
    setHomeContent((prev) => ({
      ...prev,
      gallery: [...prev.gallery, newImg],
    }));
    markDirty();
  };

  const handleRemoveGalleryImage = (id: string) => {
    setHomeContent((prev) => ({
      ...prev,
      gallery: prev.gallery.filter((img) => img.id !== id),
    }));
    markDirty();
  };

  // Stat update
  const handleUpdateStat = (id: string, field: "label" | "value", val: string) => {
    setHomeContent((prev) => ({
      ...prev,
      stats: prev.stats.map((s) => (s.id === id ? { ...s, [field]: val } : s)),
    }));
    markDirty();
  };

  // Save Draft (does not advance onboarding step)
  const handleSaveDraft = useCallback(async () => {
    if (!school || !website) return;
    setIsSavingDraft(true);
    setError(null);

    try {
      // 1. Update basic website metadata
      await updateSchoolWebsite({
        schoolId: school.id,
        websiteId: website.id,
        input: {
          site_name: siteName.trim() || school.name,
          tagline: tagline.trim() || undefined,
          logo_url: logoUrl || undefined,
          about_text: aboutText.trim() || undefined,
          primary_color: primaryColor,
          secondary_color: secondaryColor,
          accent_color: accentColor,
        },
        userRole: profile?.role || "school_admin",
      });

      // 2. Save rich home page content
      await saveHomePageContent({
        schoolId: school.id,
        websiteId: website.id,
        content: homeContent,
        userRole: profile?.role || "school_admin",
      });

      setIsDraftSaved(true);
      setSuccessMsg("Draft configuration saved successfully.");
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save draft";
      setError(msg);
    } finally {
      setIsSavingDraft(false);
    }
  }, [
    school,
    website,
    siteName,
    tagline,
    logoUrl,
    aboutText,
    primaryColor,
    secondaryColor,
    accentColor,
    homeContent,
    profile?.role,
  ]);

  // Final Submit & Continue to Step 6: Launch
  const handleSubmitAndContinue = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!siteName.trim()) {
      setError("Website display name is required.");
      setActiveTab("identity");
      return;
    }
    if (!school || !website || !user) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // 1. Update website settings
      const updateRes = await updateSchoolWebsite({
        schoolId: school.id,
        websiteId: website.id,
        input: {
          site_name: siteName.trim(),
          tagline: tagline.trim() || undefined,
          logo_url: logoUrl || undefined,
          about_text: aboutText.trim() || undefined,
          primary_color: primaryColor,
          secondary_color: secondaryColor,
          accent_color: accentColor,
          contact_email: website.contact_email || school.official_email || undefined,
          contact_phone: website.contact_phone || school.contact_phone || undefined,
          address: website.address || school.address || undefined,
          city: website.city || school.city || undefined,
          state: website.state || school.state || undefined,
          postal_code: website.postal_code || school.pin_code || undefined,
          admission_enabled: true,
          parent_portal_enabled: true,
          published: false, // Remains draft until Step 6 Launch
        },
        userRole: profile?.role || "school_admin",
      });

      if (!updateRes.success) {
        setError(updateRes.error || "Failed to update website settings.");
        setIsSubmitting(false);
        return;
      }

      // 2. Save structured home page content
      await saveHomePageContent({
        schoolId: school.id,
        websiteId: website.id,
        content: homeContent,
        userRole: profile?.role || "school_admin",
      });

      // 3. Advance onboarding step to 6 (Launch)
      await saveWebsiteSetupProgress({
        schoolId: school.id,
        userId: user.id,
      });

      await refreshSession();
      navigate("/onboarding/complete");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred.";
      setError(message);
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <OnboardingLayout
        currentStepNumber={5}
        completedStepNumbers={[1, 2, 3, 4]}
        title="Set up your school website"
        subtitle="Configure your official school website, leadership details, and public portal."
      >
        <div className="py-20 text-center space-y-3">
          <div className="w-8 h-8 border-2 border-[#2158E0] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-medium text-[#141A2E]">
            Loading school website builder...
          </p>
        </div>
      </OnboardingLayout>
    );
  }

  if (missingSchoolError || !school) {
    return (
      <OnboardingLayout
        currentStepNumber={5}
        completedStepNumbers={[]}
        title="Set up your school website"
        subtitle="Configure your official school website, leadership details, and public portal."
      >
        <div className="p-6 rounded-2xl bg-amber-50/80 border border-amber-200 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 mx-auto flex items-center justify-center">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-amber-900">
              School profile incomplete
            </h2>
            <p className="text-xs text-amber-700 mt-1 max-w-md mx-auto">
              Before configuring your website, your school profile must be completed in Step 1.
            </p>
          </div>
          <Link
            to="/onboarding/school"
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-[#2158E0] hover:bg-[#1a4ec4] rounded-full transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Go to Step 1: School profile
          </Link>
        </div>
      </OnboardingLayout>
    );
  }

  return (
    <OnboardingLayout
      currentStepNumber={5}
      completedStepNumbers={[1, 2, 3, 4]}
      title="Build your school website"
      subtitle="Customize identity, branding, leadership message, and open your live public school portal in a separate tab."
      maxWidth="max-w-6xl"
      showCardWrapper={false}
      onSaveAndExit={handleSaveDraft}
      isSavingAndExiting={isSavingDraft}
    >
      <div className="space-y-6">
        {/* Alerts */}
        {error && (
          <div
            role="alert"
            className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3 text-xs text-red-700"
          >
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Action required</span>
              <p className="mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2.5 text-xs text-emerald-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Clean Two-Column Layout (Left Progress/Section Sidebar, Main Spacious Form) */}
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* Left: Compact Onboarding & Section Navigation Sidebar */}
          <WebsiteBuilderSidebar
            currentTab={activeTab}
            onTabChange={(tab) => setActiveTab(tab)}
            isDraftSaved={isDraftSaved}
            isSavingDraft={isSavingDraft}
            onSaveDraft={handleSaveDraft}
            schoolSubdomain={school.subdomain}
          />

          {/* Right: Main Spacious Website Configuration Dashboard */}
          <main className="flex-1 min-w-0 w-full space-y-6">
            {/* Live Website Link Action Card */}
            <div className="bg-white rounded-2xl border border-[#E6EAF3] p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#94A3B8]">
                    Official School Website URL
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      website?.published
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-amber-50 text-amber-700 border border-amber-200"
                    }`}
                  >
                    {website?.published ? "Published & Live" : "Draft (Unpublished)"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-[#2158E0] shrink-0" />
                  <span className="text-sm font-semibold font-mono text-[#141A2E] truncate">
                    https://{school.subdomain}.myzkool.com
                  </span>
                </div>
                <p className="text-[11px] text-[#5B6478]">
                  {website?.published
                    ? "Your school website is published and accessible to parents worldwide."
                    : "Opens your live draft website in a new tab. Publish live in Step 6 (Launch)."}
                </p>
              </div>

              <div className="flex items-center gap-2.5 w-full md:w-auto shrink-0">
                {/* Open Website Button (Opens actual website in a new tab) */}
                <a
                  href={`/s/${school.subdomain}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  id="open-website-btn"
                  className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#2158E0] hover:bg-[#1a4ec4] text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                  title="Open live school website in a new tab"
                >
                  <span>Open Website</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>

                {/* Copy Website URL Button */}
                <button
                  type="button"
                  onClick={handleCopySubdomain}
                  id="copy-website-url-btn"
                  className="flex-1 md:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#E6EAF3] bg-white hover:bg-slate-50 text-xs font-semibold text-[#141A2E] transition-colors cursor-pointer"
                  title="Copy public URL to clipboard"
                >
                  {subdomainCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-[#5B6478]" />
                      <span>Copy URL</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Tab 1: Identity & Name */}
            {activeTab === "identity" && (
              <div className="bg-white rounded-2xl border border-[#E6EAF3] p-6 sm:p-8 space-y-6 shadow-xs">
                <div className="border-b border-[#F1F5F9] pb-4">
                  <h2 className="text-base sm:text-lg font-bold text-[#141A2E] flex items-center gap-2">
                    <Globe className="w-4 h-4 text-[#2158E0]" />
                    School Identity & URL
                  </h2>
                  <p className="text-xs text-[#5B6478] mt-1">
                    Configure your school display name, official logo, and subdomain link.
                  </p>
                </div>

                {/* Display Name */}
                <div>
                  <label
                    htmlFor="site-name-input"
                    className="block text-xs font-semibold text-[#141A2E] mb-1.5"
                  >
                    School website display name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="site-name-input"
                    type="text"
                    required
                    value={siteName}
                    onChange={(e) => {
                      setSiteName(e.target.value);
                      markDirty();
                    }}
                    placeholder="e.g. Greenwood International Academy"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E6EAF3] bg-white text-sm text-[#141A2E] placeholder-[#94A3B8] hover:border-[#D1D5DB] focus:border-[#2158E0] focus:ring-2 focus:ring-[#2158E0]/15 focus:outline-hidden"
                  />
                  <p className="text-[11px] text-[#94A3B8] mt-1">
                    Displays in the top navigation header, hero banner, search engine titles, and footer.
                  </p>
                </div>

                {/* Subdomain URL with Copy Button */}
                <div>
                  <label className="block text-xs font-semibold text-[#141A2E] mb-1.5">
                    Assigned school subdomain
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 flex items-center px-3.5 py-2.5 rounded-xl border border-[#E6EAF3] bg-slate-50 text-sm font-mono text-[#141A2E]">
                      <span className="text-[#94A3B8]">https://</span>
                      <span className="font-semibold text-[#2158E0]">{school.subdomain}</span>
                      <span className="text-[#94A3B8]">.myzkool.com</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopySubdomain}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#E6EAF3] bg-white hover:bg-slate-50 text-xs font-semibold text-[#141A2E] transition-colors cursor-pointer shrink-0"
                    >
                      {subdomainCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-700">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-[#5B6478]" />
                          <span>Copy link</span>
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-[11px] text-[#94A3B8] mt-1">
                    Assigned from School Profile. Custom domain mapping (e.g. www.myschool.edu.in) is available after launch.
                  </p>
                </div>

                {/* Logo Upload */}
                <ImageUploadField
                  label="Official school logo"
                  description="Displays in the website header, favicon, and formal document footers."
                  value={logoUrl}
                  schoolId={school.id}
                  category="logo"
                  aspectRatioHint="Square 1:1 or 4:3, up to 5MB"
                  onChange={(url) => {
                    setLogoUrl(url);
                    markDirty();
                  }}
                  onRemove={() => {
                    setLogoUrl("");
                    markDirty();
                  }}
                />

                {/* Tagline */}
                <div>
                  <label
                    htmlFor="tagline-input"
                    className="block text-xs font-semibold text-[#141A2E] mb-1.5"
                  >
                    School tagline or motto
                  </label>
                  <input
                    id="tagline-input"
                    type="text"
                    value={tagline}
                    onChange={(e) => {
                      setTagline(e.target.value);
                      markDirty();
                    }}
                    placeholder="e.g. Nurturing today. Leading tomorrow."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E6EAF3] bg-white text-sm text-[#141A2E] placeholder-[#94A3B8] hover:border-[#D1D5DB] focus:border-[#2158E0] focus:ring-2 focus:ring-[#2158E0]/15 focus:outline-hidden"
                  />
                </div>

                {/* About School with Character Counter */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      htmlFor="about-text-input"
                      className="block text-xs font-semibold text-[#141A2E]"
                    >
                      About the school
                    </label>
                    <span className="text-[11px] text-[#94A3B8]">
                      {aboutText.length} / 500 characters
                    </span>
                  </div>
                  <textarea
                    id="about-text-input"
                    rows={4}
                    maxLength={500}
                    value={aboutText}
                    onChange={(e) => {
                      setAboutText(e.target.value);
                      markDirty();
                    }}
                    placeholder="Share a brief overview of your school's vision, philosophy, and history to welcome parents..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E6EAF3] bg-white text-sm text-[#141A2E] placeholder-[#94A3B8] hover:border-[#D1D5DB] focus:border-[#2158E0] focus:ring-2 focus:ring-[#2158E0]/15 focus:outline-hidden resize-none"
                  />
                </div>
              </div>
            )}

            {/* Tab 2: Theme Customization */}
            {activeTab === "theme" && (
              <div className="bg-white rounded-2xl border border-[#E6EAF3] p-6 sm:p-8 space-y-6 shadow-xs">
                <div className="border-b border-[#F1F5F9] pb-4">
                  <h2 className="text-base sm:text-lg font-bold text-[#141A2E] flex items-center gap-2">
                    <Palette className="w-4 h-4 text-[#2158E0]" />
                    Brand Color Theme
                  </h2>
                  <p className="text-xs text-[#5B6478] mt-1">
                    Select a curated academic color palette designed for Indian educational institutions.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {WEBSITE_COLOR_PRESETS.map((preset) => {
                    const isSelected =
                      primaryColor.toLowerCase() === preset.primary.toLowerCase() &&
                      secondaryColor.toLowerCase() === preset.secondary.toLowerCase();

                    return (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => handleSelectPreset(preset)}
                        className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? "border-[#2158E0] bg-blue-50/40 ring-2 ring-[#2158E0]/20 shadow-xs"
                            : "border-[#E6EAF3] bg-white hover:border-[#CBD5E1]"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-[#141A2E]">
                            {preset.name}
                          </span>
                          {isSelected && (
                            <CheckCircle2 className="w-4 h-4 text-[#2158E0]" />
                          )}
                        </div>

                        <div className="flex items-center gap-2 mb-2">
                          <div
                            className="w-7 h-7 rounded-lg border border-black/10 shadow-2xs"
                            style={{ backgroundColor: preset.primary }}
                            title={`Primary: ${preset.primary}`}
                          />
                          <div
                            className="w-7 h-7 rounded-lg border border-black/10 shadow-2xs"
                            style={{ backgroundColor: preset.secondary }}
                            title={`Secondary: ${preset.secondary}`}
                          />
                          <div
                            className="w-7 h-7 rounded-lg border border-black/10 shadow-2xs"
                            style={{ backgroundColor: preset.accent }}
                            title={`Accent: ${preset.accent}`}
                          />
                        </div>

                        <p className="text-[11px] text-[#5B6478] leading-relaxed">
                          {preset.description}
                        </p>
                      </button>
                    );
                  })}
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-[#5B6478]">
                  <span>Active Palette Tokens:</span>
                  <div className="flex items-center gap-4 font-mono text-[11px]">
                    <span className="flex items-center gap-1.5">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: primaryColor }}
                      />
                      Primary: {primaryColor}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: secondaryColor }}
                      />
                      Secondary: {secondaryColor}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: accentColor }}
                      />
                      Accent: {accentColor}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: Hero & Principal Leadership */}
            {activeTab === "hero_principal" && (
              <div className="bg-white rounded-2xl border border-[#E6EAF3] p-6 sm:p-8 space-y-6 shadow-xs">
                <div className="border-b border-[#F1F5F9] pb-4">
                  <h2 className="text-base sm:text-lg font-bold text-[#141A2E] flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#2158E0]" />
                    Hero Banner & Leadership Message
                  </h2>
                  <p className="text-xs text-[#5B6478] mt-1">
                    First impressions for prospective parents and students exploring your academy.
                  </p>
                </div>

                {/* Hero Section Fields */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#5B6478]">
                    Homepage Hero Banner
                  </h3>

                  <div>
                    <label
                      htmlFor="hero-headline-input"
                      className="block text-xs font-semibold text-[#141A2E] mb-1.5"
                    >
                      Hero Headline
                    </label>
                    <input
                      id="hero-headline-input"
                      type="text"
                      value={homeContent.hero?.headline || ""}
                      onChange={(e) => {
                        setHomeContent((prev) => ({
                          ...prev,
                          hero: { ...prev.hero, headline: e.target.value },
                        }));
                        markDirty();
                      }}
                      placeholder={`Welcome to ${school.name}`}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#E6EAF3] bg-white text-sm text-[#141A2E] placeholder-[#94A3B8] hover:border-[#D1D5DB] focus:border-[#2158E0] focus:ring-2 focus:ring-[#2158E0]/15 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="hero-desc-input"
                      className="block text-xs font-semibold text-[#141A2E] mb-1.5"
                    >
                      Hero Description / Subtext
                    </label>
                    <textarea
                      id="hero-desc-input"
                      rows={3}
                      value={homeContent.hero?.description || ""}
                      onChange={(e) => {
                        setHomeContent((prev) => ({
                          ...prev,
                          hero: { ...prev.hero, description: e.target.value },
                        }));
                        markDirty();
                      }}
                      placeholder="A caring school where every child learns with curiosity, builds confidence, and grows into a capable person."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#E6EAF3] bg-white text-sm text-[#141A2E] placeholder-[#94A3B8] hover:border-[#D1D5DB] focus:border-[#2158E0] focus:ring-2 focus:ring-[#2158E0]/15 focus:outline-hidden resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="hero-cta-input"
                        className="block text-xs font-semibold text-[#141A2E] mb-1.5"
                      >
                        Hero Button CTA Text
                      </label>
                      <input
                        id="hero-cta-input"
                        type="text"
                        value={homeContent.hero?.ctaText || "Apply for Admission"}
                        onChange={(e) => {
                          setHomeContent((prev) => ({
                            ...prev,
                            hero: { ...prev.hero, ctaText: e.target.value },
                          }));
                          markDirty();
                        }}
                        placeholder="Apply for Admission"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#E6EAF3] bg-white text-sm text-[#141A2E] placeholder-[#94A3B8] hover:border-[#D1D5DB] focus:border-[#2158E0] focus:ring-2 focus:ring-[#2158E0]/15 focus:outline-hidden"
                      />
                    </div>

                    <ImageUploadField
                      label="Hero Background Photo"
                      description="School building or campus photograph."
                      value={homeContent.hero?.backgroundImageUrl || ""}
                      schoolId={school.id}
                      category="hero"
                      aspectRatioHint="16:9 widescreen, max 5MB"
                      onChange={(url) => {
                        setHomeContent((prev) => ({
                          ...prev,
                          hero: { ...prev.hero, backgroundImageUrl: url },
                        }));
                        markDirty();
                      }}
                      onRemove={() => {
                        setHomeContent((prev) => ({
                          ...prev,
                          hero: { ...prev.hero, backgroundImageUrl: "" },
                        }));
                        markDirty();
                      }}
                    />
                  </div>
                </div>

                {/* Principal Welcome Section Fields */}
                <div className="pt-4 border-t border-[#F1F5F9] space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#5B6478]">
                    Principal's Welcome Note
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="principal-name-input"
                        className="block text-xs font-semibold text-[#141A2E] mb-1.5"
                      >
                        Principal / Director Name
                      </label>
                      <input
                        id="principal-name-input"
                        type="text"
                        value={homeContent.principal?.name || ""}
                        onChange={(e) => {
                          setHomeContent((prev) => ({
                            ...prev,
                            principal: { ...prev.principal, name: e.target.value },
                          }));
                          markDirty();
                        }}
                        placeholder="e.g. Dr. A. Sharma"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#E6EAF3] bg-white text-sm text-[#141A2E] placeholder-[#94A3B8] hover:border-[#D1D5DB] focus:border-[#2158E0] focus:ring-2 focus:ring-[#2158E0]/15 focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="principal-title-input"
                        className="block text-xs font-semibold text-[#141A2E] mb-1.5"
                      >
                        Designation Title
                      </label>
                      <input
                        id="principal-title-input"
                        type="text"
                        value={homeContent.principal?.title || ""}
                        onChange={(e) => {
                          setHomeContent((prev) => ({
                            ...prev,
                            principal: { ...prev.principal, title: e.target.value },
                          }));
                          markDirty();
                        }}
                        placeholder="Principal & Head of School"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#E6EAF3] bg-white text-sm text-[#141A2E] placeholder-[#94A3B8] hover:border-[#D1D5DB] focus:border-[#2158E0] focus:ring-2 focus:ring-[#2158E0]/15 focus:outline-hidden"
                      />
                    </div>
                  </div>

                  <ImageUploadField
                    label="Principal Portrait Photo"
                    description="Professional portrait for trust and leadership presence."
                    value={homeContent.principal?.photoUrl || ""}
                    schoolId={school.id}
                    category="principal"
                    aspectRatioHint="Square 1:1 or portrait 3:4, max 5MB"
                    onChange={(url) => {
                      setHomeContent((prev) => ({
                        ...prev,
                        principal: { ...prev.principal, photoUrl: url },
                      }));
                      markDirty();
                    }}
                    onRemove={() => {
                      setHomeContent((prev) => ({
                        ...prev,
                        principal: { ...prev.principal, photoUrl: "" },
                      }));
                      markDirty();
                    }}
                  />

                  <div>
                    <label
                      htmlFor="principal-msg-input"
                      className="block text-xs font-semibold text-[#141A2E] mb-1.5"
                    >
                      Principal's Message
                    </label>
                    <textarea
                      id="principal-msg-input"
                      rows={3}
                      value={homeContent.principal?.message || ""}
                      onChange={(e) => {
                        setHomeContent((prev) => ({
                          ...prev,
                          principal: { ...prev.principal, message: e.target.value },
                        }));
                        markDirty();
                      }}
                      placeholder="At our academy, we foster a dynamic culture of curiosity and moral discipline..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#E6EAF3] bg-white text-sm text-[#141A2E] placeholder-[#94A3B8] hover:border-[#D1D5DB] focus:border-[#2158E0] focus:ring-2 focus:ring-[#2158E0]/15 focus:outline-hidden resize-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Tab 4: Campus Facilities & Gallery */}
            {activeTab === "facilities_gallery" && (
              <div className="bg-white rounded-2xl border border-[#E6EAF3] p-6 sm:p-8 space-y-6 shadow-xs">
                <div className="border-b border-[#F1F5F9] pb-4">
                  <h2 className="text-base sm:text-lg font-bold text-[#141A2E] flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-[#2158E0]" />
                    Campus Facilities & Photo Gallery
                  </h2>
                  <p className="text-xs text-[#5B6478] mt-1">
                    Showcase your school infrastructure, science laboratories, smart classrooms, and activity photos.
                  </p>
                </div>

                {/* Facilities List & Add */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#5B6478]">
                      Campus Facilities ({homeContent.facilities.length})
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {homeContent.facilities.map((fac) => (
                      <div
                        key={fac.id}
                        className="p-3.5 rounded-xl border border-[#E6EAF3] bg-slate-50 flex items-start justify-between gap-3"
                      >
                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs font-bold text-[#141A2E]">
                            {fac.title}
                          </h4>
                          <p className="text-[11px] text-[#5B6478] line-clamp-2 mt-0.5">
                            {fac.description}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveFacility(fac.id)}
                          className="p-1.5 rounded-lg border border-[#E2E8F0] hover:bg-red-50 text-[#94A3B8] hover:text-red-600 transition-colors cursor-pointer shrink-0"
                          title="Remove facility"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Add New Facility Input */}
                  <div className="p-4 rounded-xl border border-dashed border-[#CBD5E1] bg-white space-y-3">
                    <span className="text-xs font-bold text-[#141A2E]">Add a campus amenity</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        type="text"
                        value={newFacilityTitle}
                        onChange={(e) => setNewFacilityTitle(e.target.value)}
                        placeholder="Amenity title (e.g. Robotics & AI Lab)"
                        className="px-3.5 py-2.5 rounded-xl border border-[#E6EAF3] text-xs text-[#141A2E] focus:border-[#2158E0] focus:outline-hidden"
                      />
                      <input
                        type="text"
                        value={newFacilityDesc}
                        onChange={(e) => setNewFacilityDesc(e.target.value)}
                        placeholder="Short description"
                        className="px-3.5 py-2.5 rounded-xl border border-[#E6EAF3] text-xs text-[#141A2E] focus:border-[#2158E0] focus:outline-hidden"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleAddFacility}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2158E0] hover:bg-[#1a4ec4] text-white text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Facility</span>
                    </button>
                  </div>
                </div>

                {/* Photo Gallery */}
                <div className="pt-4 border-t border-[#F1F5F9] space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#5B6478]">
                      Photo Gallery ({homeContent.gallery.length} photos)
                    </h3>
                  </div>

                  {homeContent.gallery.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {homeContent.gallery.map((img) => (
                        <div
                          key={img.id}
                          className="relative group rounded-xl overflow-hidden aspect-square border border-[#E2E8F0] bg-slate-100 shadow-2xs"
                        >
                          <img
                            src={img.imageUrl}
                            alt={img.title || "Gallery"}
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveGalleryImage(img.id)}
                            className="absolute top-1.5 right-1.5 p-1 rounded-md bg-black/60 hover:bg-red-600 text-white transition-colors cursor-pointer"
                            title="Delete photo"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <ImageUploadField
                    label="Upload gallery photo"
                    description="Upload campus pictures, annual sports day, laboratory experiments, or cultural meet."
                    value=""
                    schoolId={school.id}
                    category="gallery"
                    aspectRatioHint="Landscape 4:3 or 16:9, max 5MB"
                    onChange={handleAddGalleryImage}
                  />
                </div>

                {/* Key Stats Bar */}
                <div className="pt-4 border-t border-[#F1F5F9] space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#5B6478]">
                    Key Institutional Highlights / Stats
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {homeContent.stats.map((st) => (
                      <div
                        key={st.id}
                        className="p-3.5 rounded-xl border border-[#E6EAF3] bg-slate-50 flex items-center gap-3"
                      >
                        <div className="w-28">
                          <input
                            type="text"
                            value={st.value}
                            onChange={(e) =>
                              handleUpdateStat(st.id, "value", e.target.value)
                            }
                            className="w-full font-bold text-sm text-[#2158E0] bg-white border border-[#CBD5E1] rounded-lg px-2.5 py-1.5"
                          />
                        </div>
                        <div className="flex-1">
                          <input
                            type="text"
                            value={st.label}
                            onChange={(e) =>
                              handleUpdateStat(st.id, "label", e.target.value)
                            }
                            className="w-full text-xs text-[#141A2E] bg-white border border-[#CBD5E1] rounded-lg px-2.5 py-1.5"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Tab 5: Section Visibility & Toggles */}
            {activeTab === "sections" && (
              <div className="bg-white rounded-2xl border border-[#E6EAF3] p-6 sm:p-8 space-y-6 shadow-xs">
                <div className="border-b border-[#F1F5F9] pb-4">
                  <h2 className="text-base sm:text-lg font-bold text-[#141A2E] flex items-center gap-2">
                    <Eye className="w-4 h-4 text-[#2158E0]" />
                    Website Sections & Ordering
                  </h2>
                  <p className="text-xs text-[#5B6478] mt-1">
                    Enable or disable public sections and arrange their vertical order.
                  </p>
                </div>

                <div className="space-y-3">
                  {homeContent.sections.map((sec, index) => (
                    <div
                      key={sec.key}
                      className={`p-4 rounded-xl border flex items-center justify-between gap-3 transition-colors ${
                        sec.isEnabled
                          ? "border-[#E6EAF3] bg-white"
                          : "border-slate-200 bg-slate-50 opacity-60"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[#141A2E]">
                            {sec.label}
                          </span>
                          {!sec.canDisable && (
                            <span className="text-[10px] font-semibold text-[#2158E0] bg-blue-50 px-2 py-0.5 rounded-full">
                              Required
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#5B6478] truncate mt-0.5">
                          {sec.description}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {/* Order adjustment buttons */}
                        <div className="flex flex-col">
                          <button
                            type="button"
                            disabled={index === 0}
                            onClick={() => handleMoveSection(index, "up")}
                            className="p-1 hover:bg-slate-100 rounded text-[#94A3B8] disabled:opacity-30 cursor-pointer"
                            title="Move up"
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={index === homeContent.sections.length - 1}
                            onClick={() => handleMoveSection(index, "down")}
                            className="p-1 hover:bg-slate-100 rounded text-[#94A3B8] disabled:opacity-30 cursor-pointer"
                            title="Move down"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Toggle switch */}
                        <button
                          type="button"
                          disabled={sec.canDisable === false}
                          onClick={() => handleToggleSection(sec.key)}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden disabled:opacity-50 disabled:cursor-not-allowed ${
                            sec.isEnabled ? "bg-[#2158E0]" : "bg-slate-300"
                          }`}
                          role="switch"
                          aria-checked={sec.isEnabled}
                        >
                          <span
                            aria-hidden="true"
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                              sec.isEnabled ? "translate-x-4" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tab 6: Contact & Social Media Links */}
            {activeTab === "contact" && (
              <div className="bg-white rounded-2xl border border-[#E6EAF3] p-6 sm:p-8 space-y-6 shadow-xs">
                <div className="border-b border-[#F1F5F9] pb-4">
                  <h2 className="text-base sm:text-lg font-bold text-[#141A2E] flex items-center gap-2">
                    <Phone className="w-4 h-4 text-[#2158E0]" />
                    Campus Contact & Social Profiles
                  </h2>
                  <p className="text-xs text-[#5B6478] mt-1">
                    Contact details are synchronized from your School Profile (Step 1) as the single source of truth.
                  </p>
                </div>

                {/* Synced Info Banner */}
                <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200/60 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#2158E0]">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Synchronized with School Profile</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[#141A2E] pt-1">
                    <div className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-[#5B6478]" />
                      <span className="truncate">{school.official_email}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-[#5B6478]" />
                      <span>{school.contact_phone}</span>
                    </div>
                    <div className="flex items-center gap-1.5 sm:col-span-2">
                      <MapPin className="w-3.5 h-3.5 text-[#5B6478] shrink-0" />
                      <span className="truncate">
                        {school.address}, {school.city}, {school.state} - {school.pin_code}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Social Profiles */}
                <div className="space-y-3.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#5B6478]">
                    Social Media Profiles
                  </h3>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2.5">
                      <Facebook className="w-4 h-4 text-[#1877F2] shrink-0" />
                      <input
                        type="url"
                        value={homeContent.socialLinks?.facebook || ""}
                        onChange={(e) => {
                          setHomeContent((prev) => ({
                            ...prev,
                            socialLinks: { ...prev.socialLinks, facebook: e.target.value },
                          }));
                          markDirty();
                        }}
                        placeholder="https://facebook.com/your-school"
                        className="flex-1 px-3.5 py-2.5 rounded-xl border border-[#E6EAF3] text-xs text-[#141A2E] placeholder-[#94A3B8] focus:border-[#2158E0] focus:outline-hidden"
                      />
                    </div>

                    <div className="flex items-center gap-2.5">
                      <Twitter className="w-4 h-4 text-[#1DA1F2] shrink-0" />
                      <input
                        type="url"
                        value={homeContent.socialLinks?.twitter || ""}
                        onChange={(e) => {
                          setHomeContent((prev) => ({
                            ...prev,
                            socialLinks: { ...prev.socialLinks, twitter: e.target.value },
                          }));
                          markDirty();
                        }}
                        placeholder="https://x.com/your-school"
                        className="flex-1 px-3.5 py-2.5 rounded-xl border border-[#E6EAF3] text-xs text-[#141A2E] placeholder-[#94A3B8] focus:border-[#2158E0] focus:outline-hidden"
                      />
                    </div>

                    <div className="flex items-center gap-2.5">
                      <Instagram className="w-4 h-4 text-[#E4405F] shrink-0" />
                      <input
                        type="url"
                        value={homeContent.socialLinks?.instagram || ""}
                        onChange={(e) => {
                          setHomeContent((prev) => ({
                            ...prev,
                            socialLinks: { ...prev.socialLinks, instagram: e.target.value },
                          }));
                          markDirty();
                        }}
                        placeholder="https://instagram.com/your-school"
                        className="flex-1 px-3.5 py-2.5 rounded-xl border border-[#E6EAF3] text-xs text-[#141A2E] placeholder-[#94A3B8] focus:border-[#2158E0] focus:outline-hidden"
                      />
                    </div>

                    <div className="flex items-center gap-2.5">
                      <Youtube className="w-4 h-4 text-[#CD201F] shrink-0" />
                      <input
                        type="url"
                        value={homeContent.socialLinks?.youtube || ""}
                        onChange={(e) => {
                          setHomeContent((prev) => ({
                            ...prev,
                            socialLinks: { ...prev.socialLinks, youtube: e.target.value },
                          }));
                          markDirty();
                        }}
                        placeholder="https://youtube.com/@your-school"
                        className="flex-1 px-3.5 py-2.5 rounded-xl border border-[#E6EAF3] text-xs text-[#141A2E] placeholder-[#94A3B8] focus:border-[#2158E0] focus:outline-hidden"
                      />
                    </div>

                    <div className="flex items-center gap-2.5">
                      <Linkedin className="w-4 h-4 text-[#0A66C2] shrink-0" />
                      <input
                        type="url"
                        value={homeContent.socialLinks?.linkedin || ""}
                        onChange={(e) => {
                          setHomeContent((prev) => ({
                            ...prev,
                            socialLinks: { ...prev.socialLinks, linkedin: e.target.value },
                          }));
                          markDirty();
                        }}
                        placeholder="https://linkedin.com/company/your-school"
                        className="flex-1 px-3.5 py-2.5 rounded-xl border border-[#E6EAF3] text-xs text-[#141A2E] placeholder-[#94A3B8] focus:border-[#2158E0] focus:outline-hidden"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Bottom Actions Bar */}
            <div className="bg-white rounded-2xl border border-[#E6EAF3] p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
              <Link
                to="/onboarding/subscription"
                id="website-back-btn"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-[#5B6478] hover:text-[#141A2E] hover:bg-slate-50 rounded-xl transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" /> Back to plan
              </Link>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={isSavingDraft}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-5 py-2.5 text-xs font-semibold text-[#141A2E] bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5 text-[#5B6478]" />
                  <span>{isSavingDraft ? "Saving..." : "Save draft"}</span>
                </button>

                <button
                  type="button"
                  id="website-continue-btn"
                  onClick={handleSubmitAndContinue}
                  disabled={isSubmitting}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-8 py-2.5 text-xs font-semibold text-white bg-[#2158E0] hover:bg-[#1a4ec4] disabled:opacity-60 disabled:cursor-not-allowed rounded-full shadow-sm transition-all cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Saving website...</span>
                    </>
                  ) : (
                    <>
                      <span>Save and continue to launch</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </main>
        </div>
      </div>
    </OnboardingLayout>
  );
}
