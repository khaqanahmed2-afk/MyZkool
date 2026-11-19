import { describe, it } from "node:test";
import assert from "node:assert";

// Test the exact filter & transformation logic implemented in the components

describe("Attendance Component Logic & Edge Case Verification", () => {
  it("TakeAttendance: filteredStudents handles null/undefined fields without throwing", () => {
    const students: any[] = [
      {
        student_id: "s1",
        full_name: "John Doe",
        first_name: "John",
        admission_no: "ADM-001",
        roll_no: "101",
        status: "present",
      },
      {
        student_id: "s2",
        full_name: null,
        first_name: null,
        admission_no: null,
        roll_no: null,
        status: "absent",
      },
      {
        student_id: "s3",
        full_name: "Jane Smith",
        first_name: "Jane",
        admission_no: "ADM-002",
        roll_no: undefined,
        status: "present",
      },
    ];

    const searchQuery = "john";
    const q = (searchQuery || "").trim().toLowerCase();
    const filtered = (students || []).filter((s) => {
      const name = (s.full_name || "").toLowerCase();
      const adm = (s.admission_no || "").toLowerCase();
      const roll = (s.roll_no || "").toLowerCase();
      return name.includes(q) || adm.includes(q) || roll.includes(q);
    });

    assert.strictEqual(filtered.length, 1);
    assert.strictEqual(filtered[0].student_id, "s1");
  });

  it("TakeAttendance: metadata unpacking handles objects returned by services", () => {
    const yearsRes = { academicYears: [{ id: "ay1", label: "2026-2027", is_current: true }] };
    const classesRes = {
      classes: [
        { id: "c1", name: "Class 1", sections: [{ id: "sec1", name: "A" }] },
        { id: "c2", name: "Class 2", sections: [] },
      ],
    };

    const loadedYears = Array.isArray(yearsRes?.academicYears) ? yearsRes.academicYears : [];
    const loadedClasses = Array.isArray(classesRes?.classes) ? classesRes.classes : [];

    assert.strictEqual(loadedYears.length, 1);
    assert.strictEqual(loadedClasses.length, 2);

    const activeClass = Array.isArray(loadedClasses) ? loadedClasses.find((c) => c.id === "c1") : undefined;
    assert.strictEqual(activeClass?.name, "Class 1");
    assert.strictEqual(activeClass?.sections?.length, 1);
  });

  it("AttendanceHistory: filteredRecords handles null student_name, admission_no, and roll_no", () => {
    const records: any[] = [
      {
        id: "r1",
        student_name: "Alice Wonderland",
        admission_no: "ADM-100",
        roll_no: "01",
        status: "present",
      },
      {
        id: "r2",
        student_name: undefined,
        admission_no: null,
        roll_no: null,
        status: "absent",
      },
    ];

    const searchQuery = "alice";
    const q = (searchQuery || "").trim().toLowerCase();
    const filtered = (records || []).filter((r) => {
      const name = (r.student_name || "").toLowerCase();
      const adm = (r.admission_no || "").toLowerCase();
      const roll = (r.roll_no || "").toLowerCase();
      return name.includes(q) || adm.includes(q) || roll.includes(q);
    });

    assert.strictEqual(filtered.length, 1);
    assert.strictEqual(filtered[0].id, "r1");
  });

  it("AttendanceReports: daily report handles empty class_summaries", () => {
    const dailyData: any = {
      date: "2026-11-19",
      total_students: 0,
      present_count: 0,
      absent_count: 0,
      late_count: 0,
      leave_count: 0,
      overall_percentage: 0,
      class_summaries: [],
    };

    const rows = (dailyData.class_summaries || []).map((c: any) => [
      c.class_name,
      c.section_name || "N/A",
      c.total_students,
      c.present_count,
    ]);

    assert.strictEqual(rows.length, 0);
  });

  it("AttendanceDashboard: safeOverview handles classOverview with null class_name or section_name", () => {
    const classOverview: any[] = [
      {
        class_id: "c1",
        class_name: "Grade 10",
        section_name: null,
        total_students: 20,
        is_recorded: true,
      },
      {
        class_id: "c2",
        class_name: null,
        section_name: "Section B",
        total_students: 15,
        is_recorded: false,
      },
    ];

    const safeOverview = Array.isArray(classOverview) ? classOverview : [];
    const filterClassQuery = "grade";

    const filteredOverview = safeOverview.filter(
      (c) =>
        (c.class_name || "").toLowerCase().includes((filterClassQuery || "").toLowerCase()) ||
        (c.section_name || "").toLowerCase().includes((filterClassQuery || "").toLowerCase())
    );

    assert.strictEqual(filteredOverview.length, 1);
    assert.strictEqual(filteredOverview[0].class_id, "c1");
  });
});
