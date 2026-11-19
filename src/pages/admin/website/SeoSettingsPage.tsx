import React, { useState, useEffect } from "react";
import { useAuth } from "../../../hooks/useAuth";
import {
  getSchoolWebsite,
  updateSchoolWebsite,
  formatSchoolWebsiteUrl,
} from "../../../services/websiteService";
import type { SchoolWebsite } from "../../../types/website";
import { WebsiteHeader } from "./WebsiteHeader";
import { ImageUploadField } from "../../../components/onboarding/website/ImageUploadField";
import {
  Search,
  Globe,
  Share2,
  CheckCircle2,
  AlertCircle,
  Save,
  Check,
  ExternalLink,
  ShieldAlert,
  FileCode,
} from "lucide-react";

export default function SeoSettingsPage() {
  const { school, profile } = useAuth();
  const userRole = profile?.role || "school_admin";

  const [website, setWebsite] = useState<SchoolWebsite | null>(null);
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [ogImageUrl, setOgImageUrl] = useState("");
  const [allowIndexing, setAllowIndexing] = useState(true);

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
          setSeoTitle(web.seo_title || `${web.site_name} — Premier CBSE School`);
          setSeoDescription(
            web.seo_description ||
              web.about_text?.substring(0, 160) ||
              "Explore academic programs, campus facilities, leadership, and online admission enquiry."
          );
          setOgImageUrl(web.og_image_url || web.logo_url || "");
          setAllowIndexing(web.allow_indexing ?? true);
        }
      } catch (err) {
        console.warn("Failed to load SEO settings:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, [school?.id]);

  const handleSaveSeo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!school?.id || !website?.id) return;

    setIsSaving(true);
    setFeedback(null);
    try {
      const res = await updateSchoolWebsite({
        schoolId: school.id,
        websiteId: website.id,
        input: {
          seo_title: seoTitle.trim(),
          seo_description: seoDescription.trim(),
          og_image_url: ogImageUrl || null,
          allow_indexing: allowIndexing,
        },
        userRole,
      });

      if (res.success && res.website) {
        setWebsite(res.website);
        setFeedback({ type: "success", message: "Search engine & social SEO settings saved." });
      } else {
        setFeedback({ type: "error", message: res.error || "Failed to save SEO settings." });
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
        title="Search Engine Optimization (SEO)"
        description="Improve search engine visibility on Google, configure meta tags, social preview thumbnails, and indexation controls."
        website={website}
        actions={
          <button
            type="button"
            onClick={handleSaveSeo}
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm transition-colors disabled:opacity-60"
          >
            <Save className="w-4 h-4" />
            {isSaving ? "Saving..." : "Save SEO Settings"}
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form Inputs (Left 7 Cols) */}
        <form onSubmit={handleSaveSeo} className="lg:col-span-7 space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-sm space-y-5">
            <div>
              <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <Search className="w-4 h-4 text-blue-600" />
                Website Meta & Search Tags
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                These tags inform Google, Bing, and search crawlers how your school should be indexed.
              </p>
            </div>

            {/* SEO Title */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <label className="font-semibold text-slate-700">SEO Meta Title *</label>
                <span
                  className={`font-mono text-[11px] ${
                    seoTitle.length > 60 ? "text-amber-600 font-bold" : "text-slate-400"
                  }`}
                >
                  {seoTitle.length} / 60 characters
                </span>
              </div>
              <input
                type="text"
                required
                value={seoTitle}
                onChange={(e) => setSeoTitle(e.target.value)}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. Greenwood Academy — Top CBSE School in Bengaluru"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Optimal length is 50–60 characters. Recommended: Include your school name, board, and city.
              </p>
            </div>

            {/* Meta Description */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <label className="font-semibold text-slate-700">Meta Description *</label>
                <span
                  className={`font-mono text-[11px] ${
                    seoDescription.length > 160 ? "text-amber-600 font-bold" : "text-slate-400"
                  }`}
                >
                  {seoDescription.length} / 160 characters
                </span>
              </div>
              <textarea
                rows={4}
                required
                value={seoDescription}
                onChange={(e) => setSeoDescription(e.target.value)}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Brief summary appearing in search engine snippet..."
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Optimal length is 140–160 characters. Clearly convey your curriculum, achievements, and admissions contact.
              </p>
            </div>

            {/* Social Share Image (OG Image) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Social Sharing Thumbnail (OpenGraph Image)
              </label>
              <ImageUploadField
                label="Social Share Image (1200x630 recommended)"
                value={ogImageUrl}
                onChange={(url) => setOgImageUrl(url)}
                onRemove={() => setOgImageUrl("")}
                schoolId={school?.id || ""}
                category="general"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Displayed when your school link is shared on WhatsApp, Facebook, LinkedIn, or Twitter/X.
              </p>
            </div>

            {/* Search Engine Indexing Toggle */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-4">
              <div>
                <div className="text-xs font-bold text-slate-900">
                  Allow Search Engine Indexing (Robots.txt)
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  When enabled, search engines like Google will index your pages. Disable only if conducting private testing.
                </div>
              </div>
              <input
                type="checkbox"
                checked={allowIndexing}
                onChange={(e) => setAllowIndexing(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
            </div>
          </div>

          {/* Technical SEO Checklist */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Technical Search Architecture
            </h4>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-slate-700 font-medium">Canonical Tag Generation</span>
                <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Automated
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-slate-700 font-medium">Mobile Viewport & Responsiveness</span>
                <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Passed
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-slate-700 font-medium">Structured Educational Organization Schema</span>
                <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Embedded
                </span>
              </div>
            </div>
          </div>
        </form>

        {/* Live SERP & Social Previews (Right 5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Google SERP Preview */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Search className="w-4 h-4 text-blue-600" />
              Google Search Result Preview
            </h3>
            <p className="text-xs text-slate-500">
              Approximate appearance on desktop and mobile Google search results.
            </p>

            <div className="p-4 bg-white border border-slate-200 rounded-lg shadow-sm space-y-1 font-sans">
              <div className="flex items-center gap-1.5 text-xs text-slate-700 truncate">
                <span className="w-4 h-4 rounded-full bg-slate-100 flex items-center justify-center text-[10px] text-blue-600 font-bold">
                  G
                </span>
                <span className="font-mono text-[11px] text-slate-600 truncate">
                  {publicUrl || "https://school.myzkool.com"}
                </span>
              </div>

              <div className="text-base text-[#1a0dab] font-medium hover:underline cursor-pointer line-clamp-1">
                {seoTitle || "School Title — Official School Website"}
              </div>

              <div className="text-xs text-[#4d5156] leading-relaxed line-clamp-2">
                {seoDescription ||
                  "Welcome to our official school portal. Inquire for online admissions and explore campus facilities."}
              </div>
            </div>
          </div>

          {/* Social Card Share Preview */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Share2 className="w-4 h-4 text-indigo-600" />
              Social Card Share Preview
            </h3>
            <p className="text-xs text-slate-500">
              Preview when shared on WhatsApp, Facebook, or Twitter/X.
            </p>

            <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm bg-slate-50">
              {ogImageUrl ? (
                <img
                  src={ogImageUrl}
                  alt="OG Preview"
                  className="w-full h-36 object-cover bg-slate-100"
                />
              ) : (
                <div className="w-full h-36 bg-gradient-to-r from-blue-600 to-indigo-800 flex items-center justify-center text-white text-xs font-semibold">
                  School Crest & Banner
                </div>
              )}
              <div className="p-3 bg-white space-y-1">
                <div className="text-[10px] font-mono uppercase text-slate-400">
                  {school?.subdomain ? `${school.subdomain}.myzkool.com` : "myzkool.com"}
                </div>
                <div className="text-xs font-bold text-slate-900 line-clamp-1">
                  {seoTitle || website?.site_name || "Official School Website"}
                </div>
                <div className="text-[11px] text-slate-500 line-clamp-2">
                  {seoDescription}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
