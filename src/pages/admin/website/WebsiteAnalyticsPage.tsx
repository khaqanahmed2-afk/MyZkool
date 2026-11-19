import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../../hooks/useAuth";
import {
  getSchoolWebsite,
  getWebsiteAnalyticsSummary,
  formatSchoolWebsiteUrl,
} from "../../../services/websiteService";
import type { SchoolWebsite, WebsiteAnalyticsSummary } from "../../../types/website";
import { WebsiteHeader } from "./WebsiteHeader";
import {
  TrendingUp,
  Users,
  Eye,
  Monitor,
  Smartphone,
  Tablet,
  Globe,
  ExternalLink,
  Calendar,
  Layers,
  ArrowUpRight,
  ShieldCheck,
} from "lucide-react";

export default function WebsiteAnalyticsPage() {
  const { school } = useAuth();
  const [website, setWebsite] = useState<SchoolWebsite | null>(null);
  const [analytics, setAnalytics] = useState<WebsiteAnalyticsSummary | null>(null);
  const [period, setPeriod] = useState<"today" | "7d" | "30d" | "90d" | "custom">("7d");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!school?.id) return;
    setIsLoading(true);
    try {
      const [webRes, analRes] = await Promise.all([
        getSchoolWebsite(school.id),
        getWebsiteAnalyticsSummary({
          schoolId: school.id,
          period,
          customStart: customStart ? new Date(customStart).toISOString() : undefined,
          customEnd: customEnd ? new Date(customEnd).toISOString() : undefined,
        }),
      ]);

      if (webRes.website) setWebsite(webRes.website);
      if (analRes.summary) setAnalytics(analRes.summary);
    } catch (err) {
      console.warn("Analytics error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [school?.id, period, customStart, customEnd]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const publicUrl = school?.subdomain ? formatSchoolWebsiteUrl(school.subdomain) : "";

  const viewsPerVisitor =
    analytics && analytics.uniqueVisitors > 0
      ? (analytics.totalPageViews / analytics.uniqueVisitors).toFixed(1)
      : "0";

  return (
    <div className="space-y-6">
      <WebsiteHeader
        title="Website Traffic & Visitor Analytics"
        description="Authentic traffic measurements, unique visitor sessions, top visited pages, device breakdown, and traffic sources."
        website={website}
      />

      {/* Filter and Date Range Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Date Presets */}
        <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
          {[
            { id: "today", label: "Today" },
            { id: "7d", label: "Last 7 Days" },
            { id: "30d", label: "Last 30 Days" },
            { id: "90d", label: "Last 90 Days" },
            { id: "custom", label: "Custom Range" },
          ].map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setPeriod(r.id as any)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                period === r.id
                  ? "bg-white text-slate-900 shadow-sm font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* Custom Range Inputs */}
        {period === "custom" && (
          <div className="flex items-center gap-2 text-xs">
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="px-2.5 py-1 border border-slate-300 rounded text-slate-700"
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="px-2.5 py-1 border border-slate-300 rounded text-slate-700"
            />
          </div>
        )}

        {/* Internal Traffic Excluded Badge */}
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Internal admin previews filtered out</span>
        </div>
      </div>

      {/* Core KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Unique Visitors */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Unique Visitors
            </span>
            <span className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Users className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900">
              {analytics?.uniqueVisitors ?? 0}
            </span>
            <span className="text-xs text-slate-500">individuals</span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Deduplicated visitor sessions
          </p>
        </div>

        {/* KPI 2: Total Page Views */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Page Views
            </span>
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Eye className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900">
              {analytics?.totalPageViews ?? 0}
            </span>
            <span className="text-xs text-slate-500">page loads</span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Total content requests
          </p>
        </div>

        {/* KPI 3: Pages per Visitor */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Pages / Visitor
            </span>
            <span className="p-2 bg-purple-50 text-purple-600 rounded-lg">
              <Layers className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900">
              {viewsPerVisitor}
            </span>
            <span className="text-xs text-slate-500">avg pages/session</span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Visitor engagement depth
          </p>
        </div>

        {/* KPI 4: Most Visited Route */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Top Visited Route
            </span>
            <span className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-lg font-bold text-slate-900 font-mono truncate">
              {analytics?.viewsByPage[0]?.path || "/"}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {analytics?.viewsByPage[0]?.views ?? 0} views ({analytics?.hasData && analytics.totalPageViews > 0 ? Math.round(((analytics?.viewsByPage[0]?.views || 0) / analytics.totalPageViews) * 100) : 0}%)
            </p>
          </div>
        </div>
      </div>

      {analytics?.hasData ? (
        <div className="space-y-6">
          {/* Daily Trend Visual Chart */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-sm space-y-4">
            <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              Daily Traffic Trajectory
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3 pt-2">
              {analytics.trafficTrends.map((trend) => (
                <div
                  key={trend.date}
                  className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center space-y-1 hover:border-blue-300 transition-colors"
                >
                  <div className="text-xs text-slate-500 font-medium">
                    {new Date(trend.date).toLocaleDateString("en-IN", {
                      weekday: "short",
                      day: "numeric",
                    })}
                  </div>
                  <div className="text-xl font-bold text-slate-900">
                    {trend.pageViews}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {trend.visitors} unique
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Two-Column Grid: Top Pages & Device/Referrers */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Visited Pages Table */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-slate-900">
                  Page Performance Breakdown
                </h3>
                <span className="text-xs text-slate-500">
                  {analytics.viewsByPage.length} distinct URLs
                </span>
              </div>

              <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
                {analytics.viewsByPage.map((page) => {
                  const pct = Math.round((page.views / analytics.totalPageViews) * 100);
                  return (
                    <div key={page.path} className="p-3 bg-white space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="font-mono text-slate-800">{page.path}</span>
                        <span className="text-slate-600">
                          {page.views} views ({pct}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-blue-600 h-full rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Devices & Referrers */}
            <div className="space-y-6">
              {/* Devices */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                <h3 className="text-base font-semibold text-slate-900">
                  Visitor Device Platforms
                </h3>

                <div className="space-y-3">
                  {analytics.deviceBreakdown.map((dev) => (
                    <div key={dev.device} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="capitalize font-semibold text-slate-700 flex items-center gap-1.5">
                          {dev.device === "mobile" ? (
                            <Smartphone className="w-3.5 h-3.5 text-blue-600" />
                          ) : dev.device === "tablet" ? (
                            <Tablet className="w-3.5 h-3.5 text-purple-600" />
                          ) : (
                            <Monitor className="w-3.5 h-3.5 text-slate-600" />
                          )}
                          {dev.device}
                        </span>
                        <span className="text-slate-500 font-mono">
                          {dev.count} views ({dev.percentage}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-blue-600 h-full rounded-full"
                          style={{ width: `${dev.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Referrers */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
                <h3 className="text-base font-semibold text-slate-900">
                  Referring Sources
                </h3>

                <div className="space-y-2">
                  {analytics.referrers.map((ref) => (
                    <div
                      key={ref.source}
                      className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-slate-50 border border-slate-200"
                    >
                      <span className="font-medium text-slate-700 truncate max-w-xs">
                        {ref.source}
                      </span>
                      <span className="font-semibold text-slate-900">
                        {ref.count} visits
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Empty State */
        <div className="bg-white border border-dashed border-slate-200 rounded-xl p-12 text-center space-y-3">
          <Globe className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">
            No Traffic Recorded for Selected Period
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            Visitor activity will begin populating here automatically as parents, students,
            and visitors browse your public school website. Internal administrative previews are excluded.
          </p>
          {publicUrl && (
            <a
              href={publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:underline pt-2"
            >
              Open Live School Website <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      )}
    </div>
  );
}
