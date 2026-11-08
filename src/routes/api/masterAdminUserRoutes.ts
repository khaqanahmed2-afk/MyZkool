import { Router, Response } from "express";
import {
  verifyMasterAdminToken,
  requirePlatformPermission,
  MasterAdminRequest,
} from "../../middleware/masterAdminAuth";
import { logPlatformAction } from "../../services/masterAdminAuditService";
import { supabase, isSupabaseConfigured } from "../../lib/supabase";
import type { PlatformAdmin } from "../../types/masterAdmin";

export const masterAdminUserRouter = Router();

// In-memory store for fallback/tests
const mockAdminsStore: PlatformAdmin[] = [
  {
    id: "admin-super-01",
    auth_id: "auth-uuid-super",
    email: "khaqan@myzkool.com",
    full_name: "Khaqan Ahmad",
    phone: "+919876543210",
    role_id: "role-super",
    role: {
      id: "role-super",
      slug: "super_admin",
      name: "Super Admin",
      description: "Full control plane authority across all platform operations and security.",
      is_system: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    permissions: ["*"],
    is_active: true,
    last_login_at: new Date().toISOString(),
    created_at: new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "admin-support-01",
    auth_id: "auth-uuid-support",
    email: "support@myzkool.com",
    full_name: "Support Specialist",
    phone: "+919876543211",
    role_id: "role-support",
    role: {
      id: "role-support",
      slug: "support_agent",
      name: "Support Agent",
      description: "School support triage, ticket resolution, and non-sensitive operational inspection.",
      is_system: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    permissions: ["dashboard.view", "schools.view", "support.view", "support.manage"],
    is_active: true,
    last_login_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    created_at: new Date(Date.now() - 45 * 24 * 3600 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  },
];

/**
 * GET /api/master-admin/users
 * List platform administrator accounts
 */
masterAdminUserRouter.get(
  "/",
  verifyMasterAdminToken,
  requirePlatformPermission("users.view"),
  async (_req: MasterAdminRequest, res: Response) => {
    try {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from("platform_admins")
          .select(`
            *,
            platform_roles (*)
          `)
          .order("created_at", { ascending: false });

        if (!error && data && data.length > 0) {
          const list = data.map((a: any) => ({
            ...a,
            role: a.platform_roles,
          }));
          res.json({ success: true, data: list });
          return;
        }
      }

      res.json({ success: true, data: mockAdminsStore });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

/**
 * POST /api/master-admin/users
 * Provision a new platform administrator
 */
masterAdminUserRouter.post(
  "/",
  verifyMasterAdminToken,
  requirePlatformPermission("users.manage"),
  async (req: MasterAdminRequest, res: Response) => {
    try {
      const { email, fullName, roleSlug, phone } = req.body;
      if (!email || !fullName || !roleSlug) {
        res.status(400).json({
          success: false,
          error: "email, fullName, and roleSlug are required.",
        });
        return;
      }

      const admin = req.platformAdmin!;
      const newAdmin: PlatformAdmin = {
        id: `adm-${Date.now().toString(36)}`,
        auth_id: `auth-${Date.now().toString(36)}`,
        email: email.trim().toLowerCase(),
        full_name: fullName.trim(),
        phone: phone || null,
        role_id: `role-${roleSlug}`,
        role: {
          id: `role-${roleSlug}`,
          slug: roleSlug,
          name: roleSlug === "super_admin" ? "Super Admin" : roleSlug === "billing_manager" ? "Billing Manager" : "Support Agent",
          description: "Assigned platform role.",
          is_system: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        permissions: roleSlug === "super_admin" ? ["*"] : ["dashboard.view", "support.view"],
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockAdminsStore.push(newAdmin);

      await logPlatformAction({
        adminId: admin.id,
        adminEmail: admin.email,
        action: "user.create",
        resourceType: "platform_admins",
        resourceId: newAdmin.id,
        details: { email: newAdmin.email, role: roleSlug },
      });

      res.status(201).json({ success: true, data: newAdmin });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

/**
 * PATCH /api/master-admin/users/:id/status
 * Deactivate or activate platform admin
 */
masterAdminUserRouter.patch(
  "/:id/status",
  verifyMasterAdminToken,
  requirePlatformPermission("users.manage"),
  async (req: MasterAdminRequest, res: Response) => {
    try {
      const { isActive } = req.body;
      const targetAdmin = mockAdminsStore.find((a) => a.id === req.params.id);
      if (!targetAdmin) {
        res.status(404).json({ success: false, error: "Platform administrator not found." });
        return;
      }

      // Protect root super admin from deactivation
      if (targetAdmin.role?.slug === "super_admin" && !isActive) {
        res.status(403).json({
          success: false,
          error: "Root Super Administrator accounts cannot be deactivated.",
        });
        return;
      }

      targetAdmin.is_active = Boolean(isActive);

      const admin = req.platformAdmin!;
      await logPlatformAction({
        adminId: admin.id,
        adminEmail: admin.email,
        action: isActive ? "user.activate" : "user.deactivate",
        resourceType: "platform_admins",
        resourceId: targetAdmin.id,
        details: { isActive },
      });

      res.json({ success: true, data: targetAdmin });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

