import React, { useState, useEffect } from "react";
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

  useEffect(() => {
    if (!schoolId) return;
    let mounted = true;
    setLoading(true);
    getRoutes(schoolId)
      .then((res) => {
        if (mounted) {
          setRoutes(res || []);
          if (res && res.length > 0 && !transport.route_id) {
            const firstRoute = res[0];
            const firstStop = firstRoute.stops?.[0]?.name || "";
            onChange({ route_id: firstRoute.id, stop_id: firstStop });
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
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#2158E0]">
              <Bus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-sm">Avail School Bus Transport</h3>
              <p className="text-xs text-slate-500">
                Transport dues will be automatically added to the student's monthly fee statement.
              </p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={Boolean(transport.opt_in)}
              onChange={(e) => onChange({ opt_in: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#2158E0]"></div>
          </label>
        </div>

        {transport.opt_in && (
          <div className="space-y-4 pt-2">
            {loading ? (
              <div className="p-4 text-center text-xs text-slate-500">
                Loading available routes...
              </div>
            ) : routes.length === 0 ? (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">No transport routes configured yet</p>
                  <p className="mt-0.5">
                    Your school hasn't set up transport routes yet. You can{" "}
                    <Link
                      to="/admin/transport/routes"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 underline font-medium"
                    >
                      configure routes here
                    </Link>{" "}
                    or leave transport opted out for now and assign it later.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Bus Route</label>
                    <select
                      value={transport.route_id || selectedRoute?.id || ""}
                      onChange={(e) => {
                        const newRouteId = e.target.value;
                        const r = routes.find((rt) => rt.id === newRouteId);
                        const firstStop = r?.stops?.[0]?.name || "";
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
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Bus Stop</label>
                    <select
                      value={transport.stop_id || availableStops[0]?.name || ""}
                      onChange={(e) => onChange({ stop_id: e.target.value })}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#2158E0]"
                    >
                      {availableStops.length > 0 ? (
                        availableStops.map((stop) => (
                          <option key={stop.id} value={stop.name}>
                            {stop.name}
                          </option>
                        ))
                      ) : (
                        <option value="">No stops on this route</option>
                      )}
                    </select>
                  </div>
                </div>

                <div className="pt-2 flex items-center gap-6">
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={transport.pickup !== false}
                      onChange={(e) => onChange({ pickup: e.target.checked })}
                      className="rounded text-[#2158E0] focus:ring-[#2158E0]"
                    />
                    <span>Morning Pickup</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={transport.dropoff !== false}
                      onChange={(e) => onChange({ dropoff: e.target.checked })}
                      className="rounded text-[#2158E0] focus:ring-[#2158E0]"
                    />
                    <span>Afternoon Drop-off</span>
                  </label>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

