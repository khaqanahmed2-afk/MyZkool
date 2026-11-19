import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../../hooks/useAuth";
import {
  getSchoolWebsite,
  updateSchoolWebsite,
  getHomePageContent,
  saveHomePageContent,
  publishWebsite,
  uploadWebsiteAsset,
  formatSchoolWebsiteUrl,
} from "../../../services/websiteService";
import type {
  SchoolWebsite,
  HomePageContent,
  FacilityItem,
  GalleryImageItem,
  StatItem,
  WebsiteSectionToggle,
} from "../../../types/website";
import { WEBSITE_COLOR_PRESETS } from "../../../types/website";
import { WebsiteLivePreview } from "../../../components/onboarding/website/WebsiteLivePreview";
import { ImageUploadField } from "../../../components/onboarding/website/ImageUploadField";
import { WebsiteHeader } from "./WebsiteHeader";
import {
  Save,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Eye,
  Monitor,
  Smartphone,
  Plus,
  Trash2,
  Globe,
  Palette,
  Building2,
  Phone,
  Mail,
  MapPin,
  Sparkles,
  Check,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Rocket,
  ShieldAlert,
} from "lucide-react";

type EditorTab =
  | "branding"
  | "hero"
  | "about_principal"
  | "facilities"
  | "gallery"
  | "stats"
  | "sections"
  | "contact";

export default function WebsiteEditorPage() {
  const { school, user, profile } = useAuth();
  const userRole = profile?.role || "school_admin";

  const [website, setWebsite] = useState<SchoolWebsite | null>(null);
  const [content, setContent] = useState<HomePageContent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [currentTab, setCurrentTab] = useState<EditorTab>("branding");
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const [showPreviewPane, setShowPreviewPane] = useState(true);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);

  // Form Fields
  const [siteName, setSiteName] = useState("");
  const [tagline, setTagline] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [faviconUrl, setFaviconUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#2158E0");
  const [secondaryColor, setSecondaryColor] = useState("#141A2E");
  const [accentColor, setAccentColor] = useState("#10B981");
  const [aboutText, setAboutText] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");

  // Load website data
  const loadData = useCallback(async () => {
    if (!school?.id) return;
    setIsLoading(true);
    try {
      const { website: web } = await getSchoolWebsite(school.id);
      if (web) {
        setWebsite(web);
        setSiteName(web.site_name || school.name || "");
        setTagline(web.tagline || "");
        setLogoUrl(web.logo_url || "");
        setFaviconUrl(web.favicon_url || "");
        setPrimaryColor(web.primary_color || "#2158E0");
        setSecondaryColor(web.secondary_color || "#141A2E");
        setAccentColor(web.accent_color || "#10B981");
        setAboutText(web.about_text || "");
        setContactEmail(web.contact_email || school.official_email || "");
        setContactPhone(web.contact_phone || school.contact_phone || "");
        setAddress(web.address || school.address || "");
        setCity(web.city || school.city || "");
        setState(web.state || school.state || "");
        setPostalCode(web.postal_code || school.pin_code || "");

        const homeContent = await getHomePageContent(web.id, school);
        setContent(homeContent);
      }
    } catch (err) {
      console.warn("Failed to load website editor data:", err);
    } finally {
      setIsLoading(false);
    }
  }, [school]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Save Draft
  const handleSaveDraft = async () => {
    if (!school?.id || !website?.id || !content) return;
    setIsSaving(true);
    setFeedback(null);
    try {
      const webRes = await updateSchoolWebsite({
        schoolId: school.id,
        websiteId: website.id,
        input: {
          site_name: siteName.trim(),
          tagline: tagline.trim(),
          logo_url: logoUrl || undefined,
          favicon_url: faviconUrl || undefined,
          primary_color: primaryColor,
          secondary_color: secondaryColor,
          accent_color: accentColor,
          about_text: aboutText,
          contact_email: contactEmail,
          contact_phone: contactPhone,
          address,
          city,
          state,
          postal_code: postalCode,
        },
        userRole,
      });

      const homeRes = await saveHomePageContent({
        schoolId: school.id,
        websiteId: website.id,
        content,
        userRole,
      });

      if (webRes.success && homeRes.success) {
        if (webRes.website) setWebsite(webRes.website);
        setLastSavedTime(new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }));
        setFeedback({ type: "success", message: "Draft changes saved successfully." });
      } else {
        setFeedback({ type: "error", message: webRes.error || homeRes.error || "Failed to save draft." });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Save failed.";
      setFeedback({ type: "error", message: msg });
    } finally {
      setIsSaving(false);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  // Handle Publish Website
  const handlePublishToggle = async (publishState: boolean) => {
    if (!school?.id || !website?.id) return;
    setIsPublishing(true);
    setFeedback(null);
    try {
      // First save current edits
      await handleSaveDraft();

      const res = await publishWebsite({
        schoolId: school.id,
        websiteId: website.id,
        published: publishState,
        userRole,
      });

      if (res.success && res.website) {
        setWebsite(res.website);
        setFeedback({
          type: "success",
          message: publishState
            ? "Congratulations! Your website is now live and published publicly."
            : "Website unpublished. It is now only visible to school administrators in draft mode.",
        });
      } else {
        setFeedback({ type: "error", message: res.error || "Failed to update publication status." });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Publish failed.";
      setFeedback({ type: "error", message: msg });
    } finally {
      setIsPublishing(false);
    }
  };

  const publicUrl = school?.subdomain ? formatSchoolWebsiteUrl(school.subdomain) : "";

  // Content helper mutators
  const updateHero = (field: string, value: string) => {
    if (!content) return;
    setContent({
      ...content,
      hero: { ...content.hero, [field]: value },
    });
  };

  const updatePrincipal = (field: string, value: string) => {
    if (!content) return;
    setContent({
      ...content,
      principal: { ...content.principal, [field]: value },
    });
  };

  const addFacility = () => {
    if (!content) return;
    const newFac: FacilityItem = {
      id: `fac-${Date.now()}`,
      title: "New Facility",
      description: "Description of infrastructure or campus amenity.",
    };
    setContent({
      ...content,
      facilities: [...content.facilities, newFac],
    });
  };

  const removeFacility = (id: string) => {
    if (!content) return;
    setContent({
      ...content,
      facilities: content.facilities.filter((f) => f.id !== id),
    });
  };

  const updateFacility = (id: string, field: "title" | "description", val: string) => {
    if (!content) return;
    setContent({
      ...content,
      facilities: content.facilities.map((f) => (f.id === id ? { ...f, [field]: val } : f)),
    });
  };

  const addGalleryItem = (url: string, category: string = "Campus") => {
    if (!content) return;
    const newItem: GalleryImageItem = {
      id: `img-${Date.now()}`,
      imageUrl: url,
      title: "Campus Photo",
      category,
    };
    setContent({
      ...content,
      gallery: [...content.gallery, newItem],
    });
  };

  const removeGalleryItem = (id: string) => {
    if (!content) return;
    setContent({
      ...content,
      gallery: content.gallery.filter((g) => g.id !== id),
    });
  };

  const toggleSectionState = (key: string) => {
    if (!content) return;
    setContent({
      ...content,
      sections: content.sections.map((sec) =>
        sec.key === key && sec.canDisable !== false ? { ...sec, isEnabled: !sec.isEnabled } : sec
      ),
    });
  };

  const updateStatItem = (id: string, field: "label" | "value", val: string) => {
    if (!content) return;
    setContent({
      ...content,
      stats: content.stats.map((s) => (s.id === id ? { ...s, [field]: val } : s)),
    });
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center bg-white rounded-xl border border-slate-200">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-slate-500 font-medium">Loading website editor...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <WebsiteHeader
        title="Website Content Editor"
        description="Edit homepage sections, branding, facilities, and principal's message with live preview."
        website={website}
        actions={
          <div className="flex items-center gap-2">
            {lastSavedTime && (
              <span className="text-xs text-slate-500 hidden sm:inline">
                Saved at {lastSavedTime}
              </span>
            )}
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-sm transition-colors disabled:opacity-60"
            >
              <Save className="w-4 h-4 text-slate-500" />
              {isSaving ? "Saving..." : "Save Draft"}
            </button>

            {website?.published ? (
              <button
                type="button"
                onClick={() => handlePublishToggle(false)}
                disabled={isPublishing}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors disabled:opacity-60"
                title="Unpublish website back to draft mode"
              >
                Unpublish
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handlePublishToggle(true)}
                disabled={isPublishing}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 shadow-sm transition-colors disabled:opacity-60"
              >
                <Rocket className="w-4 h-4" />
                {isPublishing ? "Publishing..." : "Publish Website"}
              </button>
            )}
          </div>
        }
      />

      {/* User Feedback Alert */}
      {feedback && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between gap-3 ${
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-rose-50 text-rose-800 border-rose-200"
          }`}
        >
          <div className="flex items-center gap-2 text-sm font-medium">
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-xs font-semibold hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Editor Controls & Layout Toggle */}
      <div className="flex items-center justify-between gap-3 bg-white border border-slate-200 p-2.5 rounded-xl shadow-sm">
        {/* Editor Subsection Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-1">
          {[
            { id: "branding", label: "Branding & Colors" },
            { id: "hero", label: "Hero Banner" },
            { id: "about_principal", label: "About & Leadership" },
            { id: "facilities", label: "Facilities" },
            { id: "gallery", label: "Photo Gallery" },
            { id: "stats", label: "Key Stats" },
            { id: "sections", label: "Section Visibility" },
            { id: "contact", label: "Contact Details" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setCurrentTab(tab.id as EditorTab)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                currentTab === tab.id
                  ? "bg-blue-600 text-white font-semibold shadow-sm"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Preview Viewport Controls */}
        <div className="hidden lg:flex items-center gap-2 border-l border-slate-200 pl-3">
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
            <button
              type="button"
              onClick={() => setPreviewMode("desktop")}
              className={`p-1.5 rounded-md ${
                previewMode === "desktop" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
              title="Desktop View"
            >
              <Monitor className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setPreviewMode("mobile")}
              className={`p-1.5 rounded-md ${
                previewMode === "mobile" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
              title="Mobile View"
            >
              <Smartphone className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowPreviewPane(!showPreviewPane)}
            className={`px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
              showPreviewPane
                ? "bg-blue-50 text-blue-700 border-blue-200"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}
          >
            {showPreviewPane ? "Hide Live Preview" : "Show Live Preview"}
          </button>
        </div>
      </div>

      {/* Main Grid: Form Inputs (Left) and Live Preview (Right) */}
      <div className={`grid grid-cols-1 ${showPreviewPane ? "lg:grid-cols-12" : ""} gap-6`}>
        {/* Form Controls Column */}
        <div className={showPreviewPane ? "lg:col-span-6 space-y-6" : "max-w-4xl space-y-6"}>
          {/* TAB 1: Branding & Colors */}
          {currentTab === "branding" && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-sm space-y-5">
              <div>
                <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                  <Palette className="w-4 h-4 text-blue-600" />
                  School Branding & Colors
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Customize the school display name, tagline, crest, and primary color palette.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    School Website Name *
                  </label>
                  <input
                    type="text"
                    value={siteName}
                    onChange={(e) => setSiteName(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g. Greenwood International Academy"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Institutional Tagline / Motto
                  </label>
                  <input
                    type="text"
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g. Empowering Students for Scholarly Excellence & Moral Integrity"
                  />
                </div>

                {/* Logo & Crest Upload */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    School Logo / Insignia
                  </label>
                  <ImageUploadField
                    label="School Crest / Logo"
                    value={logoUrl}
                    onChange={(url) => setLogoUrl(url)}
                    onRemove={() => setLogoUrl("")}
                    schoolId={school?.id || ""}
                    category="logo"
                  />
                </div>

                {/* Color Palettes */}
                <div className="pt-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-2">
                    Brand Color Presets
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    {WEBSITE_COLOR_PRESETS.map((preset) => (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => {
                          setPrimaryColor(preset.primary);
                          setSecondaryColor(preset.secondary);
                          setAccentColor(preset.accent);
                        }}
                        className={`p-2.5 rounded-lg border text-left transition-all ${
                          primaryColor === preset.primary
                            ? "border-blue-600 bg-blue-50/50 ring-1 ring-blue-600"
                            : "border-slate-200 hover:border-slate-300 bg-white"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <span
                            className="w-4 h-4 rounded-full border border-black/10"
                            style={{ backgroundColor: preset.primary }}
                          />
                          <span
                            className="w-4 h-4 rounded-full border border-black/10"
                            style={{ backgroundColor: preset.secondary }}
                          />
                          <span
                            className="w-4 h-4 rounded-full border border-black/10"
                            style={{ backgroundColor: preset.accent }}
                          />
                        </div>
                        <div className="text-xs font-semibold text-slate-800 truncate">
                          {preset.name}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Hex Inputs */}
                <div className="grid grid-cols-3 gap-3 pt-2">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      Primary Color
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="color"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="w-7 h-7 rounded border border-slate-300 cursor-pointer p-0"
                      />
                      <input
                        type="text"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="w-full px-2 py-1 text-xs border border-slate-300 rounded font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      Secondary Color
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="color"
                        value={secondaryColor}
                        onChange={(e) => setSecondaryColor(e.target.value)}
                        className="w-7 h-7 rounded border border-slate-300 cursor-pointer p-0"
                      />
                      <input
                        type="text"
                        value={secondaryColor}
                        onChange={(e) => setSecondaryColor(e.target.value)}
                        className="w-full px-2 py-1 text-xs border border-slate-300 rounded font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      Accent Color
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="color"
                        value={accentColor}
                        onChange={(e) => setAccentColor(e.target.value)}
                        className="w-7 h-7 rounded border border-slate-300 cursor-pointer p-0"
                      />
                      <input
                        type="text"
                        value={accentColor}
                        onChange={(e) => setAccentColor(e.target.value)}
                        className="w-full px-2 py-1 text-xs border border-slate-300 rounded font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Hero Banner */}
          {currentTab === "hero" && content && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-sm space-y-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  Hero Showcase Banner
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  The primary visual section greeted by prospective parents and visitors.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Main Headline *
                </label>
                <input
                  type="text"
                  value={content.hero.headline}
                  onChange={(e) => updateHero("headline", e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Welcome to Greenwood Academy"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Supporting Description
                </label>
                <textarea
                  rows={3}
                  value={content.hero.description}
                  onChange={(e) => updateHero("description", e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Brief introductory statement about school values..."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Call-To-Action (CTA) Button Text
                </label>
                <input
                  type="text"
                  value={content.hero.ctaText}
                  onChange={(e) => updateHero("ctaText", e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Apply for Admission 2026-27"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Hero Background Campus Image
                </label>
                <ImageUploadField
                  label="Hero Campus Background Photo"
                  value={content.hero.backgroundImageUrl}
                  onChange={(url) => updateHero("backgroundImageUrl", url)}
                  onRemove={() => updateHero("backgroundImageUrl", "")}
                  schoolId={school?.id || ""}
                  category="hero"
                />
              </div>
            </div>
          )}

          {/* TAB 3: About & Leadership */}
          {currentTab === "about_principal" && content && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-sm space-y-6">
              <div>
                <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-emerald-600" />
                  About the School & Leadership Message
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Vision, mission, and principal's welcome portrait.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  About Us Story & Institutional Overview
                </label>
                <textarea
                  rows={4}
                  value={aboutText}
                  onChange={(e) => setAboutText(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Describe your school's history, ethos, board affiliation, and vision..."
                />
              </div>

              <div className="border-t border-slate-200 pt-5 space-y-4">
                <h4 className="text-sm font-semibold text-slate-800">Principal's Desk</h4>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Principal Name
                    </label>
                    <input
                      type="text"
                      value={content.principal.name}
                      onChange={(e) => updatePrincipal("name", e.target.value)}
                      className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg"
                      placeholder="e.g. Dr. Rajesh Sharma"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Leadership Title
                    </label>
                    <input
                      type="text"
                      value={content.principal.title}
                      onChange={(e) => updatePrincipal("title", e.target.value)}
                      className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg"
                      placeholder="e.g. Principal & Head of School"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Principal's Welcome Note
                  </label>
                  <textarea
                    rows={4}
                    value={content.principal.message}
                    onChange={(e) => updatePrincipal("message", e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                    placeholder="Welcome message to prospective families..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Principal Portrait Photo
                  </label>
                  <ImageUploadField
                    label="Principal Portrait"
                    value={content.principal.photoUrl}
                    onChange={(url) => updatePrincipal("photoUrl", url)}
                    onRemove={() => updatePrincipal("photoUrl", "")}
                    schoolId={school?.id || ""}
                    category="principal"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Campus Facilities */}
          {currentTab === "facilities" && content && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-sm space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">
                    Campus Facilities & Amenities
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Highlight smart classrooms, laboratories, libraries, and sports infrastructure.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addFacility}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Facility
                </button>
              </div>

              <div className="space-y-3.5">
                {content.facilities.map((fac, idx) => (
                  <div
                    key={fac.id}
                    className="p-3.5 border border-slate-200 rounded-lg bg-slate-50/60 space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-600">
                        Facility #{idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeFacility(fac.id)}
                        className="text-xs text-rose-600 hover:text-rose-800 p-1"
                        title="Delete Facility"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <input
                      type="text"
                      value={fac.title}
                      onChange={(e) => updateFacility(fac.id, "title", e.target.value)}
                      className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded"
                      placeholder="Facility Title (e.g. Modern Physics Lab)"
                    />
                    <textarea
                      rows={2}
                      value={fac.description}
                      onChange={(e) => updateFacility(fac.id, "description", e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded"
                      placeholder="Brief description of the facility equipment and capacity..."
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: Photo Gallery */}
          {currentTab === "gallery" && content && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-sm space-y-5">
              <div>
                <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-purple-600" />
                  Campus Photo Gallery
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Upload images of school events, sports meets, cultural functions, and classrooms.
                </p>
              </div>

              <div className="border border-dashed border-slate-300 rounded-xl p-4 bg-slate-50">
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Upload New Photo to Gallery
                </label>
                <ImageUploadField
                  label="Select Gallery Image"
                  value=""
                  onChange={(url) => addGalleryItem(url, "Campus")}
                  schoolId={school?.id || ""}
                  category="gallery"
                />
              </div>

              {content.gallery.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {content.gallery.map((img) => (
                    <div
                      key={img.id}
                      className="group relative rounded-lg overflow-hidden border border-slate-200 aspect-video bg-slate-100"
                    >
                      <img
                        src={img.imageUrl}
                        alt={img.title || "Gallery"}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeGalleryItem(img.id)}
                        className="absolute top-1.5 right-1.5 p-1 bg-rose-600 text-white rounded-full opacity-90 hover:opacity-100 shadow transition-opacity"
                        title="Remove photo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-xs text-slate-400">
                  No gallery photographs uploaded yet.
                </div>
              )}
            </div>
          )}

          {/* TAB 6: Key Statistics */}
          {currentTab === "stats" && content && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-sm space-y-5">
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  Key Statistics & Achievements
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Display high-impact numbers like student count, board examination pass rate, and faculty credentials.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {content.stats.map((st) => (
                  <div key={st.id} className="p-3 border border-slate-200 rounded-lg bg-slate-50 space-y-2">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-500">Metric Value</label>
                      <input
                        type="text"
                        value={st.value}
                        onChange={(e) => updateStatItem(st.id, "value", e.target.value)}
                        className="w-full px-2.5 py-1 text-sm font-bold bg-white border border-slate-300 rounded"
                        placeholder="e.g. 100%"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-500">Label / Description</label>
                      <input
                        type="text"
                        value={st.label}
                        onChange={(e) => updateStatItem(st.id, "label", e.target.value)}
                        className="w-full px-2.5 py-1 text-xs bg-white border border-slate-300 rounded"
                        placeholder="e.g. Board Exam Results"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 7: Section Visibility */}
          {currentTab === "sections" && content && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-sm space-y-5">
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  Homepage Section Toggles
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Control which content sections appear on your school's public website.
                </p>
              </div>

              <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
                {content.sections.map((sec) => (
                  <div
                    key={sec.key}
                    className="p-3.5 flex items-center justify-between gap-3 bg-white hover:bg-slate-50 transition-colors"
                  >
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{sec.label}</div>
                      <div className="text-xs text-slate-500">{sec.description}</div>
                    </div>

                    <button
                      type="button"
                      disabled={sec.canDisable === false}
                      onClick={() => toggleSectionState(sec.key)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        sec.isEnabled ? "bg-blue-600" : "bg-slate-200"
                      } ${sec.canDisable === false ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          sec.isEnabled ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 8: Contact Details */}
          {currentTab === "contact" && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-sm space-y-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                  <Phone className="w-4 h-4 text-blue-600" />
                  Campus Contact Information
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  These details appear in your public footer and contact page.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Contact Phone Number
                  </label>
                  <input
                    type="text"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
                    placeholder="+91 98765 43210"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Public Email Address
                  </label>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
                    placeholder="admissions@school.edu.in"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Campus Physical Address
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
                  placeholder="Street / Campus Location"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">City</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">State</label>
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">PIN Code</label>
                  <input
                    type="text"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Live Preview Column */}
        {showPreviewPane && content && school && (
          <div className="lg:col-span-6">
            <div className="sticky top-6 space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-blue-600" />
                  Live Rendering Preview
                </span>
                <span>Updates in real time</span>
              </div>

              <div
                className={`transition-all duration-300 mx-auto ${
                  previewMode === "mobile" ? "max-w-[375px]" : "w-full"
                }`}
              >
                <WebsiteLivePreview
                  school={school}
                  siteName={siteName}
                  tagline={tagline}
                  logoUrl={logoUrl}
                  primaryColor={primaryColor}
                  secondaryColor={secondaryColor}
                  accentColor={accentColor}
                  aboutText={aboutText}
                  homeContent={content}
                  published={website?.published ?? false}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
