import { Router, Response } from "express";
import {
  verifyMasterAdminToken,
  requirePlatformPermission,
  MasterAdminRequest,
} from "../../middleware/masterAdminAuth";
import {
  getMasterAdminSubscriptionPlans,
  updateMasterAdminSubscriptionPlan,
  overrideSchoolSubscription,
} from "../../services/masterAdminSubscriptionService";

export const masterAdminSubscriptionRouter = Router();

/**
 * GET /api/master-admin/subscriptions/plans
 * List all subscription tiers with subscriber counts
 */
masterAdminSubscriptionRouter.get(
  "/plans",
  verifyMasterAdminToken,
  requirePlatformPermission("subscriptions.view"),
  async (_req: MasterAdminRequest, res: Response) => {
    try {
      const plans = await getMasterAdminSubscriptionPlans();
      res.json({ success: true, data: plans });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

/**
 * PUT /api/master-admin/subscriptions/plans/:id
 * Update plan pricing, quotas, and entitlements
 */
masterAdminSubscriptionRouter.put(
  "/plans/:id",
  verifyMasterAdminToken,
  requirePlatformPermission("subscriptions.manage"),
  async (req: MasterAdminRequest, res: Response) => {
    try {
      const admin = req.platformAdmin!;
      const result = await updateMasterAdminSubscriptionPlan(
        req.params.id,
        req.body,
        admin.email,
        admin.id
      );

      if (!result.success) {
        res.status(400).json({ success: false, error: result.error });
        return;
      }

      res.json({ success: true, data: result.plan });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

/**
 * PATCH /api/master-admin/subscriptions/schools/:schoolId/override
 * Apply administrative override (extend trial, change status)
 */
masterAdminSubscriptionRouter.patch(
  "/schools/:schoolId/override",
  verifyMasterAdminToken,
  requirePlatformPermission("subscriptions.override"),
  async (req: MasterAdminRequest, res: Response) => {
    try {
      const admin = req.platformAdmin!;
      const { action, extendDays, newPlanSlug, newStatus, reason } = req.body;

      const result = await overrideSchoolSubscription(
        req.params.schoolId,
        { action, extendDays, newPlanSlug, newStatus, reason },
        admin.email,
        admin.id
      );

      if (!result.success) {
        res.status(400).json({ success: false, error: result.error });
        return;
      }

      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

