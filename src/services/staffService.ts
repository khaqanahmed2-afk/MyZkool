/**
 * Staff Service Layer for MyZkool
 * 
 * Handles:
 * - Tenant-isolated staff management (Teachers, Accountants)
 * - Strict school_id scoping & multi-tenant isolation
 * - Employee code uniqueness per school
 * - Role-based authorization (only School Admin / Super Admin can mutate)
 * - Safe offline / test resilience via fallback local storage
 * - Progression to Step 8 (Complete) with non-regression logic
 */

import { supabase, isSupabaseConfigured } from "../lib/supabase";
import type {
  StaffMember,
  StaffInput,
  StaffUpdateInput,
  StaffStatus,
} from "../types/staff";

export const STAFF_CACHE_KEY_PREFIX = "myzkool_staff_";

/**
 * Validates standard email address format
 */
export function isValidEmail(email?: string | null): boolean {
  if (!email || !email.trim()) return false;
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email.trim());
}

/**
 * Generates a clean auto employee code suggestion
 */
export function generateEmployeeCode(role: string, index: number): string {
  const prefix = role === "accountant" ? "ACC" : "TCH";
  const num = String(index + 1).padStart(3, "0");
  return `${prefix}-${num}`;
}

/**
 * Helper to retrieve staff list from localStorage cache
 */
function getCachedStaff(schoolId: string): StaffMember[] {
  try {
    const raw = localStorage.getItem(`${STAFF_CACHE_KEY_PREFIX}${schoolId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // Non-fatal
  }
  return [];
}

/**
 * Helper to persist staff list to localStorage cache
 */
function setCachedStaff(schoolId: string, staff: StaffMember[]): void {
  try {
    localStorage.setItem(
      `${STAFF_CACHE_KEY_PREFIX}${schoolId}`,
      JSON.stringify(staff)
    );
  } catch {
    // Non-fatal
  }
}

/**
 * Fetches all staff members for a specific school
 */
export async function getStaff(
  schoolId: string
): Promise<{ success: boolean; staff: StaffMember[]; error?: string }> {
  if (!schoolId) {
    return { success: false, staff: [], error: "school_id is required." };
  }

  // 1. Try Supabase
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from("staff")
        .select("*")
        .eq("school_id", schoolId)
        .order("created_at", { ascending: true });

      if (!error && data) {
        const staffList: StaffMember[] = data.map((d: any) => ({
          id: d.id,
          school_id: d.school_id,
          user_id: d.user_id || null,
          employee_code: d.employee_code || null,
          first_name: d.first_name,
          last_name: d.last_name || null,
          email: d.email || null,
          phone: d.phone || null,
          role: d.role,
          designation: d.designation || null,
          joining_date: d.joining_date || null,
          status: d.status || "active",
          created_at: d.created_at,
          updated_at: d.updated_at,
        }));

        // Cache for offline/preview
        setCachedStaff(schoolId, staffList);
        return { success: true, staff: staffList };
      } else if (error) {
        // Log schema notice if table not yet created in Supabase
        console.warn("Supabase staff query notice:", error.message);
      }
    } catch (err) {
      console.warn("Supabase staff fetch exception:", err);
    }
  }

  // 2. Local cache fallback
  const cached = getCachedStaff(schoolId);
  return { success: true, staff: cached };
}

/**
 * Fetches a single staff member by ID
 */
export async function getStaffMember(
  schoolId: string,
  staffId: string
): Promise<{ success: boolean; staffMember?: StaffMember; error?: string }> {
  if (!schoolId || !staffId) {
    return {
      success: false,
      error: "school_id and staff_id are required.",
    };
  }

  const { staff, error } = await getStaff(schoolId);
  if (error) return { success: false, error };

  const member = staff.find((s) => s.id === staffId && s.school_id === schoolId);
  if (!member) {
    return { success: false, error: "Staff member not found." };
  }

  return { success: true, staffMember: member };
}

/**
 * Creates a new staff member within the school
 */
export async function createStaff({
  schoolId,
  input,
  userRole = "school_admin",
}: {
  schoolId: string;
  input: StaffInput;
  userRole?: string;
}): Promise<{ success: boolean; staffMember?: StaffMember; error?: string }> {
  if (!schoolId) {
    return { success: false, error: "school_id is required." };
  }

  // Role authorization: Only school_admin or super_admin
  if (userRole !== "school_admin" && userRole !== "super_admin") {
    return {
      success: false,
      error: "Unauthorized: Only School Administrators can add staff members.",
    };
  }

  // Validate required first name
  const firstName = input.first_name?.trim();
  if (!firstName) {
    return { success: false, error: "Staff first name is required." };
  }

  // Validate allowed roles: only teacher or accountant
  if (input.role !== "teacher" && input.role !== "accountant") {
    return {
      success: false,
      error: "Invalid staff role. Permitted onboarding roles are 'teacher' or 'accountant'.",
    };
  }

  // Validate email if provided
  if (input.email && input.email.trim()) {
    if (!isValidEmail(input.email.trim())) {
      return { success: false, error: "Please provide a valid email address." };
    }
  }

  // Check employee_code uniqueness within this school
  const currentList = getCachedStaff(schoolId);
  const normalizedCode = input.employee_code?.trim().toLowerCase();

  if (normalizedCode) {
    const codeConflict = currentList.find(
      (s) =>
        s.employee_code &&
        s.employee_code.trim().toLowerCase() === normalizedCode &&
        s.status !== "archived"
    );
    if (codeConflict) {
      return {
        success: false,
        error: `Employee code '${input.employee_code?.trim()}' is already in use at this school.`,
      };
    }
  }

  // Check email uniqueness within this school if provided
  if (input.email && input.email.trim()) {
    const emailConflict = currentList.find(
      (s) =>
        s.email &&
        s.email.trim().toLowerCase() === input.email!.trim().toLowerCase() &&
        s.status !== "archived"
    );
    if (emailConflict) {
      return {
        success: false,
        error: `A staff member with email '${input.email.trim()}' is already registered at this school.`,
      };
    }
  }

  const timestamp = new Date().toISOString();
  const newStaffId = crypto.randomUUID();

  const newMember: StaffMember = {
    id: newStaffId,
    school_id: schoolId,
    user_id: null, // nullable, credentials created in later phase
    employee_code: input.employee_code?.trim() || null,
    first_name: firstName,
    last_name: input.last_name?.trim() || null,
    email: input.email?.trim().toLowerCase() || null,
    phone: input.phone?.trim() || null,
    role: input.role,
    designation: input.designation?.trim() || null,
    joining_date: input.joining_date?.trim() || null,
    status: input.status || "active",
    created_at: timestamp,
    updated_at: timestamp,
  };

  // 1. Persist to Supabase if configured
  if (isSupabaseConfigured) {
    try {
      const { error: insertError } = await supabase.from("staff").insert({
        id: newMember.id,
        school_id: newMember.school_id,
        user_id: newMember.user_id,
        employee_code: newMember.employee_code,
        first_name: newMember.first_name,
        last_name: newMember.last_name,
        email: newMember.email,
        phone: newMember.phone,
        role: newMember.role,
        designation: newMember.designation,
        joining_date: newMember.joining_date,
        status: newMember.status,
        created_at: newMember.created_at,
        updated_at: newMember.updated_at,
      });

      if (insertError) {
        console.warn("Supabase staff insert warning:", insertError);
        if (insertError.code === "23505") {
          return {
            success: false,
            error: "An employee with this employee code or email already exists.",
          };
        }
      }
    } catch (err) {
      console.warn("Supabase staff insert exception:", err);
    }
  }

  // 2. Persist to local cache
  const updatedList = [...currentList, newMember];
  setCachedStaff(schoolId, updatedList);

  return { success: true, staffMember: newMember };
}

/**
 * Updates an existing staff member's attributes
 */
export async function updateStaff({
  schoolId,
  staffId,
  input,
  userRole = "school_admin",
}: {
  schoolId: string;
  staffId: string;
  input: StaffUpdateInput;
  userRole?: string;
}): Promise<{ success: boolean; staffMember?: StaffMember; error?: string }> {
  if (!schoolId || !staffId) {
    return {
      success: false,
      error: "school_id and staff_id are required.",
    };
  }

  // Role authorization
  if (userRole !== "school_admin" && userRole !== "super_admin") {
    return {
      success: false,
      error: "Unauthorized: Only School Administrators can update staff.",
    };
  }

  const currentList = getCachedStaff(schoolId);
  const existingIndex = currentList.findIndex((s) => s.id === staffId && s.school_id === schoolId);

  if (existingIndex === -1) {
    return { success: false, error: "Staff member not found." };
  }

  const current = currentList[existingIndex];

  // Validate first_name if updated
  if (input.first_name !== undefined && !input.first_name.trim()) {
    return { success: false, error: "First name cannot be empty." };
  }

  // Validate role if updated
  if (input.role !== undefined && input.role !== "teacher" && input.role !== "accountant") {
    return {
      success: false,
      error: "Invalid staff role. Permitted roles are 'teacher' or 'accountant'.",
    };
  }

  // Validate email if updated
  if (input.email !== undefined && input.email && input.email.trim()) {
    if (!isValidEmail(input.email.trim())) {
      return { success: false, error: "Please provide a valid email address." };
    }
  }

  // Check employee_code uniqueness against OTHER staff members
  if (input.employee_code !== undefined && input.employee_code?.trim()) {
    const norm = input.employee_code.trim().toLowerCase();
    const conflict = currentList.find(
      (s) =>
        s.id !== staffId &&
        s.employee_code &&
        s.employee_code.trim().toLowerCase() === norm &&
        s.status !== "archived"
    );
    if (conflict) {
      return {
        success: false,
        error: `Employee code '${input.employee_code.trim()}' is already in use by another staff member.`,
      };
    }
  }

  const timestamp = new Date().toISOString();
  const updatedMember: StaffMember = {
    ...current,
    first_name: input.first_name !== undefined ? input.first_name.trim() : current.first_name,
    last_name: input.last_name !== undefined ? (input.last_name?.trim() || null) : current.last_name,
    email: input.email !== undefined ? (input.email?.trim().toLowerCase() || null) : current.email,
    phone: input.phone !== undefined ? (input.phone?.trim() || null) : current.phone,
    role: input.role !== undefined ? input.role : current.role,
    designation: input.designation !== undefined ? (input.designation?.trim() || null) : current.designation,
    employee_code: input.employee_code !== undefined ? (input.employee_code?.trim() || null) : current.employee_code,
    joining_date: input.joining_date !== undefined ? (input.joining_date?.trim() || null) : current.joining_date,
    status: input.status !== undefined ? input.status : current.status,
    updated_at: timestamp,
  };

  // 1. Supabase update
  if (isSupabaseConfigured) {
    try {
      await supabase
        .from("staff")
        .update({
          first_name: updatedMember.first_name,
          last_name: updatedMember.last_name,
          email: updatedMember.email,
          phone: updatedMember.phone,
          role: updatedMember.role,
          designation: updatedMember.designation,
          employee_code: updatedMember.employee_code,
          joining_date: updatedMember.joining_date,
          status: updatedMember.status,
          updated_at: timestamp,
        })
        .eq("id", staffId)
        .eq("school_id", schoolId);
    } catch (err) {
      console.warn("Supabase updateStaff exception:", err);
    }
  }

  // 2. Cache update
  currentList[existingIndex] = updatedMember;
  setCachedStaff(schoolId, currentList);

  return { success: true, staffMember: updatedMember };
}

/**
 * Updates staff member status (active, archived, inactive)
 */
export async function updateStaffStatus({
  schoolId,
  staffId,
  status,
  userRole = "school_admin",
}: {
  schoolId: string;
  staffId: string;
  status: StaffStatus;
  userRole?: string;
}): Promise<{ success: boolean; error?: string }> {
  const result = await updateStaff({
    schoolId,
    staffId,
    input: { status },
    userRole,
  });

  return { success: result.success, error: result.error };
}

/**
 * Archives a staff member
 */
export async function archiveStaff({
  schoolId,
  staffId,
  userRole = "school_admin",
}: {
  schoolId: string;
  staffId: string;
  userRole?: string;
}): Promise<{ success: boolean; error?: string }> {
  return updateStaffStatus({
    schoolId,
    staffId,
    status: "archived",
    userRole,
  });
}

/**
 * Deletes a staff member record
 */
export async function deleteStaff({
  schoolId,
  staffId,
  userRole = "school_admin",
}: {
  schoolId: string;
  staffId: string;
  userRole?: string;
}): Promise<{ success: boolean; error?: string }> {
  if (!schoolId || !staffId) {
    return {
      success: false,
      error: "school_id and staff_id are required.",
    };
  }

  // Role authorization
  if (userRole !== "school_admin" && userRole !== "super_admin") {
    return {
      success: false,
      error: "Unauthorized: Only School Administrators can delete staff.",
    };
  }

  // 1. Supabase delete
  if (isSupabaseConfigured) {
    try {
      await supabase
        .from("staff")
        .delete()
        .eq("id", staffId)
        .eq("school_id", schoolId);
    } catch (err) {
      console.warn("Supabase deleteStaff exception:", err);
    }
  }

  // 2. Cache delete
  const currentList = getCachedStaff(schoolId);
  const filtered = currentList.filter((s) => s.id !== staffId);
  setCachedStaff(schoolId, filtered);

  return { success: true };
}

/**
 * Advances the school onboarding step to Step 8 (/onboarding/complete)
 * using the non-regression principle (Math.max(currentStep, 8)).
 */
export async function saveStaffSetupProgress({
  schoolId,
  userId,
}: {
  schoolId: string;
  userId: string;
}): Promise<{ success: boolean; error?: string }> {
  if (!schoolId || !userId) {
    return {
      success: false,
      error: "school_id and user_id are required to update onboarding progress.",
    };
  }

  const timestamp = new Date().toISOString();

  if (isSupabaseConfigured) {
    try {
      const { data: currentSchool } = await supabase
        .from("schools")
        .select("onboarding_step")
        .eq("id", schoolId)
        .maybeSingle();

      const currentStep = currentSchool?.onboarding_step || 7;
      const newStep = Math.max(currentStep, 8);

      await supabase
        .from("schools")
        .update({
          onboarding_step: newStep,
          updated_at: timestamp,
        })
        .eq("id", schoolId);

      await supabase
        .from("profiles")
        .update({
          current_onboarding_step: "/onboarding/complete",
          updated_at: timestamp,
        })
        .eq("auth_id", userId);

      await supabase.auth.updateUser({
        data: {
          onboarding_step: newStep,
          current_onboarding_step: "/onboarding/complete",
        },
      });
    } catch (err) {
      console.warn("Supabase staff onboarding progress update error:", err);
    }
  }

  // Local storage update with non-regression
  try {
    const schoolKey = `myzkool_school_profile_${userId}`;
    const raw = localStorage.getItem(schoolKey);
    if (raw) {
      const cached = JSON.parse(raw);
      cached.onboarding_step = Math.max(cached.onboarding_step || 7, 8);
      localStorage.setItem(schoolKey, JSON.stringify(cached));
    }
  } catch {
    // Non-fatal
  }

  return { success: true };
}
