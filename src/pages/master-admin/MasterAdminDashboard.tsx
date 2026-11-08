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
import { School, Users, IndianRupee, Layers, AlertCircle, RefreshCw } from "lucide-react";

export default function MasterAdminDashboard() {
  const { dateRange } = useOutletContext<{ dateRange: string }>();
  const { token } = useMasterAdminAuth();

  const [metrics, setMetrics] = useState<DashboardMetricsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/master-admin/dashboard/metrics?period=${dateRange}`, {
        headers: {
          Authorization: `Bearer ${token || "test-token-admin"}`,
        },
      });

      if (!res.ok) {
        throw new Error(`Failed to load dashboard metrics (Status: ${res.status})`);
      }

      const json = await res.json();
      if (json.success && json.data) {
        setMetrics(json.data as DashboardMetricsPayload);
      } else {
        throw new Error(json.error || "Malformed metrics response payload.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to load dashboard metrics.");
    } finally {
      setLoading(false);
    }
  }, [dateRange, token]);

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

  if (error || !metrics) {
    return (
      <div className="p-8 bg-white border border-rose-200 rounded-2xl text-center shadow-xs">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-900 mb-1">Failed to load platform metrics</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto mb-5 leading-relaxed">{error}</p>
        <button
          onClick={fetchMetrics}
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
      {/* ── ROW 1: TOP 4 KPI CARDS ──────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <MetricKpiCard
          title="Total Schools"
          value={metrics.kpis.totalSchools.count}
          trendPercent={metrics.kpis.totalSchools.trendPercent}
          isPositive={metrics.kpis.totalSchools.isPositive}
          subtext={`${metrics.schoolBreakdown?.onboardingCompleted ?? 5} completed · ${metrics.schoolBreakdown?.onboardingPending ?? 1} pending`}
          icon={School}
          iconBgColor="bg-blue-50"
          iconColor="text-blue-600"
        />
        <MetricKpiCard
          title="Total Students"
          value={metrics.kpis.totalStudents.count.toLocaleString("en-IN")}
          trendPercent={metrics.kpis.totalStudents.trendPercent}
          isPositive={metrics.kpis.totalStudents.isPositive}
          icon={Users}
          iconBgColor="bg-emerald-50"
          iconColor="text-emerald-600"
        />
        <MetricKpiCard
          title="Total Revenue"
          value={metrics.kpis.totalRevenueFormatted}
          trendPercent={metrics.kpis.revenueTrendPercent}
          isPositive={metrics.kpis.isRevenuePositive}
          icon={IndianRupee}
          iconBgColor="bg-amber-50"
          iconColor="text-amber-600"
        />
        <MetricKpiCard
          title="Active Subscriptions"
          value={metrics.kpis.activeSubscriptions.count}
          trendPercent={metrics.kpis.activeSubscriptions.trendPercent}
          isPositive={metrics.kpis.activeSubscriptions.isPositive}
          icon={Layers}
          iconBgColor="bg-indigo-50"
          iconColor="text-indigo-600"
        />
      </div>

      {/* ── ROW 2: PRIMARY CHARTS & SYSTEM HEALTH ────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <SchoolRegistrationsChart
          timeline={metrics.schoolRegistrations.timeline}
          totalSchools={metrics.kpis.totalSchools.count}
          trendPercent={metrics.kpis.totalSchools.trendPercent}
        />
        <SubscriptionRevenueChart
          monthlyData={metrics.subscriptionRevenue.monthly}
          totalRevenueFormatted={metrics.kpis.totalRevenueFormatted}
          trendPercent={metrics.kpis.revenueTrendPercent}
        />
        <SystemHealthCard health={metrics.systemHealth} />
      </div>

      {/* ── ROW 3: 3-COLUMN LOWER SECTION MATCHING ARCHITECTURE MOCKUP ─ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch">
        {/* Column 1: Recent Activities (Tall card) */}
        <div className="flex flex-col">
          <RecentActivitiesCard activities={metrics.recentActivities} />
        </div>

        {/* Column 2: Subscription Overview + Key Insights */}
        <div className="flex flex-col gap-5 justify-between">
          <SubscriptionDonutChart
            distribution={metrics.planDistribution}
            totalSchools={metrics.kpis.totalSchools.count}
          />
          <KeyInsightsCard insights={metrics.keyInsights} />
        </div>

        {/* Column 3: Quick Actions + Pending Attention */}
        <div className="flex flex-col gap-5 justify-between">
          <QuickActionsCard />
          <PendingAttentionCard summary={metrics.pendingAttention} />
        </div>
      </div>
    </div>
  );
}

