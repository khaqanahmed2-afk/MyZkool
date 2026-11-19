/**
 * AppRoutes — All authenticated, onboarding, and admin routes.
 * AuthProvider (and therefore Supabase) is ONLY initialized here,
 * not on the public landing page. This keeps the landing page
 * free of auth-related JavaScript on the critical path.
 */

import React, { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "../context/AuthContext";
import { ProtectedRoute } from "../components/auth/ProtectedRoute";
import { MasterAdminAuthProvider } from "../context/MasterAdminAuthContext";
import { MasterAdminRoute } from "../components/master-admin/MasterAdminRoute";

function PageLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm font-medium text-slate-500">Loading...</span>
      </div>
    </div>
  );
}

// Authentication Routes
const Register = lazy(() => import("../pages/auth/Register"));
const Login = lazy(() => import("../pages/auth/Login"));
const Verify = lazy(() => import("../pages/auth/Verify"));
const ResetPassword = lazy(() => import("../pages/auth/ResetPassword"));
const StudentCardVerificationPage = lazy(() => import("../pages/public/StudentCardVerificationPage"));

// Onboarding Routes
const SchoolProfile = lazy(() => import("../pages/onboarding/SchoolProfile"));
const AcademicSetup = lazy(() => import("../pages/onboarding/AcademicSetup"));
const ClassesSections = lazy(() => import("../pages/onboarding/ClassesSections"));
const Subscription = lazy(() => import("../pages/onboarding/Subscription"));
const WebsiteSetup = lazy(() => import("../pages/onboarding/WebsiteSetup"));
const Complete = lazy(() => import("../pages/onboarding/Complete"));

// Admin Shell & Core Dashboard
const AdminShell = lazy(() =>
  import("../components/admin/AdminShell").then((m) => ({ default: m.AdminShell }))
);
const DashboardHome = lazy(() => import("../pages/admin/Dashboard"));
const ModulePlaceholder = lazy(() => import("../pages/admin/ModulePlaceholder"));

// Students Management
const StudentList = lazy(() => import("../pages/admin/students/StudentList"));
const StudentProfileView = lazy(() => import("../pages/admin/students/StudentProfile"));
const StudentAdmissionWizard = lazy(() =>
  import("../pages/admin/students/wizard/StudentAdmissionWizard").then((m) => ({
    default: m.StudentAdmissionWizard,
  }))
);
const StudentBulkImport = lazy(() => import("../pages/admin/students/StudentBulkImport"));
const StudentPromotionPipeline = lazy(() => import("../pages/admin/students/StudentPromotionPipeline"));
const StudentTCRegister = lazy(() => import("../pages/admin/students/StudentTCRegister"));
const StudentIdCards = lazy(() => import("../pages/admin/students/StudentIdCards"));
const ClassesSettings = lazy(() => import("../pages/admin/settings/ClassesSettings"));
const DataDeletionSettings = lazy(() => import("../pages/admin/settings/DataDeletionSettings"));

// Fees Management
const FeeSetupChecklist = lazy(() => import("../pages/admin/fees/FeeSetupChecklist"));
const FeeHeadsPage = lazy(() => import("../pages/admin/fees/FeeHeadsPage"));
const FeeTermsPage = lazy(() => import("../pages/admin/fees/FeeTermsPage"));
const FeeStructuresPage = lazy(() => import("../pages/admin/fees/FeeStructuresPage"));
const ConcessionRulesPage = lazy(() => import("../pages/admin/fees/ConcessionRulesPage"));
const LateFeeRulesPage = lazy(() => import("../pages/admin/fees/LateFeeRulesPage"));
const FeeSettingsPage = lazy(() => import("../pages/admin/fees/FeeSettingsPage"));
const ReceiptPreviewPage = lazy(() => import("../pages/admin/fees/ReceiptPreviewPage"));
const InvoicesPage = lazy(() => import("../pages/admin/fees/InvoicesPage"));
const InvoiceDetailPage = lazy(() => import("../pages/admin/fees/InvoiceDetailPage"));
const ApprovalsPage = lazy(() => import("../pages/admin/approvals/ApprovalsPage"));
const FeeCollectionsPage = lazy(() => import("../pages/admin/fees/FeeCollectionsPage"));
const FeeCollectPage = lazy(() => import("../pages/admin/fees/FeeCollectPage"));
const StudentLedgerPage = lazy(() => import("../pages/admin/fees/StudentLedgerPage"));
const FeeDashboard = lazy(() => import("../pages/admin/fees/FeeDashboard"));
const DuesRemindersPage = lazy(() => import("../pages/admin/fees/DuesRemindersPage"));
const ChequeRegisterPage = lazy(() => import("../pages/admin/fees/ChequeRegisterPage"));
const RefundsPage = lazy(() => import("../pages/admin/fees/RefundsPage"));
const DayClosePage = lazy(() => import("../pages/admin/fees/DayClosePage"));
const FeeReportsPage = lazy(() => import("../pages/admin/fees/FeeReportsPage"));

// Transport Management
const TransportDashboard = lazy(() => import("../pages/admin/transport/TransportDashboard"));
const VehiclesPage = lazy(() => import("../pages/admin/transport/VehiclesPage"));
const TransportStaffPage = lazy(() => import("../pages/admin/transport/TransportStaffPage"));
const RouteBuilderPage = lazy(() => import("../pages/admin/transport/RouteBuilderPage"));
const FeeZonesPage = lazy(() => import("../pages/admin/transport/FeeZonesPage"));
const BulkAssignPage = lazy(() =>
  import("../pages/admin/transport/BulkAssignPage").then((m) => ({ default: m.BulkAssignPage }))
);
const YearRenewalPage = lazy(() =>
  import("../pages/admin/transport/YearRenewalPage").then((m) => ({ default: m.YearRenewalPage }))
);
// Attendance Management
const AttendanceDashboard = lazy(() => import("../pages/admin/attendance/AttendanceDashboard"));
const TakeAttendance = lazy(() => import("../pages/admin/attendance/TakeAttendance"));
const QRAttendance = lazy(() => import("../pages/admin/attendance/QRAttendance"));
const AttendanceHistory = lazy(() => import("../pages/admin/attendance/AttendanceHistory"));
const AttendanceReports = lazy(() => import("../pages/admin/attendance/AttendanceReports"));
const AttendanceSettingsPage = lazy(() => import("../pages/admin/attendance/AttendanceSettingsPage"));

const NotFoundPage = lazy(() => import("../pages/NotFoundPage"));

// Master Admin Control Plane
const MasterAdminLogin = lazy(() => import("../pages/master-admin/MasterAdminLogin"));
const MasterAdminShell = lazy(() =>
  import("../components/master-admin/MasterAdminShell").then((m) => ({ default: m.MasterAdminShell }))
);
const MasterAdminDashboard = lazy(() => import("../pages/master-admin/MasterAdminDashboard"));
const MasterAdminSchools = lazy(() => import("../pages/master-admin/MasterAdminSchools"));
const MasterAdminSchoolNew = lazy(() => import("../pages/master-admin/MasterAdminSchoolNew"));
const MasterAdminSchoolDetail = lazy(() => import("../pages/master-admin/MasterAdminSchoolDetail"));
const MasterAdminSubscriptions = lazy(() => import("../pages/master-admin/MasterAdminSubscriptions"));
const MasterAdminBilling = lazy(() => import("../pages/master-admin/MasterAdminBilling"));
const MasterAdminUsers = lazy(() => import("../pages/master-admin/MasterAdminUsers"));
const MasterAdminSupport = lazy(() => import("../pages/master-admin/MasterAdminSupport"));
const MasterAdminAnnouncements = lazy(() => import("../pages/master-admin/MasterAdminAnnouncements"));
const MasterAdminSettings = lazy(() => import("../pages/master-admin/MasterAdminSettings"));
const MasterAdminMonitoring = lazy(() => import("../pages/master-admin/MasterAdminMonitoring"));
const MasterAdminAuditLogs = lazy(() => import("../pages/master-admin/MasterAdminAuditLogs"));

export default function AppRoutes() {
  return (
    <AuthProvider>
      <Suspense fallback={<PageLoading />}>
        <Routes>
          {/* Authentication */}
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path="/verify" element={<Verify />} />
          <Route path="/verify/student/:token" element={<StudentCardVerificationPage />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Onboarding (protected, pre-onboarding & additional school registration) */}
          <Route
            path="/onboarding/new-school"
            element={
              <ProtectedRoute allowedRoles={["school_admin", "super_admin"]} requireCompletedOnboarding={false}>
                <SchoolProfile forceNewSchool={true} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/onboarding/school"
            element={
              <ProtectedRoute allowedRoles={["school_admin", "super_admin"]} requireCompletedOnboarding={false}>
                <SchoolProfile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/onboarding/academics"
            element={
              <ProtectedRoute allowedRoles={["school_admin", "super_admin"]} requireCompletedOnboarding={false}>
                <AcademicSetup />
              </ProtectedRoute>
            }
          />
          <Route
            path="/onboarding/classes"
            element={
              <ProtectedRoute allowedRoles={["school_admin", "super_admin"]} requireCompletedOnboarding={false}>
                <ClassesSections />
              </ProtectedRoute>
            }
          />
          <Route
            path="/onboarding/subscription"
            element={
              <ProtectedRoute allowedRoles={["school_admin", "super_admin"]} requireCompletedOnboarding={false}>
                <Subscription />
              </ProtectedRoute>
            }
          />
          <Route
            path="/onboarding/website"
            element={
              <ProtectedRoute allowedRoles={["school_admin", "super_admin"]} requireCompletedOnboarding={false}>
                <WebsiteSetup />
              </ProtectedRoute>
            }
          />
          <Route
            path="/onboarding/complete"
            element={
              <ProtectedRoute allowedRoles={["school_admin", "super_admin"]} requireCompletedOnboarding={false}>
                <Complete />
              </ProtectedRoute>
            }
          />

          {/* Standalone Receipt Preview for Print & Verification in separate tab */}
          <Route
            path="/admin/fees/receipt-preview"
            element={
              <ProtectedRoute allowedRoles={["school_admin", "super_admin"]} requireCompletedOnboarding={true}>
                <ReceiptPreviewPage />
              </ProtectedRoute>
            }
          />

          {/* Admin Dashboard (protected, requires completed onboarding) */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={["school_admin", "super_admin"]} requireCompletedOnboarding={true}>
                <AdminShell />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardHome />} />
            <Route path="students" element={<StudentList />} />
            <Route path="students/new" element={<StudentAdmissionWizard />} />
            <Route path="students/import" element={<StudentBulkImport />} />
            <Route path="students/promotion" element={<StudentPromotionPipeline />} />
            <Route path="students/tc" element={<StudentTCRegister />} />
            <Route path="students/id-cards" element={<StudentIdCards />} />
            <Route path="students/:id" element={<StudentProfileView />} />
            <Route path="students/:id/edit" element={<StudentAdmissionWizard />} />
            {/* Attendance Management */}
            <Route path="attendance" element={<AttendanceDashboard />} />
            <Route path="attendance/dashboard" element={<AttendanceDashboard />} />
            <Route path="attendance/take" element={<TakeAttendance />} />
            <Route path="attendance/qr" element={<QRAttendance />} />
            <Route path="attendance/history" element={<AttendanceHistory />} />
            <Route path="attendance/reports" element={<AttendanceReports />} />
            <Route path="attendance/settings" element={<AttendanceSettingsPage />} />
            <Route path="fees" element={<FeeDashboard />} />
            <Route path="fees/dashboard" element={<FeeDashboard />} />
            <Route path="fees/setup" element={<FeeSetupChecklist />} />
            <Route path="fees/setup/heads" element={<FeeHeadsPage />} />
            <Route path="fees/setup/terms" element={<FeeTermsPage />} />
            <Route path="fees/structures" element={<FeeStructuresPage />} />
            <Route path="fees/setup/structures" element={<FeeStructuresPage />} />
            <Route path="fees/setup/concessions" element={<ConcessionRulesPage />} />
            <Route path="fees/setup/late-fees" element={<LateFeeRulesPage />} />
            <Route path="fees/setup/settings" element={<FeeSettingsPage />} />
            <Route path="fees/receipt-preview" element={<ReceiptPreviewPage />} />
            <Route path="fees/invoice-settings" element={<FeeSettingsPage />} />
            <Route path="fees/dues" element={<InvoicesPage />} />
            <Route path="fees/invoices" element={<InvoicesPage />} />
            <Route path="fees/invoices/:id" element={<InvoiceDetailPage />} />
            <Route path="fees/assign" element={<InvoicesPage />} />
            <Route path="fees/collections" element={<FeeCollectionsPage />} />
            <Route path="fees/collect" element={<FeeCollectPage />} />
            <Route path="fees/receipts" element={<Navigate to="/admin/fees/collections" replace />} />
            <Route path="fees/students/:id" element={<StudentLedgerPage />} />
            <Route path="fees/reminders" element={<DuesRemindersPage />} />
            <Route path="fees/dues-report" element={<DuesRemindersPage />} />
            <Route path="fees/defaulters" element={<DuesRemindersPage />} />
            <Route path="fees/cheques" element={<ChequeRegisterPage />} />
            <Route path="fees/refunds" element={<RefundsPage />} />
            <Route path="fees/day-close" element={<DayClosePage />} />
            <Route path="fees/reports" element={<FeeReportsPage />} />
            <Route path="approvals" element={<ApprovalsPage />} />
            <Route path="transport" element={<TransportDashboard />} />
            <Route path="transport/dashboard" element={<TransportDashboard />} />
            <Route path="transport/vehicles" element={<VehiclesPage />} />
            <Route path="transport/staff" element={<TransportStaffPage />} />
            <Route path="transport/routes" element={<RouteBuilderPage />} />
            <Route path="transport/fees" element={<FeeZonesPage />} />
            <Route path="transport/assign" element={<BulkAssignPage />} />
            <Route path="transport/renewal" element={<YearRenewalPage />} />
            <Route path="academics" element={<ModulePlaceholder />} />
            <Route path="staff" element={<ModulePlaceholder />} />
            <Route path="timetable" element={<ModulePlaceholder />} />
            <Route path="exams" element={<ModulePlaceholder />} />
            <Route path="communication" element={<ModulePlaceholder />} />
            <Route path="library" element={<ModulePlaceholder />} />
            <Route path="inventory" element={<ModulePlaceholder />} />
            <Route path="reports" element={<ModulePlaceholder />} />
            <Route path="settings" element={<ClassesSettings />} />
            <Route path="settings/classes" element={<ClassesSettings />} />
            <Route path="settings/privacy" element={<DataDeletionSettings />} />
            <Route path="settings/deletion" element={<DataDeletionSettings />} />
          </Route>

          {/* Master Admin Control Plane (Autonomous SaaS Management) */}
          <Route
            path="/master-admin/login"
            element={
              <MasterAdminAuthProvider>
                <MasterAdminLogin />
              </MasterAdminAuthProvider>
            }
          />
          <Route
            path="/master-admin"
            element={
              <MasterAdminAuthProvider>
                <MasterAdminRoute>
                  <MasterAdminShell />
                </MasterAdminRoute>
              </MasterAdminAuthProvider>
            }
          >
            <Route index element={<MasterAdminDashboard />} />
            <Route path="dashboard" element={<MasterAdminDashboard />} />
            <Route path="schools" element={<MasterAdminSchools />} />
            <Route path="schools/new" element={<MasterAdminSchoolNew />} />
            <Route path="schools/:id" element={<MasterAdminSchoolDetail />} />
            <Route path="subscriptions" element={<MasterAdminSubscriptions />} />
            <Route path="billing" element={<MasterAdminBilling />} />
            <Route path="users" element={<MasterAdminUsers />} />
            <Route path="support" element={<MasterAdminSupport />} />
            <Route path="announcements" element={<MasterAdminAnnouncements />} />
            <Route path="reports" element={<MasterAdminBilling />} />
            <Route path="monitoring" element={<MasterAdminMonitoring />} />
            <Route path="database" element={<MasterAdminMonitoring />} />
            <Route path="audit-logs" element={<MasterAdminAuditLogs />} />
            <Route path="settings" element={<MasterAdminSettings />} />
            <Route path="branding" element={<MasterAdminSettings />} />
            <Route path="integrations" element={<MasterAdminSettings />} />
            <Route path="feature-flags" element={<MasterAdminSettings />} />
            <Route path="policies" element={<MasterAdminSettings />} />
          </Route>

          {/* 404 Catch-All */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </AuthProvider>
  );
}
