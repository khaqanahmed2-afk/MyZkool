import React from "react";
import { Bus, MapPin, CheckCircle2 } from "lucide-react";
import { AdmissionWizardPayload } from "../../../../types/students";

interface Step7Props {
  transport?: AdmissionWizardPayload["step7_transport"];
  onChange: (fields: Partial<NonNullable<AdmissionWizardPayload["step7_transport"]>>) => void;
}

const MOCK_ROUTES = [
  { id: "route-1", name: "Route 1 - Gomti Nagar & Patrakarpuram", stops: ["Manoj Pandey Chowk", "Kathauta Jheel", "Patrakarpuram Chauraha"] },
  { id: "route-2", name: "Route 2 - Alambagh & Singar Nagar", stops: ["Alambagh Bus Stand", "Singar Nagar Metro", "Avadh Hospital"] },
  { id: "route-3", name: "Route 3 - Indira Nagar & Munshipulia", stops: ["Munshipulia Chauraha", "Aravalli Marg", "Bhootnath Market"] },
];

export const StudentWizardStep7Transport: React.FC<Step7Props> = ({
  transport = { opt_in: false, pickup: true, dropoff: true, route_id: "route-1", stop_id: "Manoj Pandey Chowk" },
  onChange,
}) => {
  const selectedRoute = MOCK_ROUTES.find((r) => r.id === transport.route_id) || MOCK_ROUTES[0];

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
              checked={transport.opt_in}
              onChange={(e) => onChange({ opt_in: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#2158E0]"></div>
          </label>
        </div>

        {transport.opt_in && (
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Bus Route</label>
                <select
                  value={transport.route_id || selectedRoute.id}
                  onChange={(e) => onChange({ route_id: e.target.value, stop_id: "" })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#2158E0]"
                >
                  {MOCK_ROUTES.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Bus Stop</label>
                <select
                  value={transport.stop_id || selectedRoute.stops[0]}
                  onChange={(e) => onChange({ stop_id: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#2158E0]"
                >
                  {selectedRoute.stops.map((stop) => (
                    <option key={stop} value={stop}>
                      {stop}
                    </option>
                  ))}
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
          </div>
        )}
      </div>
    </div>
  );
};
