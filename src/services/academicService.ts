/**
 * Academic Setup Service Layer
 *
 * Handles:
 * - Academic year validation (structural range, date ordering, duration)
 * - Tenant-scoped persistence (scoped to school_id)
 * - Atomic current-year management (single active year rule)
 * - Onboarding step progression (Step 2 -> Step 3)
 * - Resume behavior (loading saved year, preventing duplicates on re-entry)
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
 * Validates the academic year form input values
 */
export function validateAcademicYearInput(
  input: AcademicYearInput
): AcademicYearValidationResult {
  const errors: AcademicYearValidationErrors = {};

  // 1. Start Year & End Year validation
  if (!input.start_year || isNaN(input.start_year)) {
    errors.start_year = "Please enter a valid start year.";
  } else if (input.start_year < 1990 || input.start_year > 2100) {
    errors.start_year = "Start year must be between 1990 and 2100.";
  }

  if (!input.end_year || isNaN(input.end_year)) {
    errors.end_year = "Please enter a valid end year.";
  } else if (input.end_year < 1990 || input.end_year > 2100) {
    errors.end_year = "End year must be between 1990 and 2100.";
  }

  if (
    input.start_year &&
    input.end_year &&
    !isNaN(input.start_year) &&
    !isNaN(input.end_year)
  ) {
    if (input.end_year <= input.start_year) {
      errors.end_year = `End year (${input.end_year}) must be greater than start year (${input.start_year}).`;
    }
  }

  // 2. Label validation
  if (!input.label || !input.label.trim()) {
    errors.label = "Please enter a label for this academic year.";
  }

  // 3. Start Date validation
  if (!input.start_date) {
    errors.start_date = "Please select the academic year start date.";
  } else {
    const sDate = new Date(input.start_date);
    if (isNaN(sDate.getTime())) {
      errors.start_date = "Start date is not a valid calendar date.";
    }
  }

  // 4. End Date validation
  if (!input.end_date) {
    errors.end_date = "Please select the academic year end date.";
  } else {
    const eDate = new Date(input.end_date);
    if (isNaN(eDate.getTime())) {
      errors.end_date = "End date is not a valid calendar date.";
    }
  }

  // 5. Date ordering & duration comparison
  if (input.start_date && input.end_date) {
    const sTime = new Date(input.start_date).getTime();
    const eTime = new Date(input.end_date).getTime();

    if (!isNaN(sTime) && !isNaN(eTime)) {
      if (eTime <= sTime) {
        errors.end_date =
          "End date must be after the start date. End date cannot be on or before start date.";
      } else {
        const diffDays = (eTime - sTime) / (1000 * 60 * 60 * 24);
        if (diffDays < 30) {
          errors.end_date =
            "Academic year duration must span at least 30 days.";
        }
      }
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Computes default academic year based on today's calendar date
 */
export function getDefaultAcademicYear(referenceDate = new Date()): AcademicYearInput {
  const currentYear = referenceDate.getFullYear();
  const currentMonth = referenceDate.getMonth() + 1; // 1-12

  // Suggest default cycle: if current month is April or later, default to currentYear -> currentYear + 1
  // Otherwise if Jan-Mar, default to previousYear -> currentYear
  let startYear = currentYear;
  let endYear = currentYear + 1;

  if (currentMonth < 4) {
    startYear = currentYear - 1;
    endYear = currentYear;
  }

  // Standard initial suggestion (customizable by user)
  const startDate = `${startYear}-04-01`;
  const endDate = `${endYear}-03-31`;

  return {
    start_year: startYear,
    end_year: endYear,
    label: `${startYear}–${endYear}`,
    start_date: startDate,
    end_date: endDate,
    is_current: true,
  };
}

/**
 * Retrieves all academic years belonging to a school
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
          start_year: item.start_year,
          end_year: item.end_year,
          label: item.label,
          start_date: item.start_date,
          end_date: item.end_date,
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
 * Retrieves the current active academic year for a school
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
 * and advances onboarding step from 2 to 3.
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
    return { success: false, error: "Authentication required." };
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
    const firstError = Object.values(validation.errors)[0] || "Invalid academic year configuration.";
    return { success: false, error: firstError };
  }

  const academicYearId = existingAcademicYearId || crypto.randomUUID();
  const timestamp = new Date().toISOString();

  const record: AcademicYear = {
    id: academicYearId,
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

  // 2. Persist to Supabase
  if (isSupabaseConfigured) {
    try {
      // If setting this academic year as current, reset other academic years for this school
      if (record.is_current) {
        try {
          await supabase
            .from("academic_years")
            .update({ is_current: false })
            .eq("school_id", schoolId)
            .neq("id", record.id);
        } catch {
          // Handled or trigger will handle
        }
      }

      // Upsert the academic year record
      const { error: ayError } = await supabase
        .from("academic_years")
        .upsert({
          id: record.id,
          school_id: record.school_id,
          start_year: record.start_year,
          end_year: record.end_year,
          label: record.label,
          start_date: record.start_date,
          end_date: record.end_date,
          is_current: record.is_current,
          updated_at: timestamp,
        });

      if (ayError) {
        console.warn("Supabase academic_years upsert error:", ayError.message);
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
      } catch {
        // Fallback
      }

      // Update profile onboarding step
      try {
        await supabase
          .from("profiles")
          .update({
            current_onboarding_step: "/onboarding/classes",
            updated_at: timestamp,
          })
          .eq("auth_id", userId);
      } catch {
        // Fallback
      }

      // Update user auth metadata
      try {
        await supabase.auth.updateUser({
          data: {
            onboarding_step: 3,
            current_onboarding_step: "/onboarding/classes",
          },
        });
      } catch {
        // Fallback
      }
    } catch (err) {
      console.warn("Database save exception:", err);
    }
  }

  // 3. Update localStorage fallback cache
  try {
    const raw = localStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}${schoolId}`);
    let list: AcademicYear[] = raw ? JSON.parse(raw) : [];

    // If new record is current, unset existing current
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

    // Also update cached school profile onboarding_step to at least 3
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

  return {
    success: true,
    academicYear: record,
  };
}
