/**
 * Parent Authentication Architecture & Service
 * 
 * SECURITY MANDATES:
 * 1. Parents NEVER log in through the central School Admin portal (/login).
 * 2. Parent authentication occurs strictly via individual school tenant websites
 *    (e.g., https://greenwood.myzkool.in/parent-login or subdomain router).
 * 3. Client-side queries MUST NEVER search the `students` table directly using
 *    Class + Roll Number + Date of Birth, as that exposes student directory data.
 * 4. Verification is delegated entirely to a secure Supabase Edge Function ('parent-auth')
 *    with server-side tenant checks, IP rate limiting, timing-safe credential comparisons,
 *    and cryptographically signed, short-lived parent session tokens.
 */

import { supabase, isSupabaseConfigured } from "../lib/supabase";

export interface ParentStudentCredentials {
  /** The tenant identifier of the school (e.g., 'dps-delhi' or UUID) */
  schoolSlug: string;
  /** Class or Grade (e.g., 'Grade 8', 'Class 10') */
  classGrade: string;
  /** Section identifier (e.g., 'A', 'B') */
  section?: string;
  /** Unique student roll number within class/section */
  rollNumber: string;
  /** Student Date of Birth in ISO YYYY-MM-DD format */
  dateOfBirth: string;
}

export interface ParentStudentSummary {
  studentId: string;
  studentName: string;
  classGrade: string;
  section?: string;
  rollNumber: string;
  schoolId: string;
  schoolName: string;
  academicYear: string;
}

export interface ParentAuthResult {
  success: boolean;
  token?: string;
  expiresAt?: string;
  student?: ParentStudentSummary;
  error?: string;
}

/**
 * Authenticates a parent against their school's tenant instance.
 * Dispatches a payload to the secure Supabase Edge Function 'parent-auth'.
 */
export async function authenticateParentViaSchoolTenant(
  credentials: ParentStudentCredentials
): Promise<ParentAuthResult> {
  // 1. Client-side sanity checks
  if (!credentials.schoolSlug?.trim()) {
    return { success: false, error: "School identifier is missing or invalid." };
  }
  if (!credentials.classGrade?.trim() || !credentials.rollNumber?.trim() || !credentials.dateOfBirth?.trim()) {
    return { success: false, error: "Please enter Class, Roll Number, and Date of Birth." };
  }

  // 2. In local/preview environments without deployed Edge Functions
  if (!isSupabaseConfigured) {
    return {
      success: false,
      error: "Supabase environment variables are not configured for parent authentication.",
    };
  }

  try {
    // 3. Delegate to server-side Edge Function to enforce tenant boundaries & rate limits
    const { data, error } = await supabase.functions.invoke<ParentAuthResult>("parent-auth", {
      body: {
        school_slug: credentials.schoolSlug.trim().toLowerCase(),
        class_grade: credentials.classGrade.trim(),
        section: credentials.section?.trim() || null,
        roll_number: credentials.rollNumber.trim(),
        date_of_birth: credentials.dateOfBirth.trim(),
      },
    });

    if (error) {
      return {
        success: false,
        error: error.message || "Failed to authenticate with school portal. Please verify your details.",
      };
    }

    if (!data?.success) {
      return {
        success: false,
        error: data?.error || "Invalid student credentials for this school.",
      };
    }

    return {
      success: true,
      token: data.token,
      expiresAt: data.expiresAt,
      student: data.student,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "An unexpected error occurred during parent verification.",
    };
  }
}
