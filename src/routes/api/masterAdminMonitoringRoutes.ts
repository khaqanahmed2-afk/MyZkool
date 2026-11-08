import { Router, Response } from "express";
import {
  verifyMasterAdminToken,
  requirePlatformPermission,
  MasterAdminRequest,
} from "../../middleware/masterAdminAuth";
import { getPlatformSystemHealth } from "../../services/masterAdminMonitoringService";
import { getPlatformAuditLogs } from "../../services/masterAdminAuditService";

export const masterAdminMonitoringRouter = Router();

/**
 * GET /api/master-admin/monitoring/health
 * Real-time health metrics, memory usage, latency, and integrations status
 */
masterAdminMonitoringRouter.get(
  "/health",
  verifyMasterAdminToken,
  requirePlatformPermission("monitoring.view"),
  async (_req: MasterAdminRequest, res: Response) => {
    try {
      const health = await getPlatformSystemHealth();
      res.json({ success: true, data: health });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

/**
 * GET /api/master-admin/monitoring/audit-logs
 * Security & Administrative immutable audit trail
 */
masterAdminMonitoringRouter.get(
  "/audit-logs",
  verifyMasterAdminToken,
  requirePlatformPermission("audit.view"),
  async (req: MasterAdminRequest, res: Response) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
      const action = req.query.action as string | undefined;
      const adminEmail = req.query.adminEmail as string | undefined;
      const schoolId = req.query.schoolId as string | undefined;

      const logs = await getPlatformAuditLogs({
        limit,
        action,
        adminEmail,
        schoolId,
      });

      res.json({ success: true, data: logs });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

