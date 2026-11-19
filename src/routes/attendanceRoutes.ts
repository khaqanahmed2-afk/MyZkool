/**
 * Attendance API Routes
 * Mounted at /api/attendance.
 * Protected by requireSchoolContext for multi-tenant isolation.
 */

import { Router, Request, Response } from "express";
import { requireSchoolContext } from "../middleware/auth";
import {
  getAttendanceDashboardSummary,
  getClassAttendanceOverview,
  getEnrolledStudentsForAttendance,
  saveClassAttendance,
  getAttendanceHistory,
  updateStudentAttendanceRecord,
  getAttendanceCorrectionsLog,
  scanQRAttendance,
  getDailyAttendanceReport,
  getMonthlyAttendanceReport,
  getStudentAttendanceReport,
  getAttendanceSettings,
  updateAttendanceSettings,
} from "../services/attendanceService";

const router = Router();

// Apply school context authentication to all attendance routes
router.use(requireSchoolContext);

function getSchoolId(req: Request): string {
  const schoolId = (req as any).schoolId || (req as any).user?.school_id;
  if (!schoolId) {
    throw new Error("School context is missing from request");
  }
  return schoolId;
}

function getUserId(req: Request): string | undefined {
  return (req as any).user?.id || (req as any).user?.auth_id;
}

// 1. Dashboard Summary
router.get("/summary", async (req: Request, res: Response) => {
  try {
    const schoolId = getSchoolId(req);
    const date = (req.query.date as string) || undefined;
    const academicYearId = (req.query.academicYearId as string) || undefined;

    const data = await getAttendanceDashboardSummary({ schoolId, date, academicYearId });
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to fetch attendance summary" });
  }
});

// 2. Class Overview
router.get("/overview", async (req: Request, res: Response) => {
  try {
    const schoolId = getSchoolId(req);
    const date = (req.query.date as string) || undefined;
    const academicYearId = (req.query.academicYearId as string) || undefined;

    const data = await getClassAttendanceOverview({ schoolId, date, academicYearId });
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to fetch class attendance overview" });
  }
});

// 3. Enrolled Students For Attendance Marking
router.get("/students", async (req: Request, res: Response) => {
  try {
    const schoolId = getSchoolId(req);
    const academicYearId = req.query.academicYearId as string;
    const classId = req.query.classId as string;
    const sectionId = (req.query.sectionId as string) || undefined;
    const date = (req.query.date as string) || undefined;

    if (!classId || !date) {
      return res.status(400).json({ error: "classId and date are required parameters" });
    }

    const result = await getEnrolledStudentsForAttendance({
      schoolId,
      academicYearId,
      classId,
      sectionId,
      date,
    });
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to fetch students for attendance" });
  }
});

// 4. Save Class Attendance
router.post("/save", async (req: Request, res: Response) => {
  try {
    const schoolId = getSchoolId(req);
    const userId = getUserId(req);
    const { academicYearId, classId, sectionId, date, sessionName, records, notes } = req.body;

    if (!classId || !date || !records || !Array.isArray(records)) {
      return res.status(400).json({ error: "classId, date, and student records array are required" });
    }

    const result = await saveClassAttendance({
      schoolId,
      academicYearId,
      classId,
      sectionId,
      date,
      sessionName,
      records,
      notes,
      takenBy: userId,
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to save attendance" });
  }
});

// 5. Attendance History
router.get("/history", async (req: Request, res: Response) => {
  try {
    const schoolId = getSchoolId(req);
    const {
      startDate,
      endDate,
      academicYearId,
      classId,
      sectionId,
      studentId,
      status,
      search,
      page,
      pageSize,
    } = req.query;

    const filters = {
      startDate: startDate as string,
      endDate: endDate as string,
      academicYearId: academicYearId as string,
      classId: classId as string,
      sectionId: sectionId as string,
      studentId: studentId as string,
      status: status as any,
      search: search as string,
    };

    const parsedPage = page ? parseInt(page as string, 10) : 1;
    const parsedPageSize = pageSize ? parseInt(pageSize as string, 10) : 50;

    const data = await getAttendanceHistory({
      schoolId,
      filters,
      page: parsedPage,
      pageSize: parsedPageSize,
    });

    res.json({ success: true, ...data });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to fetch attendance history" });
  }
});

// 6. Update Single Student Attendance Record
router.patch("/record/:id", async (req: Request, res: Response) => {
  try {
    const schoolId = getSchoolId(req);
    const userId = getUserId(req);
    const recordId = req.params.id;
    const { newStatus, reason } = req.body;

    if (!newStatus || !reason?.trim()) {
      return res.status(400).json({ error: "newStatus and correction reason are required" });
    }

    const result = await updateStudentAttendanceRecord({
      schoolId,
      recordId,
      newStatus,
      reason,
      changedBy: userId,
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to update attendance record" });
  }
});

// 7. Get Corrections Audit Log
router.get("/corrections", async (req: Request, res: Response) => {
  try {
    const schoolId = getSchoolId(req);
    const recordId = req.query.recordId as string;
    const studentId = req.query.studentId as string;

    const logs = await getAttendanceCorrectionsLog({ schoolId, recordId, studentId });
    res.json({ success: true, data: logs });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to fetch corrections log" });
  }
});

// 8. QR Scan Attendance
router.post("/scan-qr", async (req: Request, res: Response) => {
  try {
    const schoolId = getSchoolId(req);
    const userId = getUserId(req);
    const { verificationToken, date, sessionName, status } = req.body;

    if (!verificationToken?.trim()) {
      return res.status(400).json({ error: "verificationToken is required" });
    }

    const result = await scanQRAttendance({
      schoolId,
      verificationToken,
      date,
      sessionName,
      status,
      markedBy: userId,
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to process QR attendance" });
  }
});

// 9. Daily Report
router.get("/reports/daily", async (req: Request, res: Response) => {
  try {
    const schoolId = getSchoolId(req);
    const date = (req.query.date as string) || new Date().toISOString().split("T")[0];
    const academicYearId = (req.query.academicYearId as string) || undefined;

    const report = await getDailyAttendanceReport({ schoolId, date, academicYearId });
    res.json({ success: true, data: report });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to generate daily report" });
  }
});

// 10. Monthly Report
router.get("/reports/monthly", async (req: Request, res: Response) => {
  try {
    const schoolId = getSchoolId(req);
    const year = parseInt(req.query.year as string, 10) || new Date().getFullYear();
    const month = parseInt(req.query.month as string, 10) || new Date().getMonth() + 1;
    const academicYearId = (req.query.academicYearId as string) || undefined;
    const classId = (req.query.classId as string) || undefined;
    const sectionId = (req.query.sectionId as string) || undefined;

    const report = await getMonthlyAttendanceReport({
      schoolId,
      year,
      month,
      academicYearId,
      classId,
      sectionId,
    });

    res.json({ success: true, data: report });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to generate monthly report" });
  }
});

// 11. Student Individual Report
router.get("/reports/student/:studentId", async (req: Request, res: Response) => {
  try {
    const schoolId = getSchoolId(req);
    const studentId = req.params.studentId;
    const academicYearId = (req.query.academicYearId as string) || undefined;
    const startDate = (req.query.startDate as string) || undefined;
    const endDate = (req.query.endDate as string) || undefined;

    const report = await getStudentAttendanceReport({
      schoolId,
      studentId,
      academicYearId,
      startDate,
      endDate,
    });

    if (!report) {
      return res.status(404).json({ error: "Student or attendance report not found" });
    }

    res.json({ success: true, data: report });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to generate student attendance report" });
  }
});

// 12. Settings
router.get("/settings", async (req: Request, res: Response) => {
  try {
    const schoolId = getSchoolId(req);
    const settings = await getAttendanceSettings(schoolId);
    res.json({ success: true, data: settings });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to fetch attendance settings" });
  }
});

router.put("/settings", async (req: Request, res: Response) => {
  try {
    const schoolId = getSchoolId(req);
    const result = await updateAttendanceSettings({ schoolId, settings: req.body });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to update attendance settings" });
  }
});

export default router;
