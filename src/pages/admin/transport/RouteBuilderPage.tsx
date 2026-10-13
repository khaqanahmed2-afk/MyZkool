import React, { useState, useEffect } from "react";
import {
  MapPin,
  Plus,
  Clock,
  ArrowUpDown,
  Printer,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Bus,
  Save,
  ChevronUp,
  ChevronDown,
  X,
} from "lucide-react";
import {
  getRoutes,
  createRoute,
  updateRoute,
  saveRouteStops,
  deleteRoute,
  getVehicles,
  getTransportStaff,
  getFeeZones,
  timeToMinutes,
} from "../../../services/transportCoreService";
import type {
  EnrichedRoute,
  RouteStop,
  TransportVehicle,
  TransportStaff,
  TransportFeeZone,
} from "../../../types/transport";
import { useAuth } from "../../../hooks/useAuth";
import { checkSchoolFeature } from "../../../middleware/features";
import { TransportLockedPreview } from "./TransportLockedPreview";
import { PrintableRouteSheet } from "./PrintableRouteSheet";

export function RouteBuilderPage() {
  const { schoolId } = useAuth();
  const [hasFeature, setHasFeature] = useState<boolean | null>(null);
  const [routes, setRoutes] = useState<EnrichedRoute[]>([]);
  const [vehicles, setVehicles] = useState<TransportVehicle[]>([]);
  const [staff, setStaff] = useState<TransportStaff[]>([]);
  const [feeZones, setFeeZones] = useState<TransportFeeZone[]>([]);
  const [loading, setLoading] = useState(true);

  // Active route being built / edited
  const [activeRoute, setActiveRoute] = useState<EnrichedRoute | null>(null);
  const [stops, setStops] = useState<RouteStop[]>([]);
  const [isPrintMode, setIsPrintMode] = useState(false);

  // Form states
  const [routeName, setRouteName] = useState("");
  const [routeCode, setRouteCode] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [driverId, setDriverId] = useState("");
  const [attendantId, setAttendantId] = useState("");
  const [pickupStart, setPickupStart] = useState("07:00");
  const [dropStart, setDropStart] = useState("14:30");
  const [durationMin, setDurationMin] = useState(45);
  const [routeError, setRouteError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Toast feedback state
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Time Helper State
  const [showTimeHelper, setShowTimeHelper] = useState(false);
  const [helperIntervalMin, setHelperIntervalMin] = useState(6);

  useEffect(() => {
    if (!schoolId) return;
    checkSchoolFeature(schoolId, "transport").then((enabled) => {
      setHasFeature(enabled);
      if (enabled) loadAll();
      else setLoading(false);
    });
  }, [schoolId]);

  async function loadAll() {
    if (!schoolId) return;
    setLoading(true);
    const [rData, vData, sData, zData] = await Promise.all([
      getRoutes(schoolId),
      getVehicles(schoolId),
      getTransportStaff(schoolId),
      getFeeZones(schoolId),
    ]);
    setRoutes(rData);
    setVehicles(vData);
    setStaff(sData);
    setFeeZones(zData);

    if (rData.length > 0 && !activeRoute) {
      selectRouteForEditing(rData[0]);
    }
    setLoading(false);
  }

  function selectRouteForEditing(r: EnrichedRoute) {
    setActiveRoute(r);
    setRouteName(r.name);
    setRouteCode(r.code);
    setVehicleId(r.default_vehicle_id || "");
    setDriverId(r.default_driver_id || "");
    setAttendantId(r.default_attendant_id || "");
    setPickupStart(r.pickup_start_time.slice(0, 5));
    setDropStart(r.drop_start_time.slice(0, 5));
    setDurationMin(Number.isFinite(Number(r.est_duration_min)) && Number(r.est_duration_min) > 0 ? Number(r.est_duration_min) : 45);
    setStops(r.stops || []);
    setRouteError("");
    setIsPrintMode(false);
  }

  function handleStartNewRoute() {
    setActiveRoute(null);
    setRouteName("");
    setRouteCode(`R-${routes.length + 1}`);
    setVehicleId(vehicles[0]?.id || "");
    setDriverId("");
    setAttendantId("");
    setPickupStart("07:00");
    setDropStart("14:30");
    setDurationMin(45);
    setStops([
      {
        id: crypto.randomUUID(),
        school_id: schoolId || "",
        route_id: "",
        name: "School Campus",
        landmark: "Main Gate",
        sequence: 1,
        pickup_time: "07:00",
        drop_time: "15:00",
      },
    ]);
    setRouteError("");
    setIsPrintMode(false);
  }

  // ─── Stops Reordering & Time Helper ────────────────────────────────────────

  function handleMoveStop(index: number, direction: "up" | "down") {
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= stops.length) return;

    const copy = [...stops];
    const temp = copy[index];
    copy[index] = copy[targetIdx];
    copy[targetIdx] = temp;

    // Recalculate continuous sequence (C10.4)
    const resequenced = copy.map((st, i) => ({ ...st, sequence: i + 1 }));
    setStops(resequenced);
  }

  function handleAddStop(afterIndex?: number) {
    const prevTime = stops.length > 0 ? stops[stops.length - 1].pickup_time : pickupStart;
    const prevMin = timeToMinutes(prevTime);
    const nextPickupMin = prevMin + 5;
    const nextPickupHours = Math.floor(nextPickupMin / 60)
      .toString()
      .padStart(2, "0");
    const nextPickupMins = (nextPickupMin % 60).toString().padStart(2, "0");

    const newStop: RouteStop = {
      id: crypto.randomUUID(),
      school_id: schoolId || "",
      route_id: activeRoute?.id || "",
      name: `Stop ${stops.length + 1}`,
      landmark: "",
      sequence: stops.length + 1,
      pickup_time: `${nextPickupHours}:${nextPickupMins}`,
      drop_time: "14:45",
      fee_zone_id: feeZones[0]?.id || null,
    };

    if (afterIndex !== undefined && afterIndex >= 0) {
      const copy = [...stops];
      copy.splice(afterIndex + 1, 0, newStop);
      const resequenced = copy.map((st, i) => ({ ...st, sequence: i + 1 }));
      setStops(resequenced);
    } else {
      setStops([...stops, newStop]);
    }
  }

  function handleRemoveStop(index: number) {
    if (stops.length <= 1) {
      alert("A route must have at least one stop.");
      return;
    }
    const copy = stops.filter((_, i) => i !== index);
    const resequenced = copy.map((st, i) => ({ ...st, sequence: i + 1 }));
    setStops(resequenced);
  }

  function handleApplyTimeHelper() {
    let currentMin = timeToMinutes(pickupStart);
    const updated = stops.map((st, idx) => {
      if (idx > 0) {
        currentMin += helperIntervalMin;
      }
      const hh = Math.floor(currentMin / 60)
        .toString()
        .padStart(2, "0");
      const mm = (currentMin % 60).toString().padStart(2, "0");
      return {
        ...st,
        pickup_time: `${hh}:${mm}`,
      };
    });
    setStops(updated);
    setShowTimeHelper(false);
  }

  function handleGenerateDropTimes() {
    // Drop times generated in reverse order from drop start
    let dropMin = timeToMinutes(dropStart);
    const updated = [...stops];
    for (let i = updated.length - 1; i >= 0; i--) {
      const hh = Math.floor(dropMin / 60)
        .toString()
        .padStart(2, "0");
      const mm = (dropMin % 60).toString().padStart(2, "0");
      updated[i].drop_time = `${hh}:${mm}`;
      dropMin += helperIntervalMin;
    }
    setStops(updated);
  }

  // ─── Save Route & Stops ───────────────────────────────────────────────────

  async function handleSaveRoute(e: React.FormEvent) {
    e.preventDefault();
    if (!schoolId) return;
    setRouteError("");
    setIsSaving(true);

    let routeId = activeRoute?.id;

    if (activeRoute) {
      const res = await updateRoute(schoolId, activeRoute.id, {
        name: routeName.trim(),
        code: routeCode.trim().toUpperCase(),
        default_vehicle_id: vehicleId || null,
        default_driver_id: driverId || null,
        default_attendant_id: attendantId || null,
        pickup_start_time: pickupStart,
        drop_start_time: dropStart,
        est_duration_min: durationMin,
        status: "active",
      });

      if (!res.success) {
        setRouteError(res.error || "Failed to update route.");
        setIsSaving(false);
        return;
      }
    } else {
      const res = await createRoute(schoolId, {
        name: routeName.trim(),
        code: routeCode.trim().toUpperCase(),
        default_vehicle_id: vehicleId || null,
        default_driver_id: driverId || null,
        default_attendant_id: attendantId || null,
        pickup_start_time: pickupStart,
        drop_start_time: dropStart,
        est_duration_min: durationMin,
        status: "active",
      });

      if (!res.success || !res.route) {
        setRouteError(res.error || "Failed to create route.");
        setIsSaving(false);
        return;
      }
      routeId = res.route.id;
    }

    // Save Stops
    const stopsRes = await saveRouteStops(schoolId, routeId!, stops);
    setIsSaving(false);

    if (!stopsRes.success) {
      setRouteError(stopsRes.error || "Failed to save route stops.");
      return;
    }

    setToast({
      type: "success",
      message: `Route ${routeCode.trim().toUpperCase()} and ${stops.length} stop(s) saved successfully.`,
    });
    await loadAll();
  }

  async function handleDeleteRoute() {
    if (!schoolId || !activeRoute) return;
    if (!confirm(`Are you sure you want to delete Route ${activeRoute.code}?`)) return;

    const res = await deleteRoute(schoolId, activeRoute.id);
    if (!res.success) {
      setToast({
        type: "error",
        message: res.error || "Cannot delete route.",
      });
      return;
    }
    setToast({
      type: "success",
      message: `Route ${activeRoute.code} deleted successfully.`,
    });
    setActiveRoute(null);
    loadAll();
  }

  if (hasFeature === false) {
    return <TransportLockedPreview />;
  }

  const currentVehicle = vehicles.find((v) => v.id === vehicleId);
  const capacity = currentVehicle?.capacity || 40;
  const seatsUsed = activeRoute?.seats_used || 0;
  const isOverCapacity = seatsUsed > capacity;

  if (isPrintMode && activeRoute) {
    return (
      <PrintableRouteSheet
        route={{ ...activeRoute, stops }}
        schoolName="MyZkool Academy"
        onBack={() => setIsPrintMode(false)}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toast && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
            toast.type === "success"
              ? "bg-green-50 border-green-200 text-green-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          <div className="flex items-center gap-2 text-xs font-bold">
            {toast.type === "success" ? (
              <CheckCircle className="w-4 h-4 text-green-600" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-600" />
            )}
            <span>{toast.message}</span>
          </div>
          <button
            onClick={() => setToast(null)}
            className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#141A2E] tracking-tight">
            Route Builder & Stops
          </h1>
          <p className="text-xs text-[#5B6478]">
            Configure stop timeline sequences, automated schedules, and bus seat allocations
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeRoute && (
            <button
              onClick={() => setIsPrintMode(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-[#E6EAF3] text-xs font-bold text-[#141A2E] hover:bg-gray-50 shadow-sm transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Print Route Sheet
            </button>
          )}
          <button
            onClick={handleStartNewRoute}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#2158E0] hover:bg-blue-600 text-white font-bold text-xs shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            New Route
          </button>
        </div>
      </div>

      {/* Routes Horizontal Selector */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
        {routes.map((r) => {
          const isSelected = activeRoute?.id === r.id;
          return (
            <button
              key={r.id}
              onClick={() => selectRouteForEditing(r)}
              className={`px-4 py-2 rounded-xl border text-xs font-bold flex items-center gap-2 shrink-0 transition-all cursor-pointer ${
                isSelected
                  ? "bg-[#2158E0] text-white border-[#2158E0] shadow-sm"
                  : "bg-white text-[#141A2E] border-[#E6EAF3] hover:bg-gray-50"
              }`}
            >
              <Bus className="w-3.5 h-3.5" />
              <span>{r.code}</span>
              <span className={isSelected ? "text-blue-100" : "text-gray-400 font-normal"}>
                • {r.stops_count} stops
              </span>
            </button>
          );
        })}
      </div>

      {routeError && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{routeError}</span>
        </div>
      )}

      {/* Main 2-Column Responsive Route Builder */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Route Details & Seat Meter */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-6 lg:sticky lg:top-6">
          <form
            onSubmit={handleSaveRoute}
            className="bg-white rounded-xl border border-[#E6EAF3] p-5 shadow-sm space-y-4 text-xs"
          >
            <div className="flex items-center justify-between border-b border-[#E6EAF3] pb-3">
              <div>
                <h2 className="font-bold text-sm text-[#141A2E]">
                  {activeRoute ? `Route Details (${routeCode})` : "New Route Details"}
                </h2>
                <p className="text-[11px] text-[#5B6478]">
                  {activeRoute ? "Modify route assignments and timings" : "Set up a new school transport route"}
                </p>
              </div>
              {activeRoute && (
                <button
                  type="button"
                  onClick={handleDeleteRoute}
                  className="text-gray-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors cursor-pointer"
                  title="Delete Route"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[#5B6478] mb-1 font-semibold">Route Code</label>
                <input
                  type="text"
                  placeholder="e.g. R-1"
                  value={routeCode}
                  onChange={(e) => setRouteCode(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E6EAF3] uppercase font-bold text-xs focus:outline-none focus:ring-2 focus:ring-[#2158E0]"
                  required
                />
              </div>
              <div>
                <label className="block text-[#5B6478] mb-1 font-semibold">Route Name</label>
                <input
                  type="text"
                  placeholder="e.g. Gomti Nagar Route"
                  value={routeName}
                  onChange={(e) => setRouteName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E6EAF3] font-medium text-xs focus:outline-none focus:ring-2 focus:ring-[#2158E0]"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[#5B6478] mb-1 font-semibold">Default Vehicle</label>
              <select
                value={vehicleId}
                onChange={(e) => setVehicleId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[#E6EAF3] bg-white font-medium text-xs focus:outline-none focus:ring-2 focus:ring-[#2158E0]"
              >
                <option value="">Unassigned</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.registration_no} ({v.make_model} - {v.capacity} seats)
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[#5B6478] mb-1 font-semibold">Driver</label>
                <select
                  value={driverId}
                  onChange={(e) => setDriverId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E6EAF3] bg-white font-medium text-xs focus:outline-none focus:ring-2 focus:ring-[#2158E0]"
                >
                  <option value="">Unassigned</option>
                  {staff
                    .filter((s) => s.staff_type === "driver")
                    .map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.full_name}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-[#5B6478] mb-1 font-semibold">Attendant</label>
                <select
                  value={attendantId}
                  onChange={(e) => setAttendantId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E6EAF3] bg-white font-medium text-xs focus:outline-none focus:ring-2 focus:ring-[#2158E0]"
                >
                  <option value="">Unassigned</option>
                  {staff
                    .filter((s) => s.staff_type === "attendant")
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.full_name}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[#5B6478] mb-1 font-semibold">Pickup Start</label>
                <input
                  type="time"
                  value={pickupStart}
                  onChange={(e) => setPickupStart(e.target.value)}
                  className="w-full px-2 py-2 rounded-lg border border-[#E6EAF3] font-mono font-bold text-xs focus:outline-none focus:ring-2 focus:ring-[#2158E0]"
                  required
                />
              </div>
              <div>
                <label className="block text-[#5B6478] mb-1 font-semibold">Drop Start</label>
                <input
                  type="time"
                  value={dropStart}
                  onChange={(e) => setDropStart(e.target.value)}
                  className="w-full px-2 py-2 rounded-lg border border-[#E6EAF3] font-mono font-bold text-xs focus:outline-none focus:ring-2 focus:ring-[#2158E0]"
                  required
                />
              </div>
              <div>
                <label className="block text-[#5B6478] mb-1 font-semibold">Duration (min)</label>
                <input
                  type="number"
                  min="15"
                  max="180"
                  value={Number.isNaN(durationMin) ? "" : (durationMin ?? "")}
                  onChange={(e) => {
                    const parsed = parseInt(e.target.value, 10);
                    setDurationMin(isNaN(parsed) ? ("" as any) : parsed);
                  }}
                  className="w-full px-2 py-2 rounded-lg border border-[#E6EAF3] font-bold text-xs focus:outline-none focus:ring-2 focus:ring-[#2158E0]"
                  required
                />
              </div>
            </div>

            {/* Seat Meter */}
            <div
              className={`p-3 rounded-xl border space-y-2 ${
                isOverCapacity
                  ? "bg-red-50 border-red-200"
                  : "bg-blue-50/50 border-blue-100"
              }`}
            >
              <div className="flex justify-between items-center text-xs font-bold">
                <span className={isOverCapacity ? "text-red-900" : "text-blue-900"}>
                  Seat Meter
                </span>
                <span className={isOverCapacity ? "text-red-700" : "text-blue-700"}>
                  {seatsUsed} of {capacity} seats used
                </span>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    isOverCapacity ? "bg-red-600" : "bg-[#2158E0]"
                  }`}
                  style={{ width: `${Math.min((seatsUsed / (capacity || 1)) * 100, 100)}%` }}
                ></div>
              </div>
              {isOverCapacity && (
                <p className="text-[11px] text-red-700 font-semibold">
                  Warning: Route exceeds vehicle seating capacity by {seatsUsed - capacity} student(s).
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="w-full py-2.5 rounded-xl bg-[#2158E0] hover:bg-blue-600 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-colors cursor-pointer"
            >
              <Save className="w-4 h-4" />
              {isSaving ? "Saving..." : "Save Route & Stops"}
            </button>
          </form>
        </div>

        {/* Right Column: Stops Vertical Timeline */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-4">
          <div className="bg-white rounded-xl border border-[#E6EAF3] p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E6EAF3] pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-sm text-[#141A2E]">
                    Stops Timeline
                  </h2>
                  <span className="px-2 py-0.5 rounded-full bg-blue-100 text-[#2158E0] text-[11px] font-bold">
                    {stops.length} {stops.length === 1 ? "Stop" : "Stops"}
                  </span>
                </div>
                <p className="text-xs text-[#5B6478]">
                  Continuous sequence required. Pickup times must strictly increase.
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setShowTimeHelper(!showTimeHelper)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-colors cursor-pointer ${
                    showTimeHelper
                      ? "bg-blue-50 border-blue-200 text-[#2158E0]"
                      : "border-[#E6EAF3] text-[#141A2E] hover:bg-gray-50"
                  }`}
                >
                  <Clock className="w-3.5 h-3.5 text-[#2158E0]" />
                  Time Helper
                </button>
                <button
                  type="button"
                  onClick={handleGenerateDropTimes}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E6EAF3] text-xs font-bold text-[#141A2E] hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <ArrowUpDown className="w-3.5 h-3.5 text-[#2158E0]" />
                  Reverse Drop Times
                </button>
                <button
                  type="button"
                  onClick={() => handleAddStop()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2158E0] text-white text-xs font-bold hover:bg-blue-600 transition-colors cursor-pointer shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Stop
                </button>
              </div>
            </div>

            {/* Time Helper Drawer */}
            {showTimeHelper && (
              <div className="p-4 rounded-xl bg-blue-50/75 border border-blue-200 space-y-3 text-xs">
                <div className="font-bold text-blue-950">Automated Time Helper</div>
                <p className="text-blue-900">
                  Calculates all sequential pickup times based on the first stop pickup time ({pickupStart}) and average minutes between stops:
                </p>
                <div className="flex items-center gap-3">
                  <label className="font-semibold text-blue-900">Minutes between stops:</label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={Number.isNaN(helperIntervalMin) ? "" : (helperIntervalMin ?? "")}
                    onChange={(e) => {
                      const parsed = parseInt(e.target.value, 10);
                      setHelperIntervalMin(isNaN(parsed) ? ("" as any) : parsed);
                    }}
                    className="w-20 px-2 py-1 rounded border border-blue-300 bg-white font-bold"
                  />
                  <button
                    onClick={handleApplyTimeHelper}
                    className="px-4 py-1 rounded bg-[#2158E0] text-white font-bold hover:bg-blue-600 cursor-pointer transition-colors"
                  >
                    Apply Times
                  </button>
                </div>
              </div>
            )}

            {/* Stops Sequence Rows */}
            <div className="space-y-3">
              {stops.map((st, idx) => (
                <div
                  key={st.id || idx}
                  className="p-3.5 rounded-xl border border-[#E6EAF3] bg-white hover:border-[#CBD5E1] transition-all shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 text-xs">
                    {/* Move controls & Sequence number */}
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex flex-col">
                        <button
                          type="button"
                          onClick={() => handleMoveStop(idx, "up")}
                          disabled={idx === 0}
                          className="p-0.5 text-gray-400 hover:text-gray-700 disabled:opacity-20 cursor-pointer"
                          title="Move Up"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveStop(idx, "down")}
                          disabled={idx === stops.length - 1}
                          className="p-0.5 text-gray-400 hover:text-gray-700 disabled:opacity-20 cursor-pointer"
                          title="Move Down"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <span className="w-7 h-7 rounded-xl bg-blue-50 text-[#2158E0] font-black text-xs flex items-center justify-center shrink-0 border border-blue-100">
                        {st.sequence}
                      </span>
                    </div>

                    {/* Inputs */}
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                      <div className="sm:col-span-4">
                        <label className="block text-[10px] text-[#5B6478] font-bold mb-1">
                          Stop Name
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Aliganj Chauraha"
                          value={st.name}
                          onChange={(e) => {
                            const copy = [...stops];
                            copy[idx].name = e.target.value;
                            setStops(copy);
                          }}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-[#E6EAF3] font-bold text-xs text-[#141A2E] focus:outline-none focus:ring-2 focus:ring-[#2158E0]"
                          required
                        />
                      </div>
                      <div className="sm:col-span-4">
                        <label className="block text-[10px] text-[#5B6478] font-bold mb-1">
                          Landmark (Optional)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Near Metro Station"
                          value={st.landmark || ""}
                          onChange={(e) => {
                            const copy = [...stops];
                            copy[idx].landmark = e.target.value;
                            setStops(copy);
                          }}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-[#E6EAF3] text-xs text-[#5B6478] focus:outline-none focus:ring-2 focus:ring-[#2158E0]"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-[10px] text-[#5B6478] font-bold mb-1">
                          Pickup Time
                        </label>
                        <input
                          type="time"
                          value={st.pickup_time}
                          onChange={(e) => {
                            const copy = [...stops];
                            copy[idx].pickup_time = e.target.value;
                            setStops(copy);
                          }}
                          className="w-full px-2 py-1.5 rounded-lg border border-[#E6EAF3] font-mono font-bold text-xs text-[#141A2E] focus:outline-none focus:ring-2 focus:ring-[#2158E0]"
                          required
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-[10px] text-[#5B6478] font-bold mb-1">
                          Drop Time
                        </label>
                        <input
                          type="time"
                          value={st.drop_time}
                          onChange={(e) => {
                            const copy = [...stops];
                            copy[idx].drop_time = e.target.value;
                            setStops(copy);
                          }}
                          className="w-full px-2 py-1.5 rounded-lg border border-[#E6EAF3] font-mono font-bold text-xs text-[#141A2E] focus:outline-none focus:ring-2 focus:ring-[#2158E0]"
                          required
                        />
                      </div>
                    </div>

                    {/* Delete button */}
                    <div className="flex sm:flex-col items-center justify-end sm:justify-center shrink-0 pt-1 sm:pt-4">
                      <button
                        type="button"
                        onClick={() => handleRemoveStop(idx)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        title="Remove Stop"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Add Next Stop Button */}
            <button
              type="button"
              onClick={() => handleAddStop()}
              className="w-full py-2.5 rounded-xl border border-dashed border-[#2158E0]/40 hover:border-[#2158E0] bg-blue-50/30 hover:bg-blue-50/60 text-[#2158E0] font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add Next Stop
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
export default RouteBuilderPage;
