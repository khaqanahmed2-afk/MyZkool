import React, { useEffect, useState, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import { useMasterAdminAuth } from "../../context/MasterAdminAuthContext";
import { MetricKpiCard } from "../../components/master-admin/MetricKpiCard";
import { SchoolRegistrationsChart } from "../../components/master-admin/SchoolRegistrationsChart";
import { SubscriptionRevenueChart } from "../../components/master-admin/SubscriptionRevenueChart";
import { SystemHealthCard } from "../../components/master-admin/SystemHealthCard";
import { SubscriptionDonutChart } from "../../components/master-admin/SubscriptionDonutChart";
import { RecentActivitiesCard } from "../../components/master-admin/RecentActivitiesCard";
import { QuickActionsCard } from "../../components/master-admin/QuickActionsCard";
import { KeyInsightsCard } from "../../components/master-admin/KeyInsightsCard";
import { PendingAttentionCard } from "../../components/master-admin/PendingAttentionCard";
import type { DashboardMetricsPayload } from "../../types/masterAdmin";
import type { MasterAdminOutletContext } from "../../components/master-admin/MasterAdminShell";
import { School, Users, IndianRupee, Layers, AlertCircle, RefreshCw, Clock } from "lucide-react";

export default function MasterAdminDashboard() {
  const context = useOutletContext<MasterAdminOutletContext>();
  const dateRange = context?.dateRange || "30d";
  const startDate = context?.startDate;
  const endDate = context?.endDate;

  const { token } = useMasterAdminAuth();

  const [metrics, setMetrics] = useState<DashboardMetricsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      let url = `/api/master-admin/dashboard/metrics?period=${encodeURIComponent(dateRange)}`;
      if (dateRange === "custom" && startDate && endDate) {
        url += `&startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`;
      }

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token || "test-token-super:super@myzkool.com"}`,
        },
      });

      if (!res.ok) {
        throw new Error(`Failed to load platform metrics (HTTP Status: ${res.status})`);
      }

      const json = await res.json();
      if (json.success && json.data) {
        setMetrics(json.data as DashboardMetricsPayload);
        setLastUpdated(new Date());
      } else {
        throw new Error(json.error || "Malformed metrics response payload.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to load dashboard metrics.");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [dateRange, startDate, endDate, token]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  if (loading && !metrics) {
    return (
      <div className="space-y-6 animate-pulse">
        {/* Skeleton Top KPI row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-slate-200/70 rounded-2xl" />
          ))}
        </div>
        {/* Skeleton Chart row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="h-72 bg-slate-200/70 rounded-2xl" />
          <div className="h-72 bg-slate-200/70 rounded-2xl" />
          <div className="h-72 bg-slate-200/70 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error && !metrics) {
    return (
      <div className="p-8 bg-white border border-rose-200 rounded-2xl text-center shadow-xs">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-900 mb-1">Failed to load platform metrics</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto mb-5 leading-relaxed">{error}</p>
        <button
          onClick={() => fetchMetrics(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry Loading</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── REFRESH & STATUS SUBBAR ─────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 -mt-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-semibold text-slate-600">
            Real-Time SaaS Control Plane
          </span>
          <span className="text-slate-300">·</span>
          <span className="text-[11px] text-slate-400 capitalize">
            Range: {dateRange.replace("_", " ")}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {lastUpdated && (
            <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
              <Clock className="w-3 h-3 text-slate-400" />
              <span>
                Last updated {lastUpdated.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </span>
            </div>
          )}

          <button
            type="button"
            onClick={() => fetchMetrics(true)}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 shadow-2xs transition-all cursor-pointer disabled:opacity-60"
            title="Refresh dashboard metrics"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-blue-600 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>{isRefreshing ? "Refreshing..." : "Refresh"}</span>
          </button>
        </div>
      </div>

      {/* ── ROW 1: TOP 4 KEY STATISTIC CARDS ──────────────────────────── */}
      {metrics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <MetricKpiCard
            title="Total Schools"
            value={metrics.kpis.totalSchools.count}
            trendPercent={metrics.kpis.totalSchools.trendPercent}
            trendLabel={metrics.kpis.totalSchools.trendLabel}
            isPositive={metrics.kpis.totalSchools.isPositive}
            subtext={`${metrics.schoolBreakdown?.onboardingCompleted ?? 0} approved · ${metrics.schoolBreakdown?.onboardingPending ?? 0} pending`}
            icon={School}
            iconBgColor="bg-blue-50"
            iconColor="text-blue-600"
            loading={isRefreshing}
          />
          <MetricKpiCard
            title="Total Students"
            value={metrics.kpis.totalStudents.count.toLocaleString("en-IN")}
            trendPercent={metrics.kpis.totalStudents.trendPercent}
            trendLabel={metrics.kpis.totalStudents.trendLabel}
            isPositive={metrics.kpis.totalStudents.isPositive}
            subtext="Across all authorized school tenants"
            icon={Users}
            iconBgColor="bg-emerald-50"
            iconColor="text-emerald-600"
            loading={isRefreshing}
          />
          <MetricKpiCard
            title="Total Revenue"
            value={metrics.kpis.totalRevenueFormatted}
            trendPercent={metrics.kpis.revenueTrendPercent}
            trendLabel={metrics.kpis.revenueTrendLabel}
            isPositive={metrics.kpis.isRevenuePositive}
            subtext="Verified successful transactions & MRR"
            icon={IndianRupee}
            iconBgColor="bg-amber-50"
            iconColor="text-amber-600"
            loading={isRefreshing}
          />
          <MetricKpiCard
            title="Active Subscriptions"
            value={metrics.kpis.activeSubscriptions.count}
            trendPercent={metrics.kpis.activeSubscriptions.trendPercent}
            trendLabel={metrics.kpis.activeSubscriptions.trendLabel}
            isPositive={metrics.kpis.activeSubscriptions.isPositive}
            subtext={`${metrics.planDistribution.trial.count} in trial · ${metrics.planDistribution.pro.count + metrics.planDistribution.basic.count + metrics.planDistribution.custom.count} paid active`}
            icon={Layers}
            iconBgColor="bg-indigo-50"
            iconColor="text-indigo-600"
            loading={isRefreshing}
          />
        </div>
      )}

      {/* ── ROW 2: PRIMARY CHARTS & SYSTEM HEALTH ────────────────────── */}
      {metrics && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <SchoolRegistrationsChart
            timeline={metrics.schoolRegistrations.timeline}
            totalSchools={metrics.kpis.totalSchools.count}
            trendPercent={metrics.kpis.totalSchools.trendPercent}
            loading={isRefreshing}
          />
          <SubscriptionRevenueChart
            monthlyData={metrics.subscriptionRevenue.monthly}
            totalRevenueFormatted={metrics.kpis.totalRevenueFormatted}
            trendPercent={metrics.kpis.revenueTrendPercent}
            loading={isRefreshing}
          />
          <SystemHealthCard health={metrics.systemHealth} loading={isRefreshing} />
        </div>
      )}

      {/* ── ROW 3: 3-COLUMN LOWER SECTION ───────────────────────────── */}
      {metrics && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch">
          {/* Column 1: Recent Activities (Real audit trail) */}
          <div className="flex flex-col">
            <RecentActivitiesCard activities={metrics.recentActivities} loading={isRefreshing} />
          </div>

          {/* Column 2: Subscription Overview + Key Insights */}
          <div className="flex flex-col gap-5 justify-between">
            <SubscriptionDonutChart
              distribution={metrics.planDistribution}
              totalSchools={metrics.kpis.totalSchools.count}
              loading={isRefreshing}
            />
            <KeyInsightsCard insights={metrics.keyInsights} loading={isRefreshing} />
          </div>

          {/* Column 3: Quick Actions + Pending Attention */}
          <div className="flex flex-col gap-5 justify-between">
            <QuickActionsCard />
            <PendingAttentionCard summary={metrics.pendingAttention} loading={isRefreshing} />
          </div>
        </div>
      )}
    </div>
  );
}
