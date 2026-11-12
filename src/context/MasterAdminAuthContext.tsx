import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import type {
  PlatformAdmin,
  PlatformRoleSlug,
  MasterAdminAuthState,
} from "../types/masterAdmin";

interface MasterAdminAuthContextType extends MasterAdminAuthState {
  token: string | null;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: PlatformRoleSlug | PlatformRoleSlug[]) => boolean;
  refreshAdmin: () => Promise<void>;
}

const MasterAdminAuthContext = createContext<MasterAdminAuthContextType | undefined>(undefined);

const MASTER_TOKEN_KEY = "myzkool_master_admin_token";

export const MasterAdminAuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [admin, setAdmin] = useState<PlatformAdmin | null>(null);
  const [token, setToken] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(MASTER_TOKEN_KEY);
    }
    return null;
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetches the current platform administrator details using the active token
   */
  const fetchAdminDetails = useCallback(async (authToken: string): Promise<PlatformAdmin | null> => {
    try {
      const res = await fetch("/api/master-admin/auth/me", {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to authenticate with platform control plane.");
      }

      const json = await res.json();
      if (json.success && json.data) {
        return json.data as PlatformAdmin;
      }
      return null;
    } catch (err: any) {
      console.warn("Master admin verification note:", err.message);
      return null;
    }
  }, []);

  /**
   * Verifies existing session on initial mount
   */
  useEffect(() => {
    let isMounted = true;

    async function initSession() {
      setLoading(true);
      setError(null);

      // Check remember me status
      const isRemembered =
        typeof window !== "undefined" &&
        localStorage.getItem("myzkool_master_remember_me") === "true";
      const isSessionActive =
        typeof window !== "undefined" &&
        sessionStorage.getItem("myzkool_master_session_active") === "true";

      // 1. Check existing stored token
      const storedToken = typeof window !== "undefined" ? localStorage.getItem(MASTER_TOKEN_KEY) : null;

      if (storedToken) {
        // If user restarted browser without Remember Me, clear stored token
        if (!isRemembered && !isSessionActive) {
          if (typeof window !== "undefined") {
            localStorage.removeItem(MASTER_TOKEN_KEY);
            localStorage.removeItem("myzkool_master_remember_me");
          }
          setAdmin(null);
          setToken(null);
          setLoading(false);
          return;
        }

        const resolved = await fetchAdminDetails(storedToken);
        if (isMounted) {
          if (resolved && resolved.is_active) {
            setAdmin(resolved);
            setToken(storedToken);
            if (typeof window !== "undefined") {
              sessionStorage.setItem("myzkool_master_session_active", "true");
            }
          } else {
            // Invalidate stale token
            if (typeof window !== "undefined") {
              localStorage.removeItem(MASTER_TOKEN_KEY);
              localStorage.removeItem("myzkool_master_remember_me");
              sessionStorage.removeItem("myzkool_master_session_active");
            }
            setAdmin(null);
            setToken(null);
          }
          setLoading(false);
          return;
        }
      }

      // 2. Check Supabase active session if configured
      if (isSupabaseConfigured) {
        try {
          const { data } = await supabase.auth.getSession();
          if (data.session?.access_token) {
            if (!isRemembered && !isSessionActive) {
              await supabase.auth.signOut().catch(() => {});
            } else {
              const resolved = await fetchAdminDetails(data.session.access_token);
              if (isMounted) {
                if (resolved && resolved.is_active) {
                  setAdmin(resolved);
                  setToken(data.session.access_token);
                  if (typeof window !== "undefined") {
                    localStorage.setItem(MASTER_TOKEN_KEY, data.session.access_token);
                    sessionStorage.setItem("myzkool_master_session_active", "true");
                  }
                }
              }
            }
          }
        } catch (err: any) {
          console.warn("Notice: checking Supabase session for master admin:", err.message);
        }
      }

      if (isMounted) {
        setLoading(false);
      }
    }

    initSession();

    return () => {
      isMounted = false;
    };
  }, [fetchAdminDetails]);

  /**
   * Signs in a Master Administrator via Supabase Auth + Platform Verification
   */
  const login = useCallback(
    async (email: string, password: string, rememberMe: boolean = false): Promise<{ success: boolean; error?: string }> => {
      setLoading(true);
      setError(null);

      try {
        let sessionToken: string | null = null;
        const cleanEmail = email.trim().toLowerCase();

        if (isSupabaseConfigured) {
          const { data, error: authError } = await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password,
          });

          if (authError || !data.session?.access_token) {
            const msg = authError?.message || "Invalid platform administrator credentials.";
            setError(msg);
            setLoading(false);
            return { success: false, error: msg };
          }

          sessionToken = data.session.access_token;
        } else {
          // Dev / local testing fallback
          sessionToken = `test-token-admin:${cleanEmail}`;
        }

        // Establish session with Express Master Admin backend
        const res = await fetch("/api/master-admin/auth/session", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${sessionToken}`,
            "Content-Type": "application/json",
          },
        });

        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json.success) {
          const errMsg = json.error || "Access denied: User is not authorized as a Platform Administrator.";
          setError(errMsg);
          setLoading(false);
          if (isSupabaseConfigured) {
            await supabase.auth.signOut().catch(() => {});
          }
          return { success: false, error: errMsg };
        }

        const adminRecord = json.data as PlatformAdmin;
        setAdmin(adminRecord);
        setToken(sessionToken);
        if (typeof window !== "undefined") {
          localStorage.setItem(MASTER_TOKEN_KEY, sessionToken);
          sessionStorage.setItem("myzkool_master_session_active", "true");
          if (rememberMe) {
            localStorage.setItem("myzkool_master_remember_me", "true");
            localStorage.setItem("myzkool_master_remembered_email", cleanEmail);
          } else {
            localStorage.removeItem("myzkool_master_remember_me");
          }
        }
        setLoading(false);
        return { success: true };
      } catch (err: any) {
        const errMsg = err.message || "An unexpected error occurred during platform login.";
        setError(errMsg);
        setLoading(false);
        return { success: false, error: errMsg };
      }
    },
    []
  );

  /**
   * Logs out the Master Administrator
   */
  const logout = useCallback(async () => {
    if (token) {
      await fetch("/api/master-admin/auth/logout", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }).catch(() => {});
    }

    if (isSupabaseConfigured) {
      await supabase.auth.signOut().catch(() => {});
    }

    if (typeof window !== "undefined") {
      localStorage.removeItem(MASTER_TOKEN_KEY);
      localStorage.removeItem("myzkool_master_remember_me");
      sessionStorage.removeItem("myzkool_master_session_active");
    }

    setAdmin(null);
    setToken(null);
    setError(null);
  }, [token]);

  /**
   * Refreshes the active platform administrator record
   */
  const refreshAdmin = useCallback(async () => {
    if (!token) return;
    const resolved = await fetchAdminDetails(token);
    if (resolved && resolved.is_active) {
      setAdmin(resolved);
    }
  }, [token, fetchAdminDetails]);

  /**
   * Permission inspection helper
   */
  const hasPermission = useCallback(
    (requiredPermission: string): boolean => {
      if (!admin) return false;
      const userPerms = admin.permissions || [];
      if (userPerms.includes("*") || admin.role?.slug === "super_admin") return true;

      const [moduleName] = requiredPermission.split(".");
      return userPerms.includes(requiredPermission) || userPerms.includes(`${moduleName}.*`);
    },
    [admin]
  );

  /**
   * Role inspection helper
   */
  const hasRole = useCallback(
    (roles: PlatformRoleSlug | PlatformRoleSlug[]): boolean => {
      if (!admin || !admin.role) return false;
      const targetRoles = Array.isArray(roles) ? roles : [roles];
      return targetRoles.includes(admin.role.slug);
    },
    [admin]
  );

  const contextValue = useMemo<MasterAdminAuthContextType>(
    () => ({
      admin,
      role: admin?.role?.slug || null,
      permissions: admin?.permissions || [],
      isAuthenticated: Boolean(admin && admin.is_active),
      loading,
      error,
      token,
      login,
      logout,
      hasPermission,
      hasRole,
      refreshAdmin,
    }),
    [admin, loading, error, token, login, logout, hasPermission, hasRole, refreshAdmin]
  );

  return (
    <MasterAdminAuthContext.Provider value={contextValue}>
      {children}
    </MasterAdminAuthContext.Provider>
  );
};

export function useMasterAdminAuth(): MasterAdminAuthContextType {
  const context = useContext(MasterAdminAuthContext);
  if (!context) {
    throw new Error("useMasterAdminAuth must be used within a MasterAdminAuthProvider");
  }
  return context;
}

