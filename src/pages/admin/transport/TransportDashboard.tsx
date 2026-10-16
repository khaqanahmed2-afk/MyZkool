import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Bus,
  Users,
  AlertTriangle,
  Plus,
  Compass,
  IndianRupee,
  UserPlus,
  CalendarSync,
  RefreshCw,
  UserCheck,
  ChevronRight,
  ArrowRight,
} from "lucide-react";
import { getTransportDashboardData } from "../../../services/transportCoreService";
import type { TransportDashboardData } from "../../../types/transport";
import { useAuth } from "../../../hooks/useAuth";
import { checkSchoolFeature } from "../../../middleware/features";
import { TransportLockedPreview } from "./TransportLockedPreview";

export function TransportDashboard() {
  const { schoolId } = useAuth();
  const [hasFeature, setHasFeature] = useState<boolean | null>(null);
  const [dashboardData, setDashboardData] = useState<TransportDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!schoolId) return;
    checkSchoolFeature(schoolId, "transport").then((enabled) => {
      setHasFeature(enabled);
      if (enabled) loadDashboard();
      else setLoading(false);
    });
  }, [schoolId]);

  async function loadDashboard() {
    if (!schoolId) return;
    setLoading(true);
    try {
      const data = await getTransportDashboardData(schoolId);
      setDashboardData(data);
    } catch (err) {
      console.error("Failed to load transport dashboard data:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    if (!schoolId || refreshing) return;
    setRefreshing(true);
    try {
      const data = await getTransportDashboardData(schoolId);
      setDashboardData(data);
    } catch (err) {
      console.error("Failed to refresh transport dashboard:", err);
    } finally {
      setRefreshing(false);
    }
  }

  if (hasFeature === false) {
    return <TransportLockedPreview />;
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* ─── Top Header & Primary Action Bar ─── */}
      <div className="bg-white rounded-2xl border border-[#E6EAF3] p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#141A2E] font-heading">
              Transport
            </h1>
            <p className="text-xs text-[#5B6478] mt-1">
              Manage school vehicles, drivers, transit routes, stop pricing, and student transport rosters.
            </p>
          </div>

          {/* Primary Actions Aligned to Right */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleRefresh}
              disabled={loading || refreshing}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-gray-50 text-[#5B6478] hover:text-[#141A2E] border border-[#E6EAF3] text-xs font-semibold shadow-2xs transition-colors disabled:opacity-50 cursor-pointer"
              title="Refresh Dashboard Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-[#2158E0]" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <Link
              to="/admin/transport/vehicles?action=new"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-gray-50 border border-[#E6EAF3] text-[#141A2E] text-xs font-bold shadow-2xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5 text-[#2158E0]" />
              Add Vehicle
            </Link>

            <Link
              to="/admin/transport/routes?action=new"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-gray-50 border border-[#E6EAF3] text-[#141A2E] text-xs font-bold shadow-2xs transition-colors"
            >
              <Compass className="w-3.5 h-3.5 text-[#2158E0]" />
              Create Route
            </Link>

            <Link
              to="/admin/transport/assign"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2158E0] hover:bg-blue-600 text-white text-xs font-bold shadow-2xs transition-all"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Assign Students
            </Link>
          </div>
        </div>
      </div>

      {loading ? (
        /* Shimmer Loading Skeleton */
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white p-5 rounded-2xl border border-[#E6EAF3] shadow-xs animate-pulse space-y-3">
                <div className="w-8 h-8 rounded-lg bg-gray-100"></div>
                <div className="space-y-1.5">
                  <div className="h-4 w-20 bg-gray-100 rounded"></div>
                  <div className="h-7 w-16 bg-gray-200 rounded"></div>
                  <div className="h-3 w-32 bg-gray-100 rounded"></div>
                </div>
              </div>
            ))}
          </div>
          <div className="bg-white p-6 rounded-2xl border border-[#E6EAF3] shadow-xs animate-pulse space-y-4">
            <div className="h-5 w-48 bg-gray-100 rounded"></div>
            <div className="h-20 bg-gray-50 rounded-xl"></div>
          </div>
        </div>
      ) : dashboardData ? (
        <>
          {/* ─── Four Compact Summary Cards ─── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Total Vehicles */}
            <Link
              to="/admin/transport/vehicles"
              className="group bg-white p-5 rounded-2xl border border-[#E6EAF3] hover:border-blue-300 shadow-xs hover:shadow-sm transition-all space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="p-2.5 rounded-xl bg-blue-50 text-[#2158E0] group-hover:scale-105 transition-transform">
                  <Bus className="w-5 h-5" />
                </span>
                <span className="text-[11px] font-bold text-[#5B6478] group-hover:text-[#2158E0] flex items-center gap-0.5">
                  Manage <ChevronRight className="w-3 h-3" />
                </span>
              </div>
              <div>
                <p className="text-xs text-[#5B6478] font-semibold">Total Vehicles</p>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-2xl font-bold text-[#141A2E]">
                    {dashboardData.fleet_snapshot.vehicles_total}
                  </span>
                  <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                    {dashboardData.fleet_snapshot.vehicles_active} Active
                  </span>
                </div>
                <p className="text-[11px] text-[#5B6478] mt-1">
                  {dashboardData.fleet_snapshot.vehicles_total - dashboardData.fleet_snapshot.vehicles_active} inactive / maintenance
                </p>
              </div>
            </Link>

            {/* 2. Active Routes */}
            <Link
              to="/admin/transport/routes"
              className="group bg-white p-5 rounded-2xl border border-[#E6EAF3] hover:border-indigo-300 shadow-xs hover:shadow-sm transition-all space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 group-hover:scale-105 transition-transform">
                  <Compass className="w-5 h-5" />
                </span>
                <span className="text-[11px] font-bold text-[#5B6478] group-hover:text-indigo-600 flex items-center gap-0.5">
                  Routes <ChevronRight className="w-3 h-3" />
                </span>
              </div>
              <div>
                <p className="text-xs text-[#5B6478] font-semibold">Active Routes</p>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-2xl font-bold text-[#141A2E]">
                    {dashboardData.fleet_snapshot.routes_active}
                  </span>
                  <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                    {dashboardData.fleet_snapshot.routes_total ?? dashboardData.fleet_snapshot.routes_active} Configured
                  </span>
                </div>
                <p className="text-[11px] text-[#5B6478] mt-1">
                  Active school transit corridors
                </p>
              </div>
            </Link>

            {/* 3. Drivers and Attendants */}
            <Link
              to="/admin/transport/staff"
              className="group bg-white p-5 rounded-2xl border border-[#E6EAF3] hover:border-emerald-300 shadow-xs hover:shadow-sm transition-all space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 group-hover:scale-105 transition-transform">
                  <Users className="w-5 h-5" />
                </span>
                <span className="text-[11px] font-bold text-[#5B6478] group-hover:text-emerald-600 flex items-center gap-0.5">
                  Staff <ChevronRight className="w-3 h-3" />
                </span>
              </div>
              <div>
                <p className="text-xs text-[#5B6478] font-semibold">Drivers and Attendants</p>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-2xl font-bold text-[#141A2E]">
                    {dashboardData.fleet_snapshot.staff_total ?? (dashboardData.fleet_snapshot.drivers_total || 0)}
                  </span>
                  <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                    {dashboardData.fleet_snapshot.staff_active ?? (dashboardData.fleet_snapshot.drivers_active || 0)} Active
                  </span>
                </div>
                <p className="text-[11px] text-[#5B6478] mt-1">
                  {dashboardData.fleet_snapshot.drivers_total ?? 0} drivers • {dashboardData.fleet_snapshot.attendants_total ?? 0} attendants
                </p>
              </div>
            </Link>

            {/* 4. Students Using Transport */}
            <Link
              to="/admin/transport/assign"
              className="group bg-white p-5 rounded-2xl border border-[#E6EAF3] hover:border-amber-300 shadow-xs hover:shadow-sm transition-all space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="p-2.5 rounded-xl bg-amber-50 text-amber-600 group-hover:scale-105 transition-transform">
                  <UserCheck className="w-5 h-5" />
                </span>
                <span className="text-[11px] font-bold text-[#5B6478] group-hover:text-amber-600 flex items-center gap-0.5">
                  Rosters <ChevronRight className="w-3 h-3" />
                </span>
              </div>
              <div>
                <p className="text-xs text-[#5B6478] font-semibold">Students Using Transport</p>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-2xl font-bold text-[#141A2E]">
                    {dashboardData.fleet_snapshot.total_riders}
                  </span>
                  <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
                    {dashboardData.fleet_snapshot.utilization_percent}% Used
                  </span>
                </div>
                <p className="text-[11px] text-[#5B6478] mt-1">
                  Of {dashboardData.fleet_snapshot.total_capacity} total seat capacity
                </p>
              </div>
            </Link>
          </div>

          {/* Real Attention Items (Only rendered if genuine action items exist) */}
          {dashboardData.needs_attention.items.length > 0 && (
            <div className="bg-white rounded-2xl border border-rose-200 p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-rose-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-xs font-bold text-rose-950 uppercase tracking-wider">
                      Items Requiring Attention ({dashboardData.needs_attention.items.length})
                    </h2>
                  </div>
                </div>
                <span className="text-[11px] font-semibold text-rose-600">
                  Compliance & vehicle safety alerts
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {dashboardData.needs_attention.items.map((item) => (
                  <Link
                    key={item.id}
                    to={item.link}
                    className="p-3 rounded-xl border border-rose-100 bg-rose-50/40 hover:bg-rose-50/80 transition-all flex items-start justify-between gap-3 group"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <p className="font-bold text-xs text-rose-950 truncate">{item.title}</p>
                      <p className="text-[11px] text-rose-700 line-clamp-2">{item.subtitle}</p>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-rose-400 group-hover:text-rose-600 group-hover:translate-x-0.5 transition-all shrink-0 mt-0.5" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* ─── Consolidated Transport Management Links Section ─── */}
          <div className="bg-white rounded-2xl border border-[#E6EAF3] p-5 sm:p-6 shadow-xs space-y-4">
            <div>
              <h2 className="text-xs font-bold text-[#141A2E] uppercase tracking-wider">
                Transport Management
              </h2>
              <p className="text-xs text-[#5B6478] mt-0.5">
                Configure routes, staff, vehicles, and fee policies
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* 1. Fleet and Vehicles */}
              <Link
                to="/admin/transport/vehicles"
                className="group p-4 rounded-xl border border-[#E6EAF3] hover:border-blue-300 hover:bg-blue-50/30 transition-all flex items-start gap-3.5"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#2158E0] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Bus className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-[#141A2E] group-hover:text-[#2158E0] transition-colors">
                      Fleet and Vehicles
                    </h3>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-[#2158E0] group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <p className="text-[11px] text-[#5B6478] mt-0.5 line-clamp-2">
                    Buses, vans, seat capacities, fitness certificates, and vehicle documents.
                  </p>
                </div>
              </Link>

              {/* 2. Drivers and Staff */}
              <Link
                to="/admin/transport/staff"
                className="group p-4 rounded-xl border border-[#E6EAF3] hover:border-emerald-300 hover:bg-emerald-50/30 transition-all flex items-start gap-3.5"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Users className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-[#141A2E] group-hover:text-emerald-600 transition-colors">
                      Drivers and Staff
                    </h3>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <p className="text-[11px] text-[#5B6478] mt-0.5 line-clamp-2">
                    Driver licenses, police verifications, badge numbers, and crew allocations.
                  </p>
                </div>
              </Link>

              {/* 3. Route Builder */}
              <Link
                to="/admin/transport/routes"
                className="group p-4 rounded-xl border border-[#E6EAF3] hover:border-indigo-300 hover:bg-indigo-50/30 transition-all flex items-start gap-3.5"
              >
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Compass className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-[#141A2E] group-hover:text-indigo-600 transition-colors">
                      Route Builder
                    </h3>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <p className="text-[11px] text-[#5B6478] mt-0.5 line-clamp-2">
                    Transit stops, pickup & drop sequences, timings, and seat capacity.
                  </p>
                </div>
              </Link>

              {/* 4. Fee Management */}
              <Link
                to="/admin/transport/fees"
                className="group p-4 rounded-xl border border-[#E6EAF3] hover:border-purple-300 hover:bg-purple-50/30 transition-all flex items-start gap-3.5"
              >
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <IndianRupee className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-[#141A2E] group-hover:text-purple-600 transition-colors">
                      Fee Management
                    </h3>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-purple-600 group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <p className="text-[11px] text-[#5B6478] mt-0.5 line-clamp-2">
                    Route-wise stop pricing, both-way and one-way rates, and billing months.
                  </p>
                </div>
              </Link>

              {/* 5. Student Rosters */}
              <Link
                to="/admin/transport/assign"
                className="group p-4 rounded-xl border border-[#E6EAF3] hover:border-amber-300 hover:bg-amber-50/30 transition-all flex items-start gap-3.5"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-[#141A2E] group-hover:text-amber-600 transition-colors">
                      Student Rosters
                    </h3>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-amber-600 group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <p className="text-[11px] text-[#5B6478] mt-0.5 line-clamp-2">
                    Bulk allocate students to routes and stops, view student lists, and generate dues.
                  </p>
                </div>
              </Link>

              {/* 6. Year Renewal */}
              <Link
                to="/admin/transport/renewal"
                className="group p-4 rounded-xl border border-[#E6EAF3] hover:border-cyan-300 hover:bg-cyan-50/30 transition-all flex items-start gap-3.5"
              >
                <div className="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <CalendarSync className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-[#141A2E] group-hover:text-cyan-600 transition-colors">
                      Year Renewal
                    </h3>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-cyan-600 group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <p className="text-[11px] text-[#5B6478] mt-0.5 line-clamp-2">
                    Rollover routes, vehicle assignments, and student transport for the new academic session.
                  </p>
                </div>
              </Link>
            </div>
          </div>

          {/* ─── Compact Route Capacity Section ─── */}
          {dashboardData.fleet_snapshot.route_bars.length > 0 && (
            <div className="bg-white rounded-2xl border border-[#E6EAF3] p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-xs font-bold text-[#141A2E] uppercase tracking-wider">
                    Route Capacity & Seat Occupancy
                  </h2>
                  <p className="text-xs text-[#5B6478] mt-0.5">
                    Real-time seat occupancy across active school transit routes
                  </p>
                </div>
                <Link
                  to="/admin/transport/routes"
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#2158E0] hover:underline"
                >
                  Configure Routes <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="space-y-3 divide-y divide-[#E6EAF3]">
                {dashboardData.fleet_snapshot.route_bars.map((r) => {
                  const percent =
                    r.capacity > 0 ? Math.round((r.seats_used / r.capacity) * 100) : 0;
                  const isNear = percent >= 85 && !r.is_over;
                  return (
                    <div key={r.route_id} className="pt-3 first:pt-0 space-y-1.5 text-xs">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-blue-50 text-[#2158E0] font-bold text-[11px] border border-blue-100">
                            {r.route_code}
                          </span>
                          <span className="font-bold text-[#141A2E]">{r.route_name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-semibold ${
                              r.is_over
                                ? "text-rose-600 font-bold"
                                : isNear
                                ? "text-amber-600 font-bold"
                                : "text-[#5B6478]"
                            }`}
                          >
                            {r.seats_used} of {r.capacity} seats ({percent}%)
                          </span>
                          {r.is_over && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                              Over Capacity
                            </span>
                          )}
                          {isNear && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                              Near Full
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 rounded-full ${
                            r.is_over
                              ? "bg-rose-600"
                              : isNear
                              ? "bg-amber-500"
                              : "bg-[#2158E0]"
                          }`}
                          style={{ width: `${Math.min(percent, 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}

export default TransportDashboard;
