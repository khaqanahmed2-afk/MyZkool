import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../../hooks/useAuth";
import {
  getSchoolWebsite,
  updateSchoolWebsite,
  publishWebsite,
  formatSchoolWebsiteUrl,
} from "../../../services/websiteService";
import type { SchoolWebsite } from "../../../types/website";
import { WebsiteHeader } from "./WebsiteHeader";
import {
  Settings,
  Globe,
  CheckCircle2,
  AlertCircle,
  Save,
  Rocket,
  ShieldCheck,
  Facebook,
  Twitter,
  Instagram,
  Youtube,
  Linkedin,
  Phone,
  Mail,
  MapPin,
  Lock,
  ExternalLink,
} from "lucide-react";

export default function WebsiteSettingsPage() {
  const { school, profile } = useAuth();
  const userRole = profile?.role || "school_admin";

  const [website, setWebsite] = useState<SchoolWebsite | null>(null);
  const [siteName, setSiteName] = useState("");
  const [tagline, setTagline] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [admissionEnabled, setAdmissionEnabled] = useState(true);
  const [parentPortalEnabled, setParentPortalEnabled] = useState(true);
  const [published, setPublished] = useState(false);

  // Social Links
  const [facebook, setFacebook] = useState("");
  const [twitter, setTwitter] = useState("");
  const [instagram, setInstagram] = useState("");
  const [youtube, setYoutube] = useState("");
  const [linkedin, setLinkedin] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
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
          setSiteName(web.site_name || school.name || "");
          setTagline(web.tagline || "");
          setContactEmail(web.contact_email || school.official_email || "");
          setContactPhone(web.contact_phone || school.contact_phone || "");
          setAddress(web.address || school.address || "");
          setCity(web.city || school.city || "");
          setState(web.state || school.state || "");
          setPostalCode(web.postal_code || school.pin_code || "");
          setAdmissionEnabled(web.admission_enabled ?? true);
          setParentPortalEnabled(web.parent_portal_enabled ?? true);
          setPublished(web.published ?? false);
        }
      } catch (err) {
        console.warn("Failed to load website settings:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, [school?.id]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!school?.id || !website?.id) return;

    setIsSaving(true);
    setFeedback(null);
    try {
      const res = await updateSchoolWebsite({
        schoolId: school.id,
        websiteId: website.id,
        input: {
          site_name: siteName.trim(),
          tagline: tagline.trim(),
          contact_email: contactEmail.trim(),
          contact_phone: contactPhone.trim(),
          address: address.trim(),
          city: city.trim(),
          state: state.trim(),
          postal_code: postalCode.trim(),
          admission_enabled: admissionEnabled,
          parent_portal_enabled: parentPortalEnabled,
          published,
        },
        userRole,
      });

      if (res.success && res.website) {
        setWebsite(res.website);
        setFeedback({ type: "success", message: "Website general settings updated successfully." });
      } else {
        setFeedback({ type: "error", message: res.error || "Failed to update settings." });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Save failed.";
      setFeedback({ type: "error", message: msg });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTogglePublication = async (newPubState: boolean) => {
    if (!school?.id || !website?.id) return;
    setIsPublishing(true);
    setFeedback(null);
    try {
      const res = await publishWebsite({
        schoolId: school.id,
        websiteId: website.id,
        published: newPubState,
        userRole,
      });

      if (res.success && res.website) {
        setWebsite(res.website);
        setPublished(newPubState);
        setFeedback({
          type: "success",
          message: newPubState
            ? "Your school website is now live and published!"
            : "Website unpublished. Public visitors will see a draft maintenance notice.",
        });
      } else {
        setFeedback({ type: "error", message: res.error || "Failed to toggle publication." });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Publish toggle failed.";
      setFeedback({ type: "error", message: msg });
    } finally {
      setIsPublishing(false);
    }
  };

  const publicUrl = school?.subdomain ? formatSchoolWebsiteUrl(school.subdomain) : "";

  return (
    <div className="space-y-6">
      <WebsiteHeader
        title="Website Settings"
        description="Configure general website behavior, publication status, admissions form availability, and contact information."
        website={website}
        actions={
          <button
            type="button"
            onClick={handleSaveSettings}
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm transition-colors disabled:opacity-60"
          >
            <Save className="w-4 h-4" />
            {isSaving ? "Saving..." : "Save Changes"}
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

      {/* 1. Publication Lifecycle Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <Globe className="w-4 h-4 text-blue-600" />
              Website Publication Status
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Control whether your school website is publicly accessible or restricted to draft preview.
            </p>
          </div>

          <div>
            {published ? (
              <button
                type="button"
                disabled={isPublishing}
                onClick={() => handleTogglePublication(false)}
                className="px-3.5 py-2 text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors disabled:opacity-60"
              >
                {isPublishing ? "Updating..." : "Unpublish Website"}
              </button>
            ) : (
              <button
                type="button"
                disabled={isPublishing}
                onClick={() => handleTogglePublication(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 shadow-sm transition-colors disabled:opacity-60"
              >
                <Rocket className="w-3.5 h-3.5" />
                {isPublishing ? "Publishing..." : "Publish Website Now"}
              </button>
            )}
          </div>
        </div>

        <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-3">
          {published ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
          )}
          <div className="text-xs text-slate-700">
            {published ? (
              <span>
                <strong>Your website is currently Live.</strong> Prospective parents, visitors, and search engines can view all published pages at{" "}
                <a
                  href={publicUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 font-mono underline"
                >
                  {publicUrl}
                </a>.
              </span>
            ) : (
              <span>
                <strong>Your website is in Draft mode.</strong> Only logged-in school administrators can preview changes. Public visitors cannot view the site until you publish.
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 2. General Information Form */}
      <form onSubmit={handleSaveSettings} className="space-y-6">
        <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-sm space-y-5">
          <h3 className="text-base font-semibold text-slate-900">
            Website Identity & Header
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Display Website Name *
              </label>
              <input
                type="text"
                required
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                School Tagline
              </label>
              <input
                type="text"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* 3. Feature & Module Toggles */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-sm space-y-4">
          <h3 className="text-base font-semibold text-slate-900">
            Public Website Feature Toggles
          </h3>

          <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
            <div className="p-4 flex items-center justify-between gap-4 bg-white">
              <div>
                <div className="text-xs font-bold text-slate-900">
                  Online Admission Enquiry Form
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Allow prospective parents to submit admission enquiries directly from your website.
                </div>
              </div>
              <input
                type="checkbox"
                checked={admissionEnabled}
                onChange={(e) => setAdmissionEnabled(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
            </div>

            <div className="p-4 flex items-center justify-between gap-4 bg-white">
              <div>
                <div className="text-xs font-bold text-slate-900">
                  Parent Portal Login Navigation Link
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Display a convenient "Parent Portal" login shortcut in your website header.
                </div>
              </div>
              <input
                type="checkbox"
                checked={parentPortalEnabled}
                onChange={(e) => setParentPortalEnabled(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
            </div>
          </div>
        </div>

        {/* 4. Campus Contact & Address */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-sm space-y-4">
          <h3 className="text-base font-semibold text-slate-900">
            Campus Contact & Physical Location
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Official Enquiry Email *
              </label>
              <input
                type="email"
                required
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Contact Phone *
              </label>
              <input
                type="text"
                required
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Campus Street Address
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
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

        {/* 5. Save Button Footer */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            to="/admin/website"
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSaving}
            className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors disabled:opacity-60"
          >
            {isSaving ? "Saving Settings..." : "Save Settings"}
          </button>
        </div>
      </form>
    </div>
  );
}
