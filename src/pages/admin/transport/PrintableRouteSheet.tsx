import React from "react";
import { Printer, ArrowLeft } from "lucide-react";
import type { EnrichedRoute } from "../../../types/transport";

interface PrintableRouteSheetProps {
  route: EnrichedRoute;
  schoolName: string;
  onBack: () => void;
}

export function PrintableRouteSheet({
  route,
  schoolName,
  onBack,
}: PrintableRouteSheetProps) {
  function handlePrint() {
    window.print();
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top bar (hidden in print) */}
      <div className="flex items-center justify-between print:hidden bg-white p-4 rounded-xl border border-[#E6EAF3] shadow-sm">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#5B6478] hover:text-[#141A2E]"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Route Builder
        </button>
        <button
          onClick={handlePrint}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#2158E0] hover:bg-blue-600 text-white font-bold text-xs shadow-sm transition-colors"
        >
          <Printer className="w-4 h-4" />
          Print Route Sheet
        </button>
      </div>

      {/* Printable Sheet */}
      <div className="bg-white p-8 rounded-2xl border border-gray-300 shadow-md print:shadow-none print:border-none print:p-0 text-[#141A2E] space-y-6">
        {/* Header */}
        <div className="border-b-2 border-gray-900 pb-4 text-center space-y-1">
          <h1 className="text-xl font-black uppercase tracking-wider">{schoolName}</h1>
          <h2 className="text-sm font-bold text-gray-700 uppercase">
            Official Driver Route Sheet & Transit Roster
          </h2>
          <p className="text-xs text-gray-500">
            Generated on {new Date().toLocaleDateString("en-IN", { dateStyle: "long" })}
          </p>
        </div>

        {/* Route Details Card */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-gray-50 border border-gray-200 text-xs">
          <div>
            <p className="text-gray-500 font-semibold">Route Code & Name</p>
            <p className="font-bold text-sm text-[#141A2E] mt-0.5">
              {route.code} - {route.name}
            </p>
          </div>
          <div>
            <p className="text-gray-500 font-semibold">Bus / Vehicle</p>
            <p className="font-bold text-sm text-[#141A2E] mt-0.5">
              {route.vehicle ? `${route.vehicle.registration_no} (${route.vehicle.capacity} seats)` : "Unassigned"}
            </p>
          </div>
          <div>
            <p className="text-gray-500 font-semibold">Assigned Driver</p>
            <p className="font-bold text-sm text-[#141A2E] mt-0.5">
              {route.driver ? `${route.driver.full_name} (${route.driver.phone})` : "Unassigned"}
            </p>
          </div>
          <div>
            <p className="text-gray-500 font-semibold">Assigned Attendant</p>
            <p className="font-bold text-sm text-[#141A2E] mt-0.5">
              {route.attendant ? `${route.attendant.full_name} (${route.attendant.phone})` : "Unassigned"}
            </p>
          </div>
        </div>

        {/* Stops Sequence Table */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700">
            Stops Timeline in Sequence ({route.stops.length} Stops)
          </h3>
          <table className="w-full text-left border-collapse text-xs border border-gray-300">
            <thead>
              <tr className="bg-gray-100 font-bold border-b border-gray-300">
                <th className="py-2 px-3 border-r border-gray-300 w-12 text-center">Seq</th>
                <th className="py-2 px-3 border-r border-gray-300">Stop Name & Landmark</th>
                <th className="py-2 px-3 border-r border-gray-300 w-28 text-center">Morning Pickup</th>
                <th className="py-2 px-3 border-r border-gray-300 w-28 text-center">Evening Drop</th>
                <th className="py-2 px-3 w-28 text-center">Student Riders</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {route.stops.map((st) => (
                <tr key={st.id}>
                  <td className="py-2.5 px-3 border-r border-gray-200 text-center font-bold">
                    {st.sequence}
                  </td>
                  <td className="py-2.5 px-3 border-r border-gray-200">
                    <span className="font-bold">{st.name}</span>
                    {st.landmark && <span className="text-gray-500 block text-[11px]">Near: {st.landmark}</span>}
                  </td>
                  <td className="py-2.5 px-3 border-r border-gray-200 text-center font-mono font-bold">
                    {st.pickup_time}
                  </td>
                  <td className="py-2.5 px-3 border-r border-gray-200 text-center font-mono font-bold">
                    {st.drop_time}
                  </td>
                  <td className="py-2.5 px-3 text-center font-semibold">
                    0 riders
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Signatures & Instructions */}
        <div className="pt-8 border-t border-gray-300 grid grid-cols-3 gap-8 text-xs text-center">
          <div className="space-y-12">
            <p className="font-semibold text-gray-500">Driver Signature</p>
            <div className="border-t border-gray-400 pt-1">Date: _________________</div>
          </div>
          <div className="space-y-12">
            <p className="font-semibold text-gray-500">Transport Supervisor</p>
            <div className="border-t border-gray-400 pt-1">Date: _________________</div>
          </div>
          <div className="space-y-12">
            <p className="font-semibold text-gray-500">Principal Stamp</p>
            <div className="border-t border-gray-400 pt-1">Authorized Seal</div>
          </div>
        </div>
      </div>
    </div>
  );
}
export default PrintableRouteSheet;
