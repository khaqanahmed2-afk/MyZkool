import { Router, Response } from "express";
import {
  verifyMasterAdminToken,
  requirePlatformPermission,
  MasterAdminRequest,
} from "../../middleware/masterAdminAuth";
import {
  getMasterAdminInvoices,
  getMasterAdminPayments,
  generateMasterAdminInvoice,
  processMasterAdminRefund,
  getMasterAdminRevenueSummary,
} from "../../services/masterAdminBillingService";

export const masterAdminBillingRouter = Router();

/**
 * GET /api/master-admin/billing/invoices
 * List platform subscription invoices
 */
masterAdminBillingRouter.get(
  "/invoices",
  verifyMasterAdminToken,
  requirePlatformPermission("billing.view"),
  async (req: MasterAdminRequest, res: Response) => {
    try {
      const status = (req.query.status as string) || "all";
      const search = (req.query.search as string) || "";
      const invoices = await getMasterAdminInvoices({ status, search });
      res.json({ success: true, data: invoices });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

/**
 * POST /api/master-admin/billing/invoices
 * Generate official SaaS subscription invoice
 */
masterAdminBillingRouter.post(
  "/invoices",
  verifyMasterAdminToken,
  requirePlatformPermission("billing.manage"),
  async (req: MasterAdminRequest, res: Response) => {
    try {
      const {
        schoolId,
        schoolName,
        planSlug,
        billingCycle,
        billingAddress,
        billingState,
        billingGstin,
      } = req.body;

      if (!schoolId || !schoolName || !planSlug || !billingCycle || !billingAddress || !billingState) {
        res.status(400).json({
          success: false,
          error: "Missing required invoice fields (schoolId, schoolName, planSlug, billingCycle, billingAddress, billingState).",
        });
        return;
      }

      const admin = req.platformAdmin!;
      const invoice = await generateMasterAdminInvoice({
        schoolId,
        schoolName,
        planSlug,
        billingCycle,
        billingAddress,
        billingState,
        billingGstin,
        adminEmail: admin.email,
        adminId: admin.id,
      });

      res.status(201).json({ success: true, data: invoice });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

/**
 * GET /api/master-admin/billing/payments
 * List Razorpay payment transactions
 */
masterAdminBillingRouter.get(
  "/payments",
  verifyMasterAdminToken,
  requirePlatformPermission("billing.view"),
  async (_req: MasterAdminRequest, res: Response) => {
    try {
      const payments = await getMasterAdminPayments();
      res.json({ success: true, data: payments });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

/**
 * POST /api/master-admin/billing/refunds
 * Authorize and process subscription refund
 */
masterAdminBillingRouter.post(
  "/refunds",
  verifyMasterAdminToken,
  requirePlatformPermission("billing.manage"),
  async (req: MasterAdminRequest, res: Response) => {
    try {
      const { paymentId, amountPaise, reason } = req.body;
      if (!paymentId || !amountPaise || !reason) {
        res.status(400).json({
          success: false,
          error: "paymentId, amountPaise and reason are required.",
        });
        return;
      }

      const admin = req.platformAdmin!;
      const result = await processMasterAdminRefund(
        paymentId,
        Number(amountPaise),
        reason,
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

/**
 * GET /api/master-admin/billing/summary
 * Returns overall revenue breakdown
 */
masterAdminBillingRouter.get(
  "/summary",
  verifyMasterAdminToken,
  requirePlatformPermission("billing.view"),
  async (_req: MasterAdminRequest, res: Response) => {
    try {
      const summary = await getMasterAdminRevenueSummary();
      res.json({ success: true, data: summary });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

