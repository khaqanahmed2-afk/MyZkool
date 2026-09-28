/**
 * Authentication & School Context Middleware
 * Enforces strict multi-tenant data isolation at the backend boundary.
 * 
 * Rules:
 * 1. Resolves school_id ONLY from the authenticated session/JWT or user profile.
 * 2. Never trusts req.body, req.params, or req.query for tenant scoping.
 * 3. Never trusts unauthenticated headers like x-school-id.
 * 4. If an authenticated user attempts to pass a differing school_id in headers or body,
 *    it rejects with 403 Forbidden (cross-tenant access attempt).
 */

import type { Request, Response, NextFunction } from "express";
import { supabase, isSupabaseConfigured } from "../lib/supabase";

export interface AuthenticatedUser {
  id: string;
  email?: string;
  role?: string;
  school_id: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      schoolId?: string;
      userRole?: string;
      userPermissions?: string[];
      schoolPlan?: any;
    }
  }
}

/**
 * Middleware: requireSchoolContext
 * Resolves school_id once per request from the verified session/profile and attaches it to req.
 */
export async function requireSchoolContext(req: Request, res: Response, next: NextFunction) {
  try {
    // 1. Check if schoolId / user was already securely attached (e.g. by test runner or internal upstream)
    if (req.schoolId && req.user?.school_id) {
      // Verify no cross-tenant mismatch with header
      const headerSchoolId = req.headers["x-school-id"] as string | undefined;
      if (headerSchoolId && headerSchoolId !== req.schoolId) {
        return res.status(403).json({
          code: "CROSS_TENANT_FORBIDDEN",
          error: "Cross-tenant access denied: request header school does not match authenticated school.",
        });
      }
      return next();
    }

    // 2. Extract Authorization Bearer token
    const authHeader = req.headers.authorization || (req.headers.Authorization as string);
    let token: string | null = null;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.slice(7).trim();
    }

    // 3. Fallback for test environments without real Supabase connection
    const isTestEnv = process.env.NODE_ENV === "test" || !isSupabaseConfigured;
    if (!token && isTestEnv) {
      // In test mode, if schoolId was directly injected on req or test auth header present
      const testSchoolId = (req as any).schoolId || (req as any).testSchoolId;
      if (testSchoolId) {
        req.schoolId = testSchoolId;
        req.user = {
          id: (req as any).testUserId || "test-user-id",
          role: (req as any).testUserRole || "school_admin",
          school_id: testSchoolId,
        };
        req.userRole = req.user.role;
        return next();
      }

      // If test explicitly provides mock user in req
      if ((req as any).user?.school_id) {
        req.schoolId = (req as any).user.school_id;
        req.userRole = (req as any).user.role || "school_admin";
        return next();
      }

      // If unauthenticated header was sent in test mode, check if explicitly allowed
      // Otherwise reject
      return res.status(401).json({
        code: "UNAUTHORIZED",
        error: "Authentication token required. Unauthenticated requests cannot access tenant data.",
      });
    }

    if (!token) {
      return res.status(401).json({
        code: "UNAUTHORIZED",
        error: "Missing Authorization Bearer token.",
      });
    }

    // 4. Verify token with Supabase Auth
    const { data: authData, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !authData?.user) {
      return res.status(401).json({
        code: "INVALID_TOKEN",
        error: "Invalid or expired session token.",
      });
    }

    const authUser = authData.user;

    // 5. Resolve user's profile and confirmed school_id from PostgreSQL
    let schoolId: string | null = null;
    let userRole = "school_admin";

    // Attempt lookup from profiles table
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, school_id, role, full_name, email")
      .eq("auth_id", authUser.id)
      .maybeSingle();

    if (profile?.school_id) {
      schoolId = profile.school_id;
      userRole = profile.role || userRole;
    } else {
      // Fallback: Check if user is the creator of a school
      const { data: school } = await supabase
        .from("schools")
        .select("id")
        .eq("created_by", authUser.id)
        .maybeSingle();

      if (school?.id) {
        schoolId = school.id;
      }
    }

    // Also check JWT user_metadata as last fallback if profile row not yet created
    if (!schoolId && authUser.user_metadata?.school_id) {
      schoolId = authUser.user_metadata.school_id;
    }

    if (!schoolId) {
      return res.status(403).json({
        code: "NO_SCHOOL_CONTEXT",
        error: "User is not associated with an active school tenant.",
      });
    }

    // 6. Cross-tenant check: if client passed x-school-id or body.school_id, verify it matches
    const clientHeaderSchoolId = req.headers["x-school-id"] as string | undefined;
    if (clientHeaderSchoolId && clientHeaderSchoolId !== schoolId) {
      return res.status(403).json({
        code: "CROSS_TENANT_FORBIDDEN",
        error: "Cross-tenant access denied: specified school does not match authenticated tenant.",
      });
    }

    if (req.body && req.body.school_id && req.body.school_id !== schoolId) {
      return res.status(403).json({
        code: "CROSS_TENANT_FORBIDDEN",
        error: "Cross-tenant access denied: body school_id does not match authenticated tenant.",
      });
    }

    // 7. Attach verified context to request
    req.user = {
      id: authUser.id,
      email: authUser.email,
      role: userRole,
      school_id: schoolId,
    };
    req.schoolId = schoolId;
    req.userRole = userRole;

    next();
  } catch (error: any) {
    console.error("requireSchoolContext error:", error);
    return res.status(500).json({
      code: "INTERNAL_ERROR",
      error: "Failed to authenticate request context.",
    });
  }
}
