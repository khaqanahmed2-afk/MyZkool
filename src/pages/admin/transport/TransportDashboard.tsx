import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Bus,
  Users,
  AlertTriangle,
  Clock,
  ArrowRight,
  ShieldCheck,
  Plus,
  Compass,
  FileText,
  Calendar,
} from "lucide-react";
import {
  getTransportDashboardData,
  getVehicles,
  getRoutes,
} from "../../../services/transportCoreService";
import type { TransportDashboardData } from "../../../types/transport";
import { useAuth } from "../../../hooks/useAuth";
import { checkSchoolFeature } from "../../../middleware/features";
import { TransportLockedPreview } from "./TransportLockedPreview";

export function TransportDashboard() {
  const { schoolId } = useAuth();
  const [hasFeature, setHasFeature] = useState<boolean | null>(null);
  const [dashboardData, setDashboardData] = useState<TransportDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

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
    const data = await getTransportDashboardData(schoolId);
    setDashboardData(data);
    setLoading(false);
  }

  if (hasFeature === false) {
    return <TransportLockedPreview />;
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#141A2E] tracking-tight">
            Transport & Fleet Operations
          </h1>
          <p className="text-xs text-[#5B6478]">
            Real-time compliance monitoring, route rosters, and fleet capacity
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/admin/transport/vehicles"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-[#E6EAF3] text-xs font-bold text-[#141A2E] hover:bg-gray-50 shadow-sm"
          >
            <Bus className="w-3.5 h-3.5 text-[#2158E0]" />
            Vehicles
          </Link>
          <Link
            to="/admin/transport/staff"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-[#E6EAF3] text-xs font-bold text-[#141A2E] hover:bg-gray-50 shadow-sm"
          >
            <Users className="w-3.5 h-3.5 text-[#2158E0]" />
            Drivers
          </Link>
          <Link
            to="/admin/transport/routes"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-[#E6EAF3] text-xs font-bold text-[#141A2E] hover:bg-gray-50 shadow-sm"
          >
            <Compass className="w-3.5 h-3.5 text-[#2158E0]" />
            Route Builder
          </Link>
          <Link
            to="/admin/transport/fees"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#2158E0] hover:bg-blue-600 text-white text-xs font-bold shadow-sm transition-colors"
          >
            <FileText className="w-3.5 h-3.5" />
            Fee Zones
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-[#5B6478]">
          Loading transport dashboard...
        </div>
      ) : dashboardData ? (
        <>
          {/* Section 1: Lead with What Needs Attention (C4.1) */}
          {dashboardData.needs_attention.items.length > 0 && (
            <div className="bg-white rounded-xl border border-red-200 p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-red-100 text-red-600 flex items-center justify-center">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-red-950">
                      Items Requiring Immediate Attention ({dashboardData.needs_attention.items.length})
                    </h2>
                    <p className="text-[11px] text-red-700">
                      Vehicle compliance expiries, unassigned routes, or capacity warnings
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
                {dashboardData.needs_attention.items.map((item) => (
                  <Link
                    key={item.id}
                    to={item.link}
                    className="p-3 rounded-lg border border-red-100 bg-red-50/50 hover:bg-red-50 transition-colors flex items-start justify-between gap-2"
                  >
                    <div className="space-y-0.5">
                      <p className="font-bold text-xs text-red-950">{item.title}</p>
                      <p className="text-[11px] text-red-700">{item.subtitle}</p>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-red-400 mt-1 shrink-0" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Section 2: Fleet Snapshot Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl border border-[#E6EAF3] shadow-sm space-y-1">
              <p className="text-xs text-[#5B6478] font-semibold">Active Fleet</p>
              <p className="text-2xl font-black text-[#141A2E]">
                {dashboardData.fleet_snapshot.vehicles_active}{" "}
                <span className="text-xs font-normal text-gray-400">
                  / {dashboardData.fleet_snapshot.vehicles_total} total
                </span>
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-[#E6EAF3] shadow-sm space-y-1">
              <p className="text-xs text-[#5B6478] font-semibold">Active Routes</p>
              <p className="text-2xl font-black text-[#141A2E]">
                {dashboardData.fleet_snapshot.routes_active}
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-[#E6EAF3] shadow-sm space-y-1">
              <p className="text-xs text-[#5B6478] font-semibold">Student Riders</p>
              <p className="text-2xl font-black text-[#141A2E]">
                {dashboardData.fleet_snapshot.total_riders}
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-[#E6EAF3] shadow-sm space-y-1">
              <p className="text-xs text-[#5B6478] font-semibold">Seat Utilization</p>
              <p className="text-2xl font-black text-[#141A2E]">
                {dashboardData.fleet_snapshot.utilization_percent}%
              </p>
            </div>
          </div>

          {/* Section 3: Route Capacity Utilization Bars */}
          <div className="bg-white rounded-xl border border-[#E6EAF3] p-5 shadow-sm space-y-4">
            <h2 className="text-xs font-bold text-[#141A2E] uppercase tracking-wider">
              Route Capacity & Seat Utilization
            </h2>
            {dashboardData.fleet_snapshot.route_bars.length === 0 ? (
              <p className="text-xs text-[#5B6478] italic">No active routes configured yet.</p>
            ) : (
              <div className="space-y-3">
                {dashboardData.fleet_snapshot.route_bars.map((r) => {
                  const percent =
                    r.capacity > 0 ? Math.round((r.seats_used / r.capacity) * 100) : 0;
                  return (
                    <div key={r.route_id} className="space-y-1 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-[#141A2E]">
                          {r.route_code}: {r.route_name}
                        </span>
                        <span
                          className={`font-semibold ${
                            r.is_over ? "text-red-600 font-bold" : "text-[#5B6478]"
                          }`}
                        >
                          {r.seats_used} of {r.capacity} seats ({percent}%)
                        </span>
                      </div>
                      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            r.is_over ? "bg-red-600" : "bg-[#2158E0]"
                          }`}
                          style={{ width: `${Math.min(percent, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 4: Today's Trips Board (Empty State per C4.1) */}
          <div className="bg-white rounded-xl border border-[#E6EAF3] p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-[#141A2E] uppercase tracking-wider">
                Today's Transit Board
              </h2>
              <span className="text-[11px] text-[#5B6478]">
                {new Date().toLocaleDateString("en-IN", { dateStyle: "medium" })}
              </span>
            </div>
            <div className="p-8 text-center rounded-xl bg-gray-50 border border-dashed border-[#E6EAF3] space-y-2">
              <Clock className="w-8 h-8 text-gray-400 mx-auto" />
              <p className="text-xs font-bold text-[#141A2E]">
                {dashboardData.today_trips.empty_state_message}
              </p>
              <p className="text-[11px] text-[#5B6478]">
                Driver app trip tracking and live GPS pings will appear here during daily bus runs.
              </p>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
export default TransportDashboard;
