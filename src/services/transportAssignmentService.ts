/**
 * Transport Student Assignment & Fee Integration Service (Spec C5, C7, C9, C13, C14, B6 Rule 15, D1)
 *
 * Capabilities:
 * - One active assignment per student per academic year (Rule C7.1)
 * - Capacity check & owner override audit (Rule C7.2)
 * - Compliance check & owner override audit (Rule C7.3)
 * - Fee creation via FeeService.createTransportDues (Rule C7.4)
 * - Atomic rollback: if FeeService fails, assignment is deleted (Rule C7.4)
 * - Fee snapshot at assignment (Rule C7.5)
 * - Change route/stop with fee dues adjustment (Rule C7.6)
 * - Stop transport with cancellation & future credit (Rule C7.7)
 * - TC / student withdrawal integration (Rule C7.8)
 * - Year renewal preview and commit (Spec C5.4)
 * - Absences (not travelling) (Spec C5.3)
 * - Transport requests (Spec C5.2)
 * - Non-trip reports (Spec C9)
 */

import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { checkSchoolFeature } from "../middleware/features";
import { createFeeService } from "./feeService";
import {
  getTransportSettings,
  getRouteById,
  getVehicles,
  getTransportStaff,
  getVehicleDocuments,
} from "./transportCoreService";
import type {
  TransportAssignment,
  TransportRequest,
  TransportAbsence,
  AssignStudentInput,
  ChangeAssignmentInput,
  StopAssignmentInput,
  RenewalPreviewItem,
  CommitRenewalInput,
  EnrichedStudentTransport,
  ServiceType,
  RequestStatus,
} from "../types/transport";

// ─── Cache helpers ────────────────────────────────────────────────────────────

const ASSIGNMENTS_KEY = (s: string) => `myzkool_transport_assignments_${s}`;
const REQUESTS_KEY = (s: string) => `myzkool_transport_requests_${s}`;
const ABSENCES_KEY = (s: string) => `myzkool_transport_absences_${s}`;
const AUDIT_KEY = (s: string) => `myzkool_audit_logs_${s}`;
const OUTBOX_KEY = (s: string) => `myzkool_fee_outbox_${s}`;
const STUDENTS_KEY = (s: string) => `myzkool_students_${s}`;
const CLASSES_KEY = (s: string) => `myzkool_classes_${s}`;
const SECTIONS_KEY = (s: string) => `myzkool_sections_${s}`;
const ZONES_KEY = (s: string) => `myzkool_transport_fee_zones_${s}`;

function nowISO() {
  return new Date().toISOString();
}

function uuid() {
  return crypto.randomUUID();
}

function lsGet<T>(key: string): T[] {
  if (typeof localStorage === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch {
    return [];
  }
}

function lsSet<T>(key: string, data: T[]): void {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(key, JSON.stringify(data));
  }
}

async function logTransportAudit(
  schoolId: string,
  entry: {
    actor_id?: string | null;
    actor_role?: string | null;
    action: string;
    entity_id: string;
    details?: any;
    reason?: string | null;
  }
) {
  const row = {
    id: uuid(),
    school_id: schoolId,
    actor_id: entry.actor_id || null,
    actor_role: entry.actor_role || null,
    entity_type: "transport_assignment",
    entity_id: entry.entity_id,
    action: entry.action,
    details: entry.details || {},
    reason: entry.reason || null,
    created_at: nowISO(),
  };

  if (isSupabaseConfigured) {
    try {
      await supabase.from("audit_logs").insert(row);
    } catch {
      // fallback
    }
  }
  const existing = lsGet<any>(AUDIT_KEY(schoolId));
  lsSet(AUDIT_KEY(schoolId), [row, ...existing]);
}

async function queueTransportNotification(
  schoolId: string,
  template: "transport_assigned" | "transport_changed" | "transport_stopped",
  params: Record<string, any>
) {
  const outboxItem = {
    id: uuid(),
    school_id: schoolId,
    channel: "whatsapp",
    template_key: template,
    params,
    status: "queued",
    created_at: nowISO(),
  };

  const outbox = lsGet<any>(OUTBOX_KEY(schoolId));
  outbox.push(outboxItem);
  lsSet(OUTBOX_KEY(schoolId), outbox);
}

// ─── Fee calculation helper ───────────────────────────────────────────────────

export async function calculateStopMonthlyFee(
  schoolId: string,
  stopId: string,
  serviceType: ServiceType
): Promise<number> {
  const settings = await getTransportSettings(schoolId);
  const zones = lsGet<any>(ZONES_KEY(schoolId));

  // Find stop
  let stop: any = null;
  if (isSupabaseConfigured) {
    const { data } = await supabase.from("route_stops").select("*").eq("id", stopId).eq("school_id", schoolId).maybeSingle();
    stop = data;
  } else {
    const allStops = lsGet<any>(`myzkool_route_stops_${schoolId}`);
    stop = allStops.find((s: any) => s.id === stopId);
  }

  if (!stop) return 100000; // fallback ₹1,000 in paise

  if (stop.fee_zone_id) {
    const zone = zones.find((z: any) => z.id === stop.fee_zone_id && z.is_active);
    if (zone) {
      if (serviceType === "pickup_only") {
        return zone.pickup_only_monthly_paise || zone.monthly_fee_paise;
      }
      if (serviceType === "drop_only") {
        return zone.drop_only_monthly_paise || zone.monthly_fee_paise;
      }
      return zone.monthly_fee_paise;
    }
  }

  // Default monthly fee fallback: ₹1,200 for both, ₹700 for one way
  if (serviceType === "pickup_only" || serviceType === "drop_only") {
    return 70000;
  }
  return 120000;
}

// ─── Core Assignment Operations ───────────────────────────────────────────────

/**
 * Assign a student to transport (Spec C5.1, C7)
 */
export async function createAssignment(
  schoolId: string,
  input: AssignStudentInput
): Promise<{ success: boolean; error?: string; assignment?: TransportAssignment }> {
  const hasTransport = await checkSchoolFeature(schoolId, "transport");
  if (!hasTransport) {
    return { success: false, error: "PLAN_REQUIRED" };
  }

  // 1. One active assignment per student per academic year (Rule C7.1)
  const existingActive = await getActiveAssignmentForStudent(
    schoolId,
    input.student_id,
    input.academic_year_id
  );
  if (existingActive) {
    return {
      success: false,
      error: "STUDENT_ALREADY_ASSIGNED",
    };
  }

  // 2. Fetch route and vehicle
  const route = await getRouteById(schoolId, input.route_id);
  if (!route) {
    return { success: false, error: "Route not found" };
  }

  // 3. Capacity Check (Rule C7.2)
  const currentRiders = await getActiveRidersCountForRoute(schoolId, input.route_id);
  const vehicleCapacity = route.vehicle?.capacity || 0;

  if (vehicleCapacity > 0 && currentRiders >= vehicleCapacity) {
    if (!input.override_reason || input.override_reason.trim().length === 0) {
      return {
        success: false,
        error: "ROUTE_OVER_CAPACITY",
      };
    }
    // Record capacity override audit
    await logTransportAudit(schoolId, {
      actor_id: input.actor_id,
      actor_role: input.actor_role,
      action: "transport_capacity_override",
      entity_id: input.student_id,
      reason: input.override_reason,
      details: { route_id: input.route_id, capacity: vehicleCapacity, riders: currentRiders },
    });
  }

  // 4. Compliance Check (Rule C7.3)
  const settings = await getTransportSettings(schoolId);
  if (settings.block_expired_documents) {
    let complianceBlocked = false;
    let blockReason = "";

    // Check vehicle documents
    if (route.vehicle?.id) {
      const docs = await getVehicleDocuments(schoolId, route.vehicle.id);
      const today = new Date().toISOString().split("T")[0];
      const expiredDoc = docs.find((d) => d.is_mandatory && d.expires_on < today);
      if (expiredDoc) {
        complianceBlocked = true;
        blockReason = `Vehicle document ${expiredDoc.doc_type} is expired.`;
      }
    }

    // Check driver license
    if (route.driver?.license_expires_on) {
      const today = new Date().toISOString().split("T")[0];
      if (route.driver.license_expires_on < today) {
        complianceBlocked = true;
        blockReason = `Driver license is expired.`;
      }
    }

    if (complianceBlocked) {
      if (!input.override_reason || input.override_reason.trim().length === 0) {
        return {
          success: false,
          error: "COMPLIANCE_BLOCKED",
        };
      }
      await logTransportAudit(schoolId, {
        actor_id: input.actor_id,
        actor_role: input.actor_role,
        action: "transport_compliance_override",
        entity_id: input.student_id,
        reason: input.override_reason,
        details: { route_id: input.route_id, block_reason: blockReason },
      });
    }
  }

  // 5. Fee snapshot (Rule C7.5)
  const monthlyFeePaise = await calculateStopMonthlyFee(
    schoolId,
    input.pickup_stop_id,
    input.service_type
  );

  const dropStopId = input.drop_stop_id || input.pickup_stop_id;

  const assignment: TransportAssignment = {
    id: uuid(),
    school_id: schoolId,
    student_id: input.student_id,
    academic_year_id: input.academic_year_id,
    route_id: input.route_id,
    pickup_stop_id: input.pickup_stop_id,
    drop_stop_id: dropStopId,
    service_type: input.service_type,
    effective_from: input.effective_from,
    effective_to: null,
    monthly_fee_paise: monthlyFeePaise,
    requires_guardian_handover: input.requires_guardian_handover ?? false,
    status: "active",
    end_reason: null,
    created_by: input.actor_id || null,
    created_at: nowISO(),
    updated_at: nowISO(),
  };

  // 6. Persistence
  if (isSupabaseConfigured) {
    const { error: insErr } = await supabase.from("transport_assignments").insert(assignment);
    if (insErr) {
      return { success: false, error: insErr.message };
    }
  } else {
    const all = lsGet<TransportAssignment>(ASSIGNMENTS_KEY(schoolId));
    lsSet(ASSIGNMENTS_KEY(schoolId), [...all, assignment]);
  }

  // 7. Fee dues creation & Transaction Rollback (Rule C7.4)
  const feeService = createFeeService(schoolId);
  const feeRes = await feeService.createTransportDues(assignment.id);

  if (!feeRes.success) {
    // ATOMIC ROLLBACK: Remove the assignment record if fee dues creation failed!
    if (isSupabaseConfigured) {
      await supabase.from("transport_assignments").delete().eq("id", assignment.id).eq("school_id", schoolId);
    } else {
      const all = lsGet<TransportAssignment>(ASSIGNMENTS_KEY(schoolId));
      lsSet(
        ASSIGNMENTS_KEY(schoolId),
        all.filter((a) => a.id !== assignment.id)
      );
    }
    return {
      success: false,
      error: feeRes.error || "FEE_DUES_CREATION_FAILED",
    };
  }

  // 8. Notifications & Audit
  await queueTransportNotification(schoolId, "transport_assigned", {
    student_id: input.student_id,
    route_name: route.name,
    effective_from: input.effective_from,
    monthly_fee_paise: monthlyFeePaise,
  });

  await logTransportAudit(schoolId, {
    actor_id: input.actor_id,
    actor_role: input.actor_role,
    action: "transport_assigned",
    entity_id: assignment.id,
    details: { student_id: input.student_id, route_id: input.route_id, monthly_fee_paise: monthlyFeePaise },
  });

  return { success: true, assignment };
}

/**
 * Change route/stop for an assignment (Spec C5.3, C7.6)
 */
export async function changeAssignment(
  schoolId: string,
  assignmentId: string,
  input: ChangeAssignmentInput
): Promise<{ success: boolean; error?: string; assignment?: TransportAssignment }> {
  const hasTransport = await checkSchoolFeature(schoolId, "transport");
  if (!hasTransport) {
    return { success: false, error: "PLAN_REQUIRED" };
  }

  let oldAssignment = await getAssignmentById(schoolId, assignmentId);
  if (!oldAssignment || oldAssignment.status !== "active") {
    return { success: false, error: "Active assignment not found" };
  }

  // Check capacity on new route if changed
  if (input.new_route_id !== oldAssignment.route_id) {
    const newRoute = await getRouteById(schoolId, input.new_route_id);
    if (!newRoute) return { success: false, error: "New route not found" };
    const currentRiders = await getActiveRidersCountForRoute(schoolId, input.new_route_id);
    const capacity = newRoute.vehicle?.capacity || 0;
    if (capacity > 0 && currentRiders >= capacity) {
      if (!input.override_reason || input.override_reason.trim().length === 0) {
        return { success: false, error: "ROUTE_OVER_CAPACITY" };
      }
      await logTransportAudit(schoolId, {
        actor_id: input.actor_id,
        actor_role: input.actor_role,
        action: "transport_capacity_override",
        entity_id: oldAssignment.student_id,
        reason: input.override_reason,
      });
    }
  }

  const newDropStopId = input.new_drop_stop_id || input.new_pickup_stop_id;
  const newMonthlyFeePaise = await calculateStopMonthlyFee(
    schoolId,
    input.new_pickup_stop_id,
    input.new_service_type
  );

  // Mark old ended
  const endEffectiveTo = input.effective_date;
  const updatedOld: TransportAssignment = {
    ...oldAssignment,
    status: "ended",
    effective_to: endEffectiveTo,
    end_reason: "changed",
    updated_at: nowISO(),
  };

  const newAssignment: TransportAssignment = {
    id: uuid(),
    school_id: schoolId,
    student_id: oldAssignment.student_id,
    academic_year_id: oldAssignment.academic_year_id,
    route_id: input.new_route_id,
    pickup_stop_id: input.new_pickup_stop_id,
    drop_stop_id: newDropStopId,
    service_type: input.new_service_type,
    effective_from: input.effective_date,
    effective_to: null,
    monthly_fee_paise: newMonthlyFeePaise,
    requires_guardian_handover: input.requires_guardian_handover ?? oldAssignment.requires_guardian_handover,
    status: "active",
    end_reason: null,
    created_by: input.actor_id || null,
    created_at: nowISO(),
    updated_at: nowISO(),
  };

  // Apply DB changes
  if (isSupabaseConfigured) {
    await supabase.from("transport_assignments").update({
      status: "ended",
      effective_to: endEffectiveTo,
      end_reason: "changed",
      updated_at: nowISO(),
    }).eq("id", oldAssignment.id).eq("school_id", schoolId);

    const { error: insErr } = await supabase.from("transport_assignments").insert(newAssignment);
    if (insErr) {
      // rollback old
      await supabase.from("transport_assignments").update({
        status: "active",
        effective_to: null,
        end_reason: null,
        updated_at: nowISO(),
      }).eq("id", oldAssignment.id).eq("school_id", schoolId);
      return { success: false, error: insErr.message };
    }
  } else {
    const all = lsGet<TransportAssignment>(ASSIGNMENTS_KEY(schoolId));
    lsSet(
      ASSIGNMENTS_KEY(schoolId),
      all.map((a) => (a.id === oldAssignment!.id ? updatedOld : a)).concat(newAssignment)
    );
  }

  // Call FeeService.changeTransportDues
  const feeService = createFeeService(schoolId);
  const feeRes = await feeService.changeTransportDues(oldAssignment.id, newAssignment.id);

  if (!feeRes.success) {
    // ROLLBACK both
    if (isSupabaseConfigured) {
      await supabase.from("transport_assignments").delete().eq("id", newAssignment.id).eq("school_id", schoolId);
      await supabase.from("transport_assignments").update({
        status: "active",
        effective_to: null,
        end_reason: null,
        updated_at: nowISO(),
      }).eq("id", oldAssignment.id).eq("school_id", schoolId);
    } else {
      const all = lsGet<TransportAssignment>(ASSIGNMENTS_KEY(schoolId));
      lsSet(
        ASSIGNMENTS_KEY(schoolId),
        all
          .filter((a) => a.id !== newAssignment.id)
          .map((a) => (a.id === oldAssignment!.id ? oldAssignment! : a))
      );
    }
    return { success: false, error: feeRes.error || "Failed to update dues on change" };
  }

  await queueTransportNotification(schoolId, "transport_changed", {
    student_id: oldAssignment.student_id,
    effective_from: input.effective_date,
    new_monthly_fee_paise: newMonthlyFeePaise,
  });

  await logTransportAudit(schoolId, {
    actor_id: input.actor_id,
    actor_role: input.actor_role,
    action: "transport_changed",
    entity_id: newAssignment.id,
    details: { old_assignment_id: oldAssignment.id, new_route_id: input.new_route_id },
  });

  return { success: true, assignment: newAssignment };
}

/**
 * Stop transport for an assignment (Spec C5.3, C7.7)
 */
export async function stopAssignment(
  schoolId: string,
  assignmentId: string,
  input: StopAssignmentInput
): Promise<{ success: boolean; error?: string; assignment?: TransportAssignment }> {
  const hasTransport = await checkSchoolFeature(schoolId, "transport");
  if (!hasTransport) {
    return { success: false, error: "PLAN_REQUIRED" };
  }

  if (!input.reason || input.reason.trim().length === 0) {
    return { success: false, error: "Reason is required to stop transport" };
  }

  const assignment = await getAssignmentById(schoolId, assignmentId);
  if (!assignment || assignment.status !== "active") {
    return { success: false, error: "Active assignment not found" };
  }

  const updated: TransportAssignment = {
    ...assignment,
    status: "ended",
    effective_to: input.effective_date,
    end_reason: input.reason,
    updated_at: nowISO(),
  };

  if (isSupabaseConfigured) {
    const { error: updErr } = await supabase
      .from("transport_assignments")
      .update({
        status: "ended",
        effective_to: input.effective_date,
        end_reason: input.reason,
        updated_at: nowISO(),
      })
      .eq("id", assignment.id)
      .eq("school_id", schoolId);
    if (updErr) return { success: false, error: updErr.message };
  } else {
    const all = lsGet<TransportAssignment>(ASSIGNMENTS_KEY(schoolId));
    lsSet(
      ASSIGNMENTS_KEY(schoolId),
      all.map((a) => (a.id === assignment.id ? updated : a))
    );
  }

  // Call FeeService.cancelTransportDues
  const feeService = createFeeService(schoolId);
  const feeRes = await feeService.cancelTransportDues(assignment.id, input.effective_date);

  if (!feeRes.success) {
    // ROLLBACK
    if (isSupabaseConfigured) {
      await supabase
        .from("transport_assignments")
        .update({
          status: "active",
          effective_to: null,
          end_reason: null,
          updated_at: nowISO(),
        })
        .eq("id", assignment.id)
        .eq("school_id", schoolId);
    } else {
      const all = lsGet<TransportAssignment>(ASSIGNMENTS_KEY(schoolId));
      lsSet(
        ASSIGNMENTS_KEY(schoolId),
        all.map((a) => (a.id === assignment.id ? assignment : a))
      );
    }
    return { success: false, error: feeRes.error || "Failed to cancel future dues on stop" };
  }

  await queueTransportNotification(schoolId, "transport_stopped", {
    student_id: assignment.student_id,
    effective_date: input.effective_date,
    reason: input.reason,
  });

  await logTransportAudit(schoolId, {
    actor_id: input.actor_id,
    actor_role: input.actor_role,
    action: "transport_stopped",
    entity_id: assignment.id,
    reason: input.reason,
  });

  return { success: true, assignment: updated };
}

/**
 * End transport assignment when student leaves or withdraws (Spec C7.8, D1)
 */
export async function endStudentTransportAssignment(
  schoolId: string,
  studentId: string,
  effectiveDate: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  // Find active assignment for this student
  let assignment: TransportAssignment | null = null;
  if (isSupabaseConfigured) {
    const { data } = await supabase
      .from("transport_assignments")
      .select("*")
      .eq("school_id", schoolId)
      .eq("student_id", studentId)
      .eq("status", "active")
      .maybeSingle();
    assignment = data;
  } else {
    const all = lsGet<TransportAssignment>(ASSIGNMENTS_KEY(schoolId));
    assignment = all.find((a) => a.student_id === studentId && a.status === "active") || null;
  }

  if (!assignment) {
    return { success: true }; // No active transport, nothing to end
  }

  const res = await stopAssignment(schoolId, assignment.id, {
    effective_date: effectiveDate,
    reason: `Student status changed: ${reason}`,
  });

  return { success: res.success, error: res.error };
}

/**
 * Bulk assign students to a route & stop (Spec C5.2)
 */
export async function bulkAssignStudents(
  schoolId: string,
  input: {
    student_ids: string[];
    academic_year_id: string;
    route_id: string;
    pickup_stop_id: string;
    drop_stop_id?: string;
    service_type: ServiceType;
    effective_from: string;
    override_reason?: string;
    actor_id?: string;
    actor_role?: string;
  }
): Promise<{ success: boolean; error?: string; count?: number; assignments?: TransportAssignment[] }> {
  const hasTransport = await checkSchoolFeature(schoolId, "transport");
  if (!hasTransport) {
    return { success: false, error: "PLAN_REQUIRED" };
  }

  const route = await getRouteById(schoolId, input.route_id);
  if (!route) return { success: false, error: "Route not found" };

  const currentRiders = await getActiveRidersCountForRoute(schoolId, input.route_id);
  const capacity = route.vehicle?.capacity || 0;

  if (capacity > 0 && currentRiders + input.student_ids.length > capacity) {
    if (!input.override_reason || input.override_reason.trim().length === 0) {
      return { success: false, error: "ROUTE_OVER_CAPACITY" };
    }
  }

  const created: TransportAssignment[] = [];

  for (const studentId of input.student_ids) {
    const res = await createAssignment(schoolId, {
      student_id: studentId,
      academic_year_id: input.academic_year_id,
      route_id: input.route_id,
      pickup_stop_id: input.pickup_stop_id,
      drop_stop_id: input.drop_stop_id,
      service_type: input.service_type,
      effective_from: input.effective_from,
      override_reason: input.override_reason,
      actor_id: input.actor_id,
      actor_role: input.actor_role,
    });

    if (res.success && res.assignment) {
      created.push(res.assignment);
    }
  }

  return { success: true, count: created.length, assignments: created };
}

// ─── Query Helpers ────────────────────────────────────────────────────────────

export async function getActiveAssignmentForStudent(
  schoolId: string,
  studentId: string,
  academicYearId?: string
): Promise<TransportAssignment | null> {
  if (isSupabaseConfigured) {
    let q = supabase
      .from("transport_assignments")
      .select("*")
      .eq("school_id", schoolId)
      .eq("student_id", studentId)
      .eq("status", "active");
    if (academicYearId) q = q.eq("academic_year_id", academicYearId);
    const { data } = await q.maybeSingle();
    return data as TransportAssignment | null;
  }

  const all = lsGet<TransportAssignment>(ASSIGNMENTS_KEY(schoolId));
  return (
    all.find(
      (a) =>
        a.student_id === studentId &&
        a.status === "active" &&
        (!academicYearId || a.academic_year_id === academicYearId)
    ) || null
  );
}

export async function getAssignmentById(
  schoolId: string,
  assignmentId: string
): Promise<TransportAssignment | null> {
  if (isSupabaseConfigured) {
    const { data } = await supabase
      .from("transport_assignments")
      .select("*")
      .eq("id", assignmentId)
      .eq("school_id", schoolId)
      .maybeSingle();
    return data as TransportAssignment | null;
  }

  const all = lsGet<TransportAssignment>(ASSIGNMENTS_KEY(schoolId));
  return all.find((a) => a.id === assignmentId) || null;
}

export async function getActiveRidersCountForRoute(
  schoolId: string,
  routeId: string
): Promise<number> {
  if (isSupabaseConfigured) {
    const { count } = await supabase
      .from("transport_assignments")
      .select("*", { count: "exact", head: true })
      .eq("school_id", schoolId)
      .eq("route_id", routeId)
      .eq("status", "active");
    return count || 0;
  }

  const all = lsGet<TransportAssignment>(ASSIGNMENTS_KEY(schoolId));
  return all.filter((a) => a.route_id === routeId && a.status === "active").length;
}

/**
 * Get student's transport details (for student profile and chip)
 */
export async function getStudentTransportDetails(
  schoolId: string,
  studentId: string
): Promise<EnrichedStudentTransport> {
  let activeAssignment: TransportAssignment | null = null;
  let history: TransportAssignment[] = [];
  let absences: TransportAbsence[] = [];

  if (isSupabaseConfigured) {
    const { data: assignments } = await supabase
      .from("transport_assignments")
      .select("*")
      .eq("school_id", schoolId)
      .eq("student_id", studentId)
      .order("created_at", { ascending: false });

    if (assignments && assignments.length > 0) {
      activeAssignment = (assignments.find((a) => a.status === "active") as TransportAssignment) || null;
      history = assignments as TransportAssignment[];
    }

    const { data: abs } = await supabase
      .from("transport_absences")
      .select("*")
      .eq("school_id", schoolId)
      .eq("student_id", studentId)
      .order("date_from", { ascending: false });
    absences = (abs || []) as TransportAbsence[];
  } else {
    const allAssignments = lsGet<TransportAssignment>(ASSIGNMENTS_KEY(schoolId));
    const userAssignments = allAssignments
      .filter((a) => a.student_id === studentId)
      .sort((a, b) => b.created_at!.localeCompare(a.created_at!));

    activeAssignment = userAssignments.find((a) => a.status === "active") || null;
    history = userAssignments;

    const allAbsences = lsGet<TransportAbsence>(ABSENCES_KEY(schoolId));
    absences = allAbsences.filter((a) => a.student_id === studentId);
  }

  // Enrich active assignment with route/stop names
  if (activeAssignment) {
    const route = await getRouteById(schoolId, activeAssignment.route_id);
    if (route) {
      activeAssignment.route_name = route.name;
      const pStop = route.stops.find((s) => s.id === activeAssignment!.pickup_stop_id);
      const dStop = route.stops.find((s) => s.id === activeAssignment!.drop_stop_id);
      if (pStop) {
        activeAssignment.pickup_stop_name = pStop.name;
        activeAssignment.pickup_time = pStop.pickup_time;
      }
      if (dStop) {
        activeAssignment.drop_stop_name = dStop.name;
        activeAssignment.drop_time = dStop.drop_time;
      }
    }
  }

  // Siblings on the same route check
  const siblingsOnRoute: {
    student_id: string;
    student_name: string;
    class_name: string;
    route_name: string;
  }[] = [];

  if (activeAssignment) {
    const students = lsGet<any>(STUDENTS_KEY(schoolId));
    const classes = lsGet<any>(CLASSES_KEY(schoolId));
    const currentStudent = students.find((s: any) => s.id === studentId);

    if (currentStudent && (currentStudent.father_phone || currentStudent.mother_phone || currentStudent.guardian_phone)) {
      const parentPhone = currentStudent.father_phone || currentStudent.mother_phone || currentStudent.guardian_phone;
      const allActiveAssignments = lsGet<TransportAssignment>(ASSIGNMENTS_KEY(schoolId)).filter(
        (a) => a.status === "active" && a.route_id === activeAssignment!.route_id && a.student_id !== studentId
      );

      for (const assign of allActiveAssignments) {
        const sib = students.find(
          (s: any) =>
            s.id === assign.student_id &&
            (s.father_phone === parentPhone || s.mother_phone === parentPhone || s.guardian_phone === parentPhone)
        );
        if (sib) {
          const cls = classes.find((c: any) => c.id === sib.class_id);
          siblingsOnRoute.push({
            student_id: sib.id,
            student_name: `${sib.first_name} ${sib.last_name || ""}`.trim(),
            class_name: cls?.name || "Class",
            route_name: activeAssignment.route_name || "Route",
          });
        }
      }
    }
  }

  return {
    assignment: activeAssignment,
    history,
    absences,
    siblings_on_route: siblingsOnRoute,
  };
}

// ─── Absences (Spec C5.3, C13) ────────────────────────────────────────────────

export async function recordAbsence(
  schoolId: string,
  input: {
    student_id: string;
    date_from: string;
    date_to: string;
    reason?: string;
    created_by?: string;
  }
): Promise<{ success: boolean; error?: string; absence?: TransportAbsence }> {
  const absence: TransportAbsence = {
    id: uuid(),
    school_id: schoolId,
    student_id: input.student_id,
    date_from: input.date_from,
    date_to: input.date_to,
    reason: input.reason || null,
    created_by: input.created_by || null,
    created_at: nowISO(),
  };

  if (isSupabaseConfigured) {
    const { error } = await supabase.from("transport_absences").insert(absence);
    if (error) return { success: false, error: error.message };
  } else {
    const all = lsGet<TransportAbsence>(ABSENCES_KEY(schoolId));
    lsSet(ABSENCES_KEY(schoolId), [absence, ...all]);
  }

  return { success: true, absence };
}

export async function listAbsences(
  schoolId: string,
  studentId?: string
): Promise<TransportAbsence[]> {
  if (isSupabaseConfigured) {
    let q = supabase.from("transport_absences").select("*").eq("school_id", schoolId);
    if (studentId) q = q.eq("student_id", studentId);
    const { data } = await q.order("date_from", { ascending: false });
    return (data || []) as TransportAbsence[];
  }

  const all = lsGet<TransportAbsence>(ABSENCES_KEY(schoolId));
  return studentId ? all.filter((a) => a.student_id === studentId) : all;
}

// ─── Requests (Spec C5.2, C13) ────────────────────────────────────────────────

export async function createTransportRequest(
  schoolId: string,
  input: {
    student_id: string;
    requested_location: string;
    note?: string;
  }
): Promise<{ success: boolean; error?: string; request?: TransportRequest }> {
  const req: TransportRequest = {
    id: uuid(),
    school_id: schoolId,
    student_id: input.student_id,
    requested_location: input.requested_location,
    note: input.note || null,
    status: "pending",
    decided_by: null,
    decided_at: null,
    created_at: nowISO(),
    updated_at: nowISO(),
  };

  if (isSupabaseConfigured) {
    const { error } = await supabase.from("transport_requests").insert(req);
    if (error) return { success: false, error: error.message };
  } else {
    const all = lsGet<TransportRequest>(REQUESTS_KEY(schoolId));
    lsSet(REQUESTS_KEY(schoolId), [req, ...all]);
  }

  return { success: true, request: req };
}

export async function listTransportRequests(
  schoolId: string,
  status?: RequestStatus
): Promise<TransportRequest[]> {
  let requests: TransportRequest[] = [];
  if (isSupabaseConfigured) {
    let q = supabase.from("transport_requests").select("*").eq("school_id", schoolId);
    if (status) q = q.eq("status", status);
    const { data } = await q.order("created_at", { ascending: false });
    requests = (data || []) as TransportRequest[];
  } else {
    const all = lsGet<TransportRequest>(REQUESTS_KEY(schoolId));
    requests = status ? all.filter((r) => r.status === status) : all;
  }

  // Enrich with student details
  const students = lsGet<any>(STUDENTS_KEY(schoolId));
  const classes = lsGet<any>(CLASSES_KEY(schoolId));
  return requests.map((r) => {
    const s = students.find((st: any) => st.id === r.student_id);
    const c = classes.find((cl: any) => cl.id === s?.class_id);
    return {
      ...r,
      student_name: s ? `${s.first_name} ${s.last_name || ""}`.trim() : "Unknown",
      student_admission_no: s?.admission_no || "",
      class_name: c?.name || "",
    };
  });
}

export async function updateTransportRequestStatus(
  schoolId: string,
  requestId: string,
  status: RequestStatus,
  decidedBy?: string
): Promise<{ success: boolean; error?: string }> {
  if (isSupabaseConfigured) {
    const { error } = await supabase
      .from("transport_requests")
      .update({
        status,
        decided_by: decidedBy || null,
        decided_at: nowISO(),
        updated_at: nowISO(),
      })
      .eq("id", requestId)
      .eq("school_id", schoolId);
    if (error) return { success: false, error: error.message };
  } else {
    const all = lsGet<TransportRequest>(REQUESTS_KEY(schoolId));
    lsSet(
      REQUESTS_KEY(schoolId),
      all.map((r) =>
        r.id === requestId
          ? { ...r, status, decided_by: decidedBy || null, decided_at: nowISO(), updated_at: nowISO() }
          : r
      )
    );
  }

  return { success: true };
}

// ─── Year Renewal (Spec C5.4, C7.9, C13) ──────────────────────────────────────

export async function getRenewalPreview(
  schoolId: string,
  oldYearId: string,
  newYearId: string
): Promise<RenewalPreviewItem[]> {
  // Get all riders who had an active assignment in oldYearId
  const allAssignments = lsGet<TransportAssignment>(ASSIGNMENTS_KEY(schoolId));
  const oldRiders = allAssignments.filter((a) => a.academic_year_id === oldYearId);

  const students = lsGet<any>(STUDENTS_KEY(schoolId));
  const classes = lsGet<any>(CLASSES_KEY(schoolId));

  const previewItems: RenewalPreviewItem[] = [];

  for (const oldAssign of oldRiders) {
    const s = students.find((st: any) => st.id === oldAssign.student_id);
    const isLeftSchool = !s || s.status === "withdrawn" || s.status === "transferred" || s.status === "alumni";

    // Check if already assigned in new year
    const alreadyAssigned = allAssignments.some(
      (a) => a.academic_year_id === newYearId && a.student_id === oldAssign.student_id && a.status === "active"
    );

    const route = await getRouteById(schoolId, oldAssign.route_id);
    const pStop = route?.stops.find((st) => st.id === oldAssign.pickup_stop_id);
    const dStop = route?.stops.find((st) => st.id === oldAssign.drop_stop_id);

    const newFeePaise = await calculateStopMonthlyFee(
      schoolId,
      oldAssign.pickup_stop_id,
      oldAssign.service_type
    );

    const cls = classes.find((c: any) => c.id === s?.class_id);

    let status: "eligible" | "left_school" | "already_assigned" = "eligible";
    if (isLeftSchool) status = "left_school";
    else if (alreadyAssigned) status = "already_assigned";

    previewItems.push({
      student_id: oldAssign.student_id,
      student_name: s ? `${s.first_name} ${s.last_name || ""}`.trim() : "Unknown",
      admission_no: s?.admission_no || "",
      old_class_name: cls?.name || "Previous Class",
      new_class_name: cls?.name || "Current Class",
      route_id: oldAssign.route_id,
      route_name: route?.name || "Route",
      pickup_stop_id: oldAssign.pickup_stop_id,
      pickup_stop_name: pStop?.name || "Stop",
      drop_stop_id: oldAssign.drop_stop_id,
      drop_stop_name: dStop?.name || "Stop",
      service_type: oldAssign.service_type,
      old_monthly_fee_paise: oldAssign.monthly_fee_paise,
      new_monthly_fee_paise: newFeePaise,
      status,
      selected: status === "eligible",
    });
  }

  return previewItems;
}

export async function commitRenewal(
  schoolId: string,
  input: CommitRenewalInput
): Promise<{ success: boolean; count: number; error?: string }> {
  let renewedCount = 0;

  for (const item of input.renewals) {
    // Check if already assigned (idempotent)
    const existing = await getActiveAssignmentForStudent(
      schoolId,
      item.student_id,
      input.new_academic_year_id
    );
    if (existing) continue;

    const res = await createAssignment(schoolId, {
      student_id: item.student_id,
      academic_year_id: input.new_academic_year_id,
      route_id: item.route_id,
      pickup_stop_id: item.pickup_stop_id,
      drop_stop_id: item.drop_stop_id,
      service_type: item.service_type,
      effective_from: input.effective_from,
      actor_id: input.actor_id,
      actor_role: input.actor_role,
    });

    if (res.success) {
      renewedCount++;
    }
  }

  return { success: true, count: renewedCount };
}

// ─── Non-trip Reports (Spec C9) ───────────────────────────────────────────────

export async function getRouteRosterReport(schoolId: string, routeId: string) {
  const route = await getRouteById(schoolId, routeId);
  if (!route) return null;

  const allAssignments = lsGet<TransportAssignment>(ASSIGNMENTS_KEY(schoolId));
  const activeAssignments = allAssignments.filter((a) => a.route_id === routeId && a.status === "active");

  const students = lsGet<any>(STUDENTS_KEY(schoolId));
  const classes = lsGet<any>(CLASSES_KEY(schoolId));
  const absences = lsGet<TransportAbsence>(ABSENCES_KEY(schoolId));
  const today = new Date().toISOString().split("T")[0];

  const stopsWithRiders = route.stops.map((stop) => {
    const stopAssignments = activeAssignments.filter((a) => a.pickup_stop_id === stop.id || a.drop_stop_id === stop.id);
    const riders = stopAssignments.map((a) => {
      const s = students.find((st: any) => st.id === a.student_id);
      const c = classes.find((cl: any) => cl.id === s?.class_id);
      const isAbsent = absences.some(
        (ab) => ab.student_id === a.student_id && ab.date_from <= today && ab.date_to >= today
      );
      return {
        assignment_id: a.id,
        student_id: a.student_id,
        name: s ? `${s.first_name} ${s.last_name || ""}`.trim() : "Unknown",
        admission_no: s?.admission_no || "",
        class_name: c?.name || "",
        guardian_phone: s?.father_phone || s?.mother_phone || s?.guardian_phone || "N/A",
        service_type: a.service_type,
        is_absent_today: isAbsent,
        handover_required: a.requires_guardian_handover,
      };
    });

    return {
      ...stop,
      riders,
    };
  });

  return {
    route,
    stops: stopsWithRiders,
    total_riders: activeAssignments.length,
  };
}

export async function getRidersByRouteAndStopReport(schoolId: string) {
  const allAssignments = lsGet<TransportAssignment>(ASSIGNMENTS_KEY(schoolId));
  const active = allAssignments.filter((a) => a.status === "active");
  return {
    total_active_riders: active.length,
    items: active,
  };
}

export async function getVehicleUtilisationReport(schoolId: string) {
  const vehicles = await getVehicles(schoolId);
  const allAssignments = lsGet<TransportAssignment>(ASSIGNMENTS_KEY(schoolId));
  const activeAssignments = allAssignments.filter((a) => a.status === "active");

  const results = vehicles.map((v) => {
    const ridersOnVehicle = activeAssignments.filter((a) => {
      // Find if route uses this vehicle
      const routes = lsGet<any>(`myzkool_transport_routes_${schoolId}`);
      const r = routes.find((rt: any) => rt.id === a.route_id);
      return r?.vehicle_id === v.id;
    });

    const used = ridersOnVehicle.length;
    const cap = v.capacity || 1;
    const util = Math.round((used / cap) * 100);

    return {
      vehicle_id: v.id,
      registration_no: v.registration_no,
      capacity: cap,
      riders_count: used,
      utilisation_percent: util,
      is_over_capacity: used > cap,
    };
  });

  return results;
}

export async function getUnassignedAndRequestsReport(schoolId: string) {
  const students = lsGet<any>(STUDENTS_KEY(schoolId));
  const activeAssignments = lsGet<TransportAssignment>(ASSIGNMENTS_KEY(schoolId)).filter((a) => a.status === "active");
  const assignedStudentIds = new Set(activeAssignments.map((a) => a.student_id));

  const unassigned = students.filter((s: any) => !assignedStudentIds.has(s.id) && s.status === "active");
  const requests = await listTransportRequests(schoolId, "pending");

  return {
    unassigned_count: unassigned.length,
    pending_requests_count: requests.length,
    unassigned_students: unassigned,
    requests,
  };
}

export async function getTransportFeeReport(schoolId: string) {
  const allAssignments = lsGet<TransportAssignment>(ASSIGNMENTS_KEY(schoolId));
  const active = allAssignments.filter((a) => a.status === "active");
  const totalMonthlyDemandPaise = active.reduce((sum, a) => sum + (Number(a.monthly_fee_paise) || 0), 0);

  const dues = lsGet<any>(`myzkool_student_dues_${schoolId}`).filter((d: any) => d.source === "transport");
  const totalBilledPaise = dues.reduce((sum: number, d: any) => sum + (d.gross_paise || 0), 0);
  const totalCollectedPaise = dues.reduce((sum: number, d: any) => sum + (d.paid_paise || 0), 0);
  const totalOutstandingPaise = dues.reduce((sum: number, d: any) => sum + (d.balance_paise || 0), 0);

  return {
    active_riders_count: active.length,
    total_monthly_demand_paise: totalMonthlyDemandPaise,
    total_billed_paise: totalBilledPaise,
    total_collected_paise: totalCollectedPaise,
    total_outstanding_paise: totalOutstandingPaise,
  };
}

/**
 * Assignment history report — all assignments (active and ended) for the
 * school, optionally filtered by student_id.  (Spec C9)
 */
export async function getAssignmentHistoryReport(
  schoolId: string,
  studentId?: string
) {
  let assignments: TransportAssignment[];

  if (isSupabaseConfigured) {
    let q = supabase
      .from("transport_assignments")
      .select("*")
      .eq("school_id", schoolId)
      .order("created_at", { ascending: false });
    if (studentId) q = q.eq("student_id", studentId);
    const { data } = await q;
    assignments = (data || []) as TransportAssignment[];
  } else {
    assignments = lsGet<TransportAssignment>(ASSIGNMENTS_KEY(schoolId));
    if (studentId) assignments = assignments.filter((a) => a.student_id === studentId);
    assignments = assignments.sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));
  }

  return {
    total: assignments.length,
    items: assignments,
  };
}
