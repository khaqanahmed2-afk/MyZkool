/**
 * Transport API Routes (Spec 1.5, C1, C2, C3, C4, C9, C10, C15)
 * Mounted at /api/transport.
 * EVERY route is protected by requireFeature('transport').
 */

import { Router, Request, Response } from "express";
import { requireFeature } from "../middleware/features";
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

export const transportRouter = Router();

// ENFORCE PLAN GATING ON EVERY /api/transport ROUTE
transportRouter.use(requireFeature("transport"));

function getSchoolId(req: Request): string {
  return (
    (req as any).schoolId ||
    (req.headers["x-school-id"] as string) ||
    "default-school"
  );
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

transportRouter.put("/settings", async (req: Request, res: Response) => {
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

transportRouter.post("/vehicles", async (req: Request, res: Response) => {
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

transportRouter.put("/vehicles/:id", async (req: Request, res: Response) => {
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

transportRouter.delete("/vehicles/:id", async (req: Request, res: Response) => {
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

transportRouter.post("/vehicles/:id/documents", async (req: Request, res: Response) => {
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

transportRouter.delete("/vehicles/:id/documents/:docId", async (req: Request, res: Response) => {
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

transportRouter.post("/staff", async (req: Request, res: Response) => {
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

transportRouter.put("/staff/:id", async (req: Request, res: Response) => {
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

transportRouter.delete("/staff/:id", async (req: Request, res: Response) => {
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

transportRouter.post("/routes", async (req: Request, res: Response) => {
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

transportRouter.put("/routes/:id", async (req: Request, res: Response) => {
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

transportRouter.delete("/routes/:id", async (req: Request, res: Response) => {
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

transportRouter.post("/routes/:id/stops", async (req: Request, res: Response) => {
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

transportRouter.post("/fees", async (req: Request, res: Response) => {
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

transportRouter.put("/fees/:id", async (req: Request, res: Response) => {
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

transportRouter.delete("/fees/:id", async (req: Request, res: Response) => {
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
