import React, { useState, useEffect, useRef } from "react";
import { Bus, MapPin, CheckCircle2, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { AdmissionWizardPayload } from "../../../../types/students";
import { getRoutes } from "../../../../services/transportCoreService";
import type { EnrichedRoute } from "../../../../types/transport";

interface Step7Props {
  schoolId?: string;
  transport?: AdmissionWizardPayload["step7_transport"];
  onChange: (fields: Partial<NonNullable<AdmissionWizardPayload["step7_transport"]>>) => void;
}

export const StudentWizardStep7Transport: React.FC<Step7Props> = ({
  schoolId,
  transport: rawTransport,
  onChange,
}) => {
  const transport: NonNullable<AdmissionWizardPayload["step7_transport"]> = rawTransport || {
    opt_in: false,
    pickup: true,
    dropoff: true,
  };
  const [routes, setRoutes] = useState<EnrichedRoute[]>([]);
  const [loading, setLoading] = useState(false);

  const transportRouteIdRef = useRef(transport.route_id);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    transportRouteIdRef.current = transport.route_id;
    onChangeRef.current = onChange;
  });

  useEffect(() => {
    if (!schoolId) return;
    let mounted = true;
    setLoading(true);
    getRoutes(schoolId)
      .then((res) => {
        if (mounted) {
          setRoutes(res || []);
          if (res && res.length > 0 && !transportRouteIdRef.current) {
            const firstRoute = res[0];
            const firstStop = firstRoute.stops?.[0]?.id || "";
            onChangeRef.current({ route_id: firstRoute.id, stop_id: firstStop });
          }
        }
      })
      .catch((err) => {
        console.warn("Failed to load transport routes:", err);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [schoolId]);

  const selectedRoute = routes.find((r) => r.id === transport.route_id) || routes[0];
  const availableStops = selectedRoute?.stops || [];
  const selectedStop = availableStops.find((s) => s.id === transport.stop_id) || availableStops[0];

  const pickup = transport.pickup !== false;
  const dropoff = transport.dropoff !== false;
  const serviceSelectionError = transport.opt_in && !pickup && !dropoff;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-display font-bold text-slate-900">Step 7: School Transport</h2>
        <p className="text-sm text-slate-500 mt-1">
          Opt in for school bus services, select bus stop and pickup/drop preferences.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-5 shadow-sm">
        {/* Opt in toggle */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#2158E0] shrink-0">
              <Bus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-sm">Avail School Bus Transport</h3>
              <p className="text-xs text-slate-500">
                Transport dues will be automatically added to the student's monthly fee ledger upon enrollment.
              </p>
            </div>
          </div>
          <label htmlFor="transport-opt-in-toggle" className="relative inline-flex items-center cursor-pointer shrink-0">
            <span className="sr-only">Avail School Bus Transport</span>
            <input
              id="transport-opt-in-toggle"
              type="checkbox"
              aria-label="Avail School Bus Transport"
              checked={Boolean(transport.opt_in)}
              onChange={(e) => onChange({ opt_in: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-transform peer-checked:bg-[#2158E0]"></div>
          </label>
        </div>

        {transport.opt_in && (
          <div className="space-y-4 pt-2">
            {loading ? (
              <div className="p-4 text-center text-xs text-slate-500 font-medium">
                Loading available school bus routes...
              </div>
            ) : routes.length === 0 ? (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">No transport routes configured yet</p>
                  <p className="mt-0.5 text-slate-700">
                    Your school hasn't configured transport routes yet. You can{" "}
                    <Link
                      to="/admin/transport/routes"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 underline font-semibold"
                    >
                      configure routes in Transport Settings
                    </Link>{" "}
                    or leave transport opted out for now and assign a stop later from the Student Profile.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="transport-route-select" className="block text-xs font-semibold text-slate-700 mb-1">
                      Select Bus Route
                    </label>
                    <select
                      id="transport-route-select"
                      value={transport.route_id || selectedRoute?.id || ""}
                      onChange={(e) => {
                        const newRouteId = e.target.value;
                        const r = routes.find((rt) => rt.id === newRouteId);
                        const firstStop = r?.stops?.[0]?.id || "";
                        onChange({ route_id: newRouteId, stop_id: firstStop });
                      }}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#2158E0]"
                    >
                      {routes.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name} {r.code ? `(${r.code})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="transport-stop-select" className="block text-xs font-semibold text-slate-700 mb-1">
                      Select Boarding Stop & Fee
                    </label>
                    <select
                      id="transport-stop-select"
                      value={transport.stop_id || availableStops[0]?.id || ""}
                      onChange={(e) => onChange({ stop_id: e.target.value })}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#2158E0]"
                    >
                      {availableStops.length > 0 ? (
                        availableStops.map((stop) => (
                          <option key={stop.id} value={stop.id}>
                            {stop.name} {stop.monthly_fee_paise ? `— ₹${Math.round(stop.monthly_fee_paise / 100)}/month` : ""}
                          </option>
                        ))
                      ) : (
                        <option value="">No stops configured on this route</option>
                      )}
                    </select>
                    {selectedStop?.monthly_fee_paise && (
                      <p className="text-[11px] text-emerald-700 font-medium mt-1">
                        Monthly charge: ₹{Math.round(selectedStop.monthly_fee_paise / 100)} / month
                      </p>
                    )}
                  </div>
                </div>

                {/* Service Types: Pickup and Drop */}
                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <p className="text-xs font-semibold text-slate-700">Service Options</p>
                  <div className="flex items-center gap-6">
                    <label htmlFor="transport-pickup" className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                      <input
                        id="transport-pickup"
                        type="checkbox"
                        checked={pickup}
                        onChange={(e) => onChange({ pickup: e.target.checked })}
                        className="rounded text-[#2158E0] focus:ring-[#2158E0]"
                      />
                      <span>Morning Pickup</span>
                    </label>

                    <label htmlFor="transport-dropoff" className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                      <input
                        id="transport-dropoff"
                        type="checkbox"
                        checked={dropoff}
                        onChange={(e) => onChange({ dropoff: e.target.checked })}
                        className="rounded text-[#2158E0] focus:ring-[#2158E0]"
                      />
                      <span>Afternoon Drop-off</span>
                    </label>
                  </div>

                  {serviceSelectionError && (
                    <p className="text-xs text-rose-600 flex items-center gap-1 font-medium pt-1">
                      <AlertCircle className="w-3.5 h-3.5" /> Please select at least one of Morning Pickup or Afternoon Drop-off.
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
