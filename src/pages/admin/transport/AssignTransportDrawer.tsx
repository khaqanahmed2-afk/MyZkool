/**
 * Assign Transport Drawer (Spec C5.1)
 * Right-hand drawer with steps in one scroll:
 * 1. Route search (seats left, vehicle)
 * 2. Pickup stop and drop stop (times, sibling chip)
 * 3. Service type (live monthly fee)
 * 4. Effective from date
 * 5. Guardian handover at drop (default on for pre-primary)
 * 6. Capacity override request if route is full
 * 7. Success state with WhatsApp notice & print slip
 */

import React, { useState, useEffect } from "react";
import {
  X,
  Bus,
  MapPin,
  Clock,
  Users,
  ShieldAlert,
  CheckCircle2,
  Printer,
  MessageSquare,
  AlertTriangle,
} from "lucide-react";
import { getRoutes, getTransportSettings } from "../../../services/transportCoreService";
import {
  createAssignment,
  changeAssignment,
  calculateStopMonthlyFee,
  getStudentTransportDetails,
} from "../../../services/transportAssignmentService";
import type { EnrichedRoute, ServiceType, TransportAssignment } from "../../../types/transport";

interface AssignTransportDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  schoolId: string;
  studentId: string;
  studentName: string;
  className?: string;
  isPrePrimary?: boolean;
  academicYearId: string;
  existingAssignment?: TransportAssignment | null;
  onSuccess?: () => void;
}

export const AssignTransportDrawer: React.FC<AssignTransportDrawerProps> = ({
  isOpen,
  onClose,
  schoolId,
  studentId,
  studentName,
  className = "",
  isPrePrimary = false,
  academicYearId,
  existingAssignment,
  onSuccess,
}) => {
  const [routes, setRoutes] = useState<EnrichedRoute[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string>("");
  const [pickupStopId, setPickupStopId] = useState<string>("");
  const [dropStopId, setDropStopId] = useState<string>("");
  const [serviceType, setServiceType] = useState<ServiceType>("both");
  const [effectiveFrom, setEffectiveFrom] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [requiresHandover, setRequiresHandover] = useState<boolean>(isPrePrimary);
  const [monthlyFeePaise, setMonthlyFeePaise] = useState<number>(120000);
  const [overrideReason, setOverrideReason] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [loading, setLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [assignedResult, setAssignedResult] = useState<TransportAssignment | null>(null);
  const [siblingsOnRoute, setSiblingsOnRoute] = useState<any[]>([]);

  // Load routes & student transport context
  useEffect(() => {
    if (!isOpen) return;

    setErrorMessage(null);
    setAssignedResult(null);
    setLoading(true);

    Promise.all([
      getRoutes(schoolId),
      getStudentTransportDetails(schoolId, studentId),
      getTransportSettings(schoolId),
    ])
      .then(([allRoutes, transportInfo, settings]) => {
        setRoutes(allRoutes);
        setSiblingsOnRoute(transportInfo.siblings_on_route || []);

        if (existingAssignment) {
          setSelectedRouteId(existingAssignment.route_id);
          setPickupStopId(existingAssignment.pickup_stop_id);
          setDropStopId(existingAssignment.drop_stop_id);
          setServiceType(existingAssignment.service_type);
          setEffectiveFrom(new Date().toISOString().split("T")[0]);
          setRequiresHandover(existingAssignment.requires_guardian_handover);
        } else if (allRoutes.length > 0) {
          const firstRoute = allRoutes[0];
          setSelectedRouteId(firstRoute.id);
          if (firstRoute.stops && firstRoute.stops.length > 0) {
            setPickupStopId(firstRoute.stops[0].id);
            setDropStopId(firstRoute.stops[0].id);
          }
          // Default handover for pre-primary
          if (settings.guardian_handover_stages?.includes("pre_primary") && isPrePrimary) {
            setRequiresHandover(true);
          }
        }
      })
      .finally(() => setLoading(false));
  }, [isOpen, schoolId, studentId, existingAssignment, isPrePrimary]);

  // Recalculate fee live when stop or serviceType changes
  useEffect(() => {
    if (!pickupStopId) return;
    calculateStopMonthlyFee(schoolId, pickupStopId, serviceType).then((fee) => {
      setMonthlyFeePaise(fee);
    });
  }, [schoolId, pickupStopId, serviceType]);

  if (!isOpen) return null;

  const selectedRoute = routes.find((r) => r.id === selectedRouteId);
  const selectedPickupStop = selectedRoute?.stops.find((s) => s.id === pickupStopId);
  const selectedDropStop = selectedRoute?.stops.find((s) => s.id === dropStopId);

  const capacity = selectedRoute?.seat_capacity || selectedRoute?.vehicle?.capacity || 0;
  const seatsUsed = selectedRoute?.seats_used || 0;
  const seatsLeft = Math.max(0, capacity - seatsUsed);
  const isFull = capacity > 0 && seatsLeft === 0;

  const filteredRoutes = routes.filter(
    (r) =>
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.stops.some((s) => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleRouteSelect = (routeId: string) => {
    setSelectedRouteId(routeId);
    const r = routes.find((rt) => rt.id === routeId);
    if (r && r.stops && r.stops.length > 0) {
      setPickupStopId(r.stops[0].id);
      setDropStopId(r.stops[0].id);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSubmitting(true);

    try {
      if (existingAssignment) {
        // Change assignment
        const res = await changeAssignment(schoolId, existingAssignment.id, {
          new_route_id: selectedRouteId,
          new_pickup_stop_id: pickupStopId,
          new_drop_stop_id: dropStopId || pickupStopId,
          new_service_type: serviceType,
          effective_date: effectiveFrom,
          requires_guardian_handover: requiresHandover,
          override_reason: overrideReason,
        });

        if (!res.success) {
          setErrorMessage(res.error || "Failed to change transport assignment");
          return;
        }

        setAssignedResult(res.assignment || null);
        if (onSuccess) onSuccess();
      } else {
        // Create new assignment
        const res = await createAssignment(schoolId, {
          student_id: studentId,
          academic_year_id: academicYearId,
          route_id: selectedRouteId,
          pickup_stop_id: pickupStopId,
          drop_stop_id: dropStopId || pickupStopId,
          service_type: serviceType,
          effective_from: effectiveFrom,
          requires_guardian_handover: requiresHandover,
          override_reason: overrideReason,
        });

        if (!res.success) {
          setErrorMessage(res.error || "Failed to assign student to transport");
          return;
        }

        setAssignedResult(res.assignment || null);
        if (onSuccess) onSuccess();
      }
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex justify-end animate-in fade-in">
      <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col border-l border-[#E6EAF3] animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#E6EAF3] flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Bus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 font-display">
                {existingAssignment ? "Change Transport" : "Assign Transport"}
              </h2>
              <p className="text-xs text-slate-500">
                {studentName} {className ? `(${className})` : ""}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success State */}
        {assignedResult ? (
          <div className="flex-1 p-8 flex flex-col items-center justify-center text-center space-y-5">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-900 font-display">
                {existingAssignment ? "Transport Updated" : "Transport Assigned"}
              </h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                {studentName} is assigned to {selectedRoute?.name} starting {effectiveFrom}. Dues of ₹
                {(monthlyFeePaise / 100).toFixed(0)}/mo created.
              </p>
            </div>

            <div className="w-full bg-slate-50 border border-[#E6EAF3] rounded-xl p-4 text-left text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Route:</span>
                <span className="font-semibold text-slate-800">{selectedRoute?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Pickup Stop:</span>
                <span className="font-semibold text-slate-800">
                  {selectedPickupStop?.name} ({selectedPickupStop?.pickup_time || "—"})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Drop Stop:</span>
                <span className="font-semibold text-slate-800">
                  {selectedDropStop?.name} ({selectedDropStop?.drop_time || "—"})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Handover:</span>
                <span className="font-semibold text-slate-800">
                  {requiresHandover ? "Required at drop" : "Standard"}
                </span>
              </div>
            </div>

            <div className="flex gap-3 w-full pt-2">
              <button
                type="button"
                onClick={() => {
                  window.print();
                }}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-[#E6EAF3] text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                Print slip
              </button>
              <button
                type="button"
                onClick={() => {
                  alert(`WhatsApp notification queued for ${studentName}'s parent.`);
                }}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors cursor-pointer"
              >
                <MessageSquare className="w-4 h-4" />
                WhatsApp slip
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="text-xs font-medium text-slate-500 hover:text-slate-700 underline"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
            {errorMessage && (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <div>
                  <div className="font-semibold">Assignment blocked</div>
                  <div>{errorMessage}</div>
                </div>
              </div>
            )}

            {/* Sibling Chip */}
            {siblingsOnRoute.length > 0 && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600 shrink-0" />
                <span>
                  Sibling <strong>{siblingsOnRoute[0].student_name}</strong> ({siblingsOnRoute[0].class_name}) uses this route!
                </span>
              </div>
            )}

            {/* Step 1: Route Selection */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                1. Select Route
              </label>
              <input
                type="text"
                placeholder="Search route by name or stop..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-[#E6EAF3] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2158E0]"
              />
              <div className="space-y-1.5 max-h-40 overflow-y-auto border border-[#E6EAF3] rounded-xl p-1.5">
                {filteredRoutes.map((r) => {
                  const rCap = r.seat_capacity || r.vehicle?.capacity || 0;
                  const rUsed = r.seats_used || 0;
                  const rLeft = Math.max(0, rCap - rUsed);
                  const isSelected = r.id === selectedRouteId;
                  return (
                    <div
                      key={r.id}
                      onClick={() => handleRouteSelect(r.id)}
                      className={`p-2.5 rounded-lg text-xs cursor-pointer flex items-center justify-between transition-colors ${
                        isSelected
                          ? "bg-blue-50 border border-blue-200 text-[#2158E0]"
                          : "hover:bg-slate-50 text-slate-800"
                      }`}
                    >
                      <div>
                        <div className="font-semibold">{r.name}</div>
                        <div className="text-[11px] text-slate-500">
                          {r.vehicle?.registration_no || "No vehicle"} • {r.stops.length} stops
                        </div>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          rLeft === 0
                            ? "bg-rose-100 text-rose-700"
                            : rLeft <= 3
                            ? "bg-amber-100 text-amber-800"
                            : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        {rLeft === 0 ? "Full" : `${rLeft} seats left`}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Stops */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  2. Pickup Stop
                </label>
                <select
                  value={pickupStopId}
                  onChange={(e) => {
                    setPickupStopId(e.target.value);
                    if (!dropStopId) setDropStopId(e.target.value);
                  }}
                  className="w-full text-xs px-3 py-2 border border-[#E6EAF3] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2158E0] bg-white"
                >
                  {selectedRoute?.stops.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.pickup_time || "—"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Drop Stop
                </label>
                <select
                  value={dropStopId}
                  onChange={(e) => setDropStopId(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-[#E6EAF3] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2158E0] bg-white"
                >
                  {selectedRoute?.stops.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.drop_time || "—"})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Step 3: Service Type & Live Fee */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  3. Service Type
                </label>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  ₹{(monthlyFeePaise / 100).toFixed(0)} per month
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: "both", label: "Both ways" },
                  { key: "pickup_only", label: "Pickup only" },
                  { key: "drop_only", label: "Drop only" },
                ].map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setServiceType(opt.key as ServiceType)}
                    className={`py-2 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                      serviceType === opt.key
                        ? "bg-[#2158E0] text-white border-[#2158E0]"
                        : "bg-white text-slate-700 border-[#E6EAF3] hover:bg-slate-50"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Step 4: Effective Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                4. Effective From
              </label>
              <input
                type="date"
                value={effectiveFrom}
                onChange={(e) => setEffectiveFrom(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-[#E6EAF3] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2158E0]"
              />
            </div>

            {/* Step 5: Guardian Handover */}
            <div className="p-3 bg-slate-50 border border-[#E6EAF3] rounded-xl flex items-start gap-3">
              <input
                type="checkbox"
                id="handover"
                checked={requiresHandover}
                onChange={(e) => setRequiresHandover(e.target.checked)}
                className="mt-0.5 rounded text-[#2158E0] focus:ring-[#2158E0]"
              />
              <label htmlFor="handover" className="text-xs text-slate-700 cursor-pointer">
                <span className="font-semibold block text-slate-900">Guardian handover at drop</span>
                Driver/attendant must verify adult pickup before releasing student.
              </label>
            </div>

            {/* Step 6: Capacity Override if route is full */}
            {isFull && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2 text-xs text-amber-900">
                <div className="flex items-center gap-1.5 font-bold text-amber-800">
                  <ShieldAlert className="w-4 h-4" />
                  Route is full ({seatsUsed}/{capacity} seats)
                </div>
                <p className="text-slate-600 text-[11px]">
                  Requires owner override. Provide a typed reason for audit logs.
                </p>
                <input
                  type="text"
                  placeholder="Reason for capacity override..."
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-white border border-amber-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            )}

            {/* Submit */}
            <div className="pt-4 border-t border-[#E6EAF3] flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || (isFull && !overrideReason.trim())}
                className={`px-5 py-2 rounded-xl text-xs font-semibold text-white transition-colors cursor-pointer ${
                  isFull
                    ? "bg-amber-600 hover:bg-amber-700 disabled:opacity-50"
                    : "bg-[#2158E0] hover:bg-blue-700 disabled:opacity-50"
                }`}
              >
                {submitting
                  ? "Processing..."
                  : isFull
                  ? "Request capacity override"
                  : existingAssignment
                  ? "Update assignment"
                  : "Save assignment"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

