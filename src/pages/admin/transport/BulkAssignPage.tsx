/**
 * Bulk Transport Assignment Screen (Spec C5.2)
 *
 * Two panes:
 * - Left: Students without transport (search, class filter, locality/landmark) + Requests tab
 * - Right: Route selector with stops, seats used, service type
 * Confirmation summary lists students, stop, fee, and total demand change.
 */

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
  ArrowLeft,
  Pencil,
  XCircle,
  AlertTriangle,
  X,
  UserCheck,
  DollarSign,
  Calendar,
  RotateCcw,
} from "lucide-react";
import { getRoutes } from "../../../services/transportCoreService";
import {
  bulkAssignStudents,
  listEnrichedAssignments,
  stopAssignment,
  listTransportRequests,
  updateTransportRequestStatus,
  calculateStopMonthlyFee,
} from "../../../services/transportAssignmentService";
import { getAcademicYearsForSchool } from "../../../services/academicService";
import { supabase, isSupabaseConfigured } from "../../../lib/supabase";
import { useAuth } from "../../../context/AuthContext";
import { AssignTransportDrawer } from "./AssignTransportDrawer";
import type { EnrichedRoute, ServiceType, TransportRequest, TransportAssignment } from "../../../types/transport";
import type { AcademicYear } from "../../../types/academic";

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
  const navigate = useNavigate();
  const { schoolId: authSchoolId } = useAuth();
  const [activeTab, setActiveTab] = useState<"unassigned" | "assigned" | "requests">("unassigned");
  const [schoolId, setSchoolId] = useState<string>(authSchoolId || "");
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [academicYearId, setAcademicYearId] = useState<string>("");

  const handleBack = () => {
    if (selectedStudentIds.size > 0) {
      if (!window.confirm("You have students selected for assignment. Discard and go back?")) {
        return;
      }
    }
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate("/admin/transport");
    }
  };

  // Left pane states (Unassigned)
  const [unassignedStudents, setUnassignedStudents] = useState<StudentItem[]>([]);
  const [requests, setRequests] = useState<TransportRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());

  // Assigned students view states
  const [assignedStudents, setAssignedStudents] = useState<TransportAssignment[]>([]);
  const [assignedSearchQuery, setAssignedSearchQuery] = useState<string>("");
  const [assignedSelectedClass, setAssignedSelectedClass] = useState<string>("all");
  const [assignedSelectedRoute, setAssignedSelectedRoute] = useState<string>("all");
  const [assignedSelectedStop, setAssignedSelectedStop] = useState<string>("all");
  const [assignedSelectedStatus, setAssignedSelectedStatus] = useState<"all" | "active" | "ended">("active");

  // Edit Assignment Drawer state
  const [editingAssignment, setEditingAssignment] = useState<TransportAssignment | null>(null);
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState<boolean>(false);

  // End Assignment Modal state
  const [endingAssignment, setEndingAssignment] = useState<TransportAssignment | null>(null);
  const [endEffectiveDate, setEndEffectiveDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [endReasonPreset, setEndReasonPreset] = useState<string>("Parent requested cancellation");
  const [endReasonCustom, setEndReasonCustom] = useState<string>("");
  const [endingSubmitting, setEndingSubmitting] = useState<boolean>(false);

  // Right pane states
  const [routes, setRoutes] = useState<EnrichedRoute[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string>("");
  const [selectedStopId, setSelectedStopId] = useState<string>("");
  const [serviceType, setServiceType] = useState<ServiceType>("both");
  const [effectiveFrom, setEffectiveFrom] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [monthlyFeePaise, setMonthlyFeePaise] = useState<number>(0);
  const [feeStatus, setFeeStatus] = useState<{
    loading: boolean;
    feePaise: number | null;
    isFree: boolean;
    error: string | null;
  }>({
    loading: false,
    feePaise: null,
    isFree: false,
    error: null,
  });
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

  const loadData = async (overrideYearId?: string) => {
    if (!schoolId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // 1. Load Academic Years
      const ayRes = await getAcademicYearsForSchool(schoolId);
      const years = ayRes.academicYears || [];
      setAcademicYears(years);
      let targetYearId = overrideYearId || academicYearId;
      if (!targetYearId && years.length > 0) {
        const currentYear = years.find((y) => y.is_current) || years[0];
        targetYearId = currentYear.id;
        setAcademicYearId(targetYearId);
      }

      // 2. Load Routes
      const allRoutes = await getRoutes(schoolId);
      setRoutes(allRoutes);
      if (allRoutes.length > 0) {
        const activeRoute = allRoutes.find((r) => r.id === selectedRouteId) || allRoutes[0];
        setSelectedRouteId(activeRoute.id);
        if (activeRoute.stops.length > 0) {
          const hasStop = activeRoute.stops.some((s) => s.id === selectedStopId);
          if (!hasStop) setSelectedStopId(activeRoute.stops[0].id);
        } else {
          setSelectedStopId("");
        }
      }

      // 3. Load Enriched Assignments directly
      const enriched = await listEnrichedAssignments(schoolId, {
        academicYearId: targetYearId || undefined,
        status: "all",
      });

      // 4. Load Students, Classes, Sections, Addresses, Enrollments
      let rawStudents: any[] = [];
      let rawClasses: any[] = [];
      let rawSections: any[] = [];
      let rawAddresses: any[] = [];
      let rawEnrollments: any[] = [];

      if (isSupabaseConfigured) {
        const [stRes, clRes, secRes, adRes, enRes] = await Promise.all([
          supabase
            .from("students")
            .select("id, admission_no, first_name, last_name, status, admission_class_id")
            .eq("school_id", schoolId)
            .is("deleted_at", null)
            .order("first_name", { ascending: true }),
          supabase
            .from("classes")
            .select("id, name")
            .eq("school_id", schoolId),
          supabase
            .from("sections")
            .select("id, name, class_id")
            .eq("school_id", schoolId),
          supabase
            .from("student_addresses")
            .select("student_id, locality, landmark, city, kind")
            .eq("school_id", schoolId),
          supabase
            .from("student_enrollments")
            .select("student_id, class_id, section_id, status")
            .eq("school_id", schoolId)
            .eq("status", "active"),
        ]);

        if (stRes.error) {
          console.warn("Fallback to select(*) on students:", stRes.error.message);
          const fbSt = await supabase.from("students").select("*").eq("school_id", schoolId).is("deleted_at", null);
          rawStudents = fbSt.data || [];
        } else {
          rawStudents = stRes.data || [];
        }

        rawClasses = clRes.data || [];
        rawSections = secRes.data || [];
        rawAddresses = adRes.data || [];
        rawEnrollments = enRes.data || [];
      }

      if (rawStudents.length === 0) {
        rawStudents = JSON.parse(
          localStorage.getItem(`myzkool_students_${schoolId}`) || "[]"
        );
      }
      if (rawClasses.length === 0) {
        rawClasses = JSON.parse(
          localStorage.getItem(`myzkool_classes_${schoolId}`) || "[]"
        );
      }
      if (rawSections.length === 0) {
        rawSections = JSON.parse(
          localStorage.getItem(`myzkool_sections_${schoolId}`) || "[]"
        );
      }
      if (rawEnrollments.length === 0) {
        rawEnrollments = JSON.parse(
          localStorage.getItem(`myzkool_student_enrollments_${schoolId}`) || "[]"
        );
      }

      // Secondary cross-enrichment to guarantee names & classes are never blank
      const fullyEnrichedAssigned = enriched.map((assign) => {
        const s = rawStudents.find((st: any) => st.id === assign.student_id);
        const enr = rawEnrollments.find((e: any) => e.student_id === assign.student_id);
        const classId = enr?.class_id || s?.admission_class_id || (s as any)?.class_id;
        const c = rawClasses.find((cl: any) => cl.id === classId);
        const sec = enr?.section_id ? rawSections.find((sc: any) => sc.id === enr.section_id) : null;

        const resolvedName = s ? `${s.first_name || ""} ${s.last_name || ""}`.trim() || (s as any).name : "";
        const resolvedAdmission = s?.admission_no || (s as any)?.student_admission_no;
        const resolvedClass = c ? (sec?.name ? `${c.name} - ${sec.name}` : c.name) : undefined;

        return {
          ...assign,
          student_name: resolvedName || (assign.student_name && assign.student_name !== "Unknown Student" ? assign.student_name : "Unknown Student"),
          student_admission_no: resolvedAdmission || (assign.student_admission_no && assign.student_admission_no !== "—" ? assign.student_admission_no : "—"),
          class_name: resolvedClass || (assign.class_name && assign.class_name !== "—" ? assign.class_name : "—"),
        };
      });

      setAssignedStudents(fullyEnrichedAssigned);

      const activeAssignedStudentIds = new Set(
        fullyEnrichedAssigned.filter((a) => a.status === "active").map((a) => a.student_id)
      );

      const activeStudents = rawStudents
        .filter((s: any) => (s.status === "enrolled" || s.status === "active") && !activeAssignedStudentIds.has(s.id))
        .map((s: any) => {
          const enrollment = rawEnrollments.find((e: any) => e.student_id === s.id);
          const classId = enrollment?.class_id || s.admission_class_id || s.class_id;
          const c = rawClasses.find((cl: any) => cl.id === classId);
          const sec = enrollment?.section_id ? rawSections.find((sc: any) => sc.id === enrollment.section_id) : null;

          const addr = rawAddresses.find((a: any) => a.student_id === s.id && (a.kind === "current" || a.address_kind === "current")) ||
            rawAddresses.find((a: any) => a.student_id === s.id);

          return {
            id: s.id,
            first_name: s.first_name,
            last_name: s.last_name || "",
            admission_no: s.admission_no,
            class_name: c ? (sec?.name ? `${c.name} - ${sec.name}` : c.name) : "Class",
            locality: addr?.locality || addr?.city || s.address_locality || s.city || "Local",
            landmark: addr?.landmark || s.address_landmark || "",
          };
        });

      setUnassignedStudents(activeStudents);

      // 5. Load Requests
      const reqs = await listTransportRequests(schoolId, "pending");
      setRequests(reqs);
    } catch (err: any) {
      console.error("Failed to load bulk assignment data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!schoolId) return;
    loadData();
  }, [schoolId]);

  // Recalculate fee live with clear error differentiation
  useEffect(() => {
    if (!schoolId || !selectedStopId) {
      setMonthlyFeePaise(0);
      setFeeStatus({ loading: false, feePaise: null, isFree: false, error: null });
      return;
    }

    let active = true;
    setFeeStatus({ loading: true, feePaise: null, isFree: false, error: null });

    calculateStopMonthlyFee(schoolId, selectedStopId, serviceType)
      .then((f) => {
        if (!active) return;
        setMonthlyFeePaise(f);
        setFeeStatus({
          loading: false,
          feePaise: f,
          isFree: f === 0,
          error: null,
        });
      })
      .catch((err: any) => {
        if (!active) return;
        setMonthlyFeePaise(0);
        setFeeStatus({
          loading: false,
          feePaise: null,
          isFree: false,
          error: err?.message || "Transport fee has not been configured for this stop.",
        });
      });

    return () => {
      active = false;
    };
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

  // Filtered assigned students
  const filteredAssignedStudents = assignedStudents.filter((a) => {
    const term = assignedSearchQuery.trim().toLowerCase();
    const matchesSearch = !term ||
      `${a.student_name || ""} ${a.student_admission_no || ""} ${a.route_name || ""} ${a.pickup_stop_name || ""} ${a.drop_stop_name || ""}`
        .toLowerCase()
        .includes(term);
    const matchesClass = assignedSelectedClass === "all" || a.class_name === assignedSelectedClass;
    const matchesRoute = assignedSelectedRoute === "all" || a.route_id === assignedSelectedRoute;
    const matchesStop = assignedSelectedStop === "all" || a.pickup_stop_id === assignedSelectedStop || a.drop_stop_id === assignedSelectedStop;
    const matchesStatus = assignedSelectedStatus === "all" || a.status === assignedSelectedStatus;
    return matchesSearch && matchesClass && matchesRoute && matchesStop && matchesStatus;
  });

  const availableAssignedClasses = Array.from(
    new Set(assignedStudents.map((a) => a.class_name).filter((c): c is string => Boolean(c) && c !== "—"))
  ).sort();

  const availableAssignedRoutes = routes.filter((r) =>
    assignedStudents.some((a) => a.route_id === r.id)
  );

  const availableAssignedStops = assignedSelectedRoute === "all"
    ? routes.flatMap((r) => r.stops)
    : (routes.find((r) => r.id === assignedSelectedRoute)?.stops || []);

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

  const handleOpenEdit = (assign: TransportAssignment) => {
    setEditingAssignment(assign);
    setIsEditDrawerOpen(true);
  };

  const handleOpenEnd = (assign: TransportAssignment) => {
    setEndingAssignment(assign);
    setEndEffectiveDate(new Date().toISOString().split("T")[0]);
    setEndReasonPreset("Parent requested cancellation");
    setEndReasonCustom("");
  };

  const handleConfirmEnd = async () => {
    if (!endingAssignment) return;
    const reason = endReasonPreset === "Other"
      ? (endReasonCustom.trim() || "Assignment ended by administrator")
      : endReasonCustom.trim()
      ? `${endReasonPreset}: ${endReasonCustom.trim()}`
      : endReasonPreset;

    setEndingSubmitting(true);
    try {
      const res = await stopAssignment(schoolId, endingAssignment.id, {
        effective_date: endEffectiveDate,
        reason,
      });

      if (!res.success) {
        setStatusMessage({
          type: "error",
          text: res.error || "Failed to end transport assignment.",
        });
        return;
      }

      setStatusMessage({
        type: "success",
        text: `Transport assignment ended for ${endingAssignment.student_name}. Future dues cancelled.`,
      });
      setEndingAssignment(null);
      loadData();
    } catch (err: any) {
      setStatusMessage({
        type: "error",
        text: err.message || "An error occurred while ending the assignment.",
      });
    } finally {
      setEndingSubmitting(false);
    }
  };

  const handleAssignSelected = async () => {
    if (selectedStudentIds.size === 0) return;
    if (!selectedRouteId || !selectedStopId) {
      setStatusMessage({
        type: "error",
        text: "Please select both a valid route and a stop.",
      });
      return;
    }
    if (feeStatus.error) {
      setStatusMessage({
        type: "error",
        text: feeStatus.error,
      });
      return;
    }

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
        const errorDetail = res.failed && res.failed.length > 0
          ? res.failed.map((f: any) => f.error).join(", ")
          : res.error || "Failed to assign selected students.";
        setStatusMessage({
          type: "error",
          text: errorDetail,
        });
        return;
      }

      if (res.failed && res.failed.length > 0) {
        setStatusMessage({
          type: "success",
          text: `Assigned ${res.count} student(s) successfully to ${selectedRoute?.name}. However, ${res.failed.length} student(s) failed (${res.failed.map((f: any) => f.error).join(", ")}).`,
        });
      } else {
        setStatusMessage({
          type: "success",
          text: `Successfully assigned ${res.count} student(s) to ${selectedRoute?.name}. Dues generated.`,
        });
      }

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
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#E6EAF3] bg-white text-xs font-bold text-[#5B6478] hover:text-[#141A2E] hover:bg-gray-50 shadow-sm transition-all cursor-pointer"
            title="Return to Transport Dashboard"
          >
            <ArrowLeft className="w-4 h-4 text-[#2158E0]" />
            <span>Back to Transport</span>
          </button>

          <div className="h-6 w-px bg-gray-200 hidden sm:block"></div>

          <div>
            <h1 className="text-xl font-bold text-slate-900 font-display flex items-center gap-2.5">
              <Bus className="w-5 h-5 text-[#2158E0]" />
              Bulk Transport Assignment
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Map students without transport to routes and stops in batch with automated fee billing.
            </p>
          </div>
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
            onClick={() => setActiveTab("assigned")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === "assigned"
                ? "bg-[#2158E0] text-white"
                : "bg-white text-slate-600 border border-[#E6EAF3] hover:bg-slate-50"
            }`}
          >
            Assigned Students ({assignedStudents.filter((a) => a.status === "active").length})
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

      {/* Main Content Area: Assigned Students View OR Unassigned/Requests 2-Pane */}
      {activeTab === "assigned" ? (
        <div className="space-y-5">
          {/* Top Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white border border-[#E6EAF3] rounded-2xl p-4 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-xs font-medium">Active Riders</span>
                <Bus className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-bold text-slate-900 font-display">
                {assignedStudents.filter((a) => a.status === "active").length}
              </div>
              <div className="text-[11px] text-emerald-600 mt-0.5">Currently on transport</div>
            </div>

            <div className="bg-white border border-[#E6EAF3] rounded-2xl p-4 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-xs font-medium">Routes in Use</span>
                <MapPin className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-slate-900 font-display">
                {new Set(assignedStudents.filter((a) => a.status === "active").map((a) => a.route_id)).size}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">Across school network</div>
            </div>

            <div className="bg-white border border-[#E6EAF3] rounded-2xl p-4 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-xs font-medium">Monthly Demand</span>
                <DollarSign className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="text-2xl font-bold text-slate-900 font-display">
                ₹{(
                  assignedStudents
                    .filter((a) => a.status === "active")
                    .reduce((sum, a) => sum + (Number(a.monthly_fee_paise) || 0), 0) / 100
                ).toLocaleString("en-IN")}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">Active monthly billing</div>
            </div>

            <div className="bg-white border border-[#E6EAF3] rounded-2xl p-4 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-xs font-medium">Ended / Past</span>
                <Clock className="w-4 h-4 text-slate-400" />
              </div>
              <div className="text-2xl font-bold text-slate-900 font-display">
                {assignedStudents.filter((a) => a.status === "ended").length}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">Historical records retained</div>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="bg-white border border-[#E6EAF3] rounded-2xl p-4 shadow-2xs space-y-3">
            <div className="flex flex-col md:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by student name, admission #, route, or stop..."
                  value={assignedSearchQuery}
                  onChange={(e) => setAssignedSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-[#E6EAF3] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#2158E0]"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full md:w-auto">
                {/* Class filter */}
                <select
                  value={assignedSelectedClass}
                  onChange={(e) => setAssignedSelectedClass(e.target.value)}
                  className="text-xs px-2.5 py-2 border border-[#E6EAF3] rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-[#2158E0]"
                >
                  <option value="all">All Classes</option>
                  {availableAssignedClasses.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>

                {/* Route filter */}
                <select
                  value={assignedSelectedRoute}
                  onChange={(e) => {
                    setAssignedSelectedRoute(e.target.value);
                    setAssignedSelectedStop("all");
                  }}
                  className="text-xs px-2.5 py-2 border border-[#E6EAF3] rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-[#2158E0]"
                >
                  <option value="all">All Routes</option>
                  {routes.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>

                {/* Stop filter */}
                <select
                  value={assignedSelectedStop}
                  onChange={(e) => setAssignedSelectedStop(e.target.value)}
                  className="text-xs px-2.5 py-2 border border-[#E6EAF3] rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-[#2158E0]"
                >
                  <option value="all">All Stops</option>
                  {availableAssignedStops.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>

                {/* Status filter */}
                <select
                  value={assignedSelectedStatus}
                  onChange={(e) => setAssignedSelectedStatus(e.target.value as any)}
                  className="text-xs px-2.5 py-2 border border-[#E6EAF3] rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-[#2158E0]"
                >
                  <option value="active">Active Only</option>
                  <option value="ended">Ended Only</option>
                  <option value="all">All Statuses</option>
                </select>
              </div>

              {(assignedSearchQuery || assignedSelectedClass !== "all" || assignedSelectedRoute !== "all" || assignedSelectedStop !== "all" || assignedSelectedStatus !== "active") && (
                <button
                  type="button"
                  onClick={() => {
                    setAssignedSearchQuery("");
                    setAssignedSelectedClass("all");
                    setAssignedSelectedRoute("all");
                    setAssignedSelectedStop("all");
                    setAssignedSelectedStatus("active");
                  }}
                  className="px-2.5 py-2 rounded-xl border border-dashed border-slate-300 text-slate-500 hover:text-slate-800 text-xs flex items-center gap-1 cursor-pointer"
                  title="Clear all filters"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>
              )}
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-[#E6EAF3]">
              <span>
                Showing <strong className="text-slate-800">{filteredAssignedStudents.length}</strong> assigned student{filteredAssignedStudents.length === 1 ? "" : "s"}
              </span>
              <span className="text-[11px] text-slate-400">
                Click <strong>Edit</strong> to modify route/stop or <strong>End</strong> to cancel transport.
              </span>
            </div>
          </div>

          {/* Assigned Students Table */}
          <div className="bg-white border border-[#E6EAF3] rounded-2xl shadow-2xs overflow-hidden">
            {filteredAssignedStudents.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                  <Bus className="w-6 h-6" />
                </div>
                <div className="text-sm font-semibold text-slate-700">No assigned students found</div>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {assignedStudents.length === 0
                    ? "No students have been assigned to transport routes yet. Select students from the Unassigned tab to assign them."
                    : "No students match your filter criteria. Try clearing or relaxing the search filters."}
                </p>
                {assignedStudents.length === 0 ? (
                  <button
                    type="button"
                    onClick={() => setActiveTab("unassigned")}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2158E0] text-white text-xs font-semibold hover:bg-blue-700 cursor-pointer"
                  >
                    <span>Go to Unassigned Students</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setAssignedSearchQuery("");
                      setAssignedSelectedClass("all");
                      setAssignedSelectedRoute("all");
                      setAssignedSelectedStop("all");
                      setAssignedSelectedStatus("all");
                    }}
                    className="text-xs text-[#2158E0] hover:underline font-semibold"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-[#E6EAF3] text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Student</th>
                      <th className="py-3 px-3">Class</th>
                      <th className="py-3 px-3">Assigned Route</th>
                      <th className="py-3 px-3">Pickup / Drop Stop</th>
                      <th className="py-3 px-3">Service</th>
                      <th className="py-3 px-3">Monthly Fee</th>
                      <th className="py-3 px-3">Effective Date</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E6EAF3]">
                    {filteredAssignedStudents.map((a) => {
                      const isEnded = a.status === "ended";
                      return (
                        <tr key={a.id} className="hover:bg-slate-50/70 transition-colors">
                          {/* Student */}
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-900">
                              {a.student_name}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono">
                              {a.student_admission_no}
                            </div>
                          </td>

                          {/* Class */}
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium text-[11px]">
                              {a.class_name}
                            </span>
                          </td>

                          {/* Route */}
                          <td className="py-3 px-3">
                            <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                              <Bus className="w-3.5 h-3.5 text-[#2158E0] shrink-0" />
                              <span>{a.route_name}</span>
                            </div>
                          </td>

                          {/* Stop & times */}
                          <td className="py-3 px-3">
                            <div className="text-slate-800 font-medium">
                              {a.pickup_stop_name}
                            </div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                              <Clock className="w-3 h-3 text-slate-400" />
                              <span>{a.pickup_time || "—"} / {a.drop_time || "—"}</span>
                            </div>
                          </td>

                          {/* Service Type */}
                          <td className="py-3 px-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                a.service_type === "both"
                                  ? "bg-blue-50 text-blue-700 border border-blue-200"
                                  : a.service_type === "pickup_only"
                                  ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                                  : "bg-purple-50 text-purple-700 border border-purple-200"
                              }`}
                            >
                              {a.service_type === "both"
                                ? "Both ways"
                                : a.service_type === "pickup_only"
                                ? "Pickup only"
                                : "Drop only"}
                            </span>
                          </td>

                          {/* Fee */}
                          <td className="py-3 px-3">
                            <span className="font-bold text-emerald-700">
                              ₹{((a.monthly_fee_paise || 0) / 100).toLocaleString("en-IN")}/mo
                            </span>
                          </td>

                          {/* Effective Date */}
                          <td className="py-3 px-3">
                            <div className="text-slate-700 font-medium">
                              From: {a.effective_from}
                            </div>
                            {a.effective_to && (
                              <div className="text-[11px] text-slate-400">
                                To: {a.effective_to}
                              </div>
                            )}
                          </td>

                          {/* Status */}
                          <td className="py-3 px-3">
                            {isEnded ? (
                              <div>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                                  Ended
                                </span>
                                {a.end_reason && (
                                  <div className="text-[10px] text-slate-400 truncate max-w-[120px]" title={a.end_reason}>
                                    {a.end_reason}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                Active
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(a)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#E6EAF3] bg-white text-slate-700 hover:text-[#2158E0] hover:bg-blue-50/50 hover:border-blue-200 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                                title="Edit route, stop or service type"
                              >
                                <Pencil className="w-3.5 h-3.5 text-[#2158E0]" />
                                <span>Edit</span>
                              </button>

                              {!isEnded && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenEnd(a)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#E6EAF3] bg-white text-slate-600 hover:text-rose-600 hover:bg-rose-50/50 hover:border-rose-200 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                                  title="Stop bus service and cancel future dues"
                                >
                                  <XCircle className="w-3.5 h-3.5 text-rose-500" />
                                  <span>End</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Two Panes (Unassigned / Requests) */
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
                              &ldquo;{r.note}&rdquo;
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
                  const newRouteId = e.target.value;
                  setSelectedRouteId(newRouteId);
                  const r = routes.find((rt) => rt.id === newRouteId);
                  if (r && r.stops.length > 0) {
                    setSelectedStopId(r.stops[0].id);
                  } else {
                    setSelectedStopId("");
                  }
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
                {selectedRoute?.stops && selectedRoute.stops.length > 0 ? (
                  selectedRoute.stops.map((stop) => {
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
                  })
                ) : (
                  <div className="p-3 text-center text-xs text-slate-400">
                    No stops configured on this route.
                  </div>
                )}
              </div>
            </div>

            {/* Service type & fee */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Service Type
                </label>
                {feeStatus.loading ? (
                  <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    Calculating...
                  </span>
                ) : feeStatus.error ? (
                  <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200" title={feeStatus.error}>
                    Fee Not Configured
                  </span>
                ) : feeStatus.isFree ? (
                  <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    ₹0/mo (Free)
                  </span>
                ) : (
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    ₹{(monthlyFeePaise / 100).toLocaleString("en-IN")}/mo per student
                  </span>
                )}
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

            {/* Unconfigured Fee Alert */}
            {feeStatus.error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Transport Fee Not Configured</p>
                  <p className="text-[11px] text-rose-700 mt-0.5">
                    {feeStatus.error} Please configure this stop&apos;s monthly fee in Fee Management before assigning students.
                  </p>
                </div>
              </div>
            )}

            {/* Academic Year */}
            {academicYears.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Academic Year
                </label>
                <select
                  value={academicYearId}
                  onChange={(e) => {
                    setAcademicYearId(e.target.value);
                    loadData(e.target.value);
                  }}
                  className="w-full text-xs px-3 py-2 border border-[#E6EAF3] rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#2158E0]"
                >
                  {academicYears.map((ay) => (
                    <option key={ay.id} value={ay.id}>
                      {ay.label} {ay.is_current ? "(Current)" : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}

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
                !selectedRouteId ||
                !selectedStopId ||
                Boolean(feeStatus.error) ||
                feeStatus.loading ||
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
      )}

      {/* Edit Assignment Drawer */}
      {editingAssignment && (
        <AssignTransportDrawer
          isOpen={isEditDrawerOpen}
          onClose={() => {
            setIsEditDrawerOpen(false);
            setEditingAssignment(null);
          }}
          schoolId={schoolId}
          studentId={editingAssignment.student_id}
          studentName={editingAssignment.student_name || "Student"}
          className={editingAssignment.class_name}
          academicYearId={editingAssignment.academic_year_id || academicYearId}
          existingAssignment={editingAssignment}
          onSuccess={() => {
            setIsEditDrawerOpen(false);
            setEditingAssignment(null);
            loadData();
            setStatusMessage({
              type: "success",
              text: `Successfully updated transport assignment for ${editingAssignment.student_name}.`,
            });
          }}
        />
      )}

      {/* End Assignment Confirmation Modal */}
      {endingAssignment && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-[#E6EAF3] p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#E6EAF3]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                  <XCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 font-display">End Transport Assignment</h3>
                  <p className="text-xs text-slate-500">Stop bus service and cancel future dues</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEndingAssignment(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 bg-slate-50 border border-[#E6EAF3] rounded-xl text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Student:</span>
                <span className="font-semibold text-slate-900">
                  {endingAssignment.student_name} ({endingAssignment.student_admission_no})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Class:</span>
                <span className="font-semibold text-slate-900">{endingAssignment.class_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Route & Stop:</span>
                <span className="font-semibold text-slate-900">
                  {endingAssignment.route_name} • {endingAssignment.pickup_stop_name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Monthly Fee:</span>
                <span className="font-bold text-emerald-700">
                  ₹{((endingAssignment.monthly_fee_paise || 0) / 100).toLocaleString("en-IN")}/mo
                </span>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Effective End Date *</label>
                <input
                  type="date"
                  value={endEffectiveDate}
                  onChange={(e) => setEndEffectiveDate(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E6EAF3] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2158E0]"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Reason for Ending Transport *</label>
                <select
                  value={endReasonPreset}
                  onChange={(e) => setEndReasonPreset(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E6EAF3] rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#2158E0]"
                >
                  <option value="Parent requested cancellation">Parent requested cancellation</option>
                  <option value="Student relocated / shifted residence">Student relocated / shifted residence</option>
                  <option value="Switched to private commute">Switched to private commute</option>
                  <option value="Student withdrawn / left school">Student withdrawn / left school</option>
                  <option value="Route or timing conflict">Route or timing conflict</option>
                  <option value="Other">Other (custom reason)</option>
                </select>
              </div>

              {endReasonPreset === "Other" && (
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Specify Reason</label>
                  <input
                    type="text"
                    placeholder="Enter details..."
                    value={endReasonCustom}
                    onChange={(e) => setEndReasonCustom(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E6EAF3] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2158E0]"
                  />
                </div>
              )}

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 space-y-1">
                <div className="font-bold flex items-center gap-1 text-amber-800">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Preserved Records & Dues Policy
                </div>
                <p>• Historical payments, receipts, and ledger entries are preserved intact.</p>
                <p>• Future unbilled transport dues from {endEffectiveDate} will be automatically cancelled.</p>
                <p>• The student will immediately return to the Unassigned list and can be reassigned when needed.</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#E6EAF3]">
              <button
                type="button"
                onClick={() => setEndingAssignment(null)}
                disabled={endingSubmitting}
                className="px-4 py-2 rounded-xl border border-[#E6EAF3] text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmEnd}
                disabled={endingSubmitting || !endEffectiveDate}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {endingSubmitting ? "Ending Transport..." : "Confirm End Assignment"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

