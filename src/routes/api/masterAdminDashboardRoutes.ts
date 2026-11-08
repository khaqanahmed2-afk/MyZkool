import { Router, Response } from "express";
import {
  verifyMasterAdminToken,
  requirePlatformPermission,
  MasterAdminRequest,
} from "../../middleware/masterAdminAuth";
import { getPlatformDashboardMetrics } from "../../services/masterAdminDashboardService";

export const masterAdminDashboardRouter = Router();

/**
 * GET /api/master-admin/dashboard/metrics
 * Returns real-time KPIs, charts, system health, and attention alerts
 */
masterAdminDashboardRouter.get(
  "/metrics",
  verifyMasterAdminToken,
  requirePlatformPermission("dashboard.view"),
  async (req: MasterAdminRequest, res: Response) => {
    try {
      const period = (req.query.period as string) || "30d";
      const metrics = await getPlatformDashboardMetrics(req, period);
      res.json({
        success: true,
        data: metrics,
      });
    } catch (err: any) {
      console.error("Dashboard metrics error:", err);
      res.status(500).json({
        success: false,
        error: "Failed to load platform dashboard metrics.",
        details: err.message,
      });
    }
  }
);

