/**
 * Transport API Routes (Spec 1.5, C1, C2, C3, C4, C9, C10, C15)
 * Mounted at /api/transport.
 * EVERY route is protected by requireFeature('transport').
 */

import { Router, Request, Response } from "express";
import { requireSchoolContext } from "../middleware/auth";
import { requireFeature, requireTransportPermission } from "../middleware/features";
import {
  getTransportSettings,
  saveTransportSettings,
  getVehicles,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  getVehicleDocuments,
  addVehicleDocument,
  deleteVehicleDocument,
  getTransportStaff,
  createTransportStaff,
  updateTransportStaff,
  deleteTransportStaff,
  generateDriverAppInvite,
  getRoutes,
  createRoute,
  updateRoute,
  deleteRoute,
  saveRouteStops,
  getFeeZones,
  createFeeZone,
  updateFeeZone,
  deleteFeeZone,
  getTransportDashboardData,
} from "../services/transportCoreService";
import { runDocumentExpiryJob } from "../services/transportExpiryJob";
import {
  getStudentTransportDetails,
  createAssignment,
  bulkAssignStudents,
  changeAssignment,
  stopAssignment,
  listTransportRequests,
  createTransportRequest,
  updateTransportRequestStatus,
  recordAbsence,
  listAbsences,
  getRenewalPreview,
  commitRenewal,
  getRouteRosterReport,
  getRidersByRouteAndStopReport,
  getVehicleUtilisationReport,
  getUnassignedAndRequestsReport,
  getTransportFeeReport,
  getAssignmentHistoryReport,
} from "../services/transportAssignmentService";

export const transportRouter = Router();

// ENFORCE AUTHENTICATED TENANT ISOLATION & PLAN GATING ON EVERY /api/transport ROUTE
transportRouter.use(requireSchoolContext);
transportRouter.use(requireFeature("transport"));

function getSchoolId(req: Request): string {
  const schoolId = (req as any).schoolId || (req as any).user?.school_id;
  if (!schoolId) {
    throw new Error("UNAUTHORIZED: Missing authenticated school context");
  }
  return schoolId;
}

// ─── Settings ───────────────────────────────────────────────────────────────
transportRouter.get("/settings", async (req: Request, res: Response) => {
  try {
    const schoolId = getSchoolId(req);
    const settings = await getTransportSettings(schoolId);
    res.json(settings);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

transportRouter.put("/settings", requireTransportPermission('transport.manage'), async (req: Request, res: Response) => {
  try {
    const schoolId = getSchoolId(req);
    const updated = await saveTransportSettings(schoolId, req.body);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Vehicles ───────────────────────────────────────────────────────────────
transportRouter.get("/vehicles", async (req: Request, res: Response) => {
  try {
    const schoolId = getSchoolId(req);
    const vehicles = await getVehicles(schoolId);
    res.json(vehicles);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

transportRouter.post("/vehicles", requireTransportPermission('transport.manage'), async (req: Request, res: Response) => {
  try {
    const schoolId = getSchoolId(req);
    const result = await createVehicle(schoolId, req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.status(201).json(result.vehicle);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

transportRouter.put("/vehicles/:id", requireTransportPermission('transport.manage'), async (req: Request, res: Response) => {
  try {
    const schoolId = getSchoolId(req);
    const result = await updateVehicle(schoolId, req.params.id, req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.json(result.vehicle);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

transportRouter.delete("/vehicles/:id", requireTransportPermission('transport.manage'), async (req: Request, res: Response) => {
  try {
    const schoolId = getSchoolId(req);
    const result = await deleteVehicle(schoolId, req.params.id);
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Vehicle Documents ──────────────────────────────────────────────────────
transportRouter.get("/vehicles/:id/documents", async (req: Request, res: Response) => {
  try {
    const schoolId = getSchoolId(req);
    const docs = await getVehicleDocuments(schoolId, req.params.id);
    res.json(docs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

transportRouter.post("/vehicles/:id/documents", requireTransportPermission('transport.manage'), async (req: Request, res: Response) => {
  try {
    const schoolId = getSchoolId(req);
    const result = await addVehicleDocument(schoolId, {
      ...req.body,
      vehicle_id: req.params.id,
    });
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.status(201).json(result.document);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

transportRouter.delete("/vehicles/:id/documents/:docId", requireTransportPermission('transport.manage'), async (req: Request, res: Response) => {
  try {
    const schoolId = getSchoolId(req);
    await deleteVehicleDocument(schoolId, req.params.docId);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Staff (Drivers & Attendants) ───────────────────────────────────────────
transportRouter.get("/staff", async (req: Request, res: Response) => {
  try {
    const schoolId = getSchoolId(req);
    const staffType = req.query.type as "driver" | "attendant" | undefined;
    const staff = await getTransportStaff(schoolId, staffType);
    res.json(staff);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

transportRouter.post("/staff", requireTransportPermission('transport.manage'), async (req: Request, res: Response) => {
  try {
    const schoolId = getSchoolId(req);
    const result = await createTransportStaff(schoolId, req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.status(201).json(result.staff);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

transportRouter.put("/staff/:id", requireTransportPermission('transport.manage'), async (req: Request, res: Response) => {
  try {
    const schoolId = getSchoolId(req);
    const result = await updateTransportStaff(schoolId, req.params.id, req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.json(result.staff);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

transportRouter.delete("/staff/:id", requireTransportPermission('transport.manage'), async (req: Request, res: Response) => {
  try {
    const schoolId = getSchoolId(req);
    const result = await deleteTransportStaff(schoolId, req.params.id);
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

transportRouter.post("/staff/:id/invite", async (req: Request, res: Response) => {
  try {
    const schoolId = getSchoolId(req);
    const staffList = await getTransportStaff(schoolId);
    const staff = staffList.find((s) => s.id === req.params.id);
    if (!staff) {
      res.status(404).json({ error: "Staff member not found." });
      return;
    }
    const schoolName = req.body.schoolName || "MyZkool Academy";
    const invite = generateDriverAppInvite(staff, schoolName);
    res.json(invite);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Routes & Stops ─────────────────────────────────────────────────────────
transportRouter.get("/routes", async (req: Request, res: Response) => {
  try {
    const schoolId = getSchoolId(req);
    const routes = await getRoutes(schoolId);
    res.json(routes);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

transportRouter.post("/routes", requireTransportPermission('transport.manage'), async (req: Request, res: Response) => {
  try {
    const schoolId = getSchoolId(req);
    const result = await createRoute(schoolId, req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.status(201).json(result.route);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

transportRouter.put("/routes/:id", requireTransportPermission('transport.manage'), async (req: Request, res: Response) => {
  try {
    const schoolId = getSchoolId(req);
    const result = await updateRoute(schoolId, req.params.id, req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.json(result.route);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

transportRouter.delete("/routes/:id", requireTransportPermission('transport.manage'), async (req: Request, res: Response) => {
  try {
    const schoolId = getSchoolId(req);
    const result = await deleteRoute(schoolId, req.params.id);
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

transportRouter.post("/routes/:id/stops", requireTransportPermission('transport.manage'), async (req: Request, res: Response) => {
  try {
    const schoolId = getSchoolId(req);
    const result = await saveRouteStops(schoolId, req.params.id, req.body.stops);
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.json(result.stops);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

transportRouter.get("/routes/:id/sheet", requireTransportPermission('transport.manage'), async (req: Request, res: Response) => {
  try {
    const schoolId = getSchoolId(req);
    const data = await getRouteRosterReport(schoolId, req.params.id);
    if (!data) {
      res.status(404).json({ error: "Route not found" });
      return;
    }
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Fee Zones ──────────────────────────────────────────────────────────────
transportRouter.get("/fees", async (req: Request, res: Response) => {
  try {
    const schoolId = getSchoolId(req);
    const zones = await getFeeZones(schoolId);
    res.json(zones);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

transportRouter.post("/fees", requireTransportPermission('transport.fees.manage'), async (req: Request, res: Response) => {
  try {
    const schoolId = getSchoolId(req);
    const result = await createFeeZone(schoolId, req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.status(201).json(result.zone);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

transportRouter.put("/fees/:id", requireTransportPermission('transport.fees.manage'), async (req: Request, res: Response) => {
  try {
    const schoolId = getSchoolId(req);
    const result = await updateFeeZone(schoolId, req.params.id, req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.json(result.zone);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

transportRouter.delete("/fees/:id", requireTransportPermission('transport.fees.manage'), async (req: Request, res: Response) => {
  try {
    const schoolId = getSchoolId(req);
    const result = await deleteFeeZone(schoolId, req.params.id);
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Apply zone fee change to existing assignments (Spec C4.5)
transportRouter.post("/fees/:id/apply-to-existing", requireTransportPermission('transport.fees.manage'), async (req: Request, res: Response) => {
  try {
    const schoolId = getSchoolId(req);
    const zoneId = req.params.id;
    const { effective_term_id, preview_only } = req.body;
    // Get zone and active assignments using that zone
    const zones = await getFeeZones(schoolId);
    const zone = zones.find((z: any) => z.id === zoneId);
    if (!zone) {
      res.status(404).json({ error: "Fee zone not found" });
      return;
    }
    // Return preview data; actual update is an owner-approved operation
    res.json({
      zone_id: zoneId,
      preview_only: preview_only ?? true,
      effective_term_id: effective_term_id ?? null,
      message: "Apply-to-existing preview. Confirm with preview_only=false to create an approval request.",
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Dashboard & Expiry Check ───────────────────────────────────────────────
transportRouter.get("/dashboard", async (req: Request, res: Response) => {
  try {
    const schoolId = getSchoolId(req);
    const data = await getTransportDashboardData(schoolId);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

transportRouter.post("/expiry-check", async (req: Request, res: Response) => {
  try {
    const schoolId = getSchoolId(req);
    const report = await runDocumentExpiryJob(schoolId);
    res.json(report);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Student Transport Lifecycle (Spec C5, C7, C13) ─────────────────────────

transportRouter.get("/students/:id/transport", async (req: Request, res: Response) => {
  try {
    const schoolId = getSchoolId(req);
    const data = await getStudentTransportDetails(schoolId, req.params.id);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

transportRouter.post("/assignments", requireTransportPermission('transport.assign'), async (req: Request, res: Response) => {
  try {
    const schoolId = getSchoolId(req);
    const result = await createAssignment(schoolId, req.body);
    if (!result.success) {
      const statusCode = result.error === "PLAN_REQUIRED" ? 402 : 400;
      res.status(statusCode).json({ error: result.error });
      return;
    }
    res.status(201).json(result.assignment);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

transportRouter.post("/assignments/bulk", requireTransportPermission('transport.assign'), async (req: Request, res: Response) => {
  try {
    const schoolId = getSchoolId(req);
    const result = await bulkAssignStudents(schoolId, req.body);
    if (!result.success) {
      const statusCode = result.error === "PLAN_REQUIRED" ? 402 : 400;
      res.status(statusCode).json({ error: result.error });
      return;
    }
    res.status(201).json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

transportRouter.post("/assignments/:id/change", requireTransportPermission('transport.assign'), async (req: Request, res: Response) => {
  try {
    const schoolId = getSchoolId(req);
    const result = await changeAssignment(schoolId, req.params.id, req.body);
    if (!result.success) {
      const statusCode = result.error === "PLAN_REQUIRED" ? 402 : 400;
      res.status(statusCode).json({ error: result.error });
      return;
    }
    res.json(result.assignment);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

transportRouter.post("/assignments/:id/stop", requireTransportPermission('transport.assign'), async (req: Request, res: Response) => {
  try {
    const schoolId = getSchoolId(req);
    const result = await stopAssignment(schoolId, req.params.id, req.body);
    if (!result.success) {
      const statusCode = result.error === "PLAN_REQUIRED" ? 402 : 400;
      res.status(statusCode).json({ error: result.error });
      return;
    }
    res.json(result.assignment);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Requests ───────────────────────────────────────────────────────────────

transportRouter.get("/requests", async (req: Request, res: Response) => {
  try {
    const schoolId = getSchoolId(req);
    const requests = await listTransportRequests(schoolId, req.query.status as any);
    res.json(requests);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

transportRouter.post("/requests", requireTransportPermission('transport.assign'), async (req: Request, res: Response) => {
  try {
    const schoolId = getSchoolId(req);
    const result = await createTransportRequest(schoolId, req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.status(201).json(result.request);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

transportRouter.patch("/requests/:id", requireTransportPermission('transport.assign'), async (req: Request, res: Response) => {
  try {
    const schoolId = getSchoolId(req);
    const result = await updateTransportRequestStatus(
      schoolId,
      req.params.id,
      req.body.status,
      req.body.decided_by
    );
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Absences ───────────────────────────────────────────────────────────────

transportRouter.post("/absences", requireTransportPermission('transport.assign'), async (req: Request, res: Response) => {
  try {
    const schoolId = getSchoolId(req);
    const result = await recordAbsence(schoolId, req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.status(201).json(result.absence);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

transportRouter.get("/absences", async (req: Request, res: Response) => {
  try {
    const schoolId = getSchoolId(req);
    const list = await listAbsences(schoolId, req.query.student_id as string);
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Year Renewal ───────────────────────────────────────────────────────────

transportRouter.get("/renewal/preview", requireTransportPermission('transport.assign'), async (req: Request, res: Response) => {
  try {
    const schoolId = getSchoolId(req);
    const oldYearId = req.query.old_year_id as string;
    const newYearId = req.query.new_year_id as string;
    if (!oldYearId || !newYearId) {
      res.status(400).json({ error: "old_year_id and new_year_id required" });
      return;
    }
    const preview = await getRenewalPreview(schoolId, oldYearId, newYearId);
    res.json(preview);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

transportRouter.post("/renewal/commit", requireTransportPermission('transport.assign'), async (req: Request, res: Response) => {
  try {
    const schoolId = getSchoolId(req);
    const result = await commitRenewal(schoolId, req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Reports (Spec C9) ───────────────────────────────────────────────────────

transportRouter.get("/reports/:key", async (req: Request, res: Response) => {
  try {
    const schoolId = getSchoolId(req);
    const key = req.params.key;

    switch (key) {
      case "roster": {
        const routeId = req.query.route_id as string;
        if (!routeId) {
          res.status(400).json({ error: "route_id required for roster" });
          return;
        }
        const data = await getRouteRosterReport(schoolId, routeId);
        res.json(data);
        break;
      }
      case "riders": {
        const data = await getRidersByRouteAndStopReport(schoolId);
        res.json(data);
        break;
      }
      case "utilisation": {
        const data = await getVehicleUtilisationReport(schoolId);
        res.json(data);
        break;
      }
      case "unassigned": {
        const data = await getUnassignedAndRequestsReport(schoolId);
        res.json(data);
        break;
      }
      case "fee": {
        const data = await getTransportFeeReport(schoolId);
        res.json(data);
        break;
      }
      case "document_expiry": {
        const report = await runDocumentExpiryJob(schoolId);
        res.json(report);
        break;
      }
      case "assignment_history": {
        const studentId = req.query.student_id as string | undefined;
        const data = await getAssignmentHistoryReport(schoolId, studentId);
        res.json(data);
        break;
      }
      default:
        res.status(404).json({ error: `Unknown report: ${key}` });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

