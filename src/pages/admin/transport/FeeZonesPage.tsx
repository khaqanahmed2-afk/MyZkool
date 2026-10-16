import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Bus,
  MapPin,
  IndianRupee,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Calendar,
  ExternalLink,
  ChevronDown,
  Layers,
  Sparkles,
  ArrowLeft,
} from "lucide-react";
import {
  getTransportSettings,
  saveTransportSettings,
  getRoutes,
  updateRouteStopFees,
  getFeeZones,
  deleteFeeZone,
} from "../../../services/transportCoreService";
import type {
  TransportSettings,
  EnrichedRoute,
  RouteStop,
  TransportFeeZone,
} from "../../../types/transport";
import { useAuth } from "../../../hooks/useAuth";
import { checkSchoolFeature } from "../../../middleware/features";
import { TransportLockedPreview } from "./TransportLockedPreview";

const MONTHS = [
  { num: 4, name: "Apr" },
  { num: 5, name: "May" },
  { num: 6, name: "Jun" },
  { num: 7, name: "Jul" },
  { num: 8, name: "Aug" },
  { num: 9, name: "Sep" },
  { num: 10, name: "Oct" },
  { num: 11, name: "Nov" },
  { num: 12, name: "Dec" },
  { num: 1, name: "Jan" },
  { num: 2, name: "Feb" },
  { num: 3, name: "Mar" },
];

interface StopFeeFormState {
  bothWays: number | "";
  pickupOnly: number | "";
  dropOnly: number | "";
}

export function FeeZonesPage() {
  const navigate = useNavigate();
  const { schoolId } = useAuth();
  const [hasFeature, setHasFeature] = useState<boolean | null>(null);
  const [settings, setSettings] = useState<TransportSettings | null>(null);
  const [routes, setRoutes] = useState<EnrichedRoute[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  // Safe Back Navigation
  const handleBack = () => {
    if (isDirty) {
      if (!window.confirm("You have unsaved stop fee changes. Are you sure you want to discard them and go back?")) {
        return;
      }
    }
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate("/admin/transport");
    }
  };

  // Stop Fee Form State: mapped by stop.id (database UUID)
  const [stopFeeState, setStopFeeState] = useState<Record<string, StopFeeFormState>>({});
  const [initialStopFeeState, setInitialStopFeeState] = useState<Record<string, StopFeeFormState>>({});

  // Submission & feedback states
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Optional legacy zones view (for backward compatibility)
  const [legacyZones, setLegacyZones] = useState<TransportFeeZone[]>([]);
  const [showLegacyZones, setShowLegacyZones] = useState(false);

  useEffect(() => {
    if (!schoolId) return;
    checkSchoolFeature(schoolId, "transport").then((enabled) => {
      setHasFeature(enabled);
      if (enabled) loadInitialData();
      else setLoading(false);
    });
  }, [schoolId]);

  async function loadInitialData() {
    if (!schoolId) return;
    setLoading(true);
    setStatusMessage(null);
    try {
      const [sData, rData, zData] = await Promise.all([
        getTransportSettings(schoolId),
        getRoutes(schoolId),
        getFeeZones(schoolId),
      ]);
      setSettings(sData);
      setRoutes(rData);
      setLegacyZones(zData);

      // Default select the first route or keep current
      const activeRouteId = selectedRouteId && rData.some((r) => r.id === selectedRouteId)
        ? selectedRouteId
        : rData[0]?.id || "";

      setSelectedRouteId(activeRouteId);
      if (activeRouteId) {
        const found = rData.find((r) => r.id === activeRouteId);
        initStopFeeForm(found?.stops || []);
      }
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "Failed to load transport fee data." });
    } finally {
      setLoading(false);
    }
  }

  function initStopFeeForm(stops: RouteStop[]) {
    const state: Record<string, StopFeeFormState> = {};
    stops.forEach((st) => {
      state[st.id] = {
        bothWays: st.monthly_fee_paise ? Math.round(st.monthly_fee_paise / 100) : 0,
        pickupOnly: st.pickup_only_monthly_paise ? Math.round(st.pickup_only_monthly_paise / 100) : 0,
        dropOnly: st.drop_only_monthly_paise ? Math.round(st.drop_only_monthly_paise / 100) : 0,
      };
    });
    setStopFeeState(state);
    setInitialStopFeeState(JSON.parse(JSON.stringify(state)));
  }

  function handleRouteChange(newRouteId: string) {
    if (newRouteId === selectedRouteId) return;
    if (isDirty) {
      if (!confirm("You have unsaved stop fee changes on the current route. Discard changes and switch route?")) {
        return;
      }
    }
    setSelectedRouteId(newRouteId);
    setStatusMessage(null);
    const r = routes.find((rt) => rt.id === newRouteId);
    initStopFeeForm(r?.stops || []);
  }

  const selectedRoute = routes.find((r) => r.id === selectedRouteId);
  const routeStops = selectedRoute?.stops || [];

  // Check if form is dirty
  const isDirty = React.useMemo(() => {
    return JSON.stringify(stopFeeState) !== JSON.stringify(initialStopFeeState);
  }, [stopFeeState, initialStopFeeState]);

  function parseCurrencyInput(value: string): number | "" {
    if (value === "") return "";
    const cleaned = value.replace(/\D/g, "");
    if (!cleaned) return "";
    const normalized = cleaned.replace(/^0+(?=\d)/, "");
    const num = parseInt(normalized, 10);
    return isNaN(num) ? "" : Math.max(0, num);
  }

  function handleStopFeeChange(
    stopId: string,
    field: keyof StopFeeFormState,
    value: string
  ) {
    setStatusMessage(null);
    const parsed = parseCurrencyInput(value);
    setStopFeeState((prev) => {
      const current = prev[stopId] || { bothWays: 0, pickupOnly: 0, dropOnly: 0 };
      return {
        ...prev,
        [stopId]: {
          ...current,
          [field]: parsed,
        },
      };
    });
  }

  function handleStopFeeBlur(stopId: string, field: keyof StopFeeFormState) {
    setStopFeeState((prev) => {
      const cur = prev[stopId];
      if (!cur) return prev;
      if (cur[field] === "") {
        return {
          ...prev,
          [stopId]: {
            ...cur,
            [field]: 0,
          },
        };
      }
      return prev;
    });
  }

  function handleApplyAutoCalculateOneWay(stopId?: string) {
    setStatusMessage(null);
    let updatedCount = 0;
    setStopFeeState((prev) => {
      const copy = { ...prev };
      const targetStops = stopId
        ? ([routeStops.find((s) => s.id === stopId)].filter(Boolean) as RouteStop[])
        : routeStops;

      targetStops.forEach((st) => {
        const cur = copy[st.id] || { bothWays: 0, pickupOnly: 0, dropOnly: 0 };
        const both = typeof cur.bothWays === "number" ? cur.bothWays : 0;
        const oneWay = Math.round(both * 0.6);
        copy[st.id] = {
          ...cur,
          pickupOnly: oneWay,
          dropOnly: oneWay,
        };
        updatedCount++;
      });
      return copy;
    });

    setStatusMessage({
      type: "success",
      text: stopId
        ? "Auto-filled pickup and drop rates to 60% of both-ways for this stop. Remember to click 'Save Stop Fees' to persist changes."
        : `Auto-filled pickup and drop rates to 60% of both-ways for ${updatedCount} stop(s). Remember to click 'Save Stop Fees' to persist changes.`,
    });
  }

  function handleResetForm() {
    setStatusMessage(null);
    setStopFeeState(JSON.parse(JSON.stringify(initialStopFeeState)));
  }

  async function handleSaveStopFees() {
    if (!schoolId || !selectedRouteId) return;
    setStatusMessage(null);

    // Validate entries
    for (const st of routeStops) {
      const fees = stopFeeState[st.id];
      if (!fees) continue;
      const both = fees.bothWays === "" ? 0 : Number(fees.bothWays);
      const pickup = fees.pickupOnly === "" ? 0 : Number(fees.pickupOnly);
      const drop = fees.dropOnly === "" ? 0 : Number(fees.dropOnly);

      if (both < 0 || pickup < 0 || drop < 0) {
        setStatusMessage({
          type: "error",
          text: `Stop '${st.name}' has invalid negative fee amounts.`,
        });
        return;
      }
    }

    setIsSaving(true);
    try {
      const payload = routeStops.map((st) => {
        const fees = stopFeeState[st.id] || { bothWays: 0, pickupOnly: 0, dropOnly: 0 };
        return {
          id: st.id,
          monthly_fee_paise: Math.round((fees.bothWays === "" ? 0 : Number(fees.bothWays)) * 100),
          pickup_only_monthly_paise: Math.round((fees.pickupOnly === "" ? 0 : Number(fees.pickupOnly)) * 100),
          drop_only_monthly_paise: Math.round((fees.dropOnly === "" ? 0 : Number(fees.dropOnly)) * 100),
        };
      });

      const res = await updateRouteStopFees(schoolId, selectedRouteId, payload);
      if (!res.success) {
        setStatusMessage({ type: "error", text: res.error || "Failed to save stop fees." });
        return;
      }

      // Also ensure settings fee_basis is set to stop
      if (settings?.fee_basis !== "stop") {
        await saveTransportSettings(schoolId, { fee_basis: "stop" });
        setSettings((prev) => (prev ? { ...prev, fee_basis: "stop" } : null));
      }

      // Refresh cached routes
      const freshRoutes = await getRoutes(schoolId);
      setRoutes(freshRoutes);

      const refreshedRoute = freshRoutes.find((r) => r.id === selectedRouteId);
      initStopFeeForm(refreshedRoute?.stops || []);

      setStatusMessage({
        type: "success",
        text: `Successfully saved stop transport fees for ${selectedRoute?.name || "route"}.`,
      });
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "An unexpected error occurred while saving." });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleToggleBillingMonth(monthNum: number) {
    if (!schoolId || !settings) return;
    const current = settings.billing_months || [];
    let next: number[];
    if (current.includes(monthNum)) {
      next = current.filter((m) => m !== monthNum);
    } else {
      next = [...current, monthNum];
    }
    try {
      const updated = await saveTransportSettings(schoolId, { billing_months: next });
      setSettings(updated);
    } catch (err: any) {
      alert("Failed to update billing months: " + err.message);
    }
  }

  async function handleDeleteLegacyZone(zoneId: string) {
    if (!schoolId) return;
    if (!confirm("Are you sure you want to delete this legacy fee zone?")) return;
    const res = await deleteFeeZone(schoolId, zoneId);
    if (!res.success) {
      alert(res.error || "Cannot delete fee zone.");
      return;
    }
    const freshZones = await getFeeZones(schoolId);
    setLegacyZones(freshZones);
  }

  if (hasFeature === false) {
    return <TransportLockedPreview />;
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#E6EAF3] bg-white text-xs font-bold text-[#5B6478] hover:text-[#141A2E] hover:bg-gray-50 shadow-sm transition-all"
            title="Return to Transport Dashboard"
          >
            <ArrowLeft className="w-4 h-4 text-[#2158E0]" />
            <span>Back to Transport</span>
          </button>

          <div className="h-6 w-px bg-gray-200 hidden sm:block"></div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-[#141A2E] tracking-tight">
                Transport Fee Management
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-[#2158E0] text-[11px] font-bold border border-blue-200">
                Route-Wise Stop Pricing
              </span>
            </div>
            <p className="text-xs text-[#5B6478] mt-1">
              Configure individual monthly rates for each bus stop on a route, service types, and academic billing months
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {isDirty && (
            <button
              type="button"
              onClick={handleResetForm}
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-[#E6EAF3] text-xs font-bold text-[#5B6478] hover:bg-gray-50 transition-colors shadow-xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </button>
          )}

          <button
            type="button"
            onClick={handleSaveStopFees}
            disabled={isSaving || routeStops.length === 0}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2158E0] hover:bg-blue-600 disabled:opacity-50 text-white font-bold text-xs shadow-sm transition-all"
          >
            <Save className="w-4 h-4" />
            {isSaving ? "Saving..." : isDirty ? "Save Changes" : "Save Stop Fees"}
          </button>
        </div>
      </div>

      {/* Status Notifications */}
      {statusMessage && (
        <div
          className={`p-4 rounded-xl text-xs font-semibold flex items-center justify-between gap-3 border transition-all ${
            statusMessage.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {statusMessage.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="text-gray-400 hover:text-gray-600 text-sm font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Academic Billing Months Card */}
      <div className="bg-white p-5 rounded-2xl border border-[#E6EAF3] shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#2158E0] flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-[#141A2E] uppercase tracking-wider">
                Academic Billing Months
              </h2>
              <p className="text-[11px] text-[#5B6478]">
                Select the academic months in which transport fee dues will be automatically billed:
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-[#2158E0] bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
            {settings?.billing_months?.length || 0} Months Billed
          </span>
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-2 pt-1">
          {MONTHS.map((m) => {
            const isChecked = settings?.billing_months?.includes(m.num);
            return (
              <button
                key={m.num}
                type="button"
                onClick={() => handleToggleBillingMonth(m.num)}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                  isChecked
                    ? "bg-[#2158E0] text-white border-[#2158E0] shadow-xs"
                    : "bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100"
                }`}
              >
                {m.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Route-Wise Stop Pricing Section */}
      <div className="bg-white rounded-2xl border border-[#E6EAF3] shadow-xs overflow-hidden">
        {/* Route Selector Sub-header */}
        <div className="p-5 border-b border-[#E6EAF3] bg-[#F8FAFC]/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1 max-w-md">
            <label className="block text-[11px] font-bold text-[#141A2E] uppercase tracking-wider mb-1.5 flex items-center gap-2">
              <Bus className="w-3.5 h-3.5 text-[#2158E0]" />
              Select Transport Route
            </label>
            {routes.length > 0 ? (
              <select
                value={selectedRouteId}
                onChange={(e) => handleRouteChange(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] bg-white font-bold text-xs text-[#141A2E] shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#2158E0]"
              >
                {routes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.code} - {r.name} ({r.stops_count} stops)
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-xs text-[#5B6478]">No transport routes available.</p>
            )}
          </div>

          {selectedRoute && (
            <div className="flex items-center gap-3 self-end md:self-center">
              <span className="text-xs text-[#5B6478] bg-white px-3 py-1.5 rounded-xl border border-[#E6EAF3] font-medium">
                Route Stops: <strong className="text-[#141A2E]">{routeStops.length}</strong>
              </span>

              {routeStops.length > 0 && (
                <button
                  type="button"
                  onClick={() => handleApplyAutoCalculateOneWay()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-xs font-bold text-[#2158E0] hover:bg-blue-100/75 transition-colors"
                  title="Auto-fill Pickup & Drop rates as 60% of Both-Ways fee for all stops"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Auto-fill 60% One-Way
                </button>
              )}

              <Link
                to="/admin/transport/routes"
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white border border-[#E6EAF3] text-xs font-bold text-[#5B6478] hover:text-[#141A2E] hover:bg-gray-50 transition-colors"
              >
                <span>Edit Stops</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          )}
        </div>

        {/* Content Body */}
        {loading ? (
          <div className="p-16 text-center text-xs text-[#5B6478] space-y-2">
            <div className="w-6 h-6 border-2 border-[#2158E0] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="font-semibold">Loading transport routes and stops...</p>
          </div>
        ) : routes.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#2158E0] flex items-center justify-center mx-auto">
              <Bus className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-[#141A2E]">No Transport Routes Configured</h3>
            <p className="text-xs text-[#5B6478] max-w-sm mx-auto">
              Please create at least one transport route with stops before configuring stop fees.
            </p>
            <div className="pt-2">
              <Link
                to="/admin/transport/routes"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#2158E0] hover:bg-blue-600 text-white font-bold text-xs shadow-xs"
              >
                Go to Route Builder
              </Link>
            </div>
          </div>
        ) : routeStops.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
              <MapPin className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-[#141A2E]">No Stops on this Route</h3>
            <p className="text-xs text-[#5B6478] max-w-sm mx-auto">
              Selected route <strong>{selectedRoute?.name}</strong> does not have any stops yet.
              Add bus stops to this route in Route Builder to configure individual monthly pricing.
            </p>
            <div className="pt-2">
              <Link
                to="/admin/transport/routes"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#2158E0] hover:bg-blue-600 text-white font-bold text-xs shadow-xs"
              >
                Add Stops in Route Builder
              </Link>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#E6EAF3] bg-[#F8FAFC] text-[#5B6478] font-bold">
                  <th className="py-3 px-4 w-12 text-center">#</th>
                  <th className="py-3 px-4 min-w-[200px]">Bus Stop Details</th>
                  <th className="py-3 px-4 min-w-[130px]">Timings</th>
                  <th className="py-3 px-4 min-w-[160px]">
                    Monthly Fee (Both Ways) ₹
                  </th>
                  <th className="py-3 px-4 min-w-[150px]">
                    Pickup Only ₹
                  </th>
                  <th className="py-3 px-4 min-w-[150px]">
                    Drop Only ₹
                  </th>
                  <th className="py-3 px-4 w-28 text-right">Quick Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6EAF3]">
                {routeStops.map((st) => {
                  const state = stopFeeState[st.id] || {
                    bothWays: 0,
                    pickupOnly: 0,
                    dropOnly: 0,
                  };

                  return (
                    <tr
                      key={st.id}
                      className="hover:bg-gray-50/75 transition-colors group"
                    >
                      {/* Sequence */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="w-6 h-6 rounded-lg bg-blue-50 text-[#2158E0] font-bold text-[11px] inline-flex items-center justify-center border border-blue-100">
                          {st.sequence}
                        </span>
                      </td>

                      {/* Stop Info */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-start gap-2">
                          <MapPin className="w-3.5 h-3.5 text-[#2158E0] shrink-0 mt-0.5" />
                          <div>
                            <p className="font-bold text-[#141A2E] text-xs leading-snug">
                              {st.name}
                            </p>
                            {st.landmark && (
                              <p className="text-[11px] text-[#5B6478] mt-0.5">
                                {st.landmark}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Timings */}
                      <td className="py-3.5 px-4 text-[#5B6478]">
                        <div className="text-[11px] font-mono space-y-0.5">
                          <p>
                            <span className="text-gray-400 font-sans">Pick:</span>{" "}
                            {st.pickup_time ? st.pickup_time.slice(0, 5) : "--:--"}
                          </p>
                          <p>
                            <span className="text-gray-400 font-sans">Drop:</span>{" "}
                            {st.drop_time ? st.drop_time.slice(0, 5) : "--:--"}
                          </p>
                        </div>
                      </td>

                      {/* Both Ways Fee */}
                      <td className="py-3.5 px-4">
                        <div className="relative rounded-xl shadow-2xs max-w-[140px]">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#5B6478]">
                            <IndianRupee className="w-3.5 h-3.5" />
                          </div>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={state.bothWays}
                            onChange={(e) =>
                              handleStopFeeChange(st.id, "bothWays", e.target.value)
                            }
                            onBlur={() => handleStopFeeBlur(st.id, "bothWays")}
                            className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-[#CBD5E1] bg-white font-bold text-xs text-[#141A2E] focus:outline-none focus:ring-2 focus:ring-[#2158E0]"
                            placeholder="0"
                          />
                        </div>
                      </td>

                      {/* Pickup Only Fee */}
                      <td className="py-3.5 px-4">
                        <div className="relative rounded-xl shadow-2xs max-w-[140px]">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#5B6478]">
                            <IndianRupee className="w-3.5 h-3.5" />
                          </div>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={state.pickupOnly}
                            onChange={(e) =>
                              handleStopFeeChange(st.id, "pickupOnly", e.target.value)
                            }
                            onBlur={() => handleStopFeeBlur(st.id, "pickupOnly")}
                            className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-[#CBD5E1] bg-white font-bold text-xs text-[#141A2E] focus:outline-none focus:ring-2 focus:ring-[#2158E0]"
                            placeholder="0"
                          />
                        </div>
                      </td>

                      {/* Drop Only Fee */}
                      <td className="py-3.5 px-4">
                        <div className="relative rounded-xl shadow-2xs max-w-[140px]">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#5B6478]">
                            <IndianRupee className="w-3.5 h-3.5" />
                          </div>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={state.dropOnly}
                            onChange={(e) =>
                              handleStopFeeChange(st.id, "dropOnly", e.target.value)
                            }
                            onBlur={() => handleStopFeeBlur(st.id, "dropOnly")}
                            className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-[#CBD5E1] bg-white font-bold text-xs text-[#141A2E] focus:outline-none focus:ring-2 focus:ring-[#2158E0]"
                            placeholder="0"
                          />
                        </div>
                      </td>

                      {/* Quick Auto-fill button for this stop */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleApplyAutoCalculateOneWay(st.id)}
                          className="px-2.5 py-1 rounded-lg bg-gray-50 border border-gray-200 text-[#5B6478] hover:text-[#2158E0] hover:bg-blue-50 hover:border-blue-200 text-[11px] font-semibold transition-colors"
                          title="Set Pickup & Drop to 60% of Both-Ways rate"
                        >
                          60% 1-Way
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer info bar */}
        {routeStops.length > 0 && (
          <div className="p-4 bg-[#F8FAFC] border-t border-[#E6EAF3] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#5B6478]">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>
                Fees are configured per stop database ID and apply automatically to student riders assigned to that stop.
              </span>
            </div>
            <div className="flex items-center gap-3">
              {isDirty && (
                <span className="font-bold text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200 text-[11px]">
                  Unsaved changes
                </span>
              )}
              <button
                type="button"
                onClick={handleSaveStopFees}
                disabled={isSaving}
                className="px-4 py-1.5 rounded-xl bg-[#2158E0] hover:bg-blue-600 disabled:opacity-50 text-white font-bold text-xs shadow-xs transition-colors"
              >
                {isSaving ? "Saving..." : "Save Route Fees"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Legacy Fee Zones (Collapsible section for backward compatibility) */}
      {legacyZones.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#E6EAF3] shadow-xs overflow-hidden">
          <button
            type="button"
            onClick={() => setShowLegacyZones(!showLegacyZones)}
            className="w-full p-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#5B6478]" />
              <span className="text-xs font-bold text-[#141A2E]">
                Legacy Geographic Fee Zones ({legacyZones.length})
              </span>
              <span className="text-[10px] text-gray-400 font-normal">
                (Preserved for backward compatibility)
              </span>
            </div>
            <ChevronDown
              className={`w-4 h-4 text-gray-400 transition-transform ${
                showLegacyZones ? "rotate-180" : ""
              }`}
            />
          </button>

          {showLegacyZones && (
            <div className="p-4 border-t border-[#E6EAF3] space-y-3">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#E6EAF3] text-[#5B6478] font-bold">
                      <th className="py-2 px-3">Zone Name</th>
                      <th className="py-2 px-3">Distance Range</th>
                      <th className="py-2 px-3">Both Ways</th>
                      <th className="py-2 px-3">Pickup Only</th>
                      <th className="py-2 px-3">Drop Only</th>
                      <th className="py-2 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E6EAF3]">
                    {legacyZones.map((z) => (
                      <tr key={z.id}>
                        <td className="py-2 px-3 font-semibold text-[#141A2E]">{z.name}</td>
                        <td className="py-2 px-3 text-[#5B6478]">
                          {z.distance_from_km != null && z.distance_to_km != null
                            ? `${z.distance_from_km} km - ${z.distance_to_km} km`
                            : "Flat zone"}
                        </td>
                        <td className="py-2 px-3">₹{(z.monthly_fee_paise / 100).toLocaleString("en-IN")}/mo</td>
                        <td className="py-2 px-3">₹{(z.pickup_only_monthly_paise / 100).toLocaleString("en-IN")}/mo</td>
                        <td className="py-2 px-3">₹{(z.drop_only_monthly_paise / 100).toLocaleString("en-IN")}/mo</td>
                        <td className="py-2 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteLegacyZone(z.id)}
                            className="text-red-500 hover:text-red-700 text-xs font-semibold"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default FeeZonesPage;
