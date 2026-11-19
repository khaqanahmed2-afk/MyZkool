import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Globe,
  ExternalLink,
  Edit3,
  Users,
  Eye,
  FileText,
  MessageSquare,
  TrendingUp,
  Calendar,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Plus,
  Palette,
  Image as ImageIcon,
} from "lucide-react";
import { useAuth } from "../../../hooks/useAuth";
import {
  getSchoolWebsite,
  getWebsiteAnalyticsSummary,
  getAdmissionEnquiries,
  formatSchoolWebsiteUrl,
} from "../../../services/websiteService";
import type { SchoolWebsite, WebsiteAnalyticsSummary, AdmissionEnquiry } from "../../../types/website";
import { WebsiteHeader } from "./WebsiteHeader";

export default function WebsiteOverviewPage() {
  const { school } = useAuth();
  const [website, setWebsite] = useState<SchoolWebsite | null>(null);
  const [analytics, setAnalytics] = useState<WebsiteAnalyticsSummary | null>(null);
  const [recentEnquiries, setRecentEnquiries] = useState<AdmissionEnquiry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [dateRange, setDateRange] = useState<"today" | "7d" | "30d" | "90d">("7d");

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      if (!school?.id) return;
      setIsLoading(true);
      try {
        const [webRes, analRes, enqRes] = await Promise.all([
          getSchoolWebsite(school.id),
          getWebsiteAnalyticsSummary({ schoolId: school.id, period: dateRange }),
          getAdmissionEnquiries({ schoolId: school.id }),
        ]);

        if (!isMounted) return;
        if (webRes.website) setWebsite(webRes.website);
        if (analRes.summary) setAnalytics(analRes.summary);
        if (enqRes.enquiries) setRecentEnquiries(enqRes.enquiries.slice(0, 5));
      } catch (err) {
        console.warn("Error loading website overview:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, [school?.id, dateRange]);

  const publicUrl = school?.subdomain ? formatSchoolWebsiteUrl(school.subdomain) : "";

  const handleCopyUrl = () => {
    if (!publicUrl) return;
    navigator.clipboard.writeText(publicUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const publishedPagesCount = website?.pages
    ? website.pages.filter((p) => p.is_enabled).length
    : 0;

  const totalEnquiriesCount = recentEnquiries.length;
  const newEnquiriesCount = recentEnquiries.filter((e) => e.status === "new").length;

  return (
    <div className="space-y-6">
      <WebsiteHeader
        title="Website Overview"
        description="Monitor performance, quick status, and manage your school's public website from one place."
        website={website}
        actions={
          <Link
            to="/admin/website/editor"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm transition-colors"
          >
            <Edit3 className="w-4 h-4" />
            Edit Website
          </Link>
        }
      />

      {/* Hero Summary Card: Identity & Status */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden">
              {website?.logo_url ? (
                <img
                  src={website.logo_url}
                  alt={website.site_name}
                  className="w-full h-full object-contain p-1"
                />
              ) : (
                <Globe className="w-8 h-8 text-slate-400" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl font-bold text-slate-900">
                  {website?.site_name || school?.name || "School Website"}
                </h2>
                {website?.published ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3" /> Live
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                    <AlertCircle className="w-3 h-3" /> Unpublished Draft
                  </span>
                )}
              </div>

              {website?.tagline && (
                <p className="text-sm text-slate-500 mt-0.5">{website.tagline}</p>
              )}

              {/* Public URL & Quick Copy */}
              <div className="mt-2.5 flex items-center gap-2 text-sm text-slate-600">
                <span className="font-medium text-slate-500">Public URL:</span>
                <a
                  href={publicUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline font-mono text-xs sm:text-sm flex items-center gap-1"
                >
                  {publicUrl}
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <button
                  type="button"
                  onClick={handleCopyUrl}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors"
                  title="Copy URL"
                >
                  {copiedUrl ? (
                    <Check className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Published Timestamp & Quick Controls */}
          <div className="flex flex-col sm:flex-row md:flex-col items-start md:items-end justify-between gap-2.5 pt-4 md:pt-0 border-t md:border-t-0 border-slate-100">
            <div className="text-xs text-slate-500">
              <span className="text-slate-400">Last Published: </span>
              <span className="font-medium text-slate-700">
                {website?.last_published_at
                  ? new Date(website.last_published_at).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : website?.published
                  ? "Published"
                  : "Not published yet"}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Link
                to="/admin/website/editor"
                className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
              >
                Customize Content
              </Link>
              <Link
                to="/admin/website/settings"
                className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
              >
                General Settings
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Core Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Visitors */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
              Total Visitors
            </span>
            <span className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Users className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {analytics?.totalVisitors ?? 0}
            </span>
            <span className="text-xs text-slate-500">
              unique sessions
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Across {dateRange === "today" ? "today" : `last ${dateRange}`}
          </p>
        </div>

        {/* Metric 2: Total Page Views */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
              Page Views
            </span>
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Eye className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {analytics?.totalPageViews ?? 0}
            </span>
            <span className="text-xs text-slate-500">hits</span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Excludes preview traffic
          </p>
        </div>

        {/* Metric 3: Admission Enquiries */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
              Admissions Leads
            </span>
            <span className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <MessageSquare className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {totalEnquiriesCount}
            </span>
            {newEnquiriesCount > 0 && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                {newEnquiriesCount} new
              </span>
            )}
          </div>
          <Link
            to="/admin/website/enquiries"
            className="mt-1 text-xs text-blue-600 hover:underline flex items-center gap-1 font-medium"
          >
            Manage Enquiries <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {/* Metric 4: Published Pages */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
              Active Pages
            </span>
            <span className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <FileText className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {publishedPagesCount}
            </span>
            <span className="text-xs text-slate-500">of {website?.pages?.length || 5}</span>
          </div>
          <Link
            to="/admin/website/pages"
            className="mt-1 text-xs text-blue-600 hover:underline flex items-center gap-1 font-medium"
          >
            Configure Navigation <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* Analytics Summary & Date Filter */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              Website Traffic & Visitor Trends
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Real telemetry collected directly from public site visits.
            </p>
          </div>

          {/* Date Range Selector */}
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
            {(["today", "7d", "30d", "90d"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setDateRange(r)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  dateRange === r
                    ? "bg-white text-slate-900 shadow-sm font-semibold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {r === "today"
                  ? "Today"
                  : r === "7d"
                  ? "7 Days"
                  : r === "30d"
                  ? "30 Days"
                  : "90 Days"}
              </button>
            ))}
          </div>
        </div>

        {/* Analytics Content / Empty State */}
        {analytics?.hasData ? (
          <div className="space-y-6 pt-2">
            {/* Daily Trend Visual */}
            <div>
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                Daily Activity Breakdown
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
                {analytics.trafficTrends.map((trend) => (
                  <div
                    key={trend.date}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-center"
                  >
                    <div className="text-xs text-slate-500 font-medium">
                      {new Date(trend.date).toLocaleDateString("en-IN", {
                        weekday: "short",
                        day: "numeric",
                      })}
                    </div>
                    <div className="text-lg font-bold text-slate-900 mt-1">
                      {trend.pageViews}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {trend.visitors} unique
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Visited Pages */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 pt-2">
              <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50">
                <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-3 flex items-center justify-between">
                  <span>Most Visited Pages</span>
                  <span className="text-[11px] font-normal text-slate-500">
                    {analytics.viewsByPage.length} pages
                  </span>
                </h4>
                <div className="space-y-2">
                  {analytics.viewsByPage.slice(0, 5).map((page) => (
                    <div
                      key={page.path}
                      className="flex items-center justify-between text-sm py-1.5 px-2.5 bg-white rounded border border-slate-200"
                    >
                      <span className="font-mono text-xs text-slate-700 truncate max-w-[200px]">
                        {page.path}
                      </span>
                      <span className="font-semibold text-slate-900 text-xs">
                        {page.views} views
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Device Breakdown */}
              <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50">
                <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-3">
                  Visitor Device Category
                </h4>
                <div className="space-y-3">
                  {analytics.deviceBreakdown.map((item) => (
                    <div key={item.device} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="capitalize font-medium text-slate-700">
                          {item.device}
                        </span>
                        <span className="text-slate-500">
                          {item.count} views ({item.percentage}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-blue-600 h-full rounded-full"
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-10 px-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl">
            <Globe className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h4 className="text-sm font-semibold text-slate-700">
              No Visitor Activity Recorded Yet
            </h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              Traffic telemetry starts collecting automatically when prospective parents
              and visitors view your live school website. Internal admin previews are excluded.
            </p>
            {publicUrl && (
              <a
                href={publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 mt-3 text-xs font-medium text-blue-600 hover:underline"
              >
                Visit Public Website <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        )}
      </div>

      {/* Two-Column Grid: Recent Enquiries & Quick Management Shortcuts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Recent Admission Enquiries */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-amber-600" />
                Recent Admission Enquiries
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Prospective student enquiries submitted via your public portal.
              </p>
            </div>
            <Link
              to="/admin/website/enquiries"
              className="text-xs font-medium text-blue-600 hover:underline flex items-center gap-1"
            >
              View All <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {recentEnquiries.length > 0 ? (
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
              {recentEnquiries.map((enq) => (
                <div
                  key={enq.id}
                  className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-slate-50/70 transition-colors"
                >
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-slate-900">
                        {enq.student_name ? `${enq.student_name} (${enq.parent_name})` : enq.parent_name}
                      </span>
                      <span className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                        Class {enq.class_grade}
                      </span>
                      <span
                        className={`px-2 py-0.5 text-[11px] font-semibold rounded-full capitalize ${
                          enq.status === "new"
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : enq.status === "contacted"
                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                            : enq.status === "converted"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {enq.status}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1 flex items-center gap-3">
                      <span>{enq.phone}</span>
                      {enq.email && <span>{enq.email}</span>}
                      <span>
                        {new Date(enq.created_at).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                    </div>
                  </div>

                  <Link
                    to="/admin/website/enquiries"
                    className="self-start sm:self-center px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded hover:bg-slate-50"
                  >
                    View Details
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 bg-slate-50 border border-dashed border-slate-200 rounded-lg">
              <MessageSquare className="w-8 h-8 text-slate-300 mx-auto mb-1" />
              <p className="text-xs text-slate-500">No admission enquiries submitted yet.</p>
            </div>
          )}
        </div>

        {/* Right 1 Col: Quick Management Actions */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-600" />
            Quick Shortcuts
          </h3>
          <p className="text-xs text-slate-500">
            Frequently used modules to keep your school website fresh and engaging.
          </p>

          <div className="space-y-2.5 pt-1">
            <Link
              to="/admin/website/editor"
              className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/40 transition-colors group"
            >
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <Edit3 className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-slate-900">Website Editor</div>
                <div className="text-xs text-slate-500">Edit homepage sections & principal message</div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
            </Link>

            <Link
              to="/admin/website/news"
              className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/40 transition-colors group"
            >
              <div className="p-2 bg-amber-50 text-amber-600 rounded-lg group-hover:bg-amber-600 group-hover:text-white transition-colors">
                <Plus className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-slate-900">Post Announcement</div>
                <div className="text-xs text-slate-500">Publish news, notices, or upcoming events</div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
            </Link>

            <Link
              to="/admin/website/themes"
              className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/40 transition-colors group"
            >
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                <Palette className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-slate-900">Themes & Design</div>
                <div className="text-xs text-slate-500">Customize brand colors and header layouts</div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
            </Link>

            <Link
              to="/admin/website/media"
              className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/40 transition-colors group"
            >
              <div className="p-2 bg-purple-50 text-purple-600 rounded-lg group-hover:bg-purple-600 group-hover:text-white transition-colors">
                <ImageIcon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-slate-900">Media Library</div>
                <div className="text-xs text-slate-500">Upload campus photos, badges, and banners</div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
            </Link>

            <Link
              to="/admin/website/domain"
              className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/40 transition-colors group"
            >
              <div className="p-2 bg-slate-100 text-slate-600 rounded-lg group-hover:bg-slate-700 group-hover:text-white transition-colors">
                <Globe className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-slate-900">Domain & URL</div>
                <div className="text-xs text-slate-500">Manage subdomain and custom domain settings</div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
