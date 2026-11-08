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
} from "../../services/masterAdminSchoolService";

export const masterAdminSchoolRouter = Router();

/**
 * GET /api/master-admin/schools
 * List all schools with search, status, board, and state filtering
 */
masterAdminSchoolRouter.get(
  "/",
  verifyMasterAdminToken,
  requirePlatformPermission("schools.view"),
  async (req: MasterAdminRequest, res: Response) => {
    try {
      const page = parseInt((req.query.page as string) || "1", 10);
      const limit = parseInt((req.query.limit as string) || "20", 10);
      const search = (req.query.search as string) || "";
      const status = (req.query.status as string) || "all";
      const board = (req.query.board as string) || "all";
      const state = (req.query.state as string) || "all";

      const results = await getMasterAdminSchools(
        {
          page,
          limit,
          search,
          status,
          board,
          state,
        },
        req
      );

      res.json({
        success: true,
        data: results.schools,
        meta: {
          page: results.page,
          limit: results.limit,
          total: results.total,
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
      const result = await registerMasterAdminSchool({
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
      });

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
 * Suspend or reactivate an institution with audit reason
 */
masterAdminSchoolRouter.patch(
  "/:id/status",
  verifyMasterAdminToken,
  requirePlatformPermission("schools.suspend"),
  async (req: MasterAdminRequest, res: Response) => {
    try {
      const { status, reason } = req.body;
      if (!status || !["active", "suspended"].includes(status)) {
        res.status(400).json({
          success: false,
          error: "Status must be either 'active' or 'suspended'.",
        });
        return;
      }
      if (!reason || reason.trim().length < 5) {
        res.status(400).json({
          success: false,
          error: "A valid operational reason (min 5 characters) is mandatory.",
        });
        return;
      }

      const admin = req.platformAdmin!;
      const result = await updateMasterAdminSchoolStatus(
        req.params.id,
        status,
        reason.trim(),
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

