/**
 * Deletion API Routes
 * Mounted at /api/deletion in server.ts
 * 
 * Enforces:
 * - Server-side identity verification via Supabase Bearer token
 * - Strict tenant owner authorization
 * - Explicit confirmation payloads (confirmation phrase, school name, recent password verification)
 * - Safe transactional deletion and Storage purging
 * - Post-deletion verification and machine-readable audit reporting
 */

import { Router, Request, Response } from "express";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import {
  getAccountDeletionPreflight,
  purgeUserAccount,
  getSchoolDeletionPreflight,
  purgeSchoolData,
  transferSchoolOwnership,
  verifySchoolPurge,
} from "../services/deletionService";

export const deletionRouter = Router();

/**
 * Authentication middleware for deletion routes
 */
async function requireAuth(req: Request, res: Response, next: Function) {
  try {
    const authHeader = req.headers.authorization || (req.headers.Authorization as string);
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "Missing or invalid Authorization Bearer token.",
      });
    }

    const token = authHeader.slice(7).trim();
    const { data: authData, error: authErr } = await supabase.auth.getUser(token);

    if (authErr || !authData?.user) {
      return res.status(401).json({
        error: "Invalid or expired session. Please sign in again.",
      });
    }

    req.user = {
      id: authData.user.id,
      email: authData.user.email,
      role: "school_admin",
      school_id: authData.user.user_metadata?.school_id || "",
    };

    next();
  } catch (err: any) {
    console.error("requireAuth error:", err);
    return res.status(500).json({ error: "Internal authentication error." });
  }
}

// ─── 1. Account Deletion Endpoints ──────────────────────────────────────────

/**
 * GET /api/deletion/account/preflight
 * Analyzes dependencies and owned schools for current authenticated user
 */
deletionRouter.get("/account/preflight", requireAuth, async (req: Request, res: Response) => {
  try {
    const preflight = await getAccountDeletionPreflight();
    res.json(preflight);
  } catch (err: any) {
    console.error("Account preflight error:", err);
    res.status(500).json({ error: err.message || "Failed to generate account preflight." });
  }
});

/**
 * POST /api/deletion/account/purge
 * Permanently deletes user account, drafts, sessions, and anonymizes retained records
 */
deletionRouter.post("/account/purge", requireAuth, async (req: Request, res: Response) => {
  try {
    const { password, confirmationPhrase } = req.body;

    if (!confirmationPhrase || confirmationPhrase.trim() !== "DELETE MY ACCOUNT") {
      return res.status(400).json({
        error: "Explicit confirmation phrase 'DELETE MY ACCOUNT' is required.",
      });
    }

    if (!password) {
      return res.status(400).json({
        error: "Password is required for identity verification.",
      });
    }

    // Check preflight on server before proceeding
    const preflight = await getAccountDeletionPreflight();
    if (!preflight.can_delete) {
      return res.status(400).json({
        error: preflight.blocking_reason || "Account cannot be deleted while owning active schools.",
        owned_schools: preflight.owned_schools,
      });
    }

    const result = await purgeUserAccount(password);
    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }

    res.json(result);
  } catch (err: any) {
    console.error("Account purge error:", err);
    res.status(500).json({ error: err.message || "Failed to purge account." });
  }
});

// ─── 2. School Deletion Endpoints ───────────────────────────────────────────

/**
 * GET /api/deletion/school/:schoolId/preflight
 * Itemized breakdown of all records in school tenant
 */
deletionRouter.get("/school/:schoolId/preflight", requireAuth, async (req: Request, res: Response) => {
  try {
    const { schoolId } = req.params;
    const preflight = await getSchoolDeletionPreflight(schoolId);

    if (!preflight.is_owner) {
      return res.status(403).json({
        error: preflight.error || "Only the verified school owner is authorized to view deletion details.",
      });
    }

    res.json(preflight);
  } catch (err: any) {
    console.error("School preflight error:", err);
    res.status(500).json({ error: err.message || "Failed to fetch school preflight." });
  }
});

/**
 * POST /api/deletion/school/:schoolId/transfer
 * Transfer ownership to another user email
 */
deletionRouter.post("/school/:schoolId/transfer", requireAuth, async (req: Request, res: Response) => {
  try {
    const { schoolId } = req.params;
    const { newOwnerEmail } = req.body;

    if (!newOwnerEmail) {
      return res.status(400).json({ error: "Target new owner email is required." });
    }

    const result = await transferSchoolOwnership(schoolId, newOwnerEmail);
    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }

    res.json(result);
  } catch (err: any) {
    console.error("Transfer ownership error:", err);
    res.status(500).json({ error: err.message || "Failed to transfer school ownership." });
  }
});

/**
 * POST /api/deletion/school/:schoolId/purge
 * Complete tenant purge across all tables and Storage
 */
deletionRouter.post("/school/:schoolId/purge", requireAuth, async (req: Request, res: Response) => {
  try {
    const { schoolId } = req.params;
    const { schoolNameConfirmation, password, acknowledgedRisks } = req.body;

    if (!acknowledgedRisks || !acknowledgedRisks.all_data_lost || !acknowledgedRisks.no_recovery) {
      return res.status(400).json({
        error: "All critical risk acknowledgment checkboxes must be confirmed.",
      });
    }

    if (!schoolNameConfirmation) {
      return res.status(400).json({
        error: "Exact school name confirmation is required.",
      });
    }

    if (!password) {
      return res.status(400).json({
        error: "Owner password is required for identity verification.",
      });
    }

    const result = await purgeSchoolData(schoolId, schoolNameConfirmation, password);
    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }

    res.json(result);
  } catch (err: any) {
    console.error("School purge error:", err);
    res.status(500).json({ error: err.message || "Failed to purge school tenant." });
  }
});

/**
 * GET /api/deletion/school/:schoolId/verify
 * Independent verification of zero remaining records
 */
deletionRouter.get("/school/:schoolId/verify", requireAuth, async (req: Request, res: Response) => {
  try {
    const { schoolId } = req.params;
    const result = await verifySchoolPurge(schoolId);
    res.json(result);
  } catch (err: any) {
    console.error("School verification error:", err);
    res.status(500).json({ error: err.message || "Failed to verify school deletion." });
  }
});
