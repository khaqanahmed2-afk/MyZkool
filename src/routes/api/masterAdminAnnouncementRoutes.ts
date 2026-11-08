import { Router, Response } from "express";
import {
  verifyMasterAdminToken,
  requirePlatformPermission,
  MasterAdminRequest,
} from "../../middleware/masterAdminAuth";
import {
  getMasterAdminAnnouncements,
  createMasterAdminAnnouncement,
  deleteMasterAdminAnnouncement,
} from "../../services/masterAdminSettingsService";

export const masterAdminAnnouncementRouter = Router();

/**
 * GET /api/master-admin/announcements
 * List all platform broadcasts
 */
masterAdminAnnouncementRouter.get(
  "/",
  verifyMasterAdminToken,
  requirePlatformPermission("announcements.publish"),
  async (_req: MasterAdminRequest, res: Response) => {
    try {
      const list = await getMasterAdminAnnouncements();
      res.json({ success: true, data: list });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

/**
 * POST /api/master-admin/announcements
 * Broadcast new announcement
 */
masterAdminAnnouncementRouter.post(
  "/",
  verifyMasterAdminToken,
  requirePlatformPermission("announcements.publish"),
  async (req: MasterAdminRequest, res: Response) => {
    try {
      const { title, content, type, targetAudience, targetSchoolIds, isPublished, expiresAt } = req.body;
      if (!title || !content) {
        res.status(400).json({ success: false, error: "Title and content are required." });
        return;
      }

      const admin = req.platformAdmin!;
      const item = await createMasterAdminAnnouncement(
        {
          title,
          content,
          type: type || "announcement",
          target_audience: targetAudience || "all",
          target_school_ids: targetSchoolIds,
          is_published: isPublished ?? true,
          expires_at: expiresAt || null,
        },
        {
          id: admin.id,
          email: admin.email,
          name: admin.full_name,
        }
      );

      res.status(201).json({ success: true, data: item });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

/**
 * DELETE /api/master-admin/announcements/:id
 * Revoke or remove an announcement
 */
masterAdminAnnouncementRouter.delete(
  "/:id",
  verifyMasterAdminToken,
  requirePlatformPermission("announcements.publish"),
  async (req: MasterAdminRequest, res: Response) => {
    try {
      const admin = req.platformAdmin!;
      const success = await deleteMasterAdminAnnouncement(req.params.id, {
        id: admin.id,
        email: admin.email,
      });

      if (!success) {
        res.status(404).json({ success: false, error: "Announcement not found." });
        return;
      }

      res.json({ success: true, message: "Announcement removed successfully." });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

