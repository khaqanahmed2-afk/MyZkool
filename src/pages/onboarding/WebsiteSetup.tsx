import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { OnboardingLayout } from "../../components/onboarding/OnboardingLayout";
import { getSchoolForCurrentUser } from "../../services/schoolService";
import {
  initializeSchoolWebsite,
  updateSchoolWebsite,
  saveWebsiteSetupProgress,
} from "../../services/websiteService";
import type { School } from "../../types/school";
import {
  type SchoolWebsite,
  type WebsiteColorPreset,
  WEBSITE_COLOR_PRESETS,
} from "../../types/website";
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
} from "lucide-react";

export default function WebsiteSetup() {
  const { user, profile, refreshSession } = useAuth();
  const navigate = useNavigate();

  // Core data state
  const [school, setSchool] = useState<School | null>(null);
  const [website, setWebsite] = useState<SchoolWebsite | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [missingSchoolError, setMissingSchoolError] = useState(false);

  // Form state
  const [siteName, setSiteName] = useState<string>("");
  const [tagline, setTagline] = useState<string>("");
  const [aboutText, setAboutText] = useState<string>("");
  const [primaryColor, setPrimaryColor] = useState<string>("#2158E0");
  const [secondaryColor, setSecondaryColor] = useState<string>("#141A2E");
  const [accentColor, setAccentColor] = useState<string>("#10B981");

  // Redirect if already completed onboarding
  useEffect(() => {
    if (profile?.onboarding_completed) {
      navigate("/admin", { replace: true });
    }
  }, [profile?.onboarding_completed, navigate]);

  // Load school and initialize website record
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
          setWebsite(initResult.website);
          setSiteName(initResult.website.site_name || loadedSchool.name || "");
          setTagline(initResult.website.tagline || "");
          setAboutText(initResult.website.about_text || "");
          setPrimaryColor(initResult.website.primary_color || "#2158E0");
          setSecondaryColor(initResult.website.secondary_color || "#141A2E");
          setAccentColor(initResult.website.accent_color || "#10B981");
        } else {
          setSiteName(loadedSchool.name || "");
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

  const handleSelectPreset = (preset: WebsiteColorPreset) => {
    setPrimaryColor(preset.primary);
    setSecondaryColor(preset.secondary);
    setAccentColor(preset.accent);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!siteName.trim()) {
      setError("Website name is required.");
      return;
    }
    if (!school || !website) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const updateRes = await updateSchoolWebsite({
        schoolId: school.id,
        websiteId: website.id,
        input: {
          site_name: siteName.trim(),
          tagline: tagline.trim() || undefined,
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
          logo_url: website.logo_url || school.logo_url || undefined,
          admission_enabled: website.admission_enabled ?? true,
          parent_portal_enabled: website.parent_portal_enabled ?? true,
          published: website.published ?? false,
        },
        userRole: profile?.role || "school_admin",
      });

      if (!updateRes.success) {
        setError(updateRes.error || "Failed to update website settings.");
        setIsSubmitting(false);
        return;
      }

      await saveWebsiteSetupProgress({
        schoolId: school.id,
        userId: user.id,
      });

      await refreshSession();
      navigate("/onboarding/complete");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred.";
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
        subtitle="A clean public website for admissions and parent information."
      >
        <div className="py-16 text-center space-y-3">
          <div className="w-8 h-8 border-2 border-[#2158E0] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-medium text-[#141A2E]">Loading website settings...</p>
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
        subtitle="A clean public website for admissions and parent information."
      >
        <div className="p-6 rounded-2xl bg-amber-50/80 border border-amber-200 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 mx-auto flex items-center justify-center">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-amber-900">School profile incomplete</h2>
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
      title="Set up your school website"
      subtitle="A clean public website for admissions and parent information."
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        {error && (
          <div
            role="alert"
            className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3 text-xs text-red-700"
          >
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Unable to proceed</span>
              <p className="mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Live Preview Header Card */}
        <div className="rounded-2xl border border-[#E6EAF3] bg-white overflow-hidden shadow-xs">
          <div className="px-4 py-2.5 bg-slate-50 border-b border-[#E6EAF3] flex items-center justify-between">
            <span className="text-xs font-semibold text-[#5B6478] flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-[#2158E0]" />
              Live website header preview
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-md bg-slate-200/70 text-slate-700">
              <Globe className="w-3 h-3 text-[#2158E0]" />
              {school.subdomain}.myzkool.com
            </span>
          </div>

          <div
            className="p-5 text-white transition-colors"
            style={{ backgroundColor: primaryColor }}
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base sm:text-lg font-bold tracking-tight">
                  {siteName || "Your school name"}
                </h3>
                {tagline ? (
                  <p className="text-xs text-white/80 mt-0.5">{tagline}</p>
                ) : (
                  <p className="text-xs text-white/60 mt-0.5 italic">Add a tagline below...</p>
                )}
              </div>

              <div className="hidden sm:flex items-center gap-3 text-xs font-medium text-white/80">
                <span>Home</span>
                <span>About</span>
                <span>Academics</span>
                <span>Admissions</span>
                <span>Contact</span>
              </div>
            </div>
          </div>
        </div>

        {/* Form Inputs Card */}
        <div className="bg-white rounded-2xl border border-[#E6EAF3] p-5 sm:p-6 space-y-5">
          {/* Website Name */}
          <div>
            <label
              htmlFor="site-name-input"
              className="block text-xs font-semibold text-[#141A2E] mb-1.5"
            >
              Website display name <span className="text-red-500">*</span>
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
          </div>

          {/* Tagline */}
          <div>
            <label
              htmlFor="tagline-input"
              className="block text-xs font-semibold text-[#141A2E] mb-1.5"
            >
              Tagline / Motto
            </label>
            <input
              id="tagline-input"
              type="text"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="e.g. Inspiring excellence, cultivating character"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E6EAF3] bg-white text-sm text-[#141A2E] placeholder-[#94A3B8] hover:border-[#D1D5DB] focus:border-[#2158E0] focus:ring-2 focus:ring-[#2158E0]/15 focus:outline-hidden"
            />
          </div>

          {/* About Text */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="about-text-input"
                className="block text-xs font-semibold text-[#141A2E]"
              >
                About the school
              </label>
              <span className="text-[11px] text-[#94A3B8]">{aboutText.length}/300</span>
            </div>
            <textarea
              id="about-text-input"
              rows={3}
              maxLength={300}
              value={aboutText}
              onChange={(e) => setAboutText(e.target.value)}
              placeholder="A brief introduction greeting prospective parents and students..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E6EAF3] bg-white text-sm text-[#141A2E] placeholder-[#94A3B8] hover:border-[#D1D5DB] focus:border-[#2158E0] focus:ring-2 focus:ring-[#2158E0]/15 focus:outline-hidden resize-none"
            />
          </div>

          {/* Brand Color Presets */}
          <div>
            <label className="text-xs font-semibold text-[#141A2E] mb-2.5 flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-[#2158E0]" />
              Brand color theme
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {WEBSITE_COLOR_PRESETS.map((preset) => {
                const isSelected =
                  primaryColor.toLowerCase() === preset.primary.toLowerCase();

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
                      <span className="text-xs font-bold text-[#141A2E]">{preset.name}</span>
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-[#2158E0]" />}
                    </div>

                    <div className="flex items-center gap-1.5 mb-1.5">
                      <div
                        className="w-5 h-5 rounded-md border border-black/10"
                        style={{ backgroundColor: preset.primary }}
                      />
                      <div
                        className="w-5 h-5 rounded-md border border-black/10"
                        style={{ backgroundColor: preset.secondary }}
                      />
                      <div
                        className="w-5 h-5 rounded-md border border-black/10"
                        style={{ backgroundColor: preset.accent }}
                      />
                    </div>

                    <p className="text-[11px] text-[#5B6478] leading-tight line-clamp-1">
                      {preset.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Read-only details note */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2.5 text-xs text-[#5B6478]">
            <Info className="w-4 h-4 text-[#2158E0] shrink-0 mt-0.5" />
            <div>
              <p>
                Contact details and address come from your school profile. You can change them later
                from website settings.
              </p>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-[11px] text-[#94A3B8]">Public address:</span>
                <code className="text-[11px] font-mono bg-white px-2 py-0.5 rounded border border-slate-200 text-[#141A2E]">
                  https://{school.subdomain}.myzkool.com
                </code>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Action Buttons */}
        <div className="pt-4 border-t border-[#F1F5F9] flex flex-col sm:flex-row items-center justify-between gap-3">
          <Link
            to="/onboarding/subscription"
            id="website-back-btn"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-[#5B6478] hover:text-[#141A2E] hover:bg-[#F1F5F9] rounded-xl transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to plan
          </Link>

          <button
            type="submit"
            id="website-continue-btn"
            disabled={isSubmitting}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-2.5 text-xs font-semibold text-white bg-[#2158E0] hover:bg-[#1a4ec4] disabled:opacity-60 disabled:cursor-not-allowed rounded-full shadow-sm transition-all"
          >
            {isSubmitting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Saving website settings...</span>
              </>
            ) : (
              <>
                <span>Save and continue to launch</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </OnboardingLayout>
  );
}
