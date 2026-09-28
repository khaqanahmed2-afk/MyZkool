/**
 * Bulk Transport Assignment Screen (Spec C5.2)
 *
 * Two panes:
 * - Left: Students without transport (search, class filter, locality/landmark) + Requests tab
 * - Right: Route selector with stops, seats used, service type
 * Confirmation summary lists students, stop, fee, and total demand change.
 */

import React, { useState, useEffect } from "react";
import {
  Bus,
  Users,
  Search,
  Filter,
  CheckSquare,
  Square,
  AlertCircle,
  CheckCircle2,
  MapPin,
  Clock,
  ShieldAlert,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { getRoutes } from "../../../services/transportCoreService";
import {
  bulkAssignStudents,
  listTransportRequests,
  updateTransportRequestStatus,
  calculateStopMonthlyFee,
} from "../../../services/transportAssignmentService";
import { useAuth } from "../../../context/AuthContext";
import type { EnrichedRoute, ServiceType, TransportRequest } from "../../../types/transport";

interface StudentItem {
  id: string;
  first_name: string;
  last_name: string;
  admission_no: string;
  class_name: string;
  locality?: string;
  landmark?: string;
}

export const BulkAssignPage: React.FC = () => {
  const { schoolId: authSchoolId } = useAuth();
  const [activeTab, setActiveTab] = useState<"unassigned" | "requests">("unassigned");
  const [schoolId, setSchoolId] = useState<string>(authSchoolId || "");
  const [academicYearId, setAcademicYearId] = useState<string>("ay-2026-27");

  // Left pane states
  const [unassignedStudents, setUnassignedStudents] = useState<StudentItem[]>([]);
  const [requests, setRequests] = useState<TransportRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());

  // Right pane states
  const [routes, setRoutes] = useState<EnrichedRoute[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string>("");
  const [selectedStopId, setSelectedStopId] = useState<string>("");
  const [serviceType, setServiceType] = useState<ServiceType>("both");
  const [effectiveFrom, setEffectiveFrom] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [monthlyFeePaise, setMonthlyFeePaise] = useState<number>(120000);
  const [overrideReason, setOverrideReason] = useState<string>("");

  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  // Load data
  useEffect(() => {
    if (authSchoolId) {
      setSchoolId(authSchoolId);
    } else if (typeof localStorage !== "undefined") {
      const storedSchool = localStorage.getItem("current_school_id");
      if (storedSchool) setSchoolId(storedSchool);
    }
  }, [authSchoolId]);

  const loadData = async () => {
    if (!schoolId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const allRoutes = await getRoutes(schoolId);
      setRoutes(allRoutes);
      if (allRoutes.length > 0 && !selectedRouteId) {
        setSelectedRouteId(allRoutes[0].id);
        if (allRoutes[0].stops.length > 0) {
          setSelectedStopId(allRoutes[0].stops[0].id);
        }
      }

      // Load unassigned students
      const rawStudents = JSON.parse(
        localStorage.getItem(`myzkool_students_${schoolId}`) || "[]"
      );
      const rawClasses = JSON.parse(
        localStorage.getItem(`myzkool_classes_${schoolId}`) || "[]"
      );
      const rawAssignments = JSON.parse(
        localStorage.getItem(`myzkool_transport_assignments_${schoolId}`) || "[]"
      );
      const assignedIds = new Set(
        rawAssignments.filter((a: any) => a.status === "active").map((a: any) => a.student_id)
      );

      const activeStudents = rawStudents
        .filter((s: any) => s.status === "active" && !assignedIds.has(s.id))
        .map((s: any) => {
          const c = rawClasses.find((cl: any) => cl.id === s.class_id);
          return {
            id: s.id,
            first_name: s.first_name,
            last_name: s.last_name || "",
            admission_no: s.admission_no,
            class_name: c?.name || "Class",
            locality: s.address_locality || s.city || "Local",
            landmark: s.address_landmark || "",
          };
        });

      setUnassignedStudents(activeStudents);

      // Load requests
      const reqs = await listTransportRequests(schoolId, "pending");
      setRequests(reqs);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!schoolId) return;
    loadData();
  }, [schoolId]);

  // Recalculate fee live
  useEffect(() => {
    if (!selectedStopId) return;
    calculateStopMonthlyFee(schoolId, selectedStopId, serviceType).then((f) => {
      setMonthlyFeePaise(f);
    });
  }, [schoolId, selectedStopId, serviceType]);

  const selectedRoute = routes.find((r) => r.id === selectedRouteId);
  const selectedStop = selectedRoute?.stops.find((s) => s.id === selectedStopId);

  const capacity = selectedRoute?.seat_capacity || selectedRoute?.vehicle?.capacity || 0;
  const seatsUsed = selectedRoute?.seats_used || 0;
  const seatsLeft = Math.max(0, capacity - seatsUsed);
  const isOverCapacity = capacity > 0 && selectedStudentIds.size > seatsLeft;

  const filteredStudents = unassignedStudents.filter((s) => {
    const matchesSearch =
      `${s.first_name} ${s.last_name} ${s.admission_no} ${s.locality} ${s.landmark}`
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
    const matchesClass = selectedClass === "all" || s.class_name === selectedClass;
    return matchesSearch && matchesClass;
  });

  const availableClasses = Array.from(new Set(unassignedStudents.map((s) => s.class_name))).sort();

  const toggleSelectAll = () => {
    if (selectedStudentIds.size === filteredStudents.length) {
      setSelectedStudentIds(new Set());
    } else {
      setSelectedStudentIds(new Set(filteredStudents.map((s) => s.id)));
    }
  };

  const toggleSelectStudent = (id: string) => {
    const next = new Set(selectedStudentIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedStudentIds(next);
  };

  const handleAssignSelected = async () => {
    if (selectedStudentIds.size === 0) return;
    if (!selectedRouteId || !selectedStopId) return;

    setStatusMessage(null);
    setSubmitting(true);

    try {
      const res = await bulkAssignStudents(schoolId, {
        student_ids: Array.from(selectedStudentIds),
        academic_year_id: academicYearId,
        route_id: selectedRouteId,
        pickup_stop_id: selectedStopId,
        service_type: serviceType,
        effective_from: effectiveFrom,
        override_reason: overrideReason,
      });

      if (!res.success) {
        setStatusMessage({
          type: "error",
          text: res.error || "Failed to assign selected students.",
        });
        return;
      }

      setStatusMessage({
        type: "success",
        text: `Successfully assigned ${res.count} student(s) to ${selectedRoute?.name}. Dues generated.`,
      });

      setSelectedStudentIds(new Set());
      setOverrideReason("");
      loadData();
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "An error occurred." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 font-display flex items-center gap-2.5">
            <Bus className="w-5 h-5 text-[#2158E0]" />
            Bulk Transport Assignment
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Map students without transport to routes and stops in batch with automated fee billing.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("unassigned")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === "unassigned"
                ? "bg-[#2158E0] text-white"
                : "bg-white text-slate-600 border border-[#E6EAF3] hover:bg-slate-50"
            }`}
          >
            Unassigned Students ({unassignedStudents.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("requests")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === "requests"
                ? "bg-[#2158E0] text-white"
                : "bg-white text-slate-600 border border-[#E6EAF3] hover:bg-slate-50"
            }`}
          >
            Requests ({requests.length})
          </button>
        </div>
      </div>

      {statusMessage && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center gap-2.5 border ${
            statusMessage.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-rose-50 text-rose-800 border-rose-200"
          }`}
        >
          {statusMessage.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Two Panes */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Pane (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-[#E6EAF3] rounded-2xl p-5 shadow-2xs space-y-4">
          {activeTab === "unassigned" ? (
            <>
              {/* Search & Filter Bar */}
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="relative flex-1 w-full">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by student, admission #, locality, or landmark..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-[#E6EAF3] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2158E0]"
                  />
                </div>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="text-xs px-3 py-2 border border-[#E6EAF3] rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#2158E0]"
                >
                  <option value="all">All Classes</option>
                  {availableClasses.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Selection Summary */}
              <div className="flex items-center justify-between py-2 border-y border-[#E6EAF3] text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className="flex items-center gap-1.5 font-semibold text-slate-700 hover:text-slate-900 cursor-pointer"
                  >
                    {selectedStudentIds.size > 0 &&
                    selectedStudentIds.size === filteredStudents.length ? (
                      <CheckSquare className="w-4 h-4 text-[#2158E0]" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400" />
                    )}
                    <span>Select all ({filteredStudents.length})</span>
                  </button>
                </div>
                <span className="font-semibold text-slate-700">
                  {selectedStudentIds.size} selected
                </span>
              </div>

              {/* Student list */}
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                {filteredStudents.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    No unassigned students found matching filters.
                  </div>
                ) : (
                  filteredStudents.map((s) => {
                    const isSelected = selectedStudentIds.has(s.id);
                    return (
                      <div
                        key={s.id}
                        onClick={() => toggleSelectStudent(s.id)}
                        className={`p-3 rounded-xl border text-xs cursor-pointer flex items-center justify-between transition-colors ${
                          isSelected
                            ? "bg-blue-50/60 border-blue-200 text-slate-900"
                            : "bg-white border-[#E6EAF3] hover:bg-slate-50 text-slate-700"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="text-slate-400">
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-[#2158E0]" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900">
                              {s.first_name} {s.last_name}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono">
                              {s.admission_no} • {s.class_name}
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-slate-700 font-medium flex items-center gap-1 justify-end">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            {s.locality}
                          </div>
                          {s.landmark && (
                            <div className="text-[11px] text-slate-400">Near {s.landmark}</div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          ) : (
            // Requests Tab
            <div className="space-y-3">
              <div className="text-xs text-slate-500 pb-2 border-b border-[#E6EAF3]">
                Parents who requested school transport through the admission or portal workflow.
              </div>

              {requests.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  No pending transport requests.
                </div>
              ) : (
                requests.map((r) => (
                  <div
                    key={r.id}
                    className="p-3.5 border border-[#E6EAF3] rounded-xl text-xs space-y-2 bg-slate-50/40"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-semibold text-slate-900">
                          {r.student_name} ({r.class_name})
                        </div>
                        <div className="text-slate-600 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-amber-600" />
                          Requested: {r.requested_location}
                        </div>
                        {r.note && (
                          <div className="text-[11px] text-slate-500 italic mt-0.5">
                            "{r.note}"
                          </div>
                        )}
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800">
                        Pending
                      </span>
                    </div>

                    <div className="pt-2 border-t border-[#E6EAF3] flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          await updateTransportRequestStatus(schoolId, r.id, "rejected");
                          loadData();
                        }}
                        className="px-2.5 py-1 rounded text-slate-600 hover:bg-slate-200 text-[11px] font-semibold cursor-pointer"
                      >
                        Decline
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          toggleSelectStudent(r.student_id);
                          setActiveTab("unassigned");
                        }}
                        className="px-3 py-1 rounded bg-[#2158E0] text-white text-[11px] font-semibold hover:bg-blue-700 cursor-pointer"
                      >
                        Select for assignment
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Right Pane (5 cols) */}
        <div className="lg:col-span-5 bg-white border border-[#E6EAF3] rounded-2xl p-5 shadow-2xs space-y-5">
          <div>
            <h2 className="text-sm font-bold text-slate-900 font-display">
              Target Route & Stop
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Select destination and service parameters for selected students.
            </p>
          </div>

          {/* Route selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Route
            </label>
            <select
              value={selectedRouteId}
              onChange={(e) => {
                setSelectedRouteId(e.target.value);
                const r = routes.find((rt) => rt.id === e.target.value);
                if (r && r.stops.length > 0) setSelectedStopId(r.stops[0].id);
              }}
              className="w-full text-xs px-3 py-2 border border-[#E6EAF3] rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#2158E0]"
            >
              {routes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.vehicle?.registration_no || "No vehicle"})
                </option>
              ))}
            </select>
          </div>

          {/* Stop selector with seats */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Stop
            </label>
            <div className="space-y-1 max-h-44 overflow-y-auto border border-[#E6EAF3] rounded-xl p-1.5">
              {selectedRoute?.stops.map((stop) => {
                const isSelected = stop.id === selectedStopId;
                return (
                  <div
                    key={stop.id}
                    onClick={() => setSelectedStopId(stop.id)}
                    className={`p-2 rounded-lg text-xs cursor-pointer flex items-center justify-between transition-colors ${
                      isSelected
                        ? "bg-blue-50 border border-blue-200 text-[#2158E0] font-semibold"
                        : "hover:bg-slate-50 text-slate-800"
                    }`}
                  >
                    <div>
                      <div>{stop.name}</div>
                      <div className="text-[10px] text-slate-500">
                        {stop.pickup_time || "—"} / {stop.drop_time || "—"}
                      </div>
                    </div>
                    {stop.landmark && (
                      <span className="text-[10px] text-slate-400">Near {stop.landmark}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Service type & fee */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Service Type
              </label>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                ₹{(monthlyFeePaise / 100).toFixed(0)}/mo per student
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
                  className={`py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
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

          {/* Effective date */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Effective Date
            </label>
            <input
              type="date"
              value={effectiveFrom}
              onChange={(e) => setEffectiveFrom(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-[#E6EAF3] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2158E0]"
            />
          </div>

          {/* Confirmation Summary Box (Spec C5.2) */}
          <div className="p-4 bg-slate-50 border border-[#E6EAF3] rounded-xl space-y-2 text-xs">
            <div className="font-bold text-slate-900">Assignment Summary</div>
            <div className="flex justify-between text-slate-600">
              <span>Selected Students:</span>
              <span className="font-semibold text-slate-900">{selectedStudentIds.size}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Target Stop:</span>
              <span className="font-semibold text-slate-900">{selectedStop?.name || "—"}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Route Seats:</span>
              <span className="font-semibold text-slate-900">
                {seatsUsed + selectedStudentIds.size}/{capacity} used
              </span>
            </div>
            <div className="flex justify-between text-slate-600 pt-1 border-t border-[#E6EAF3]">
              <span>Monthly Demand Change:</span>
              <span className="font-bold text-emerald-700">
                +₹{((monthlyFeePaise * selectedStudentIds.size) / 100).toLocaleString("en-IN")}
              </span>
            </div>
          </div>

          {/* Over Capacity Block */}
          {isOverCapacity && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2 text-xs text-amber-900">
              <div className="flex items-center gap-1.5 font-bold text-amber-800">
                <ShieldAlert className="w-4 h-4" />
                Over-capacity warning
              </div>
              <p className="text-slate-600 text-[11px]">
                Adding {selectedStudentIds.size} student(s) exceeds capacity ({seatsLeft} seats left).
                Requires owner override reason to proceed.
              </p>
              <input
                type="text"
                placeholder="Type override reason..."
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-white border border-amber-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
          )}

          {/* Action button */}
          <button
            type="button"
            onClick={handleAssignSelected}
            disabled={
              submitting ||
              selectedStudentIds.size === 0 ||
              (isOverCapacity && !overrideReason.trim())
            }
            className={`w-full py-2.5 rounded-xl text-xs font-semibold text-white transition-colors cursor-pointer flex items-center justify-center gap-2 ${
              isOverCapacity
                ? "bg-amber-600 hover:bg-amber-700 disabled:opacity-50"
                : "bg-[#2158E0] hover:bg-blue-700 disabled:opacity-50"
            }`}
          >
            {submitting ? (
              "Assigning..."
            ) : isOverCapacity ? (
              "Request override & assign"
            ) : (
              <>
                <span>Assign {selectedStudentIds.size} student(s)</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

