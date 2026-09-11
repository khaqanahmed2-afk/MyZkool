import type { User, Session } from "@supabase/supabase-js";

/**
 * MyZkool Application Roles
 * Note: parent authentication is architecturally segregated and handled
 * through tenant-scoped school portals via server-side Edge Functions.
 */
export type UserRole =
  | "super_admin"
  | "school_admin"
  | "teacher"
  | "accountant"
  | "parent";

/**
 * Application-level user profile
 * Kept in application database with tenant-scoped RLS
 */
export interface UserProfile {
  id: string;
  auth_id: string;
  email: string;
  full_name: string;
  role: UserRole;
  school_id: string | null;
  phone?: string;
  onboarding_completed: boolean;
  current_onboarding_step?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Global authentication state contract
 */
export interface AuthState {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  role: UserRole | null;
  schoolId: string | null;
  loading: boolean;
  isAuthenticated: boolean;
}

/**
 * Auth result responses for operations
 */
export interface AuthActionResult {
  success: boolean;
  error?: string;
  needsEmailVerification?: boolean;
}
