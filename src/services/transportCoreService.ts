/**
 * Transport Core Service (Spec 1.5, C1, C2, C3, C4, C9, C10, C15)
 *
 * Core engine providing:
 * - Transport settings (fee basis, billing months, run days, alert days)
 * - Vehicles & compliance documents with C10 registration validation (uppercase, spaces stripped)
 * - Drivers & attendants with masked ID proof and driver app invite wiring
 * - Routes & stops builder with C10 sequence & overlap validation rules
 * - Fee zones (zone, stop, distance basis)
 * - Dashboard aggregation
 * - Dual Supabase + localStorage support for runtime and unit test environments
 */

import { supabase, isSupabaseConfigured } from "../lib/supabase";
import type {
  TransportSettings,
  TransportVehicle,
  VehicleDocument,
  TransportStaff,
  StaffDocument,
  TransportRoute,
  RouteStop,
  RouteStopFeeInput,
  TransportFeeZone,
  EnrichedVehicle,
  EnrichedStaff,
  EnrichedRoute,
  TransportDashboardData,
  DocumentStatusChip,
  VehicleDocType,
} from "../types/transport";

function nowISO(): string {
  return new Date().toISOString();
}

function lsGet<T>(key: string): T[] {
  if (typeof localStorage === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch {
    return [];
  }
}

function lsSet<T>(key: string, data: T[]) {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(key, JSON.stringify(data));
  }
}

// Helper: Convert "HH:MM" or "HH:MM:SS" to minutes from midnight
export function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.split(":").map((p) => parseInt(p, 10));
  return (parts[0] || 0) * 60 + (parts[1] || 0);
}

// Helper: Check if two time intervals [start1, end1] and [start2, end2] overlap
export function intervalsOverlap(start1: number, end1: number, start2: number, end2: number): boolean {
  return Math.max(start1, start2) < Math.min(end1, end2);
}

// ─── 1. Settings ────────────────────────────────────────────────────────────

export const DEFAULT_TRANSPORT_SETTINGS: TransportSettings = {
  school_id: "",
  fee_basis: "zone",
  billing_months: [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3],
  run_days: [1, 2, 3, 4, 5, 6],
  drop_order: "reverse",
  require_pretrip_checklist: false,
  guardian_handover_stages: ["pre_primary"],
  block_expired_documents: true,
  expiry_alert_days: [30, 15, 7, 1],
  tracking_enabled: false,
  notify_boarding: false,
  notify_approaching: true,
  approaching_meters: 800,
  partial_month_rule: "full_month",
};

export async function getTransportSettings(schoolId: string): Promise<TransportSettings> {
  if (isSupabaseConfigured) {
    const { data } = await supabase
      .from("transport_settings")
      .select("*")
      .eq("school_id", schoolId)
      .maybeSingle();
    if (data) return data as TransportSettings;
  }

  const cached = lsGet<TransportSettings>(`myzkool_transport_settings_${schoolId}`);
  if (cached.length > 0) return cached[0];

  return { ...DEFAULT_TRANSPORT_SETTINGS, school_id: schoolId };
}

export async function saveTransportSettings(
  schoolId: string,
  input: Partial<TransportSettings>
): Promise<TransportSettings> {
  const current = await getTransportSettings(schoolId);
  const updated: TransportSettings = {
    ...current,
    ...input,
    school_id: schoolId,
    updated_at: nowISO(),
  };

  if (isSupabaseConfigured) {
    await supabase.from("transport_settings").upsert(updated);
  }

  lsSet(`myzkool_transport_settings_${schoolId}`, [updated]);
  return updated;
}

// ─── 2. Vehicles ────────────────────────────────────────────────────────────

// Clean and normalize registration number (C10.1: uppercase, spaces removed)
export function normalizeRegistrationNo(regNo: string): string {
  return regNo.replace(/\s+/g, "").toUpperCase();
}

export async function getVehicles(schoolId: string): Promise<EnrichedVehicle[]> {
  let vehicles: TransportVehicle[] = [];
  if (isSupabaseConfigured) {
    const { data } = await supabase
      .from("transport_vehicles")
      .select("*")
      .eq("school_id", schoolId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    vehicles = (data || []) as TransportVehicle[];
  } else {
    vehicles = lsGet<TransportVehicle>(`myzkool_transport_vehicles_${schoolId}`).filter(
      (v) => !v.deleted_at
    );
  }

  const routes = await getRoutes(schoolId);
  const allDocs = await getAllVehicleDocuments(schoolId);
  const todayStr = new Date().toISOString().split("T")[0];

  return vehicles.map((v) => {
    const assigned = routes
      .filter((r) => r.default_vehicle_id === v.id && r.status === "active")
      .map((r) => ({ id: r.id, name: r.name, code: r.code }));

    const vDocs = allDocs.filter((d) => d.vehicle_id === v.id && !d.deleted_at);

    // Compute document status chip
    let minDays: number | null = null;
    let hasExpired = false;
    let hasExpiringSoon = false;

    for (const d of vDocs) {
      const diffMs = new Date(d.expires_on).getTime() - new Date(todayStr).getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      if (minDays === null || diffDays < minDays) {
        minDays = diffDays;
      }
      if (diffDays <= 0) hasExpired = true;
      else if (diffDays <= 30) hasExpiringSoon = true;
    }

    const mandatoryTypes: VehicleDocType[] = ["rc", "insurance", "fitness", "puc"];
    const existingTypes = vDocs.map((d) => d.doc_type);
    const missing = mandatoryTypes.filter((mt) => !existingTypes.includes(mt));

    let chip: DocumentStatusChip = {
      status: "valid",
      label: "Valid",
      color: "green",
      daysRemaining: minDays ?? undefined,
    };

    if (vDocs.length === 0) {
      chip = { status: "missing", label: "Missing Documents", color: "amber" };
    } else if (hasExpired) {
      chip = { status: "expired", label: "Expired", color: "red", daysRemaining: minDays ?? 0 };
    } else if (hasExpiringSoon) {
      chip = {
        status: "expiring_soon",
        label: `Expiring in ${minDays}d`,
        color: "amber",
        daysRemaining: minDays ?? 0,
      };
    }

    return {
      ...v,
      assigned_routes_count: assigned.length,
      assigned_routes: assigned,
      document_status: chip,
      documents_count: vDocs.length,
      missing_mandatory_docs: missing,
    };
  });
}

export async function createVehicle(
  schoolId: string,
  input: Omit<TransportVehicle, "id" | "school_id" | "created_at" | "updated_at">
): Promise<{ success: boolean; vehicle?: TransportVehicle; error?: string }> {
  const normReg = normalizeRegistrationNo(input.registration_no);
  if (!normReg) {
    return { success: false, error: "Registration number is required." };
  }

  // C10.1: Registration number is unique per school
  const existing = await getVehicles(schoolId);
  const duplicate = existing.find(
    (v) => normalizeRegistrationNo(v.registration_no) === normReg
  );
  if (duplicate) {
    return {
      success: false,
      error: `Vehicle with registration '${normReg}' already exists in this school.`,
    };
  }

  const record: TransportVehicle = {
    ...input,
    id: crypto.randomUUID(),
    school_id: schoolId,
    registration_no: normReg,
    created_at: nowISO(),
    updated_at: nowISO(),
  };

  if (isSupabaseConfigured) {
    const { error } = await supabase.from("transport_vehicles").insert(record);
    if (error) return { success: false, error: error.message };
  }

  const allVehicles = lsGet<TransportVehicle>(`myzkool_transport_vehicles_${schoolId}`);
  lsSet(`myzkool_transport_vehicles_${schoolId}`, [...allVehicles, record]);

  return { success: true, vehicle: record };
}

export async function updateVehicle(
  schoolId: string,
  vehicleId: string,
  input: Partial<TransportVehicle>
): Promise<{ success: boolean; vehicle?: TransportVehicle; error?: string }> {
  const allVehicles = lsGet<TransportVehicle>(`myzkool_transport_vehicles_${schoolId}`);
  const idx = allVehicles.findIndex((v) => v.id === vehicleId && !v.deleted_at);

  if (idx === -1) {
    return { success: false, error: "Vehicle not found." };
  }

  if (input.registration_no) {
    const normReg = normalizeRegistrationNo(input.registration_no);
    const duplicate = allVehicles.find(
      (v) => v.id !== vehicleId && !v.deleted_at && normalizeRegistrationNo(v.registration_no) === normReg
    );
    if (duplicate) {
      return {
        success: false,
        error: `Vehicle with registration '${normReg}' already exists in this school.`,
      };
    }
    input.registration_no = normReg;
  }

  const updated: TransportVehicle = {
    ...allVehicles[idx],
    ...input,
    updated_at: nowISO(),
  };

  if (isSupabaseConfigured) {
    await supabase.from("transport_vehicles").update(updated).eq("id", vehicleId).eq("school_id", schoolId);
  }

  allVehicles[idx] = updated;
  lsSet(`myzkool_transport_vehicles_${schoolId}`, allVehicles);

  return { success: true, vehicle: updated };
}

export async function deleteVehicle(
  schoolId: string,
  vehicleId: string
): Promise<{ success: boolean; error?: string }> {
  // C4.2: Retiring a vehicle with active routes is blocked until routes are reassigned
  const routes = await getRoutes(schoolId);
  const activeAssignedRoutes = routes.filter(
    (r) => r.default_vehicle_id === vehicleId && r.status === "active"
  );
  if (activeAssignedRoutes.length > 0) {
    const routeCodes = activeAssignedRoutes.map((r) => r.code).join(", ");
    return {
      success: false,
      error: `Cannot delete vehicle. It is currently assigned to active route(s): ${routeCodes}. Reassign or deactivate routes first.`,
    };
  }

  const allVehicles = lsGet<TransportVehicle>(`myzkool_transport_vehicles_${schoolId}`);
  const idx = allVehicles.findIndex((v) => v.id === vehicleId);
  if (idx !== -1) {
    allVehicles[idx].deleted_at = nowISO();
    allVehicles[idx].status = "retired";
    lsSet(`myzkool_transport_vehicles_${schoolId}`, allVehicles);
  }

  if (isSupabaseConfigured) {
    await supabase
      .from("transport_vehicles")
      .update({ deleted_at: nowISO(), status: "retired" })
      .eq("id", vehicleId)
      .eq("school_id", schoolId);
  }

  return { success: true };
}

// ─── 3. Vehicle Documents ───────────────────────────────────────────────────

export async function getAllVehicleDocuments(schoolId: string): Promise<VehicleDocument[]> {
  if (isSupabaseConfigured) {
    const { data } = await supabase
      .from("vehicle_documents")
      .select("*")
      .eq("school_id", schoolId)
      .is("deleted_at", null);
    return (data || []) as VehicleDocument[];
  }
  return lsGet<VehicleDocument>(`myzkool_vehicle_docs_${schoolId}`).filter((d) => !d.deleted_at);
}

export async function getVehicleDocuments(
  schoolId: string,
  vehicleId: string
): Promise<VehicleDocument[]> {
  const allDocs = await getAllVehicleDocuments(schoolId);
  return allDocs.filter((d) => d.vehicle_id === vehicleId);
}

export async function addVehicleDocument(
  schoolId: string,
  input: Omit<VehicleDocument, "id" | "school_id" | "created_at" | "updated_at">
): Promise<{ success: boolean; document?: VehicleDocument; error?: string }> {
  if (!input.expires_on) {
    return { success: false, error: "Document expiry date is mandatory." };
  }

  const doc: VehicleDocument = {
    ...input,
    id: crypto.randomUUID(),
    school_id: schoolId,
    created_at: nowISO(),
    updated_at: nowISO(),
  };

  if (isSupabaseConfigured) {
    await supabase.from("vehicle_documents").insert(doc);
  }

  const allDocs = lsGet<VehicleDocument>(`myzkool_vehicle_docs_${schoolId}`);
  lsSet(`myzkool_vehicle_docs_${schoolId}`, [...allDocs, doc]);

  return { success: true, document: doc };
}

export async function deleteVehicleDocument(
  schoolId: string,
  docId: string
): Promise<{ success: boolean }> {
  const allDocs = lsGet<VehicleDocument>(`myzkool_vehicle_docs_${schoolId}`);
  const idx = allDocs.findIndex((d) => d.id === docId);
  if (idx !== -1) {
    allDocs[idx].deleted_at = nowISO();
    lsSet(`myzkool_vehicle_docs_${schoolId}`, allDocs);
  }
  if (isSupabaseConfigured) {
    await supabase.from("vehicle_documents").update({ deleted_at: nowISO() }).eq("id", docId).eq("school_id", schoolId);
  }
  return { success: true };
}

// ─── 4. Transport Staff (Drivers & Attendants) ───────────────────────────────

export function extract10DigitPhone(phoneStr?: string | null): string {
  if (!phoneStr) return "";
  const digits = phoneStr.replace(/\D/g, "");
  if (digits.length >= 10) {
    return digits.slice(-10);
  }
  return digits;
}

export function formatPhoneWithCountryCode(rawPhone: string): string {
  const digits = extract10DigitPhone(rawPhone);
  return digits ? `+91${digits}` : "";
}

export function maskIdProof(last4OrAadhaar?: string | null): string {
  if (!last4OrAadhaar) return "Not provided";
  const clean = last4OrAadhaar.replace(/\D/g, "");
  if (!clean) return "Not provided";
  const suffix = clean.slice(-4);
  return `XXXX XXXX ${suffix}`;
}

export async function getTransportStaff(
  schoolId: string,
  staffType?: "driver" | "attendant"
): Promise<EnrichedStaff[]> {
  let staffList: TransportStaff[] = [];
  if (isSupabaseConfigured) {
    let q = supabase
      .from("transport_staff")
      .select("*")
      .eq("school_id", schoolId)
      .is("deleted_at", null);
    if (staffType) q = q.eq("staff_type", staffType);
    const { data } = await q.order("created_at", { ascending: false });
    staffList = (data || []) as TransportStaff[];
    // Keep local cache fresh so localStorage and Supabase remain synchronized
    lsSet(`myzkool_transport_staff_${schoolId}`, staffList);
  } else {
    staffList = lsGet<TransportStaff>(`myzkool_transport_staff_${schoolId}`).filter(
      (s) => !s.deleted_at && (!staffType || s.staff_type === staffType)
    );
  }

  const routes = await getRoutes(schoolId);
  const staffDocs = lsGet<StaffDocument>(`myzkool_staff_docs_${schoolId}`).filter((d) => !d.deleted_at);
  const todayStr = new Date().toISOString().split("T")[0];

  return staffList.map((s) => {
    const assigned = routes
      .filter(
        (r) =>
          (r.default_driver_id === s.id || r.default_attendant_id === s.id) &&
          r.status === "active"
      )
      .map((r) => ({ id: r.id, name: r.name, code: r.code }));

    let licenseChip: DocumentStatusChip | undefined;
    if (s.staff_type === "driver") {
      if (s.license_expires_on) {
        const diffMs = new Date(s.license_expires_on).getTime() - new Date(todayStr).getTime();
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        if (diffDays <= 0) {
          licenseChip = { status: "expired", label: "License Expired", color: "red", daysRemaining: diffDays };
        } else if (diffDays <= 30) {
          licenseChip = { status: "expiring_soon", label: `Expires in ${diffDays}d`, color: "amber", daysRemaining: diffDays };
        } else {
          licenseChip = { status: "valid", label: "License Valid", color: "green", daysRemaining: diffDays };
        }
      } else {
        licenseChip = { status: "missing", label: "License Required", color: "red", daysRemaining: 0 };
      }
    }

    const docs = staffDocs.filter((d) => d.staff_id === s.id);

    return {
      ...s,
      assigned_routes: assigned,
      license_status: licenseChip,
      documents_count: docs.length,
    };
  });
}

export async function createTransportStaff(
  schoolId: string,
  input: Omit<TransportStaff, "id" | "school_id" | "created_at" | "updated_at">
): Promise<{ success: boolean; staff?: TransportStaff; error?: string }> {
  const phone10 = extract10DigitPhone(input.phone);
  if (!phone10 || phone10.length !== 10) {
    return { success: false, error: "A valid 10-digit mobile number is required." };
  }
  const phone = `+91${phone10}`;

  // Unique phone per school check in localStorage
  const allStaff = lsGet<TransportStaff>(`myzkool_transport_staff_${schoolId}`);
  const duplicateLocal = allStaff.find(
    (s) => !s.deleted_at && extract10DigitPhone(s.phone) === phone10
  );
  if (duplicateLocal) {
    return {
      success: false,
      error: `Staff with mobile number '+91 ${phone10}' is already registered in this school.`,
    };
  }

  // Check duplicate in Supabase if configured
  if (isSupabaseConfigured) {
    const { data: dbDups } = await supabase
      .from("transport_staff")
      .select("id, phone")
      .eq("school_id", schoolId)
      .is("deleted_at", null);
    if (dbDups && dbDups.some((d) => extract10DigitPhone(d.phone) === phone10)) {
      return {
        success: false,
        error: `Staff with mobile number '+91 ${phone10}' is already registered in this school.`,
      };
    }
  }

  const record: TransportStaff = {
    ...input,
    id: crypto.randomUUID(),
    school_id: schoolId,
    phone,
    id_proof_type: "Aadhaar",
    id_proof_last4: input.id_proof_last4 ? input.id_proof_last4.slice(-4) : null,
    aadhaar_enc: input.aadhaar_enc || null,
    created_at: nowISO(),
    updated_at: nowISO(),
  };

  if (isSupabaseConfigured) {
    const dbPayload = {
      id: record.id,
      school_id: record.school_id,
      staff_type: record.staff_type,
      full_name: record.full_name,
      phone: record.phone,
      photo_path: record.photo_path || null,
      license_no: record.license_no || null,
      license_class: record.license_class || null,
      license_expires_on: record.license_expires_on || null,
      badge_no: record.badge_no || null,
      police_verified_on: record.police_verified_on || null,
      medical_fit_on: record.medical_fit_on || null,
      experience_years: record.experience_years || null,
      address: record.address || null,
      emergency_contact_name: record.emergency_contact_name || null,
      emergency_contact_phone: record.emergency_contact_phone || null,
      id_proof_type: "Aadhaar",
      id_proof_last4: record.id_proof_last4,
      aadhaar_enc: record.aadhaar_enc,
      joined_on: record.joined_on,
      status: record.status,
      created_at: record.created_at,
      updated_at: record.updated_at,
    };

    const { error } = await supabase.from("transport_staff").insert(dbPayload);
    if (error) return { success: false, error: error.message };
  }

  lsSet(`myzkool_transport_staff_${schoolId}`, [...allStaff, record]);

  return { success: true, staff: record };
}

export async function updateTransportStaff(
  schoolId: string,
  staffId: string,
  input: Partial<TransportStaff>
): Promise<{ success: boolean; staff?: TransportStaff; error?: string }> {
  let existingStaff: TransportStaff | null = null;
  const allStaff = lsGet<TransportStaff>(`myzkool_transport_staff_${schoolId}`);
  const idx = allStaff.findIndex((s) => s.id === staffId && !s.deleted_at);
  if (idx !== -1) {
    existingStaff = allStaff[idx];
  }

  // If not found in localStorage cache, fetch directly from Supabase
  if (!existingStaff && isSupabaseConfigured) {
    const { data: dbStaff } = await supabase
      .from("transport_staff")
      .select("*")
      .eq("id", staffId)
      .eq("school_id", schoolId)
      .is("deleted_at", null)
      .maybeSingle();
    if (dbStaff) {
      existingStaff = dbStaff as TransportStaff;
    }
  }

  if (!existingStaff) {
    return { success: false, error: "Staff member not found." };
  }

  let phone = existingStaff.phone;
  if (input.phone) {
    const phone10 = extract10DigitPhone(input.phone);
    if (!phone10 || phone10.length !== 10) {
      return { success: false, error: "A valid 10-digit mobile number is required." };
    }
    phone = `+91${phone10}`;

    // Check duplicate in local storage
    const duplicateLocal = allStaff.find(
      (s) => s.id !== staffId && !s.deleted_at && extract10DigitPhone(s.phone) === phone10
    );
    if (duplicateLocal) {
      return { success: false, error: `Staff with mobile number '+91 ${phone10}' is already registered.` };
    }

    // Check duplicate in Supabase
    if (isSupabaseConfigured) {
      const { data: dbDups } = await supabase
        .from("transport_staff")
        .select("id, phone")
        .eq("school_id", schoolId)
        .neq("id", staffId)
        .is("deleted_at", null);
      if (dbDups && dbDups.some((d) => extract10DigitPhone(d.phone) === phone10)) {
        return { success: false, error: `Staff with mobile number '+91 ${phone10}' is already registered.` };
      }
    }
  }

  // Handle ID proof data
  let id_proof_last4 = existingStaff.id_proof_last4;
  let aadhaar_enc = existingStaff.aadhaar_enc;
  if (input.id_proof_last4 !== undefined) {
    id_proof_last4 = input.id_proof_last4 ? input.id_proof_last4.slice(-4) : null;
  }
  if (input.aadhaar_enc !== undefined) {
    aadhaar_enc = input.aadhaar_enc;
  }

  // Handle license details if staff_type is attendant vs driver
  const targetStaffType = input.staff_type || existingStaff.staff_type;
  let license_no = input.license_no !== undefined ? input.license_no : existingStaff.license_no;
  let license_expires_on = input.license_expires_on !== undefined ? input.license_expires_on : existingStaff.license_expires_on;
  if (targetStaffType === "attendant") {
    license_no = null;
    license_expires_on = null;
  }

  const updated: TransportStaff = {
    ...existingStaff,
    ...input,
    staff_type: targetStaffType,
    phone,
    id_proof_type: "Aadhaar",
    id_proof_last4,
    aadhaar_enc,
    license_no,
    license_expires_on,
    updated_at: nowISO(),
  };

  // Clean payload for database update (exclude enriched and route-specific UI fields)
  if (isSupabaseConfigured) {
    const dbPayload = {
      full_name: updated.full_name,
      staff_type: updated.staff_type,
      phone: updated.phone,
      photo_path: updated.photo_path || null,
      license_no: updated.license_no || null,
      license_class: updated.license_class || null,
      license_expires_on: updated.license_expires_on || null,
      badge_no: updated.badge_no || null,
      police_verified_on: updated.police_verified_on || null,
      medical_fit_on: updated.medical_fit_on || null,
      id_proof_type: "Aadhaar",
      id_proof_last4: updated.id_proof_last4 || null,
      aadhaar_enc: updated.aadhaar_enc || null,
      status: updated.status,
      updated_at: updated.updated_at,
    };

    const { error: updErr } = await supabase
      .from("transport_staff")
      .update(dbPayload)
      .eq("id", staffId)
      .eq("school_id", schoolId);

    if (updErr) {
      return { success: false, error: updErr.message };
    }
  }

  if (idx !== -1) {
    allStaff[idx] = updated;
    lsSet(`myzkool_transport_staff_${schoolId}`, allStaff);
  } else {
    lsSet(`myzkool_transport_staff_${schoolId}`, [...allStaff, updated]);
  }

  return { success: true, staff: updated };
}

export async function deleteTransportStaff(
  schoolId: string,
  staffId: string
): Promise<{ success: boolean; error?: string }> {
  const routes = await getRoutes(schoolId);
  const activeRoutes = routes.filter(
    (r) =>
      (r.default_driver_id === staffId || r.default_attendant_id === staffId) &&
      r.status === "active"
  );
  if (activeRoutes.length > 0) {
    const codes = activeRoutes.map((r) => r.code).join(", ");
    return {
      success: false,
      error: `Cannot delete staff member. Currently assigned to active route(s): ${codes}.`,
    };
  }

  const allStaff = lsGet<TransportStaff>(`myzkool_transport_staff_${schoolId}`);
  const idx = allStaff.findIndex((s) => s.id === staffId);
  if (idx !== -1) {
    allStaff[idx].deleted_at = nowISO();
    allStaff[idx].status = "inactive";
    lsSet(`myzkool_transport_staff_${schoolId}`, allStaff);
  }

  if (isSupabaseConfigured) {
    const { error } = await supabase
      .from("transport_staff")
      .update({ deleted_at: nowISO(), status: "inactive" })
      .eq("id", staffId)
      .eq("school_id", schoolId);
    if (error) {
      return { success: false, error: error.message };
    }
  }

  return { success: true };
}

// C4.3: Generate WhatsApp invite link with OTP sign-in wiring
export function generateDriverAppInvite(
  staff: TransportStaff,
  schoolName: string
): { inviteToken: string; whatsappUrl: string; message: string } {
  const inviteToken = `drv_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
  const cleanPhone = staff.phone.replace(/\D/g, "");
  const targetPhone = cleanPhone.startsWith("91") ? cleanPhone : `91${cleanPhone}`;

  const message = `Hello ${staff.full_name}, you have been invited to access the MyZkool Driver App for ${schoolName}. Sign in securely using your registered mobile number ${staff.phone} and OTP: https://myzkool.com/driver/login?invite=${inviteToken}`;
  const whatsappUrl = `https://wa.me/${targetPhone}?text=${encodeURIComponent(message)}`;

  return { inviteToken, whatsappUrl, message };
}

// ─── 5. Routes & Stops (with C10 Overlap & Sequence Validations) ──────────────

export async function getRoutes(schoolId: string): Promise<EnrichedRoute[]> {
  let routes: TransportRoute[] = [];
  let allStops: RouteStop[] = [];
  let vehicles: TransportVehicle[] = [];
  let staff: TransportStaff[] = [];
  let assignments: { route_id: string; status: string }[] = [];

  if (isSupabaseConfigured) {
    const [routesRes, stopsRes, vehRes, staffRes, assignRes] = await Promise.all([
      supabase
        .from("transport_routes")
        .select("*")
        .eq("school_id", schoolId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false }),
      supabase
        .from("route_stops")
        .select("*")
        .eq("school_id", schoolId)
        .is("deleted_at", null)
        .order("sequence", { ascending: true }),
      supabase
        .from("transport_vehicles")
        .select("*")
        .eq("school_id", schoolId)
        .is("deleted_at", null),
      supabase
        .from("transport_staff")
        .select("*")
        .eq("school_id", schoolId)
        .is("deleted_at", null),
      supabase
        .from("transport_assignments")
        .select("route_id, status")
        .eq("school_id", schoolId)
        .eq("status", "active"),
    ]);

    routes = (routesRes.data || []) as TransportRoute[];
    allStops = (stopsRes.data || []) as RouteStop[];
    vehicles = (vehRes.data || []) as TransportVehicle[];
    staff = (staffRes.data || []) as TransportStaff[];
    assignments = (assignRes.data || []) as { route_id: string; status: string }[];

    // Synchronize local cache for offline / fallback resilience
    lsSet(`myzkool_transport_routes_${schoolId}`, routes);
    lsSet(`myzkool_route_stops_${schoolId}`, allStops);
  } else {
    routes = lsGet<TransportRoute>(`myzkool_transport_routes_${schoolId}`).filter(
      (r) => !r.deleted_at
    );
    vehicles = lsGet<TransportVehicle>(`myzkool_transport_vehicles_${schoolId}`).filter((v) => !v.deleted_at);
    staff = lsGet<TransportStaff>(`myzkool_transport_staff_${schoolId}`).filter((s) => !s.deleted_at);
    allStops = lsGet<RouteStop>(`myzkool_route_stops_${schoolId}`).filter((s) => !s.deleted_at);
    assignments = lsGet<{ route_id: string; status: string }>(
      `myzkool_transport_assignments_${schoolId}`
    ).filter((a) => a.status === "active");
  }

  return routes.map((r) => {
    const v = vehicles.find((veh) => veh.id === r.default_vehicle_id);
    const driver = staff.find((st) => st.id === r.default_driver_id);
    const attendant = staff.find((st) => st.id === r.default_attendant_id);
    const stops = allStops
      .filter((st) => st.route_id === r.id)
      .sort((a, b) => a.sequence - b.sequence);

    const ridersCount = assignments.filter((a) => a.route_id === r.id).length;
    const capacity = v?.capacity || 0;

    return {
      ...r,
      vehicle: v || null,
      driver: driver || null,
      attendant: attendant || null,
      stops_count: stops.length,
      riders_count: ridersCount,
      seat_capacity: capacity,
      seats_used: ridersCount,
      is_over_capacity: capacity > 0 && ridersCount > capacity,
      stops,
    };
  });
}

export async function getRouteById(
  schoolId: string,
  routeId: string
): Promise<EnrichedRoute | null> {
  const routes = await getRoutes(schoolId);
  return routes.find((r) => r.id === routeId) || null;
}

// C10.2 & C10.3 Schedule overlap validation
export async function validateRouteOverlap(
  schoolId: string,
  routeInput: Partial<TransportRoute>,
  excludeRouteId?: string
): Promise<{ valid: boolean; error?: string }> {
  if (!routeInput.pickup_start_time || !routeInput.est_duration_min) {
    return { valid: true };
  }

  const startMin = timeToMinutes(routeInput.pickup_start_time);
  const endMin = startMin + (routeInput.est_duration_min || 45);

  const existingRoutes = (await getRoutes(schoolId)).filter(
    (r) => r.id !== excludeRouteId && r.status === "active"
  );

  for (const r of existingRoutes) {
    const rStart = timeToMinutes(r.pickup_start_time);
    const rEnd = rStart + (r.est_duration_min || 45);

    if (intervalsOverlap(startMin, endMin, rStart, rEnd)) {
      // C10.2: Vehicle overlap check
      if (
        routeInput.default_vehicle_id &&
        r.default_vehicle_id &&
        routeInput.default_vehicle_id === r.default_vehicle_id
      ) {
        return {
          valid: false,
          error: `Vehicle schedule overlap: This vehicle is already scheduled on Route ${r.code} from ${r.pickup_start_time} (duration: ${r.est_duration_min} min).`,
        };
      }

      // C10.3: Driver overlap check
      if (
        routeInput.default_driver_id &&
        r.default_driver_id &&
        routeInput.default_driver_id === r.default_driver_id
      ) {
        return {
          valid: false,
          error: `Driver schedule overlap: Driver is already assigned to Route ${r.code} during overlapping window ${r.pickup_start_time}.`,
        };
      }

      // Attendant overlap check
      if (
        routeInput.default_attendant_id &&
        r.default_attendant_id &&
        routeInput.default_attendant_id === r.default_attendant_id
      ) {
        return {
          valid: false,
          error: `Attendant schedule overlap: Attendant is already assigned to Route ${r.code} during overlapping window.`,
        };
      }
    }
  }

  return { valid: true };
}

/**
 * Unassigns a vehicle, driver, or attendant from other routes in the school
 * to prevent duplicate assignments across routes (Spec Route Builder Reassignment).
 */
export async function unassignRouteResourcesFromOtherRoutes(
  schoolId: string,
  excludeRouteId: string | null | undefined,
  resources: {
    vehicleId?: string | null;
    driverId?: string | null;
    attendantId?: string | null;
  }
): Promise<{ success: boolean; unassignedFromRoutes: string[]; error?: string }> {
  if (!schoolId) {
    return { success: false, unassignedFromRoutes: [], error: "School ID is required." };
  }

  const { vehicleId, driverId, attendantId } = resources;
  if (!vehicleId && !driverId && !attendantId) {
    return { success: true, unassignedFromRoutes: [] };
  }

  let dbRoutes: TransportRoute[] = [];
  if (isSupabaseConfigured) {
    const { data } = await supabase
      .from("transport_routes")
      .select("*")
      .eq("school_id", schoolId)
      .is("deleted_at", null);
    dbRoutes = (data || []) as TransportRoute[];
  } else {
    dbRoutes = lsGet<TransportRoute>(`myzkool_transport_routes_${schoolId}`).filter((r) => !r.deleted_at);
  }

  const otherRoutes = dbRoutes.filter((r) => r.id !== excludeRouteId);
  const affectedRouteCodes: string[] = [];
  const lsRoutes = lsGet<TransportRoute>(`myzkool_transport_routes_${schoolId}`);

  for (const r of otherRoutes) {
    let needsUpdate = false;
    const patch: Partial<TransportRoute> = {};

    if (vehicleId && r.default_vehicle_id === vehicleId) {
      patch.default_vehicle_id = null;
      needsUpdate = true;
    }
    if (driverId && r.default_driver_id === driverId) {
      patch.default_driver_id = null;
      needsUpdate = true;
    }
    if (attendantId && r.default_attendant_id === attendantId) {
      patch.default_attendant_id = null;
      needsUpdate = true;
    }

    if (needsUpdate) {
      if (!affectedRouteCodes.includes(r.code)) {
        affectedRouteCodes.push(r.code);
      }

      if (isSupabaseConfigured) {
        await supabase
          .from("transport_routes")
          .update({ ...patch, updated_at: nowISO() })
          .eq("id", r.id)
          .eq("school_id", schoolId);
      }

      const idx = lsRoutes.findIndex((item) => item.id === r.id);
      if (idx !== -1) {
        lsRoutes[idx] = { ...lsRoutes[idx], ...patch, updated_at: nowISO() };
      }
    }
  }

  lsSet(`myzkool_transport_routes_${schoolId}`, lsRoutes);
  return { success: true, unassignedFromRoutes: affectedRouteCodes };
}

export async function createRoute(
  schoolId: string,
  input: Omit<TransportRoute, "id" | "school_id" | "created_at" | "updated_at">,
  options?: { reassignResources?: boolean }
): Promise<{ success: boolean; route?: TransportRoute; unassignedFromRoutes?: string[]; error?: string }> {
  const code = input.code.trim().toUpperCase();
  if (!code || !input.name.trim()) {
    return { success: false, error: "Route name and code are required." };
  }

  // Check code uniqueness
  const routes = await getRoutes(schoolId);
  if (routes.some((r) => r.code.toUpperCase() === code)) {
    return { success: false, error: `Route code '${code}' already exists.` };
  }

  // If reassignResources option is enabled, unassign from other routes first
  let unassignedFromRoutes: string[] = [];
  if (options?.reassignResources) {
    const unassignRes = await unassignRouteResourcesFromOtherRoutes(schoolId, null, {
      vehicleId: input.default_vehicle_id,
      driverId: input.default_driver_id,
      attendantId: input.default_attendant_id,
    });
    unassignedFromRoutes = unassignRes.unassignedFromRoutes;
  }

  // Validate overlaps
  const overlapCheck = await validateRouteOverlap(schoolId, { ...input, code });
  if (!overlapCheck.valid) {
    return { success: false, error: overlapCheck.error };
  }

  const record: TransportRoute = {
    ...input,
    id: crypto.randomUUID(),
    school_id: schoolId,
    code,
    name: input.name.trim(),
    created_at: nowISO(),
    updated_at: nowISO(),
  };

  if (isSupabaseConfigured) {
    const { error } = await supabase.from("transport_routes").insert(record);
    if (error) return { success: false, error: error.message };
  }

  const allRoutes = lsGet<TransportRoute>(`myzkool_transport_routes_${schoolId}`);
  lsSet(`myzkool_transport_routes_${schoolId}`, [...allRoutes, record]);

  return { success: true, route: record, unassignedFromRoutes };
}

export async function updateRoute(
  schoolId: string,
  routeId: string,
  input: Partial<TransportRoute>,
  options?: { reassignResources?: boolean }
): Promise<{ success: boolean; route?: TransportRoute; unassignedFromRoutes?: string[]; error?: string }> {
  const allRoutes = lsGet<TransportRoute>(`myzkool_transport_routes_${schoolId}`);
  const idx = allRoutes.findIndex((r) => r.id === routeId && !r.deleted_at);

  if (idx === -1) {
    return { success: false, error: "Route not found." };
  }

  if (input.code) {
    const code = input.code.trim().toUpperCase();
    if (allRoutes.some((r) => r.id !== routeId && !r.deleted_at && r.code.toUpperCase() === code)) {
      return { success: false, error: `Route code '${code}' already exists.` };
    }
    input.code = code;
  }

  // If reassignResources option is enabled, unassign from other routes first
  let unassignedFromRoutes: string[] = [];
  if (options?.reassignResources) {
    const unassignRes = await unassignRouteResourcesFromOtherRoutes(schoolId, routeId, {
      vehicleId: input.default_vehicle_id,
      driverId: input.default_driver_id,
      attendantId: input.default_attendant_id,
    });
    unassignedFromRoutes = unassignRes.unassignedFromRoutes;
  }

  // Validate overlaps if schedule or assignments change
  const merged = { ...allRoutes[idx], ...input };
  const overlapCheck = await validateRouteOverlap(schoolId, merged, routeId);
  if (!overlapCheck.valid) {
    return { success: false, error: overlapCheck.error };
  }

  const updated: TransportRoute = {
    ...merged,
    updated_at: nowISO(),
  };

  if (isSupabaseConfigured) {
    await supabase.from("transport_routes").update(updated).eq("id", routeId).eq("school_id", schoolId);
  }

  allRoutes[idx] = updated;
  lsSet(`myzkool_transport_routes_${schoolId}`, allRoutes);

  return { success: true, route: updated, unassignedFromRoutes };
}

export async function deleteRoute(
  schoolId: string,
  routeId: string
): Promise<{ success: boolean; error?: string }> {
  // C10.5: No delete with riders
  let activeRidersCount = 0;
  if (isSupabaseConfigured) {
    const { count } = await supabase
      .from("transport_assignments")
      .select("*", { count: "exact", head: true })
      .eq("school_id", schoolId)
      .eq("route_id", routeId)
      .eq("status", "active");
    activeRidersCount = count || 0;
  } else {
    const assignments = lsGet<{ route_id: string; status: string }>(
      `myzkool_transport_assignments_${schoolId}`
    ).filter((a) => a.route_id === routeId && a.status === "active");
    activeRidersCount = assignments.length;
  }

  if (activeRidersCount > 0) {
    return {
      success: false,
      error: `Cannot delete route. ${activeRidersCount} student rider(s) are currently assigned. Reassign students first.`,
    };
  }

  const allRoutes = lsGet<TransportRoute>(`myzkool_transport_routes_${schoolId}`);
  const idx = allRoutes.findIndex((r) => r.id === routeId);
  if (idx !== -1) {
    allRoutes[idx].deleted_at = nowISO();
    allRoutes[idx].status = "inactive";
    lsSet(`myzkool_transport_routes_${schoolId}`, allRoutes);
  }

  if (isSupabaseConfigured) {
    await supabase
      .from("transport_routes")
      .update({ deleted_at: nowISO(), status: "inactive" })
      .eq("id", routeId)
      .eq("school_id", schoolId);
  }

  return { success: true };
}

// ─── 6. Route Stops (with C10 Continuous Sequence & Time Validations) ────────

export async function saveRouteStops(
  schoolId: string,
  routeId: string,
  stops: Omit<RouteStop, "id" | "school_id" | "route_id" | "created_at" | "updated_at">[]
): Promise<{ success: boolean; stops?: RouteStop[]; error?: string }> {
  if (!stops || stops.length === 0) {
    return { success: false, error: "A route must have at least one stop." };
  }

  // C10.4: Sequence must be strictly continuous: 1, 2, 3...
  const sortedStops = [...stops].sort((a, b) => a.sequence - b.sequence);
  for (let i = 0; i < sortedStops.length; i++) {
    const expectedSeq = i + 1;
    if (sortedStops[i].sequence !== expectedSeq) {
      return {
        success: false,
        error: `Invalid stop sequence: expected sequence ${expectedSeq}, found ${sortedStops[i].sequence}. Stop sequence must be continuous without gaps.`,
      };
    }
  }

  // C10.4: Pickup times must strictly increase along sequence
  let lastPickupMin = -1;
  for (const st of sortedStops) {
    const min = timeToMinutes(st.pickup_time);
    if (min <= lastPickupMin) {
      return {
        success: false,
        error: `Stop times must increase along the sequence: '${st.name}' at ${st.pickup_time} cannot be earlier than or equal to preceding stop.`,
      };
    }
    lastPickupMin = min;
  }

  // Query existing stops
  let allExistingStops: RouteStop[] = [];
  let activeAssignments: { pickup_stop_id?: string; drop_stop_id?: string; status: string }[] = [];

  if (isSupabaseConfigured) {
    const { data: dbStops } = await supabase
      .from("route_stops")
      .select("*")
      .eq("school_id", schoolId)
      .eq("route_id", routeId)
      .is("deleted_at", null);
    allExistingStops = (dbStops || []) as RouteStop[];

    const { data: dbAssigns } = await supabase
      .from("transport_assignments")
      .select("pickup_stop_id, drop_stop_id, status")
      .eq("school_id", schoolId)
      .eq("route_id", routeId)
      .eq("status", "active");
    activeAssignments = (dbAssigns || []) as any[];
  } else {
    allExistingStops = lsGet<RouteStop>(`myzkool_route_stops_${schoolId}`).filter(
      (s) => s.route_id === routeId && !s.deleted_at
    );
    activeAssignments = lsGet<{ pickup_stop_id?: string; drop_stop_id?: string; status: string; route_id?: string }>(
      `myzkool_transport_assignments_${schoolId}`
    ).filter((a) => a.route_id === routeId && a.status === "active");
  }

  // Check if removing any stop that has riders assigned
  const newStopIds = new Set(sortedStops.map((s) => (s as any).id).filter(Boolean));
  const newStopNames = new Set(sortedStops.map((s) => s.name.trim().toLowerCase()));

  for (const oldStop of allExistingStops) {
    const isRetained = newStopIds.has(oldStop.id) || newStopNames.has(oldStop.name.trim().toLowerCase());
    if (!isRetained) {
      const riderUsingStop = activeAssignments.find(
        (a) => a.pickup_stop_id === oldStop.id || a.drop_stop_id === oldStop.id
      );
      if (riderUsingStop) {
        return {
          success: false,
          error: `Cannot delete stop '${oldStop.name}' because riders are assigned to it. Reassign riders first.`,
        };
      }
    }
  }

  const createdStops: RouteStop[] = sortedStops.map((st) => {
    // Preserve existing stop ID if stop with same name already existed on this route
    const existingMatch = allExistingStops.find(
      (old) => (st as any).id === old.id || old.name.trim().toLowerCase() === st.name.trim().toLowerCase()
    );
    const finalMonthlyFee =
      (st as any).monthly_fee_paise !== undefined && (st as any).monthly_fee_paise !== null
        ? Number((st as any).monthly_fee_paise)
        : (existingMatch?.monthly_fee_paise || 0);
    const finalPickupFee =
      (st as any).pickup_only_monthly_paise !== undefined && (st as any).pickup_only_monthly_paise !== null
        ? Number((st as any).pickup_only_monthly_paise)
        : (existingMatch?.pickup_only_monthly_paise || 0);
    const finalDropFee =
      (st as any).drop_only_monthly_paise !== undefined && (st as any).drop_only_monthly_paise !== null
        ? Number((st as any).drop_only_monthly_paise)
        : (existingMatch?.drop_only_monthly_paise || 0);

    return {
      ...st,
      id: (st as any).id || existingMatch?.id || crypto.randomUUID(),
      school_id: schoolId,
      route_id: routeId,
      monthly_fee_paise: finalMonthlyFee,
      pickup_only_monthly_paise: finalPickupFee,
      drop_only_monthly_paise: finalDropFee,
      created_at: existingMatch?.created_at || nowISO(),
      updated_at: nowISO(),
    };
  });

  // Update localStorage
  const allStops = lsGet<RouteStop>(`myzkool_route_stops_${schoolId}`).filter(
    (s) => s.route_id !== routeId
  );
  lsSet(`myzkool_route_stops_${schoolId}`, [...allStops, ...createdStops]);

  if (isSupabaseConfigured) {
    // 1. Delete stops that are no longer part of the route (and have no riders)
    const retainedIds = new Set(createdStops.map((s) => s.id));
    const stopsToDelete = allExistingStops.filter((s) => !retainedIds.has(s.id));
    if (stopsToDelete.length > 0) {
      const deleteIds = stopsToDelete.map((s) => s.id);
      await supabase.from("route_stops").delete().in("id", deleteIds).eq("school_id", schoolId);
    }

    // 2. Upsert retained and new stops safely without breaking foreign keys
    const { error: upsertErr } = await supabase.from("route_stops").upsert(createdStops, { onConflict: "id" });
    if (upsertErr) {
      return { success: false, error: upsertErr.message };
    }
  }

  return { success: true, stops: createdStops };
}

/**
 * Configure separate monthly transport fees for stops on a route (Spec 1.5, Section 2)
 */
export async function updateRouteStopFees(
  schoolId: string,
  routeId: string,
  stopFees: RouteStopFeeInput[]
): Promise<{ success: boolean; stops?: RouteStop[]; error?: string }> {
  if (!schoolId || !routeId) {
    return { success: false, error: "School ID and Route ID are required." };
  }

  if (!stopFees || stopFees.length === 0) {
    return { success: false, error: "No stop fees provided." };
  }

  // 1. Fetch route and its stops
  const route = await getRouteById(schoolId, routeId);
  if (!route) {
    return { success: false, error: "Route not found." };
  }

  const existingStops = route.stops || [];
  const existingStopIds = new Set(existingStops.map((s) => s.id));

  // 2. Validate all stop IDs belong to this route and fees are non-negative
  for (const item of stopFees) {
    if (!item.id || !existingStopIds.has(item.id)) {
      return {
        success: false,
        error: `Stop with ID '${item.id}' does not belong to route '${route.name}' (${route.code}).`,
      };
    }
    const bothPaise = Number(item.monthly_fee_paise);
    const pickupPaise = item.pickup_only_monthly_paise !== undefined ? Number(item.pickup_only_monthly_paise) : bothPaise;
    const dropPaise = item.drop_only_monthly_paise !== undefined ? Number(item.drop_only_monthly_paise) : bothPaise;

    if (isNaN(bothPaise) || bothPaise < 0 || isNaN(pickupPaise) || pickupPaise < 0 || isNaN(dropPaise) || dropPaise < 0) {
      return {
        success: false,
        error: "Stop fees must be non-negative numbers.",
      };
    }
  }

  // 3. Update the stops
  const feeMap = new Map<string, RouteStopFeeInput>();
  for (const item of stopFees) {
    feeMap.set(item.id, item);
  }

  const updatedStops: RouteStop[] = existingStops.map((st) => {
    const feeItem = feeMap.get(st.id);
    if (!feeItem) return st;

    const bothPaise = Math.round(Number(feeItem.monthly_fee_paise));
    const pickupPaise = feeItem.pickup_only_monthly_paise !== undefined 
      ? Math.round(Number(feeItem.pickup_only_monthly_paise)) 
      : bothPaise;
    const dropPaise = feeItem.drop_only_monthly_paise !== undefined 
      ? Math.round(Number(feeItem.drop_only_monthly_paise)) 
      : bothPaise;

    return {
      ...st,
      monthly_fee_paise: bothPaise,
      pickup_only_monthly_paise: pickupPaise,
      drop_only_monthly_paise: dropPaise,
      updated_at: nowISO(),
    };
  });

  // 4. Update Supabase
  if (isSupabaseConfigured) {
    for (const st of updatedStops) {
      if (feeMap.has(st.id)) {
        const { error: updErr } = await supabase
          .from("route_stops")
          .update({
            monthly_fee_paise: st.monthly_fee_paise,
            pickup_only_monthly_paise: st.pickup_only_monthly_paise,
            drop_only_monthly_paise: st.drop_only_monthly_paise,
            updated_at: st.updated_at,
          })
          .eq("id", st.id)
          .eq("school_id", schoolId)
          .eq("route_id", routeId);

        if (updErr) {
          return { success: false, error: updErr.message };
        }
      }
    }
  }

  // 5. Update localStorage
  const allStops = lsGet<RouteStop>(`myzkool_route_stops_${schoolId}`).filter(
    (s) => s.route_id !== routeId
  );
  lsSet(`myzkool_route_stops_${schoolId}`, [...allStops, ...updatedStops]);

  return { success: true, stops: updatedStops };
}

// ─── 7. Fee Zones ───────────────────────────────────────────────────────────

export async function getFeeZones(schoolId: string): Promise<TransportFeeZone[]> {
  if (isSupabaseConfigured) {
    const { data } = await supabase
      .from("transport_fee_zones")
      .select("*")
      .eq("school_id", schoolId)
      .is("deleted_at", null)
      .order("monthly_fee_paise", { ascending: true });
    const zones = (data || []) as TransportFeeZone[];
    lsSet(`myzkool_transport_fee_zones_${schoolId}`, zones);
    return zones;
  }
  return lsGet<TransportFeeZone>(`myzkool_transport_fee_zones_${schoolId}`).filter(
    (z) => !z.deleted_at
  );
}

export async function createFeeZone(
  schoolId: string,
  input: Omit<TransportFeeZone, "id" | "school_id" | "created_at" | "updated_at">
): Promise<{ success: boolean; zone?: TransportFeeZone; error?: string }> {
  if (!input.name.trim()) {
    return { success: false, error: "Zone name is required." };
  }

  const record: TransportFeeZone = {
    ...input,
    id: crypto.randomUUID(),
    school_id: schoolId,
    created_at: nowISO(),
    updated_at: nowISO(),
  };

  if (isSupabaseConfigured) {
    await supabase.from("transport_fee_zones").insert(record);
  }

  const allZones = lsGet<TransportFeeZone>(`myzkool_transport_fee_zones_${schoolId}`);
  lsSet(`myzkool_transport_fee_zones_${schoolId}`, [...allZones, record]);

  return { success: true, zone: record };
}

export async function updateFeeZone(
  schoolId: string,
  zoneId: string,
  input: Partial<TransportFeeZone>
): Promise<{ success: boolean; zone?: TransportFeeZone; error?: string }> {
  const allZones = lsGet<TransportFeeZone>(`myzkool_transport_fee_zones_${schoolId}`);
  const idx = allZones.findIndex((z) => z.id === zoneId && !z.deleted_at);
  if (idx === -1) {
    return { success: false, error: "Fee zone not found." };
  }

  const updated: TransportFeeZone = {
    ...allZones[idx],
    ...input,
    updated_at: nowISO(),
  };

  if (isSupabaseConfigured) {
    await supabase.from("transport_fee_zones").update(updated).eq("id", zoneId).eq("school_id", schoolId);
  }

  allZones[idx] = updated;
  lsSet(`myzkool_transport_fee_zones_${schoolId}`, allZones);

  return { success: true, zone: updated };
}

export async function deleteFeeZone(
  schoolId: string,
  zoneId: string
): Promise<{ success: boolean; error?: string }> {
  let stopsUsingZoneCount = 0;
  if (isSupabaseConfigured) {
    const { count } = await supabase
      .from("route_stops")
      .select("*", { count: "exact", head: true })
      .eq("school_id", schoolId)
      .eq("fee_zone_id", zoneId)
      .is("deleted_at", null);
    stopsUsingZoneCount = count || 0;
  } else {
    const stops = lsGet<RouteStop>(`myzkool_route_stops_${schoolId}`);
    stopsUsingZoneCount = stops.filter((s) => s.fee_zone_id === zoneId && !s.deleted_at).length;
  }

  if (stopsUsingZoneCount > 0) {
    return {
      success: false,
      error: `Cannot delete fee zone. ${stopsUsingZoneCount} stop(s) are currently assigned to this zone.`,
    };
  }

  const allZones = lsGet<TransportFeeZone>(`myzkool_transport_fee_zones_${schoolId}`);
  const idx = allZones.findIndex((z) => z.id === zoneId);
  if (idx !== -1) {
    allZones[idx].deleted_at = nowISO();
    lsSet(`myzkool_transport_fee_zones_${schoolId}`, allZones);
  }

  if (isSupabaseConfigured) {
    await supabase.from("transport_fee_zones").update({ deleted_at: nowISO() }).eq("id", zoneId).eq("school_id", schoolId);
  }

  return { success: true };
}

// ─── 8. Transport Dashboard Aggregation ─────────────────────────────────────

export async function getTransportDashboardData(schoolId: string): Promise<TransportDashboardData> {
  const vehicles = await getVehicles(schoolId);
  const routes = await getRoutes(schoolId);
  const staff = await getTransportStaff(schoolId);

  let expiredDocsCount = 0;
  let expiringDocsCount = 0;
  const attentionItems: TransportDashboardData["needs_attention"]["items"] = [];

  // Inspect vehicle documents
  for (const v of vehicles) {
    if (v.document_status.status === "expired") {
      expiredDocsCount++;
      attentionItems.push({
        id: `att_v_${v.id}`,
        kind: "doc_expired",
        title: `Vehicle ${v.registration_no} document expired`,
        subtitle: `${v.make_model} has expired compliance document(s).`,
        link: `/admin/transport/vehicles?id=${v.id}`,
        severity: "high",
      });
    } else if (v.document_status.status === "expiring_soon") {
      expiringDocsCount++;
      attentionItems.push({
        id: `att_v_${v.id}`,
        kind: "doc_expiring",
        title: `Vehicle ${v.registration_no} document expiring soon`,
        subtitle: `Expires in ${v.document_status.daysRemaining} days.`,
        link: `/admin/transport/vehicles?id=${v.id}`,
        severity: "medium",
      });
    }
  }

  // Inspect driver licenses
  for (const st of staff) {
    if (st.license_status?.status === "expired") {
      expiredDocsCount++;
      attentionItems.push({
        id: `att_st_${st.id}`,
        kind: "doc_expired",
        title: `Driver ${st.full_name} license expired`,
        subtitle: `License #${st.license_no || "N/A"} has expired.`,
        link: `/admin/transport/staff?id=${st.id}`,
        severity: "high",
      });
    } else if (st.license_status?.status === "expiring_soon") {
      expiringDocsCount++;
      attentionItems.push({
        id: `att_st_${st.id}`,
        kind: "doc_expiring",
        title: `Driver ${st.full_name} license expiring soon`,
        subtitle: `Expires in ${st.license_status.daysRemaining} days.`,
        link: `/admin/transport/staff?id=${st.id}`,
        severity: "medium",
      });
    }
  }

  // Inspect routes
  let noDriverCount = 0;
  let noVehicleCount = 0;
  let overCapacityCount = 0;

  for (const r of routes) {
    if (r.status === "active") {
      if (!r.default_driver_id) {
        noDriverCount++;
        attentionItems.push({
          id: `att_rd_${r.id}`,
          kind: "unassigned_route",
          title: `Route ${r.code} has no driver assigned`,
          subtitle: `${r.name} starts at ${r.pickup_start_time} with no driver.`,
          link: `/admin/transport/routes?id=${r.id}`,
          severity: "high",
        });
      }
      if (!r.default_vehicle_id) {
        noVehicleCount++;
        attentionItems.push({
          id: `att_rv_${r.id}`,
          kind: "unassigned_route",
          title: `Route ${r.code} has no vehicle assigned`,
          subtitle: `${r.name} has no bus or van linked.`,
          link: `/admin/transport/routes?id=${r.id}`,
          severity: "high",
        });
      }
      if (r.is_over_capacity) {
        overCapacityCount++;
        attentionItems.push({
          id: `att_oc_${r.id}`,
          kind: "overcapacity_route",
          title: `Route ${r.code} is over capacity`,
          subtitle: `${r.seats_used} riders assigned for ${r.seat_capacity} seats.`,
          link: `/admin/transport/routes?id=${r.id}`,
          severity: "high",
        });
      }
    }
  }

  const activeVehicles = vehicles.filter((v) => v.status === "active");
  const activeRoutes = routes.filter((r) => r.status === "active");
  const totalRiders = activeRoutes.reduce((sum, r) => sum + r.riders_count, 0);
  const totalCapacity = activeRoutes.reduce((sum, r) => sum + r.seat_capacity, 0);
  const utilPercent = totalCapacity > 0 ? Math.round((totalRiders / totalCapacity) * 100) : 0;

  const routeBars = activeRoutes.map((r) => ({
    route_id: r.id,
    route_name: r.name,
    route_code: r.code,
    seats_used: r.seats_used,
    capacity: r.seat_capacity,
    is_over: r.is_over_capacity,
  }));

  let authoritativeRidersCount = totalRiders;
  if (isSupabaseConfigured) {
    const { data: activeAssignments } = await supabase
      .from("transport_assignments")
      .select("student_id")
      .eq("school_id", schoolId)
      .eq("status", "active");
    if (activeAssignments) {
      authoritativeRidersCount = new Set(activeAssignments.map((a) => a.student_id)).size;
    }
  } else {
    const assignments = lsGet<any>(`myzkool_transport_assignments_${schoolId}`).filter((a) => a.status === "active");
    authoritativeRidersCount = new Set(assignments.map((a) => a.student_id)).size;
  }

  const driversTotal = staff.filter((s) => s.staff_type === "driver").length;
  const driversActive = staff.filter((s) => s.staff_type === "driver" && s.status === "active").length;
  const attendantsTotal = staff.filter((s) => s.staff_type === "attendant").length;
  const attendantsActive = staff.filter((s) => s.staff_type === "attendant" && s.status === "active").length;
  const staffTotal = staff.length;
  const staffActive = staff.filter((s) => s.status === "active").length;

  return {
    needs_attention: {
      expired_documents_count: expiredDocsCount,
      expiring_documents_count: expiringDocsCount,
      routes_without_driver_count: noDriverCount,
      routes_without_vehicle_count: noVehicleCount,
      over_capacity_routes_count: overCapacityCount,
      pending_requests_count: 0,
      items: attentionItems,
    },
    fleet_snapshot: {
      vehicles_active: activeVehicles.length,
      vehicles_total: vehicles.length,
      routes_active: activeRoutes.length,
      routes_total: routes.length,
      drivers_total: driversTotal,
      drivers_active: driversActive,
      attendants_total: attendantsTotal,
      attendants_active: attendantsActive,
      staff_total: staffTotal,
      staff_active: staffActive,
      total_riders: authoritativeRidersCount,
      total_capacity: totalCapacity,
      utilization_percent: totalCapacity > 0 ? Math.round((authoritativeRidersCount / totalCapacity) * 100) : 0,
      route_bars: routeBars,
    },
    today_trips: {
      pickup_trips_count: 0,
      drop_trips_count: 0,
      completed_trips_count: 0,
      delayed_trips_count: 0,
      empty_state_message: "No trips scheduled yet today. Active routes will begin tracking once school session opens.",
    },
  };
}
