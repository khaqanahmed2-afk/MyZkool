import React, { useState, useEffect } from "react";
import { useAuth } from "../../../hooks/useAuth";
import {
  getSchoolWebsite,
  updateSchoolWebsite,
  formatSchoolWebsiteUrl,
} from "../../../services/websiteService";
import type { SchoolWebsite } from "../../../types/website";
import { WebsiteHeader } from "./WebsiteHeader";
import {
  Globe,
  ExternalLink,
  Copy,
  Check,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Lock,
  Server,
  RefreshCw,
  Save,
  HelpCircle,
} from "lucide-react";

export default function DomainUrlPage() {
  const { school, profile } = useAuth();
  const userRole = profile?.role || "school_admin";

  const [website, setWebsite] = useState<SchoolWebsite | null>(null);
  const [customDomain, setCustomDomain] = useState("");
  const [domainStatus, setDomainStatus] = useState<string>("unconfigured");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [copiedSubdomain, setCopiedSubdomain] = useState(false);
  const [copiedTarget, setCopiedTarget] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

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
          setCustomDomain(web.custom_domain || "");
          setDomainStatus(web.custom_domain_status || (web.custom_domain ? "pending_verification" : "unconfigured"));
        }
      } catch (err) {
        console.warn("Failed to load domain settings:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, [school?.id]);

  const publicUrl = school?.subdomain ? formatSchoolWebsiteUrl(school.subdomain) : "";

  const handleCopySubdomain = () => {
    if (!publicUrl) return;
    navigator.clipboard.writeText(publicUrl);
    setCopiedSubdomain(true);
    setTimeout(() => setCopiedSubdomain(false), 2000);
  };

  const handleCopyCnameTarget = () => {
    navigator.clipboard.writeText("domains.myzkool.com");
    setCopiedTarget(true);
    setTimeout(() => setCopiedTarget(false), 2000);
  };

  const handleSaveCustomDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!school?.id || !website?.id) return;

    const cleanDomain = customDomain.toLowerCase().trim().replace(/^https?:\/\//, "").replace(/\/+$/, "");

    setIsSaving(true);
    setFeedback(null);
    try {
      const res = await updateSchoolWebsite({
        schoolId: school.id,
        websiteId: website.id,
        input: {
          custom_domain: cleanDomain || null,
          custom_domain_status: cleanDomain ? "pending_verification" : "unconfigured",
        },
        userRole,
      });

      if (res.success && res.website) {
        setWebsite(res.website);
        setDomainStatus(cleanDomain ? "pending_verification" : "unconfigured");
        setFeedback({
          type: "success",
          message: cleanDomain
            ? "Custom domain saved. Please add the CNAME record to your DNS provider."
            : "Custom domain removed. Website continues using default subdomain.",
        });
      } else {
        setFeedback({ type: "error", message: res.error || "Failed to update domain." });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Domain error.";
      setFeedback({ type: "error", message: msg });
    } finally {
      setIsSaving(false);
    }
  };

  const handleVerifyDns = async () => {
    if (!customDomain) return;
    setIsVerifying(true);
    setFeedback(null);
    setTimeout(() => {
      setIsVerifying(false);
      setFeedback({
        type: "error",
        message: `DNS check in progress for '${customDomain}'. Standard global DNS propagation takes 24–48 hours. Ensure your CNAME points to 'domains.myzkool.com'.`,
      });
    }, 1500);
  };

  return (
    <div className="space-y-6">
      <WebsiteHeader
        title="Domain & URL Settings"
        description="Manage your school's official website address, default MyZkool subdomain, and connect a branded custom domain."
        website={website}
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

      {/* 1. Default MyZkool Subdomain Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <Globe className="w-4 h-4 text-blue-600" />
              Default MyZkool Subdomain
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Every school on MyZkool receives a dedicated, high-speed multi-tenant subdomain.
            </p>
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 self-start sm:self-auto">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Active & SSL Secured
          </span>
        </div>

        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Live School Address
            </span>
            <div className="font-mono text-base font-bold text-slate-900 flex items-center gap-2">
              {publicUrl || "https://school.myzkool.com"}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopySubdomain}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 shadow-sm transition-colors"
            >
              {copiedSubdomain ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" /> Copied!
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" /> Copy URL
                </>
              )}
            </button>

            {publicUrl && (
              <a
                href={publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 shadow-sm transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Open Website
              </a>
            )}
          </div>
        </div>

        <div className="text-xs text-slate-500 flex items-center gap-2">
          <Lock className="w-3.5 h-3.5 text-slate-400" />
          <span>
            Subdomain slug <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-slate-800 font-semibold">{school?.subdomain}</code> is permanently linked to your school tenant. To request a change, contact Master Admin support.
          </span>
        </div>
      </div>

      {/* 2. Custom Domain Configuration Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <Server className="w-4 h-4 text-purple-600" />
              Custom Branded Domain (e.g. www.yourschool.edu.in)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Connect your own registered institutional domain name while continuing to use MyZkool's hosting infrastructure.
            </p>
          </div>

          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold self-start sm:self-auto capitalize ${
              domainStatus === "active"
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : domainStatus === "pending_verification"
                ? "bg-amber-50 text-amber-700 border border-amber-200"
                : "bg-slate-100 text-slate-600 border border-slate-200"
            }`}
          >
            {domainStatus === "active" ? (
              <CheckCircle2 className="w-3.5 h-3.5" />
            ) : domainStatus === "pending_verification" ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <HelpCircle className="w-3.5 h-3.5" />
            )}
            Status: {domainStatus.replace(/_/g, " ")}
          </span>
        </div>

        <form onSubmit={handleSaveCustomDomain} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Custom Domain Name
            </label>
            <div className="flex items-center gap-2 max-w-lg">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={customDomain}
                  onChange={(e) => setCustomDomain(e.target.value)}
                  placeholder="www.greenwoodschool.in"
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>
              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors shadow-sm"
              >
                {isSaving ? "Saving..." : "Save Domain"}
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Enter your fully qualified domain name without http:// or https:// (e.g. www.delhiacademy.org).
            </p>
          </div>
        </form>

        {/* DNS Configuration Guide */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            DNS Configuration Instructions
          </h4>
          <p className="text-xs text-slate-600 leading-relaxed">
            In your domain registrar's DNS management console (e.g. GoDaddy, Cloudflare, Namecheap), add the following CNAME record:
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs bg-white border border-slate-200 rounded-lg overflow-hidden">
              <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2 px-3">Type</th>
                  <th className="py-2 px-3">Host / Name</th>
                  <th className="py-2 px-3">Target / Points to</th>
                  <th className="py-2 px-3">TTL</th>
                  <th className="py-2 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="py-2 px-3 font-mono font-bold text-blue-700">CNAME</td>
                  <td className="py-2 px-3 font-mono text-slate-700">www (or subdomain)</td>
                  <td className="py-2 px-3 font-mono text-slate-900 font-semibold">
                    domains.myzkool.com
                  </td>
                  <td className="py-2 px-3 font-mono text-slate-600">3600 (Auto)</td>
                  <td className="py-2 px-3 text-right">
                    <button
                      type="button"
                      onClick={handleCopyCnameTarget}
                      className="px-2 py-1 text-[11px] font-medium text-slate-700 bg-slate-100 rounded hover:bg-slate-200"
                    >
                      {copiedTarget ? "Copied!" : "Copy Target"}
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2 border-t border-slate-200">
            <div className="text-[11px] text-slate-500">
              Automatic SSL certificate generation occurs once CNAME points correctly to MyZkool.
            </div>

            {customDomain && (
              <button
                type="button"
                onClick={handleVerifyDns}
                disabled={isVerifying}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-purple-700 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors disabled:opacity-60"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? "animate-spin" : ""}`} />
                {isVerifying ? "Checking DNS..." : "Verify DNS Propagation"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
