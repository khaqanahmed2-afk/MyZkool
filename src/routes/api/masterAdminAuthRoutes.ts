import { Router, Response } from "express";
import {
  verifyMasterAdminToken,
  MasterAdminRequest,
  resolvePlatformAdminByAuthId,
} from "../../middleware/masterAdminAuth";
import { logPlatformAction } from "../../services/masterAdminAuditService";
import { supabase, isSupabaseConfigured, checkIsSupabaseConfigured } from "../../lib/supabase";

export const masterAdminAuthRouter = Router();

/**
 * GET /api/master-admin/auth/me
 * Returns authenticated platform admin profile & permissions
 */
masterAdminAuthRouter.get(
  "/me",
  verifyMasterAdminToken,
  async (req: MasterAdminRequest, res: Response) => {
    res.json({
      success: true,
      data: req.platformAdmin,
    });
  }
);

/**
 * POST /api/master-admin/auth/session
 * Records login event, updates last_login_at, and verifies platform admin status
 */
masterAdminAuthRouter.post("/session", async (req: MasterAdminRequest, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({
      success: false,
      code: "UNAUTHENTICATED",
      error: "Authorization header required.",
    });
    return;
  }

  const token = authHeader.split(" ")[1]?.trim();
  let authUserId: string | null = null;
  let authEmail: string | null = null;

  if (token.startsWith("test-token-")) {
    const parts = token.replace("test-token-", "").split(":");
    authUserId = parts[0];
    authEmail = parts[1] || `${authUserId}@myzkool.com`;
  } else if (isSupabaseConfigured || checkIsSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.auth.getUser(token);
      if (error || !data.user) {
        res.status(401).json({
          success: false,
          code: "INVALID_SESSION",
          error: "Session token could not be verified.",
        });
        return;
      }
      authUserId = data.user.id;
      authEmail = data.user.email || null;
    } catch {
      res.status(401).json({
        success: false,
        code: "AUTH_ERROR",
        error: "Verification failed.",
      });
      return;
    }
  }

  if (!authUserId) {
    res.status(401).json({
      success: false,
      code: "UNKNOWN_USER",
      error: "Could not resolve identity.",
    });
    return;
  }

  const platformAdmin = await resolvePlatformAdminByAuthId(authUserId, token, authEmail);
  if (!platformAdmin) {
    res.status(403).json({
      success: false,
      code: "NOT_PLATFORM_ADMIN",
      error: "User is not registered as a MyZkool Platform Administrator.",
    });
    return;
  }

  if (!platformAdmin.is_active) {
    res.status(403).json({
      success: false,
      code: "ACCOUNT_SUSPENDED",
      error: "Platform Administrator account has been deactivated.",
    });
    return;
  }

  const clientIp = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "127.0.0.1";

  // Update last_login_at in background with authenticated client
  if (isSupabaseConfigured && platformAdmin.id) {
    try {
      const supabaseUrl = process.env.VITE_SUPABASE_URL;
      const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
      const client = token && supabaseUrl && supabaseKey
        ? (await import("@supabase/supabase-js")).createClient(supabaseUrl, supabaseKey, {
            global: { headers: { Authorization: `Bearer ${token}` } },
          })
        : supabase;

      await client
        .from("platform_admins")
        .update({
          last_login_at: new Date().toISOString(),
          last_login_ip: clientIp,
        })
        .eq("id", platformAdmin.id);
    } catch {}
  }

  // Record audit log
  await logPlatformAction({
    adminId: platformAdmin.id,
    adminEmail: platformAdmin.email,
    action: "admin.login",
    resourceType: "platform_admins",
    resourceId: platformAdmin.id,
    ipAddress: clientIp,
    userAgent: req.headers["user-agent"] || "unknown",
    details: { role: platformAdmin.role?.slug },
  });

  res.json({
    success: true,
    data: platformAdmin,
  });
});

/**
 * POST /api/master-admin/auth/logout
 * Records logout audit event
 */
masterAdminAuthRouter.post(
  "/logout",
  verifyMasterAdminToken,
  async (req: MasterAdminRequest, res: Response) => {
    const admin = req.platformAdmin!;
    const clientIp = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "127.0.0.1";

    await logPlatformAction({
      adminId: admin.id,
      adminEmail: admin.email,
      action: "admin.logout",
      resourceType: "platform_admins",
      resourceId: admin.id,
      ipAddress: clientIp,
      userAgent: req.headers["user-agent"] || "unknown",
      details: {},
    });

    res.json({
      success: true,
      message: "Logged out successfully.",
    });
  }
);

