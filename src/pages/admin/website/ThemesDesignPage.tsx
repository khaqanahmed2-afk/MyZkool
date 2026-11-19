import React, { useState, useEffect } from "react";
import { useAuth } from "../../../hooks/useAuth";
import {
  getSchoolWebsite,
  updateSchoolWebsite,
  formatSchoolWebsiteUrl,
} from "../../../services/websiteService";
import type { SchoolWebsite, WebsiteThemeTemplate } from "../../../types/website";
import { WEBSITE_THEMES, WEBSITE_COLOR_PRESETS } from "../../../types/website";
import { WebsiteHeader } from "./WebsiteHeader";
import {
  Palette,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Layout,
  Type,
  Check,
  Save,
  Sliders,
  ExternalLink,
} from "lucide-react";

export default function ThemesDesignPage() {
  const { school, profile } = useAuth();
  const userRole = profile?.role || "school_admin";

  const [website, setWebsite] = useState<SchoolWebsite | null>(null);
  const [selectedThemeId, setSelectedThemeId] = useState("academic-classic");
  const [primaryColor, setPrimaryColor] = useState("#2158E0");
  const [secondaryColor, setSecondaryColor] = useState("#141A2E");
  const [accentColor, setAccentColor] = useState("#10B981");
  const [fontFamily, setFontFamily] = useState("Inter, sans-serif");
  const [headerStyle, setHeaderStyle] = useState("standard");
  const [footerStyle, setFooterStyle] = useState("rich");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      if (!school?.id) return;
      setIsLoading(true);
      try {
        const { website: web } = await getSchoolWebsite(school.id);
        if (!isMounted) return;
        if (web) {
          setWebsite(web);
          setSelectedThemeId(web.theme_id || "academic-classic");
          setPrimaryColor(web.primary_color || "#2158E0");
          setSecondaryColor(web.secondary_color || "#141A2E");
          setAccentColor(web.accent_color || "#10B981");
          setFontFamily(web.font_family || "Inter, sans-serif");
          setHeaderStyle(web.header_style || "standard");
          setFooterStyle(web.footer_style || "rich");
        }
      } catch (err) {
        console.warn("Failed to load theme settings:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, [school?.id]);

  const handleApplyTheme = async (theme: WebsiteThemeTemplate) => {
    setSelectedThemeId(theme.id);
    setPrimaryColor(theme.primaryColor);
    setSecondaryColor(theme.secondaryColor);
    setAccentColor(theme.accentColor);
    setFontFamily(theme.fontFamily);
    setHeaderStyle(theme.headerStyle);
    setFooterStyle(theme.footerStyle);

    if (!school?.id || !website?.id) return;
    setIsSaving(true);
    setFeedback(null);
    try {
      const res = await updateSchoolWebsite({
        schoolId: school.id,
        websiteId: website.id,
        input: {
          theme_id: theme.id,
          primary_color: theme.primaryColor,
          secondary_color: theme.secondaryColor,
          accent_color: theme.accentColor,
          font_family: theme.fontFamily,
          header_style: theme.headerStyle,
          footer_style: theme.footerStyle,
        },
        userRole,
      });

      if (res.success && res.website) {
        setWebsite(res.website);
        setFeedback({ type: "success", message: `Theme '${theme.name}' applied successfully! Existing content preserved.` });
      } else {
        setFeedback({ type: "error", message: res.error || "Failed to apply theme." });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error applying theme.";
      setFeedback({ type: "error", message: msg });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveCustomDesign = async () => {
    if (!school?.id || !website?.id) return;
    setIsSaving(true);
    setFeedback(null);
    try {
      const res = await updateSchoolWebsite({
        schoolId: school.id,
        websiteId: website.id,
        input: {
          theme_id: selectedThemeId,
          primary_color: primaryColor,
          secondary_color: secondaryColor,
          accent_color: accentColor,
          font_family: fontFamily,
          header_style: headerStyle,
          footer_style: footerStyle,
        },
        userRole,
      });

      if (res.success && res.website) {
        setWebsite(res.website);
        setFeedback({ type: "success", message: "Custom design and typography saved successfully." });
      } else {
        setFeedback({ type: "error", message: res.error || "Failed to save design." });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Save failed.";
      setFeedback({ type: "error", message: msg });
    } finally {
      setIsSaving(false);
    }
  };

  const publicUrl = school?.subdomain ? formatSchoolWebsiteUrl(school.subdomain) : "";

  return (
    <div className="space-y-6">
      <WebsiteHeader
        title="Themes & Design Customizer"
        description="Choose from curated institutional themes, customize color palettes, typography, and navigation layout styles."
        website={website}
        actions={
          <button
            type="button"
            onClick={handleSaveCustomDesign}
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm transition-colors disabled:opacity-60"
          >
            <Save className="w-4 h-4" />
            {isSaving ? "Saving..." : "Save Design"}
          </button>
        }
      />

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

      {/* Theme Cards Grid */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-sm space-y-5">
        <div>
          <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-600" />
            Curated Institutional Themes
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Switch your school's visual aesthetic with one click. Content, pages, and photos are always preserved.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {WEBSITE_THEMES.map((th) => {
            const isApplied = selectedThemeId === th.id;
            return (
              <div
                key={th.id}
                className={`rounded-xl border transition-all overflow-hidden flex flex-col justify-between ${
                  isApplied
                    ? "border-blue-600 ring-2 ring-blue-600/20 bg-blue-50/20"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                {/* Visual Header / Banner Mockup */}
                <div
                  className={`h-24 bg-gradient-to-r ${th.previewAccent} p-4 flex flex-col justify-between text-white relative`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 bg-black/30 rounded-full backdrop-blur-sm">
                      {th.badge}
                    </span>
                    {isApplied && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 bg-emerald-500 text-white rounded-full">
                        <Check className="w-3 h-3" /> Active
                      </span>
                    )}
                  </div>
                  <div className="text-sm font-bold tracking-wide">
                    {th.name}
                  </div>
                </div>

                {/* Theme Description & Specs */}
                <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {th.description}
                  </p>

                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Color Palette:</span>
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-black/10"
                          style={{ backgroundColor: th.primaryColor }}
                        />
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-black/10"
                          style={{ backgroundColor: th.secondaryColor }}
                        />
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-black/10"
                          style={{ backgroundColor: th.accentColor }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Header Layout:</span>
                      <span className="font-semibold text-slate-700 capitalize">
                        {th.headerStyle}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Typography:</span>
                      <span className="font-semibold text-slate-700 truncate max-w-[140px]">
                        {th.fontFamily.split(",")[0]}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleApplyTheme(th)}
                    disabled={isApplied || isSaving}
                    className={`w-full py-2 px-3 text-xs font-semibold rounded-lg transition-colors mt-2 ${
                      isApplied
                        ? "bg-slate-100 text-slate-500 cursor-default"
                        : "bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
                    }`}
                  >
                    {isApplied ? "Currently Active Theme" : "Apply This Theme"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Custom Fine-Tuning: Layout & Typography */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Layout Options */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <Layout className="w-4 h-4 text-blue-600" />
              Header & Navigation Layout
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Choose how your school's logo, navigation links, and portals are arranged.
            </p>
          </div>

          <div className="space-y-2.5">
            {[
              {
                id: "standard",
                title: "Standard Navigation",
                desc: "Logo on the left, primary navigation tabs across the right, quick admissions button on far right.",
              },
              {
                id: "centered",
                title: "Centered Prestige Header",
                desc: "Prominent crest and institutional seal centered at the top, with navigation cleanly centered below.",
              },
              {
                id: "minimal",
                title: "Contemporary Minimal",
                desc: "Compact translucent header bar designed to maximize hero campus photography showcase.",
              },
            ].map((hdr) => (
              <label
                key={hdr.id}
                className={`p-3.5 rounded-lg border flex items-start gap-3 cursor-pointer transition-colors ${
                  headerStyle === hdr.id
                    ? "border-blue-600 bg-blue-50/50"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <input
                  type="radio"
                  name="headerStyle"
                  value={hdr.id}
                  checked={headerStyle === hdr.id}
                  onChange={(e) => setHeaderStyle(e.target.value)}
                  className="mt-0.5 text-blue-600"
                />
                <div>
                  <div className="text-xs font-bold text-slate-900">{hdr.title}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{hdr.desc}</div>
                </div>
              </label>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-100">
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Footer Style
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "rich", label: "Rich Multi-Column" },
                { id: "standard", label: "Standard 2-Column" },
                { id: "compact", label: "Compact Minimal" },
              ].map((ftr) => (
                <button
                  key={ftr.id}
                  type="button"
                  onClick={() => setFooterStyle(ftr.id)}
                  className={`p-2 text-xs font-medium rounded-lg border text-center transition-colors ${
                    footerStyle === ftr.id
                      ? "border-blue-600 bg-blue-50 text-blue-700 font-semibold"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {ftr.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Typography & Brand Colors */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <Type className="w-4 h-4 text-emerald-600" />
              Typography & Fonts
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Select font styling to match your institution's scholarly identity.
            </p>
          </div>

          <div className="space-y-2">
            {[
              { font: "Inter, sans-serif", name: "Inter", desc: "Clean, universally legible academic standard" },
              { font: "Plus Jakarta Sans, sans-serif", name: "Plus Jakarta Sans", desc: "Modern, progressive geometry" },
              { font: "Cinzel, serif", name: "Cinzel (Serif)", desc: "Heritage, traditional convent and institutional stature" },
              { font: "Space Grotesk, sans-serif", name: "Space Grotesk", desc: "Digital STEM & tech-focused academy aesthetic" },
              { font: "Outfit, sans-serif", name: "Outfit", desc: "Contemporary, friendly rounded typography" },
            ].map((f) => (
              <label
                key={f.font}
                className={`p-3 rounded-lg border flex items-center justify-between cursor-pointer transition-colors ${
                  fontFamily === f.font
                    ? "border-blue-600 bg-blue-50/50"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div>
                  <div className="text-sm font-bold text-slate-900" style={{ fontFamily: f.font }}>
                    {f.name}
                  </div>
                  <div className="text-xs text-slate-500">{f.desc}</div>
                </div>
                <input
                  type="radio"
                  name="fontFamily"
                  value={f.font}
                  checked={fontFamily === f.font}
                  onChange={(e) => setFontFamily(e.target.value)}
                  className="text-blue-600"
                />
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
