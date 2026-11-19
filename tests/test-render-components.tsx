import React from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { AuthContext } from "../src/context/AuthContext";

// Import all 6 Attendance Components
import { TakeAttendance } from "../src/pages/admin/attendance/TakeAttendance";
import { AttendanceHistory } from "../src/pages/admin/attendance/AttendanceHistory";
import { AttendanceReports } from "../src/pages/admin/attendance/AttendanceReports";
import { AttendanceDashboard } from "../src/pages/admin/attendance/AttendanceDashboard";
import { QRAttendance } from "../src/pages/admin/attendance/QRAttendance";
import { AttendanceSettingsPage } from "../src/pages/admin/attendance/AttendanceSettingsPage";

async function runRenderTests() {
  console.log("=================================================");
  console.log("RUNNING REACT RUNTIME COMPONENT RENDERING TESTS");
  console.log("=================================================");

  const mockSchool = {
    id: "f8b9e67d-93cb-4a11-8e34-58a36cbfb8e0",
    name: "Springfield High School",
    code: "SHS",
    subdomain: "springfield",
    email: "admin@springfield.edu",
    phone: "1234567890",
    address: "742 Evergreen Terrace",
    status: "active" as const,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const mockAcademicYear = {
    id: "277e5d8d-29c8-472e-84ad-e71e3b6aa8a8",
    school_id: mockSchool.id,
    label: "2026-2027",
    start_date: "2026-04-01",
    end_date: "2027-03-31",
    is_current: true,
    status: "active" as const,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const mockAuthContextValue: any = {
    user: { id: "user-123", email: "admin@springfield.edu" },
    session: { access_token: "mock-token" },
    profile: { id: "profile-123", full_name: "Admin User", role: "school_admin" },
    role: "school_admin",
    schoolId: mockSchool.id,
    school: mockSchool,
    loading: false,
    isAuthenticated: true,
    availableSchools: [mockSchool],
    currentAcademicYear: mockAcademicYear,
    switchSchool: async () => ({ success: true }),
    refreshSchool: async () => {},
    signIn: async () => ({ success: true }),
    signUp: async () => ({ success: true }),
    signInWithGoogle: async () => ({ success: true }),
    signOut: async () => {},
    resetPassword: async () => ({ success: true }),
    updatePassword: async () => ({ success: true }),
    resendVerificationEmail: async () => ({ success: true }),
    refreshSession: async () => {},
  };

  const emptyAuthContextValue: any = {
    ...mockAuthContextValue,
    school: null,
    schoolId: null,
    currentAcademicYear: null,
    user: null,
  };

  const componentsToTest = [
    {
      name: "1. TakeAttendance (/admin/attendance/take)",
      component: <TakeAttendance />,
    },
    {
      name: "2. AttendanceHistory (/admin/attendance/history)",
      component: <AttendanceHistory />,
    },
    {
      name: "3. AttendanceReports (/admin/attendance/reports)",
      component: <AttendanceReports />,
    },
    {
      name: "4. AttendanceDashboard (/admin/attendance)",
      component: <AttendanceDashboard />,
    },
    {
      name: "5. QRAttendance (/admin/attendance/qr)",
      component: <QRAttendance />,
    },
    {
      name: "6. AttendanceSettingsPage (/admin/attendance/settings)",
      component: <AttendanceSettingsPage />,
    },
  ];

  let passed = 0;
  let failed = 0;

  for (const { name, component } of componentsToTest) {
    console.log(`\nTesting: ${name}`);

    // Test with Full Authenticated Context
    try {
      const html = renderToString(
        <MemoryRouter>
          <AuthContext.Provider value={mockAuthContextValue}>
            {component}
          </AuthContext.Provider>
        </MemoryRouter>
      );
      if (html && html.length > 50) {
        console.log(`  ✓ Rendered with Authenticated Context: Success (${html.length} bytes rendered)`);
        passed++;
      } else {
        console.error(`  ✗ Blank/Empty output rendered! (${html.length} bytes)`);
        failed++;
      }
    } catch (err: any) {
      console.error(`  ✗ CRASH with Authenticated Context:`, err?.message || err);
      failed++;
    }

    // Test with Empty / Null Context
    try {
      const htmlEmpty = renderToString(
        <MemoryRouter>
          <AuthContext.Provider value={emptyAuthContextValue}>
            {component}
          </AuthContext.Provider>
        </MemoryRouter>
      );
      if (htmlEmpty && htmlEmpty.length > 50) {
        console.log(`  ✓ Rendered with Empty Context: Success (${htmlEmpty.length} bytes rendered)`);
        passed++;
      } else {
        console.error(`  ✗ Blank/Empty output rendered on empty context!`);
        failed++;
      }
    } catch (err: any) {
      console.error(`  ✗ CRASH with Empty Context:`, err?.message || err);
      failed++;
    }
  }

  console.log("\n=================================================");
  console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log("=================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runRenderTests().catch((e) => {
  console.error("FATAL ERROR IN RENDER TEST RUNNER:", e);
  process.exit(1);
});
