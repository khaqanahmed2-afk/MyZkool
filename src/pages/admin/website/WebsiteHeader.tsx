import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Globe,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Eye,
  Sparkles,
} from "lucide-react";
import { useAuth } from "../../../hooks/useAuth";
import { formatSchoolWebsiteUrl } from "../../../services/websiteService";
import type { SchoolWebsite } from "../../../types/website";

interface WebsiteHeaderProps {
  title: string;
  description?: string;
  website?: SchoolWebsite | null;
  actions?: React.ReactNode;
}

export const WEBSITE_TABS = [
  { label: "Overview", href: "/admin/website", exact: true },
  { label: "Editor", href: "/admin/website/editor" },
  { label: "Pages", href: "/admin/website/pages" },
  { label: "Themes & Design", href: "/admin/website/themes" },
  { label: "Media Library", href: "/admin/website/media" },
  { label: "News & Notices", href: "/admin/website/news" },
  { label: "Admission Enquiries", href: "/admin/website/enquiries" },
  { label: "Analytics", href: "/admin/website/analytics" },
  { label: "SEO Settings", href: "/admin/website/seo" },
  { label: "Domain & URL", href: "/admin/website/domain" },
  { label: "Settings", href: "/admin/website/settings" },
];

export function WebsiteHeader({
  title,
  description,
  website,
  actions,
}: WebsiteHeaderProps) {
  const location = useLocation();
  const { school } = useAuth();

  const publicUrl = school?.subdomain
    ? formatSchoolWebsiteUrl(school.subdomain)
    : "";
  const isPublished = website?.published ?? false;

  const isActiveTab = (tabHref: string, exact?: boolean) => {
    const current = location.pathname.replace(/\/+$/, "") || "/";
    const target = tabHref.replace(/\/+$/, "") || "/";
    if (exact || target === "/admin/website") {
      return current === "/admin/website" || current === "/admin/website/overview";
    }
    return current === target || current.startsWith(target + "/");
  };

  return (
    <div className="bg-white border-b border-slate-200 -mx-4 -mt-4 sm:-mx-6 sm:-mt-6 lg:-mx-8 lg:-mt-8 mb-6 sm:mb-8 px-4 sm:px-6 lg:px-8 pt-6 pb-0">
      {/* Top Bar: Title, Status, Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-5">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
              <span className="p-2 bg-blue-50 text-blue-600 rounded-lg border border-blue-100">
                <Globe className="w-5 h-5" />
              </span>
              {title}
            </h1>

            {/* Publication Status Badge */}
            <div className="flex items-center gap-1.5">
              {isPublished ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Live & Published
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Draft Mode (Unpublished)
                </span>
              )}
            </div>
          </div>

          {description && (
            <p className="mt-1.5 text-sm text-slate-500 max-w-2xl">
              {description}
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {actions}

          {publicUrl && (
            <a
              href={publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm"
              title="Open public website in a new tab"
            >
              <ExternalLink className="w-4 h-4 text-slate-500" />
              View Website
            </a>
          )}
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto scrollbar-none border-t border-slate-100 pt-1 -mb-px">
        {WEBSITE_TABS.map((tab) => {
          const active = isActiveTab(tab.href, tab.exact);
          return (
            <Link
              key={tab.href}
              to={tab.href}
              className={`whitespace-nowrap px-3.5 py-2.5 text-sm font-medium border-b-2 transition-all flex items-center gap-1.5 ${
                active
                  ? "border-blue-600 text-blue-600 font-semibold"
                  : "border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
