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

// Fees Management
const FeeSetupChecklist = lazy(() => import("../pages/admin/fees/FeeSetupChecklist"));
const FeeHeadsPage = lazy(() => import("../pages/admin/fees/FeeHeadsPage"));
const FeeTermsPage = lazy(() => import("../pages/admin/fees/FeeTermsPage"));
const FeeStructuresPage = lazy(() => import("../pages/admin/fees/FeeStructuresPage"));
const ConcessionRulesPage = lazy(() => import("../pages/admin/fees/ConcessionRulesPage"));
const LateFeeRulesPage = lazy(() => import("../pages/admin/fees/LateFeeRulesPage"));
const FeeSettingsPage = lazy(() => import("../pages/admin/fees/FeeSettingsPage"));
const DuesGenerationPage = lazy(() => import("../pages/admin/fees/DuesGenerationPage"));
const ApprovalsPage = lazy(() => import("../pages/admin/approvals/ApprovalsPage"));
const FeeCollectPage = lazy(() => import("../pages/admin/fees/FeeCollectPage"));
const ReceiptsPage = lazy(() => import("../pages/admin/fees/ReceiptsPage"));
const StudentLedgerPage = lazy(() => import("../pages/admin/fees/StudentLedgerPage"));
const FeeDashboard = lazy(() => import("../pages/admin/fees/FeeDashboard"));
const DefaultersPage = lazy(() => import("../pages/admin/fees/DefaultersPage"));
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

export default function AppRoutes() {
  return (
    <AuthProvider>
      <Suspense fallback={<PageLoading />}>
        <Routes>
          {/* Authentication */}
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path="/verify" element={<Verify />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Onboarding (protected, pre-onboarding) */}
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
            <Route path="attendance" element={<ModulePlaceholder />} />
            <Route path="fees" element={<FeeDashboard />} />
            <Route path="fees/dashboard" element={<FeeDashboard />} />
            <Route path="fees/setup" element={<FeeSetupChecklist />} />
            <Route path="fees/setup/heads" element={<FeeHeadsPage />} />
            <Route path="fees/setup/terms" element={<FeeTermsPage />} />
            <Route path="fees/setup/structures" element={<FeeStructuresPage />} />
            <Route path="fees/setup/concessions" element={<ConcessionRulesPage />} />
            <Route path="fees/setup/late-fees" element={<LateFeeRulesPage />} />
            <Route path="fees/setup/settings" element={<FeeSettingsPage />} />
            <Route path="fees/dues" element={<DuesGenerationPage />} />
            <Route path="fees/invoices" element={<DuesGenerationPage />} />
            <Route path="fees/assign" element={<DuesGenerationPage />} />
            <Route path="fees/collect" element={<FeeCollectPage />} />
            <Route path="fees/receipts" element={<ReceiptsPage />} />
            <Route path="fees/students/:id" element={<StudentLedgerPage />} />
            <Route path="fees/dues-report" element={<DefaultersPage />} />
            <Route path="fees/defaulters" element={<DefaultersPage />} />
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
            <Route path="staff" element={<ModulePlaceholder />} />
            <Route path="timetable" element={<ModulePlaceholder />} />
            <Route path="exams" element={<ModulePlaceholder />} />
            <Route path="communication" element={<ModulePlaceholder />} />
            <Route path="reports" element={<ModulePlaceholder />} />
            <Route path="settings" element={<ClassesSettings />} />
            <Route path="settings/classes" element={<ClassesSettings />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </AuthProvider>
  );
}
