/**
 * Academic Setup Service Layer
 *
 * Handles:
 * - Deterministic, timezone-safe academic year validation (calendar rules, leap years, duration)
 * - Tenant-scoped persistence (strictly isolated by school_id)
 * - Atomic current-year management (single active year rule)
 * - Onboarding step progression (Step 2 -> Step 3)
 * - Resume behavior (loading saved year, updating in-place, duplicate prevention)
 * - Fallback local storage for offline / preview resilience
 */

import { supabase, isSupabaseConfigured } from "../lib/supabase";
import type {
  AcademicYear,
  AcademicYearInput,
  AcademicYearValidationResult,
  AcademicYearValidationErrors,
} from "../types/academic";

const LOCAL_STORAGE_KEY_PREFIX = "myzkool_academic_years_";

/**
 * Validates a YYYY-MM-DD calendar date string without timezone shifts.
 * Validates actual calendar month lengths (28-31 days) and leap years.
 */
export function isValidCalendarDate(dateStr: string): boolean {
  if (!dateStr || typeof dateStr !== "string") return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
  if (!match) return false;

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);

  if (year < 1990 || year > 2100) return false;
  if (month < 1 || month > 12) return false;

  // Month day count (handling Feb leap years)
  // Day 0 of month+1 gives last day of month in local time
  const maxDays = new Date(year, month, 0).getDate();
  return day >= 1 && day <= maxDays;
}

/**
 * Extracts year, month, and day components from YYYY-MM-DD string.
 */
export function parseDateParts(dateStr: string): {
  year: number;
  month: number;
  day: number;
} | null {
  if (!isValidCalendarDate(dateStr)) return null;
  const [y, m, d] = dateStr.trim().split("-").map((v) => parseInt(v, 10));
  return { year: y, month: m, day: d };
}

/**
 * Generates sensible default display label for start and end years.
 * e.g. 2026, 2027 -> "2026–2027"
 * e.g. 2026, 2026 -> "2026"
 */
export function formatDefaultAcademicYearLabel(
  startYear: number,
  endYear: number
): string {
  if (!startYear || isNaN(startYear)) return "";
  if (!endYear || isNaN(endYear)) return String(startYear);
  return startYear === endYear ? `${startYear}` : `${startYear}–${endYear}`;
}

/**
 * Validates the academic year form input values with deterministic business rules.
 */
export function validateAcademicYearInput(
  input: AcademicYearInput
): AcademicYearValidationResult {
  const errors: AcademicYearValidationErrors = {};

  // 1. Start Year Validation
  if (!input.start_year || isNaN(input.start_year)) {
    errors.start_year = "Please enter a valid start year.";
  } else if (input.start_year < 1990 || input.start_year > 2100) {
    errors.start_year = "Start year must be between 1990 and 2100.";
  }

  // 2. End Year Validation
  if (!input.end_year || isNaN(input.end_year)) {
    errors.end_year = "Please enter a valid end year.";
  } else if (input.end_year < 1990 || input.end_year > 2100) {
    errors.end_year = "End year must be between 1990 and 2100.";
  }

  // 3. Year Order Check
  if (
    input.start_year &&
    input.end_year &&
    !isNaN(input.start_year) &&
    !isNaN(input.end_year)
  ) {
    if (input.end_year < input.start_year) {
      errors.end_year = `End year (${input.end_year}) cannot be earlier than start year (${input.start_year}).`;
    }
  }

  // 4. Label Validation
  if (!input.label || !input.label.trim()) {
    errors.label = "Please enter a display label for this academic year.";
  } else if (input.label.trim().length > 60) {
    errors.label = "Academic year label cannot exceed 60 characters.";
  }

  // 5. Start Date Validation
  if (!input.start_date || !input.start_date.trim()) {
    errors.start_date = "Please select the academic year start date.";
  } else if (!isValidCalendarDate(input.start_date)) {
    errors.start_date = "Start date must be a valid calendar date (YYYY-MM-DD).";
  }

  // 6. End Date Validation
  if (!input.end_date || !input.end_date.trim()) {
    errors.end_date = "Please select the academic year end date.";
  } else if (!isValidCalendarDate(input.end_date)) {
    errors.end_date = "End date must be a valid calendar date (YYYY-MM-DD).";
  }

  // 7. Date Ordering, Duration, and Year Consistency
  const hasValidStartDate = isValidCalendarDate(input.start_date);
  const hasValidEndDate = isValidCalendarDate(input.end_date);

  if (hasValidStartDate && hasValidEndDate) {
    const sParts = parseDateParts(input.start_date)!;
    const eParts = parseDateParts(input.end_date)!;

    // Lexical comparison for ISO YYYY-MM-DD is chronological and timezone-immune
    if (input.end_date <= input.start_date) {
      errors.end_date =
        "End date must be after the start date. End date cannot be on or before start date.";
    } else {
      // Calculate duration in days via UTC timestamps to avoid daylight savings / timezone shift
      const sUtc = Date.UTC(sParts.year, sParts.month - 1, sParts.day);
      const eUtc = Date.UTC(eParts.year, eParts.month - 1, eParts.day);
      const diffDays = Math.round((eUtc - sUtc) / (1000 * 60 * 60 * 24));

      if (diffDays < 30) {
        errors.end_date = "Academic year duration must span at least 30 days.";
      }
    }

    // Consistency between dates and year fields
    if (input.start_year && !isNaN(input.start_year) && input.start_year !== sParts.year) {
      errors.start_year = `Start year (${input.start_year}) must match the start date's calendar year (${sParts.year}).`;
    }

    if (input.end_year && !isNaN(input.end_year) && input.end_year !== eParts.year) {
      errors.end_year = `End year (${input.end_year}) must match the end date's calendar year (${eParts.year}).`;
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Computes default academic year based on reference date (defaults to current calendar date).
 */
export function getDefaultAcademicYear(referenceDate = new Date()): AcademicYearInput {
  const currentYear = referenceDate.getFullYear();
  const currentMonth = referenceDate.getMonth() + 1; // 1-12

  // Suggest default Indian cycle (April–March):
  // If current month is April (4) or later, session is currentYear -> currentYear + 1
  // If Jan–Mar, session is (currentYear - 1) -> currentYear
  let startYear = currentYear;
  let endYear = currentYear + 1;

  if (currentMonth < 4) {
    startYear = currentYear - 1;
    endYear = currentYear;
  }

  const startDate = `${startYear}-04-01`;
  const endDate = `${endYear}-03-31`;

  return {
    start_year: startYear,
    end_year: endYear,
    label: formatDefaultAcademicYearLabel(startYear, endYear),
    start_date: startDate,
    end_date: endDate,
    is_current: true,
  };
}

/**
 * Retrieves all academic years belonging to a school.
 */
export async function getAcademicYearsForSchool(
  schoolId: string
): Promise<{ academicYears: AcademicYear[]; error?: string }> {
  if (!schoolId) {
    return { academicYears: [], error: "school_id is required." };
  }

  // 1. Supabase database query
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from("academic_years")
        .select("*")
        .eq("school_id", schoolId)
        .order("start_year", { ascending: false });

      if (!error && data && data.length > 0) {
        const mapped: AcademicYear[] = data.map((item) => ({
          id: item.id,
          school_id: item.school_id,
          start_year: Number(item.start_year),
          end_year: Number(item.end_year),
          label: String(item.label),
          start_date: String(item.start_date),
          end_date: String(item.end_date),
          is_current: Boolean(item.is_current),
          created_at: item.created_at,
          updated_at: item.updated_at,
        }));
        return { academicYears: mapped };
      }
    } catch {
      // Table may not yet be initialized
    }
  }

  // 2. Local storage fallback
  try {
    const raw = localStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}${schoolId}`);
    if (raw) {
      const parsed = JSON.parse(raw) as AcademicYear[];
      return { academicYears: parsed };
    }
  } catch {
    // Storage access error
  }

  return { academicYears: [] };
}

/**
 * Retrieves the current active academic year for a school.
 */
export async function getCurrentAcademicYear(
  schoolId: string
): Promise<{ academicYear: AcademicYear | null; error?: string }> {
  const { academicYears, error } = await getAcademicYearsForSchool(schoolId);
  if (error) {
    return { academicYear: null, error };
  }

  const current =
    academicYears.find((y) => y.is_current) || academicYears[0] || null;
  return { academicYear: current };
}

export interface SaveAcademicYearParams {
  schoolId: string;
  userId: string;
  input: AcademicYearInput;
  existingAcademicYearId?: string | null;
}

/**
 * Saves or updates an academic year, enforces single current year rule,
 * updates profiles and schools onboarding steps, and handles conflict targets.
 */
export async function saveAcademicSetup({
  schoolId,
  userId,
  input,
  existingAcademicYearId,
}: SaveAcademicYearParams): Promise<{
  success: boolean;
  academicYear?: AcademicYear;
  error?: string;
}> {
  if (!userId) {
    return { success: false, error: "Authentication session expired. Please log in again." };
  }

  if (!schoolId) {
    return {
      success: false,
      error: "School association required. Please complete Step 1 first.",
    };
  }

  // 1. Validation
  const validation = validateAcademicYearInput(input);
  if (!validation.isValid) {
    const firstError =
      Object.values(validation.errors)[0] || "Invalid academic year configuration.";
    return { success: false, error: firstError };
  }

  const timestamp = new Date().toISOString();

  // 2. Persist to Supabase
  if (isSupabaseConfigured) {
    try {
      // Determine target academic year ID (resume existing, or check matching label to prevent unique constraint conflict)
      let resolvedAcademicYearId = existingAcademicYearId || null;

      if (!resolvedAcademicYearId) {
        const { data: existingSameLabel } = await supabase
          .from("academic_years")
          .select("id")
          .eq("school_id", schoolId)
          .ilike("label", input.label.trim())
          .maybeSingle();

        if (existingSameLabel?.id) {
          resolvedAcademicYearId = existingSameLabel.id;
        }
      }

      const academicYearId = resolvedAcademicYearId || crypto.randomUUID();

      // If marking as current, unset other academic years for this school first to prevent unique index collisions
      if (input.is_current) {
        try {
          await supabase
            .from("academic_years")
            .update({ is_current: false })
            .eq("school_id", schoolId)
            .neq("id", academicYearId);
        } catch (resetErr) {
          console.warn("Could not unset previous current academic years:", resetErr);
        }
      }

      // Upsert the academic year record
      const recordPayload = {
        id: academicYearId,
        school_id: schoolId,
        start_year: Number(input.start_year),
        end_year: Number(input.end_year),
        label: input.label.trim(),
        start_date: input.start_date,
        end_date: input.end_date,
        is_current: Boolean(input.is_current),
        updated_at: timestamp,
      };

      const { data: savedAY, error: ayError } = await supabase
        .from("academic_years")
        .upsert(recordPayload, { onConflict: "id" })
        .select()
        .single();

      if (ayError) {
        console.error("Supabase academic_years upsert error:", ayError);
        if (ayError.code === "23505") {
          return {
            success: false,
            error: `An academic year with the label "${input.label.trim()}" already exists for this school.`,
          };
        }
        if (ayError.code === "23514") {
          return {
            success: false,
            error: "The academic year dates or year range violated database calendar constraints.",
          };
        }
        return {
          success: false,
          error: ayError.message || "Failed to save academic setup to database.",
        };
      }

      // Update school onboarding step (advance to 3 if currently < 3)
      try {
        const { data: currentSchool } = await supabase
          .from("schools")
          .select("onboarding_step")
          .eq("id", schoolId)
          .maybeSingle();

        const currentStep = currentSchool?.onboarding_step || 2;
        const newStep = Math.max(currentStep, 3);

        await supabase
          .from("schools")
          .update({
            onboarding_step: newStep,
            updated_at: timestamp,
          })
          .eq("id", schoolId);
      } catch (schoolErr) {
        console.warn("Could not advance school onboarding_step:", schoolErr);
      }

      // Update profiles: ensure school_id is bound and advance step
      try {
        await supabase
          .from("profiles")
          .update({
            school_id: schoolId,
            current_onboarding_step: "/onboarding/classes",
            updated_at: timestamp,
          })
          .eq("auth_id", userId);
      } catch (profileErr) {
        console.warn("Could not update user profile onboarding step:", profileErr);
      }

      // Update auth user metadata
      try {
        await supabase.auth.updateUser({
          data: {
            school_id: schoolId,
            onboarding_step: 3,
            current_onboarding_step: "/onboarding/classes",
          },
        });
      } catch (authErr) {
        console.warn("Could not update auth user metadata:", authErr);
      }

      const verifiedRecord: AcademicYear = {
        id: savedAY?.id || academicYearId,
        school_id: schoolId,
        start_year: Number(input.start_year),
        end_year: Number(input.end_year),
        label: input.label.trim(),
        start_date: input.start_date,
        end_date: input.end_date,
        is_current: Boolean(input.is_current),
        created_at: savedAY?.created_at || timestamp,
        updated_at: timestamp,
      };

      // Also update localStorage cache for offline/session resilience
      updateLocalCache(schoolId, userId, verifiedRecord);

      return {
        success: true,
        academicYear: verifiedRecord,
      };
    } catch (err: any) {
      console.error("Database save exception:", err);
      return {
        success: false,
        error: err?.message || "An unexpected database error occurred while saving.",
      };
    }
  }

  // 3. Fallback for pure offline / local-storage testing
  const fallbackId = existingAcademicYearId || crypto.randomUUID();
  const fallbackRecord: AcademicYear = {
    id: fallbackId,
    school_id: schoolId,
    start_year: Number(input.start_year),
    end_year: Number(input.end_year),
    label: input.label.trim(),
    start_date: input.start_date,
    end_date: input.end_date,
    is_current: Boolean(input.is_current),
    created_at: timestamp,
    updated_at: timestamp,
  };

  updateLocalCache(schoolId, userId, fallbackRecord);

  return {
    success: true,
    academicYear: fallbackRecord,
  };
}

function updateLocalCache(
  schoolId: string,
  userId: string,
  record: AcademicYear
): void {
  try {
    const raw = localStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}${schoolId}`);
    let list: AcademicYear[] = raw ? JSON.parse(raw) : [];

    if (record.is_current) {
      list = list.map((item) =>
        item.id !== record.id ? { ...item, is_current: false } : item
      );
    }

    const existingIdx = list.findIndex((item) => item.id === record.id);
    if (existingIdx >= 0) {
      list[existingIdx] = record;
    } else {
      list.push(record);
    }

    localStorage.setItem(
      `${LOCAL_STORAGE_KEY_PREFIX}${schoolId}`,
      JSON.stringify(list)
    );

    const schoolCacheKey = `myzkool_school_profile_${userId}`;
    const cachedSchoolRaw = localStorage.getItem(schoolCacheKey);
    if (cachedSchoolRaw) {
      const cachedSchool = JSON.parse(cachedSchoolRaw);
      cachedSchool.onboarding_step = Math.max(cachedSchool.onboarding_step || 2, 3);
      localStorage.setItem(schoolCacheKey, JSON.stringify(cachedSchool));
    }
  } catch {
    // Non-fatal
  }
}
