/**
 * School Service Layer
 * 
 * Handles:
 * - Subdomain normalization and validation
 * - Real-time uniqueness checks against Supabase
 * - School profile creation and association with the authenticated School Admin
 * - Onboarding step progression and state persistence
 * - Fallback local storage for offline / preview resilience
 */

import { supabase, isSupabaseConfigured } from "../lib/supabase";
import type {
  School,
  SchoolProfileInput,
  SubdomainCheckResult,
} from "../types/school";

// Reserved subdomains that cannot be claimed by schools
export const RESERVED_SUBDOMAINS = new Set([
  "www",
  "admin",
  "api",
  "app",
  "login",
  "register",
  "signup",
  "verify",
  "auth",
  "support",
  "help",
  "status",
  "portal",
  "mail",
  "myzkool",
  "dev",
  "staging",
  "demo",
  "test",
  "billing",
  "account",
  "dashboard",
  "root",
  "superadmin",
  "cdn",
  "assets",
  "static",
  "secure",
  "dns",
  "mx",
  "smtp",
  "imap",
  "ftp",
  "ssh",
  "webhook",
  "parent",
  "parents",
  "student",
  "students",
  "teacher",
  "teachers",
  "erp",
  "pay",
  "payment",
]);

const LOCAL_STORAGE_KEY_PREFIX = "myzkool_school_profile_";

/**
 * Normalizes school name into a valid, safe subdomain slug
 */
export function normalizeSubdomain(name: string): string {
  if (!name) return "";

  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .replace(/[^a-z0-9\s-]/g, "") // remove non-alphanumeric chars
    .trim()
    .replace(/\s+/g, "-") // spaces to hyphens
    .replace(/-+/g, "-") // collapse multiple hyphens
    .replace(/^-+|-+$/g, "") // trim hyphens from ends
    .slice(0, 48);
}

/**
 * Validates the syntactic and structural rules of a subdomain
 */
export function validateSubdomainFormat(subdomain: string): {
  isValid: boolean;
  error?: string;
} {
  const trimmed = subdomain.trim().toLowerCase();

  if (!trimmed) {
    return { isValid: false, error: "Subdomain cannot be empty." };
  }

  if (trimmed.length < 3) {
    return {
      isValid: false,
      error: "Subdomain must be at least 3 characters long.",
    };
  }

  if (trimmed.length > 48) {
    return {
      isValid: false,
      error: "Subdomain cannot exceed 48 characters.",
    };
  }

  if (RESERVED_SUBDOMAINS.has(trimmed)) {
    return {
      isValid: false,
      error: `'${trimmed}' is a reserved system address. Please pick another name.`,
    };
  }

  // Must start and end with alphanumeric, can have hyphens in between
  const regex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;
  if (!regex.test(trimmed)) {
    return {
      isValid: false,
      error:
        "Subdomain can only contain lowercase letters, numbers, and hyphens (cannot start or end with a hyphen).",
    };
  }

  return { isValid: true };
}

/**
 * Checks whether a subdomain is available in the system
 */
export async function checkSubdomainAvailability(
  rawSubdomain: string,
  currentSchoolId?: string | null
): Promise<SubdomainCheckResult> {
  const subdomain = rawSubdomain.trim().toLowerCase();

  // 1. Format check
  const formatValidation = validateSubdomainFormat(subdomain);
  if (!formatValidation.isValid) {
    const isReserved = RESERVED_SUBDOMAINS.has(subdomain);
    return {
      status: isReserved ? "reserved" : "invalid",
      isAvailable: false,
      message: formatValidation.error || "Invalid subdomain format.",
      subdomain,
    };
  }

  // 2. Query Supabase database
  if (isSupabaseConfigured) {
    try {
      const query = supabase
        .from("schools")
        .select("id, subdomain")
        .ilike("subdomain", subdomain);

      const { data, error } = await query;

      if (!error && data) {
        // If a match exists
        if (data.length > 0) {
          const match = data[0];
          // If the match belongs to the user's current school, it is allowed
          if (currentSchoolId && match.id === currentSchoolId) {
            return {
              status: "available",
              isAvailable: true,
              message: "This is your current school address ✓",
              subdomain,
            };
          }

          return {
            status: "taken",
            isAvailable: false,
            message: "This website address is already in use by another school.",
            subdomain,
          };
        }

        return {
          status: "available",
          isAvailable: true,
          message: "Website address is available ✓",
          subdomain,
        };
      }
    } catch {
      // Fallback to local check if table is not yet accessible
    }
  }

  // 3. Fallback check from localStorage records
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(LOCAL_STORAGE_KEY_PREFIX)) {
        const itemStr = localStorage.getItem(key);
        if (itemStr) {
          const stored = JSON.parse(itemStr) as School;
          if (
            stored.subdomain?.toLowerCase() === subdomain &&
            (!currentSchoolId || stored.id !== currentSchoolId)
          ) {
            return {
              status: "taken",
              isAvailable: false,
              message: "This website address is already in use.",
              subdomain,
            };
          }
        }
      }
    }
  } catch {
    // Ignore storage parse issues
  }

  return {
    status: "available",
    isAvailable: true,
    message: "Website address is available ✓",
    subdomain,
  };
}

/**
 * Loads the school record associated with the current user
 */
export async function getSchoolForCurrentUser(
  userId: string,
  schoolId?: string | null
): Promise<{ school: School | null; error?: string }> {
  if (!userId) {
    return { school: null, error: "Authentication required to fetch school." };
  }

  // 1. Try Supabase
  if (isSupabaseConfigured) {
    try {
      let query = supabase.from("schools").select("*");

      if (schoolId) {
        query = query.eq("id", schoolId);
      } else {
        query = query.eq("created_by", userId);
      }

      const { data, error } = await query.maybeSingle();

      if (!error && data) {
        return {
          school: {
            id: data.id,
            name: data.name,
            subdomain: data.subdomain,
            school_type: data.school_type,
            affiliation_board: data.affiliation_board,
            official_email: data.official_email,
            contact_phone: data.contact_phone,
            address: data.address,
            city: data.city,
            state: data.state,
            pin_code: data.pin_code,
            logo_url: data.logo_url,
            onboarding_completed: Boolean(data.onboarding_completed),
            onboarding_step: data.onboarding_step || 1,
            created_by: data.created_by,
            created_at: data.created_at,
            updated_at: data.updated_at,
          },
        };
      }
    } catch {
      // Table may not yet be available
    }
  }

  // 2. Local storage fallback
  try {
    const localData = localStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}${userId}`);
    if (localData) {
      const parsed = JSON.parse(localData) as School;
      return { school: parsed };
    }
  } catch {
    // Storage access error
  }

  return { school: null };
}

export interface SaveSchoolProfileParams {
  userId: string;
  userEmail: string;
  profileInput: SchoolProfileInput;
  existingSchoolId?: string | null;
}

/**
 * Saves or updates the School Profile
 * Ensures school_id association and progresses onboarding to Step 2
 */
export async function saveSchoolProfile({
  userId,
  userEmail: _userEmail,
  profileInput,
  existingSchoolId,
}: SaveSchoolProfileParams): Promise<{
  success: boolean;
  school?: School;
  error?: string;
}> {
  if (!userId) {
    return { success: false, error: "User is not authenticated." };
  }

  // 1. Field validations
  if (!profileInput.name?.trim()) {
    return { success: false, error: "Please enter your school name." };
  }
  if (!profileInput.subdomain?.trim()) {
    return { success: false, error: "Please configure a website address for your school." };
  }
  if (!profileInput.school_type) {
    return { success: false, error: "Please select your school type/level." };
  }
  if (!profileInput.official_email?.trim()) {
    return { success: false, error: "Please provide an official school email address." };
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(profileInput.official_email.trim())) {
    return { success: false, error: "Please enter a valid email address." };
  }
  if (!profileInput.contact_phone?.trim()) {
    return { success: false, error: "Please provide a contact phone number." };
  }
  if (!profileInput.address?.trim()) {
    return { success: false, error: "Please enter the school address." };
  }
  if (!profileInput.city?.trim()) {
    return { success: false, error: "Please enter the city." };
  }
  if (!profileInput.state?.trim()) {
    return { success: false, error: "Please select or enter the state." };
  }
  if (!profileInput.pin_code?.trim()) {
    return { success: false, error: "Please enter the postal PIN code." };
  }

  // 2. Subdomain check (server-side verification)
  const normalizedSubdomain = normalizeSubdomain(profileInput.subdomain);
  const availability = await checkSubdomainAvailability(
    normalizedSubdomain,
    existingSchoolId
  );

  if (!availability.isAvailable) {
    return { success: false, error: availability.message };
  }

  // 3. Resolve school_id: preserve existing or create new UUID
  const schoolId = existingSchoolId || crypto.randomUUID();
  const timestamp = new Date().toISOString();

  const schoolRecord: School = {
    id: schoolId,
    name: profileInput.name.trim(),
    subdomain: normalizedSubdomain,
    school_type: profileInput.school_type,
    affiliation_board: profileInput.affiliation_board || "cbse",
    official_email: profileInput.official_email.trim().toLowerCase(),
    contact_phone: profileInput.contact_phone.trim(),
    address: profileInput.address.trim(),
    city: profileInput.city.trim(),
    state: profileInput.state.trim(),
    pin_code: profileInput.pin_code.trim(),
    onboarding_completed: false,
    onboarding_step: 2, // Successfully completed Step 1, now on Step 2
    created_by: userId,
    created_at: timestamp,
    updated_at: timestamp,
  };

  // 4. Persist to Supabase
  if (isSupabaseConfigured) {
    try {
      // Upsert into schools table
      const { error: schoolError } = await supabase.from("schools").upsert({
        id: schoolRecord.id,
        name: schoolRecord.name,
        subdomain: schoolRecord.subdomain,
        school_type: schoolRecord.school_type,
        affiliation_board: schoolRecord.affiliation_board,
        official_email: schoolRecord.official_email,
        contact_phone: schoolRecord.contact_phone,
        address: schoolRecord.address,
        city: schoolRecord.city,
        state: schoolRecord.state,
        pin_code: schoolRecord.pin_code,
        onboarding_completed: false,
        onboarding_step: 2,
        created_by: userId,
        updated_at: timestamp,
      });

      if (schoolError) {
        console.warn("Supabase school upsert error:", schoolError.message);
        // If unique constraint violation on subdomain
        if (schoolError.code === "23505") {
          return {
            success: false,
            error: "This website address is already registered. Please choose another.",
          };
        }
      }

      // Upsert into profiles table
      try {
        await supabase.from("profiles").upsert({
          auth_id: userId,
          school_id: schoolRecord.id,
          onboarding_completed: false,
          current_onboarding_step: "/onboarding/academics",
          updated_at: timestamp,
        });
      } catch {
        // Table might not exist yet
      }

      // Update auth user metadata so session has the link immediately
      try {
        await supabase.auth.updateUser({
          data: {
            school_id: schoolRecord.id,
            onboarding_step: 2,
            current_onboarding_step: "/onboarding/academics",
            onboarding_completed: false,
          },
        });
      } catch {
        // Safe fallback
      }
    } catch (dbErr) {
      console.warn("Database save exception:", dbErr);
    }
  }

  // 5. Always persist to localStorage cache for the user for instant resume & offline safety
  try {
    localStorage.setItem(
      `${LOCAL_STORAGE_KEY_PREFIX}${userId}`,
      JSON.stringify(schoolRecord)
    );
  } catch {
    // Non-fatal
  }

  return {
    success: true,
    school: schoolRecord,
  };
}

/**
 * Marks onboarding as 100% complete for the school and admin user.
 * Enables direct access to /admin workspace.
 */
export async function completeOnboarding({
  schoolId,
  userId,
}: {
  schoolId: string;
  userId: string;
}): Promise<{
  success: boolean;
  school?: School;
  error?: string;
}> {
  if (!schoolId || !userId) {
    return {
      success: false,
      error: "school_id and user_id are required to complete onboarding.",
    };
  }

  const timestamp = new Date().toISOString();

  // 1. Supabase update
  if (isSupabaseConfigured) {
    try {
      await supabase
        .from("schools")
        .update({
          onboarding_completed: true,
          onboarding_step: 8,
          updated_at: timestamp,
        })
        .eq("id", schoolId);

      await supabase
        .from("profiles")
        .update({
          onboarding_completed: true,
          current_onboarding_step: "/admin",
          updated_at: timestamp,
        })
        .eq("auth_id", userId);

      await supabase.auth.updateUser({
        data: {
          onboarding_completed: true,
          onboarding_step: 8,
          current_onboarding_step: "/admin",
        },
      });
    } catch (err) {
      console.warn("Supabase completeOnboarding update error:", err);
    }
  }

  // 2. Local storage cache update
  let updatedSchool: School | undefined;
  try {
    const schoolKey = `${LOCAL_STORAGE_KEY_PREFIX}${userId}`;
    const raw = localStorage.getItem(schoolKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      parsed.onboarding_completed = true;
      parsed.onboarding_step = 8;
      parsed.updated_at = timestamp;
      localStorage.setItem(schoolKey, JSON.stringify(parsed));
      updatedSchool = parsed;
    }
  } catch {
    // Non-fatal
  }

  return {
    success: true,
    school: updatedSchool,
  };
}
