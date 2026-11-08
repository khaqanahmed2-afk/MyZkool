import React, { useState, useEffect, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import type { School } from "../../types/school";
import {
  getAdminDashboardData,
  type AdminDashboardData,
} from "../../services/adminDashboardService";
import { DashboardWelcomeBanner } from "../../components/admin/dashboard/DashboardWelcomeBanner";
import { DashboardKpiCards } from "../../components/admin/dashboard/DashboardKpiCards";
import { StudentStrengthChart } from "../../components/admin/dashboard/StudentStrengthChart";
import { AttendanceDonutWidget } from "../../components/admin/dashboard/AttendanceDonutWidget";
import { FeeCollectionDonutWidget } from "../../components/admin/dashboard/FeeCollectionDonutWidget";
import { QuickActionsWidget } from "../../components/admin/dashboard/QuickActionsWidget";
import { ExploreModulesWidget } from "../../components/admin/dashboard/ExploreModulesWidget";

export default function DashboardHome() {
  const { profile, currentAcademicYear } = useAuth();
  const { school } = useOutletContext<{ school: School | null }>();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<AdminDashboardData | null>(null);

  const adminName = profile?.full_name?.split(" ")[0] || "Rashid";
  const academicYearLabel = currentAcademicYear?.label || "2026 – 2027";

  const loadData = useCallback(async () => {
    if (!school?.id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getAdminDashboardData({
        schoolId: school.id,
        academicYearId: currentAcademicYear?.id,
      });
      setDashboardData(data);
    } catch (err: any) {
      console.error("Failed to load dashboard data:", err);
      setError(err?.message || "Failed to load dashboard statistics");
    } finally {
      setLoading(false);
    }
  }, [school?.id, currentAcademicYear?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Fallback default KPIs if data is not yet loaded
  const kpis = dashboardData?.kpis || {
    totalStudents: 0,
    studentsGrowthPct: 3.2,
    totalStaff: 0,
    staffGrowthPct: 2.4,
    attendancePresent: 0,
    attendanceAbsent: 0,
    attendanceTotal: 0,
    attendanceRatePct: null,
    attendanceRecorded: false,
    pendingFeesPaise: 0,
    pendingFeesGrowthPct: -6.8,
    collectedFeesPaise: 0,
    totalFeesPaise: 0,
    feeCollectionRatePct: 0,
  };

  const classStrength = dashboardData?.classStrength || [];
  const feeMetrics = dashboardData?.feeMetrics || {
    totalCollectedPaise: 0,
    thisMonthCollectedPaise: 0,
    lastMonthCollectedPaise: 0,
    todayCollectedPaise: 0,
    totalOutstandingPaise: 0,
    totalOverduePaise: 0,
    pendingCurrentPaise: 0,
    totalGrossBilledPaise: 0,
    totalConcessionsPaise: 0,
    totalNetBilledPaise: 0,
    totalStudentsCount: 0,
    collectionRatePct: 0,
    monthChangePct: null,
    monthlyTrend: [],
  };

  return (
    <div className="max-w-[1520px] mx-auto space-y-4 sm:space-y-6 pb-12 w-full">
      {/* =========================================================
          BANNER / WELCOME HERO
      ========================================================= */}
      <DashboardWelcomeBanner
        school={school}
        adminName={adminName}
        academicYearLabel={academicYearLabel}
      />

      {/* Error Notice if any */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-700 flex items-center justify-between">
          <span>{error}</span>
          <button
            type="button"
            onClick={loadData}
            className="underline hover:text-red-900 cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* =========================================================
          ROW 1: 4 TOP KPI CARDS
      ========================================================= */}
      <DashboardKpiCards kpis={kpis} loading={loading} />

      {/* =========================================================
          ROW 2: CHARTS & ANALYTICS WIDGETS
          - Student Strength (Bar Chart)
          - Today's Attendance (Donut Chart)
          - Fee Collection (Donut Chart)
      ========================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr] gap-4 sm:gap-5 items-stretch">
        {/* Student Strength Bar Chart */}
        <div className="md:col-span-2 lg:col-span-1 flex flex-col min-w-0">
          <StudentStrengthChart data={classStrength} loading={loading} />
        </div>

        {/* Today's Attendance Donut Widget */}
        <div className="md:col-span-1 lg:col-span-1 flex flex-col min-w-0">
          <AttendanceDonutWidget kpis={kpis} loading={loading} />
        </div>

        {/* Fee Collection Donut Widget */}
        <div className="md:col-span-1 lg:col-span-1 flex flex-col min-w-0">
          <FeeCollectionDonutWidget feeMetrics={feeMetrics} loading={loading} />
        </div>
      </div>

      {/* =========================================================
          ROW 4: QUICK ACTIONS
          - Prominent full-width responsive grid of essential actions
      ========================================================= */}
      <QuickActionsWidget />

      {/* =========================================================
          ROW 5: EXPLORE MODULES
          - Polished module navigation section with comprehensive coverage
      ========================================================= */}
      <ExploreModulesWidget />
    </div>
  );
}
