import { Router, Response } from "express";
import {
  verifyMasterAdminToken,
  requirePlatformPermission,
  MasterAdminRequest,
} from "../../middleware/masterAdminAuth";
import {
  getMasterAdminSchools,
  getMasterAdminSchoolDetail,
  registerMasterAdminSchool,
  updateMasterAdminSchoolStatus,
  changeSchoolSubscriptionPlan,
  extendSchoolTrial,
  extendSchoolSubscriptionValidity,
  getSchoolSubscriptionHistory,
  getSchoolActivityLogs,
  updateSchoolModules,
  exportSchoolsToCsv,
  approveSchoolOnboarding,
  rejectSchoolOnboarding,
  executeBulkSchoolAction,
  BulkSchoolActionRequest,
} from "../../services/masterAdminSchoolService";

export const masterAdminSchoolRouter = Router();

/**
 * POST /api/master-admin/schools/bulk-action
 * Execute verified bulk operations (activate, suspend, change plan, extend subscription)
 */
masterAdminSchoolRouter.post(
  "/bulk-action",
  verifyMasterAdminToken,
  requirePlatformPermission("schools.suspend"),
  async (req: MasterAdminRequest, res: Response) => {
    try {
      const { action, schoolIds, reason, planSlug, billingCycle, additionalDays } = req.body;
      if (!action || !Array.isArray(schoolIds) || schoolIds.length === 0) {
        res.status(400).json({ success: false, error: "action and non-empty schoolIds array are required." });
        return;
      }
      if (!reason || reason.trim().length < 3) {
        res.status(400).json({ success: false, error: "A valid operational reason (min 3 chars) is required." });
        return;
      }

      const admin = req.platformAdmin!;
      const result = await executeBulkSchoolAction(
        {
          action,
          schoolIds,
          reason,
          planSlug,
          billingCycle,
          additionalDays: additionalDays ? parseInt(additionalDays, 10) : undefined,
        },
        admin.email,
        admin.id,
        req
      );

      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

/**
 * GET /api/master-admin/schools/export
 * Export schools as verified CSV
 */
masterAdminSchoolRouter.get(
  "/export",
  verifyMasterAdminToken,
  requirePlatformPermission("schools.view"),
  async (req: MasterAdminRequest, res: Response) => {
    try {
      const search = (req.query.search as string) || "";
      const plan = (req.query.plan as string) || "all";
      const status = (req.query.status as string) || "all";
      const sub_status = (req.query.sub_status as string) || "all";
      const board = (req.query.board as string) || "all";
      const state = (req.query.state as string) || "all";

      const csvData = await exportSchoolsToCsv(
        { search, plan, status, sub_status, board, state },
        req
      );

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", 'attachment; filename="myzkool-schools-directory.csv"');
      res.send(csvData);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

/**
 * GET /api/master-admin/schools
 * List all schools with search, plan, status, sub_status, board, state, joined filtering, and overview KPIs
 */
masterAdminSchoolRouter.get(
  "/",
  verifyMasterAdminToken,
  requirePlatformPermission("schools.view"),
  async (req: MasterAdminRequest, res: Response) => {
    try {
      const page = parseInt((req.query.page as string) || "1", 10);
      const limit = parseInt((req.query.limit as string) || "10", 10);
      const search = (req.query.search as string) || "";
      const plan = (req.query.plan as string) || "all";
      const status = (req.query.status as string) || "all";
      const sub_status = (req.query.sub_status as string) || "all";
      const board = (req.query.board as string) || "all";
      const state = (req.query.state as string) || "all";
      const joined = (req.query.joined as string) || "all";
      const sort_by = (req.query.sort_by as any) || "name";
      const sort_order = (req.query.sort_order as any) || "asc";

      const results = await getMasterAdminSchools(
        {
          page,
          limit,
          search,
          plan,
          status,
          sub_status,
          board,
          state,
          joined,
          sort_by,
          sort_order,
        },
        req
      );

      res.json({
        success: true,
        data: results.schools,
        kpis: results.kpis,
        meta: {
          page: results.page,
          limit: results.limit,
          total: results.total,
          totalPages: results.totalPages,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

/**
 * GET /api/master-admin/schools/:id
 * Get single school profile details
 */
masterAdminSchoolRouter.get(
  "/:id",
  verifyMasterAdminToken,
  requirePlatformPermission("schools.view"),
  async (req: MasterAdminRequest, res: Response) => {
    try {
      const school = await getMasterAdminSchoolDetail(req.params.id, req);
      if (!school) {
        res.status(404).json({ success: false, error: "School not found." });
        return;
      }
      res.json({ success: true, data: school });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

/**
 * POST /api/master-admin/schools
 * Register a new educational institution
 */
masterAdminSchoolRouter.post(
  "/",
  verifyMasterAdminToken,
  requirePlatformPermission("schools.create"),
  async (req: MasterAdminRequest, res: Response) => {
    try {
      const {
        name,
        subdomain,
        schoolType,
        affiliationBoard,
        officialEmail,
        contactPhone,
        address,
        city,
        district,
        state,
        pinCode,
        initialPlanSlug,
      } = req.body;

      if (!name || !subdomain || !officialEmail || !contactPhone || !city || !state || !pinCode) {
        res.status(400).json({
          success: false,
          error: "Missing required school registration fields.",
        });
        return;
      }

      const admin = req.platformAdmin!;
      const result = await registerMasterAdminSchool(
        {
          name,
          subdomain,
          schoolType,
          affiliationBoard,
          officialEmail,
          contactPhone,
          address: address || `${city}, ${state}`,
          city,
          district,
          state,
          pinCode,
          initialPlanSlug,
          adminEmail: admin.email,
          adminId: admin.id,
        },
        req
      );

      if (!result.success) {
        res.status(400).json({ success: false, error: result.error });
        return;
      }

      res.status(201).json({ success: true, data: result.school });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

/**
 * PATCH /api/master-admin/schools/:id/status
 * Suspend or reactivate an institution with audit reason & notes
 */
masterAdminSchoolRouter.patch(
  "/:id/status",
  verifyMasterAdminToken,
  requirePlatformPermission("schools.suspend"),
  async (req: MasterAdminRequest, res: Response) => {
    try {
      const { status, reason, notes } = req.body;
      if (!status || !["active", "suspended"].includes(status)) {
        res.status(400).json({
          success: false,
          error: "Status must be either 'active' or 'suspended'.",
        });
        return;
      }
      if (!reason || reason.trim().length < 3) {
        res.status(400).json({
          success: false,
          error: "A valid operational reason is mandatory.",
        });
        return;
      }

      const admin = req.platformAdmin!;
      const result = await updateMasterAdminSchoolStatus(
        req.params.id,
        status,
        reason.trim(),
        notes?.trim(),
        admin.email,
        admin.id,
        req
      );

      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

/**
 * PATCH /api/master-admin/schools/:id/subscription/change-plan
 * Upgrade or downgrade institution subscription tier
 */
masterAdminSchoolRouter.patch(
  "/:id/subscription/change-plan",
  verifyMasterAdminToken,
  requirePlatformPermission("subscriptions.manage"),
  async (req: MasterAdminRequest, res: Response) => {
    try {
      const { newPlanSlug, billingCycle, reason } = req.body;
      if (!newPlanSlug || !["basic", "pro", "custom"].includes(newPlanSlug)) {
        res.status(400).json({ success: false, error: "Valid plan slug (basic, pro, custom) is required." });
        return;
      }

      const admin = req.platformAdmin!;
      const result = await changeSchoolSubscriptionPlan(
        req.params.id,
        newPlanSlug,
        billingCycle || "yearly",
        reason,
        admin.email,
        admin.id,
        req
      );

      if (!result.success) {
        res.status(400).json(result);
        return;
      }

      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

/**
 * PATCH /api/master-admin/schools/:id/subscription/extend-trial
 * Extend Free Trial period
 */
masterAdminSchoolRouter.patch(
  "/:id/subscription/extend-trial",
  verifyMasterAdminToken,
  requirePlatformPermission("subscriptions.override"),
  async (req: MasterAdminRequest, res: Response) => {
    try {
      const { additionalDays, reason } = req.body;
      const days = parseInt(additionalDays, 10);

      const admin = req.platformAdmin!;
      const result = await extendSchoolTrial(
        req.params.id,
        days,
        reason,
        admin.email,
        admin.id,
        req
      );

      if (!result.success) {
        res.status(400).json(result);
        return;
      }

      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

/**
 * PATCH /api/master-admin/schools/:id/subscription/extend-validity
 * Extend Paid / Complimentary subscription validity
 */
masterAdminSchoolRouter.patch(
  "/:id/subscription/extend-validity",
  verifyMasterAdminToken,
  requirePlatformPermission("subscriptions.override"),
  async (req: MasterAdminRequest, res: Response) => {
    try {
      const { additionalDays, classification, paymentReference, reason } = req.body;
      const days = parseInt(additionalDays, 10);

      const admin = req.platformAdmin!;
      const result = await extendSchoolSubscriptionValidity(
        req.params.id,
        days,
        classification || "complimentary",
        paymentReference,
        reason,
        admin.email,
        admin.id,
        req
      );

      if (!result.success) {
        res.status(400).json(result);
        return;
      }

      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

/**
 * GET /api/master-admin/schools/:id/subscription/history
 * Fetch subscription audit history ledger
 */
masterAdminSchoolRouter.get(
  "/:id/subscription/history",
  verifyMasterAdminToken,
  requirePlatformPermission("subscriptions.view"),
  async (req: MasterAdminRequest, res: Response) => {
    try {
      const history = await getSchoolSubscriptionHistory(req.params.id, req);
      res.json({ success: true, data: history });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

/**
 * GET /api/master-admin/schools/:id/activity
 * Fetch institutional platform audit and security activity
 */
masterAdminSchoolRouter.get(
  "/:id/activity",
  verifyMasterAdminToken,
  requirePlatformPermission("audit.view"),
  async (req: MasterAdminRequest, res: Response) => {
    try {
      const limit = parseInt((req.query.limit as string) || "20", 10);
      const logs = await getSchoolActivityLogs(req.params.id, limit, req);
      res.json({ success: true, data: logs });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

/**
 * PATCH /api/master-admin/schools/:id/modules
 * Update enabled institutional features/modules
 */
masterAdminSchoolRouter.patch(
  "/:id/modules",
  verifyMasterAdminToken,
  requirePlatformPermission("subscriptions.manage"),
  async (req: MasterAdminRequest, res: Response) => {
    try {
      const { enabledModules, reason } = req.body;
      if (!Array.isArray(enabledModules)) {
        res.status(400).json({ success: false, error: "enabledModules must be an array of feature slugs." });
        return;
      }

      const admin = req.platformAdmin!;
      const result = await updateSchoolModules(
        req.params.id,
        enabledModules,
        reason || "Module configuration update",
        admin.email,
        admin.id,
        req
      );

      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

/**
 * PATCH /api/master-admin/schools/:id/onboarding/approve
 * Review and approve an institution's onboarding
 */
masterAdminSchoolRouter.patch(
  "/:id/onboarding/approve",
  verifyMasterAdminToken,
  requirePlatformPermission("schools.suspend"),
  async (req: MasterAdminRequest, res: Response) => {
    try {
      const { notes } = req.body;
      const admin = req.platformAdmin!;
      const result = await approveSchoolOnboarding(
        req.params.id,
        notes,
        admin.email,
        admin.id,
        req
      );

      if (!result.success) {
        res.status(400).json(result);
        return;
      }

      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

/**
 * PATCH /api/master-admin/schools/:id/onboarding/reject
 * Reject or request revisions on an institution's onboarding
 */
masterAdminSchoolRouter.patch(
  "/:id/onboarding/reject",
  verifyMasterAdminToken,
  requirePlatformPermission("schools.suspend"),
  async (req: MasterAdminRequest, res: Response) => {
    try {
      const { reason } = req.body;
      const admin = req.platformAdmin!;
      const result = await rejectSchoolOnboarding(
        req.params.id,
        reason,
        admin.email,
        admin.id,
        req
      );

      if (!result.success) {
        res.status(400).json(result);
        return;
      }

      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
);
