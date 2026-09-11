import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  useCallback,
} from "react";
import type { User, Session, AuthError } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import type { UserRole, UserProfile, AuthActionResult } from "../types/auth";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  role: UserRole | null;
  schoolId: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<AuthActionResult>;
  signUp: (
    email: string,
    password: string,
    fullName: string,
  ) => Promise<AuthActionResult>;
  signInWithGoogle: () => Promise<AuthActionResult>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<AuthActionResult>;
  updatePassword: (newPassword: string) => Promise<AuthActionResult>;
  resendVerificationEmail: (email: string) => Promise<AuthActionResult>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Maps raw Supabase error messages to clear, safe, user-friendly copy
 * without leaking sensitive database internals or server stacks.
 */
function sanitizeAuthError(err: any): string {
  if (!err) return "An unexpected error occurred. Please try again.";
  const msg: string = (err.message || String(err)).toLowerCase();

  if (
    msg.includes("invalid login credentials") ||
    msg.includes("invalid_grant")
  ) {
    return "Invalid email address or password. Please verify your credentials.";
  }
  if (msg.includes("email not confirmed") || msg.includes("unverified")) {
    return "Your email address has not been verified yet. Please check your inbox for the confirmation link.";
  }
  if (
    msg.includes("user already registered") ||
    msg.includes("already exists")
  ) {
    return "An account with this email address already exists. Please sign in instead.";
  }
  if (msg.includes("password should be at least")) {
    return "Password must be at least 6 characters long.";
  }
  if (msg.includes("rate limit") || msg.includes("too many requests")) {
    return "Too many requests. Please wait a few moments before trying again.";
  }
  if (msg.includes("network") || msg.includes("fetch")) {
    return "Network connection error. Please check your internet connection.";
  }
  return err.message || "Authentication failed. Please check your inputs.";
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  /**
   * Resolves the application-level user profile.
   * If a Supabase `profiles` table is present, it fetches the server-enforced record.
   * Otherwise, it constructs a safe profile from validated Supabase user metadata.
   * NOTE: super_admin role can NEVER be assigned through client metadata.
   */
  const resolveUserProfile = useCallback(
    async (authUser: User): Promise<UserProfile> => {
      try {
        if (isSupabaseConfigured) {
          // Attempt query from application profiles table if available
          const { data: dbProfile, error } = await supabase
            .from("profiles")
            .select("*")
            .eq("auth_id", authUser.id)
            .maybeSingle();

          if (!error && dbProfile) {
            return {
              id: dbProfile.id,
              auth_id: dbProfile.auth_id,
              email: dbProfile.email || authUser.email || "",
              full_name:
                dbProfile.full_name ||
                authUser.user_metadata?.full_name ||
                "School Administrator",
              role: dbProfile.role as UserRole,
              school_id: dbProfile.school_id || null,
              phone: dbProfile.phone,
              onboarding_completed: Boolean(dbProfile.onboarding_completed),
              current_onboarding_step:
                dbProfile.current_onboarding_step || "/onboarding/school",
              created_at: dbProfile.created_at,
            };
          }
        }
      } catch {
        // Table may not yet be provisioned in this foundational phase
      }

      // Default safe fallback from Supabase user metadata
      // Ensure that super_admin cannot be assigned through user metadata tampering
      let assignedRole: UserRole =
        (authUser.user_metadata?.role as UserRole) || "school_admin";
      if (assignedRole === "super_admin") {
        assignedRole = "school_admin";
      }

      return {
        id: authUser.id,
        auth_id: authUser.id,
        email: authUser.email || "",
        full_name:
          authUser.user_metadata?.full_name ||
          authUser.email?.split("@")[0] ||
          "School Administrator",
        role: assignedRole,
        school_id: authUser.user_metadata?.school_id || null,
        onboarding_completed: Boolean(
          authUser.user_metadata?.onboarding_completed,
        ),
        current_onboarding_step:
          authUser.user_metadata?.current_onboarding_step ||
          "/onboarding/school",
        created_at: authUser.created_at,
      };
    },
    [],
  );

  // Initialize and listen to Supabase Auth state
  useEffect(() => {
    let isMounted = true;

    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    async function initializeAuth() {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.warn(
            "Could not retrieve initial Supabase session:",
            error.message,
          );
        }
        if (isMounted) {
          if (data?.session?.user) {
            setSession(data.session);
            setUser(data.session.user);
            const userProfile = await resolveUserProfile(data.session.user);
            if (isMounted) setProfile(userProfile);
          } else {
            setSession(null);
            setUser(null);
            setProfile(null);
          }
        }
      } catch (err) {
        console.warn("Failed to initialize auth session:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    initializeAuth();

    // Subscribe to auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!isMounted) return;

      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (newSession?.user) {
        const userProfile = await resolveUserProfile(newSession.user);
        if (isMounted) setProfile(userProfile);
      } else {
        setProfile(null);
      }

      setLoading(false);
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, [resolveUserProfile]);

  const signIn = async (
    email: string,
    password: string,
  ): Promise<AuthActionResult> => {
    if (!isSupabaseConfigured) {
      return {
        success: false,
        error:
          "Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.",
      };
    }

    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        return { success: false, error: sanitizeAuthError(error) };
      }

      if (data.user) {
        setUser(data.user);
        setSession(data.session);
        const resolved = await resolveUserProfile(data.user);
        setProfile(resolved);
      }

      return { success: true };
    } catch (err) {
      return { success: false, error: sanitizeAuthError(err) };
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
  ): Promise<AuthActionResult> => {
    if (!isSupabaseConfigured) {
      return {
        success: false,
        error:
          "Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.",
      };
    }

    try {
      setLoading(true);
      const siteUrl = window.location.origin;
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            role: "school_admin",
            onboarding_completed: false,
            current_onboarding_step: "/onboarding/school",
          },
          emailRedirectTo: `${siteUrl}/verify`,
        },
      });

      if (error) {
        return { success: false, error: sanitizeAuthError(error) };
      }

      // If user is returned and identities are empty or user has not confirmed email
      const needsEmailVerification = !data.session && Boolean(data.user);

      if (data.user && data.session) {
        setUser(data.user);
        setSession(data.session);
        const resolved = await resolveUserProfile(data.user);
        setProfile(resolved);
      }

      return {
        success: true,
        needsEmailVerification,
      };
    } catch (err) {
      return { success: false, error: sanitizeAuthError(err) };
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async (): Promise<AuthActionResult> => {
    if (!isSupabaseConfigured) {
      return {
        success: false,
        error:
          "Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.",
      };
    }

    // In the AI Studio preview environment, Google Sign-In is blocked in iframes due to
    // Google's X-Frame-Options: DENY policy. We instruct the user to open the app in a new tab first.
    if (window !== window.top) {
      return {
        success: false,
        error:
          "Google Sign-In is blocked inside this preview frame. Please click the 'Open in new tab' button at the top right of this preview window to use Google Sign-In.",
      };
    }

    try {
      setLoading(true);
      const redirectUrl = `${window.location.origin}/login`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      if (error) {
        return { success: false, error: sanitizeAuthError(error) };
      }

      return { success: true };
    } catch (err) {
      return { success: false, error: sanitizeAuthError(err) };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async (): Promise<void> => {
    if (isSupabaseConfigured) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.error("Error during Supabase sign-out:", err);
      }
    }
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  const resetPassword = async (email: string): Promise<AuthActionResult> => {
    if (!isSupabaseConfigured) {
      return {
        success: false,
        error: "Supabase is not configured.",
      };
    }

    try {
      const redirectUrl = `${window.location.origin}/reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        {
          redirectTo: redirectUrl,
        },
      );

      if (error) {
        return { success: false, error: sanitizeAuthError(error) };
      }

      return { success: true };
    } catch (err) {
      return { success: false, error: sanitizeAuthError(err) };
    }
  };

  const updatePassword = async (
    newPassword: string,
  ): Promise<AuthActionResult> => {
    if (!isSupabaseConfigured) {
      return { success: false, error: "Supabase is not configured." };
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        return { success: false, error: sanitizeAuthError(error) };
      }

      return { success: true };
    } catch (err) {
      return { success: false, error: sanitizeAuthError(err) };
    }
  };

  const resendVerificationEmail = async (
    email: string,
  ): Promise<AuthActionResult> => {
    if (!isSupabaseConfigured) {
      return { success: false, error: "Supabase is not configured." };
    }

    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email.trim().toLowerCase(),
        options: {
          emailRedirectTo: `${window.location.origin}/verify`,
        },
      });

      if (error) {
        return { success: false, error: sanitizeAuthError(error) };
      }

      return { success: true };
    } catch (err) {
      return { success: false, error: sanitizeAuthError(err) };
    }
  };

  const refreshSession = async (): Promise<void> => {
    if (!isSupabaseConfigured) return;
    try {
      const { data } = await supabase.auth.refreshSession();
      if (data.session?.user) {
        setSession(data.session);
        setUser(data.session.user);
        const resolved = await resolveUserProfile(data.session.user);
        setProfile(resolved);
      }
    } catch (err) {
      console.warn("Failed to refresh session:", err);
    }
  };

  const value = useMemo(
    () => ({
      user,
      session,
      profile,
      role: profile?.role ?? null,
      schoolId: profile?.school_id ?? null,
      loading,
      isAuthenticated: Boolean(user && session),
      signIn,
      signUp,
      signInWithGoogle,
      signOut,
      resetPassword,
      updatePassword,
      resendVerificationEmail,
      refreshSession,
    }),
    [user, session, profile, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
