import { Router, Response } from "express";
import {
  verifyMasterAdminToken,
  requirePlatformPermission,
  MasterAdminRequest,
} from "../../middleware/masterAdminAuth";
import {
  getMasterAdminTickets,
  getMasterAdminTicketDetail,
  addTicketMessage,
  updateTicketStatus,
} from "../../services/masterAdminSupportService";

export const masterAdminSupportRouter = Router();

/**
 * GET /api/master-admin/support/tickets
 * List support tickets with status and priority filters
 */
masterAdminSupportRouter.get(
  "/tickets",
  verifyMasterAdminToken,
  requirePlatformPermission("support.view"),
  async (req: MasterAdminRequest, res: Response) => {
    try {
      const status = (req.query.status as string) || "all";
      const priority = (req.query.priority as string) || "all";
      const category = (req.query.category as string) || "all";

      const tickets = await getMasterAdminTickets({ status, priority, category });
      res.json({ success: true, data: tickets });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

/**
 * GET /api/master-admin/support/tickets/:id
 * Get single ticket and full message history
 */
masterAdminSupportRouter.get(
  "/tickets/:id",
  verifyMasterAdminToken,
  requirePlatformPermission("support.view"),
  async (req: MasterAdminRequest, res: Response) => {
    try {
      const detail = await getMasterAdminTicketDetail(req.params.id);
      if (!detail) {
        res.status(404).json({ success: false, error: "Ticket not found." });
        return;
      }
      res.json({ success: true, data: detail });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

/**
 * POST /api/master-admin/support/tickets/:id/messages
 * Post reply or internal private note
 */
masterAdminSupportRouter.post(
  "/tickets/:id/messages",
  verifyMasterAdminToken,
  requirePlatformPermission("support.manage"),
  async (req: MasterAdminRequest, res: Response) => {
    try {
      const { message, isInternalNote } = req.body;
      if (!message || !message.trim()) {
        res.status(400).json({ success: false, error: "Message body cannot be empty." });
        return;
      }

      const admin = req.platformAdmin!;
      const newMsg = await addTicketMessage({
        ticketId: req.params.id,
        senderType: "platform_admin",
        senderId: admin.id,
        senderName: admin.full_name,
        message: message.trim(),
        isInternalNote: Boolean(isInternalNote),
        adminEmail: admin.email,
      });

      res.status(201).json({ success: true, data: newMsg });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

/**
 * PATCH /api/master-admin/support/tickets/:id
 * Update status, priority, or assigned operator
 */
masterAdminSupportRouter.patch(
  "/tickets/:id",
  verifyMasterAdminToken,
  requirePlatformPermission("support.manage"),
  async (req: MasterAdminRequest, res: Response) => {
    try {
      const admin = req.platformAdmin!;
      const { status, priority, assignedTo, resolutionSummary } = req.body;

      const result = await updateTicketStatus(
        req.params.id,
        { status, priority, assignedTo, resolutionSummary },
        admin.email,
        admin.id
      );

      if (!result.success) {
        res.status(404).json({ success: false, error: "Ticket not found." });
        return;
      }

      res.json({ success: true, data: result.ticket });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

