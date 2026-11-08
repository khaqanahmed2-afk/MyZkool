import { Router, Response } from "express";
import {
  verifyMasterAdminToken,
  requirePlatformPermission,
  MasterAdminRequest,
} from "../../middleware/masterAdminAuth";
import {
  getMasterAdminSettings,
  updateMasterAdminSetting,
  getMasterAdminFeatureFlags,
  updateMasterAdminFeatureFlag,
} from "../../services/masterAdminSettingsService";

export const masterAdminSettingsRouter = Router();

/**
 * GET /api/master-admin/settings
 * Read platform configuration
 */
masterAdminSettingsRouter.get(
  "/",
  verifyMasterAdminToken,
  requirePlatformPermission("settings.view"),
  async (req: MasterAdminRequest, res: Response) => {
    try {
      const category = req.query.category as string | undefined;
      const settings = await getMasterAdminSettings(category);
      res.json({ success: true, data: settings });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

/**
 * PATCH /api/master-admin/settings/:key
 * Update configuration block
 */
masterAdminSettingsRouter.patch(
  "/:key",
  verifyMasterAdminToken,
  requirePlatformPermission("settings.manage"),
  async (req: MasterAdminRequest, res: Response) => {
    try {
      const { value } = req.body;
      if (!value || typeof value !== "object") {
        res.status(400).json({ success: false, error: "Settings value must be an object." });
        return;
      }

      const admin = req.platformAdmin!;
      const updated = await updateMasterAdminSetting(req.params.key, value, {
        id: admin.id,
        email: admin.email,
      });

      if (!updated) {
        res.status(404).json({ success: false, error: `Setting key '${req.params.key}' not found.` });
        return;
      }

      res.json({ success: true, data: updated });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

/**
 * GET /api/master-admin/settings/flags/all
 * List all feature rollout flags
 */
masterAdminSettingsRouter.get(
  "/flags/all",
  verifyMasterAdminToken,
  requirePlatformPermission("settings.view"),
  async (_req: MasterAdminRequest, res: Response) => {
    try {
      const flags = await getMasterAdminFeatureFlags();
      res.json({ success: true, data: flags });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

/**
 * PATCH /api/master-admin/settings/flags/:flagKey
 * Update rollout percentage or toggle feature flag
 */
masterAdminSettingsRouter.patch(
  "/flags/:flagKey",
  verifyMasterAdminToken,
  requirePlatformPermission("settings.manage"),
  async (req: MasterAdminRequest, res: Response) => {
    try {
      const { isEnabled, rolloutPercentage, targetPlans } = req.body;
      const admin = req.platformAdmin!;

      const updated = await updateMasterAdminFeatureFlag(
        req.params.flagKey,
        {
          ...(isEnabled !== undefined && { is_enabled: Boolean(isEnabled) }),
          ...(rolloutPercentage !== undefined && { rollout_percentage: Number(rolloutPercentage) }),
          ...(targetPlans !== undefined && { target_plans: targetPlans }),
        },
        {
          id: admin.id,
          email: admin.email,
        }
      );

      if (!updated) {
        res.status(404).json({ success: false, error: `Feature flag '${req.params.flagKey}' not found.` });
        return;
      }

      res.json({ success: true, data: updated });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

