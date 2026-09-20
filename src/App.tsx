/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";

// Landing Page (Full production website preserved)
import LandingPage from "./pages/LandingPage";

// Authentication Routes
import Register from "./pages/auth/Register";
import Login from "./pages/auth/Login";
import Verify from "./pages/auth/Verify";
import ResetPassword from "./pages/auth/ResetPassword";

// Onboarding Routes (Step 1 Placeholders)
import SchoolProfile from "./pages/onboarding/SchoolProfile";
import AcademicSetup from "./pages/onboarding/AcademicSetup";
import ClassesSections from "./pages/onboarding/ClassesSections";
import Subjects from "./pages/onboarding/Subjects";
import Subscription from "./pages/onboarding/Subscription";
import WebsiteSetup from "./pages/onboarding/WebsiteSetup";
import StaffSetup from "./pages/onboarding/StaffSetup";
import Complete from "./pages/onboarding/Complete";

// Admin Routes
import { AdminShell } from "./components/admin/AdminShell";
import DashboardHome from "./pages/admin/Dashboard";
import ModulePlaceholder from "./pages/admin/ModulePlaceholder";
import StudentList from "./pages/admin/students/StudentList";
import StudentProfileView from "./pages/admin/students/StudentProfile";
import { StudentAdmissionWizard } from "./pages/admin/students/wizard/StudentAdmissionWizard";
import StudentBulkImport from "./pages/admin/students/StudentBulkImport";
import StudentPromotionPipeline from "./pages/admin/students/StudentPromotionPipeline";
import StudentTCRegister from "./pages/admin/students/StudentTCRegister";
import StudentIdCards from "./pages/admin/students/StudentIdCards";
import ClassesSettings from "./pages/admin/settings/ClassesSettings";
import FeeSetupChecklist from "./pages/admin/fees/FeeSetupChecklist";
import FeeHeadsPage from "./pages/admin/fees/FeeHeadsPage";
import FeeTermsPage from "./pages/admin/fees/FeeTermsPage";
import FeeStructuresPage from "./pages/admin/fees/FeeStructuresPage";
import ConcessionRulesPage from "./pages/admin/fees/ConcessionRulesPage";
import LateFeeRulesPage from "./pages/admin/fees/LateFeeRulesPage";
import FeeSettingsPage from "./pages/admin/fees/FeeSettingsPage";
import DuesGenerationPage from "./pages/admin/fees/DuesGenerationPage";
import ApprovalsPage from "./pages/admin/approvals/ApprovalsPage";
import FeeCollectPage from "./pages/admin/fees/FeeCollectPage";
import ReceiptsPage from "./pages/admin/fees/ReceiptsPage";
import StudentLedgerPage from "./pages/admin/fees/StudentLedgerPage";



export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Existing Production Landing Page */}
          <Route path="/" element={<LandingPage />} />

          {/* Authentication Routes */}
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path="/verify" element={<Verify />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Authenticated Onboarding Flow */}
          <Route
            path="/onboarding/school"
            element={
              <ProtectedRoute
                allowedRoles={["school_admin", "super_admin"]}
                requireCompletedOnboarding={false}
              >
                <SchoolProfile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/onboarding/academics"
            element={
              <ProtectedRoute
                allowedRoles={["school_admin", "super_admin"]}
                requireCompletedOnboarding={false}
              >
                <AcademicSetup />
              </ProtectedRoute>
            }
          />
          <Route
            path="/onboarding/classes"
            element={
              <ProtectedRoute
                allowedRoles={["school_admin", "super_admin"]}
                requireCompletedOnboarding={false}
              >
                <ClassesSections />
              </ProtectedRoute>
            }
          />
          <Route
            path="/onboarding/subjects"
            element={
              <ProtectedRoute
                allowedRoles={["school_admin", "super_admin"]}
                requireCompletedOnboarding={false}
              >
                <Subjects />
              </ProtectedRoute>
            }
          />
          <Route
            path="/onboarding/subscription"
            element={
              <ProtectedRoute
                allowedRoles={["school_admin", "super_admin"]}
                requireCompletedOnboarding={false}
              >
                <Subscription />
              </ProtectedRoute>
            }
          />
          <Route
            path="/onboarding/website"
            element={
              <ProtectedRoute
                allowedRoles={["school_admin", "super_admin"]}
                requireCompletedOnboarding={false}
              >
                <WebsiteSetup />
              </ProtectedRoute>
            }
          />
          <Route
            path="/onboarding/staff"
            element={
              <ProtectedRoute
                allowedRoles={["school_admin", "super_admin"]}
                requireCompletedOnboarding={false}
              >
                <StaffSetup />
              </ProtectedRoute>
            }
          />
          <Route
            path="/onboarding/complete"
            element={
              <ProtectedRoute
                allowedRoles={["school_admin", "super_admin"]}
                requireCompletedOnboarding={false}
              >
                <Complete />
              </ProtectedRoute>
            }
          />

          {/* School Admin Dashboard (Protected - Requires Completed Onboarding) */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute
                allowedRoles={["school_admin", "super_admin"]}
                requireCompletedOnboarding={true}
              >
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
            <Route path="fees" element={<FeeSetupChecklist />} />
            <Route path="fees/setup" element={<FeeSetupChecklist />} />
            <Route path="fees/setup/heads" element={<FeeHeadsPage />} />
            <Route path="fees/setup/terms" element={<FeeTermsPage />} />
            <Route path="fees/setup/structures" element={<FeeStructuresPage />} />
            <Route path="fees/setup/concessions" element={<ConcessionRulesPage />} />
            <Route path="fees/setup/late-fees" element={<LateFeeRulesPage />} />
            <Route path="fees/setup/settings" element={<FeeSettingsPage />} />
            <Route path="fees/dues" element={<DuesGenerationPage />} />
            <Route path="fees/collect" element={<FeeCollectPage />} />
            <Route path="fees/receipts" element={<ReceiptsPage />} />
            <Route path="fees/students/:id" element={<StudentLedgerPage />} />
            <Route path="approvals" element={<ApprovalsPage />} />

            <Route path="staff" element={<ModulePlaceholder />} />
            <Route path="timetable" element={<ModulePlaceholder />} />
            <Route path="exams" element={<ModulePlaceholder />} />
            <Route path="communication" element={<ModulePlaceholder />} />
            <Route path="reports" element={<ModulePlaceholder />} />
            <Route path="settings" element={<ClassesSettings />} />
            <Route path="settings/classes" element={<ClassesSettings />} />
          </Route>

          {/* Fallback route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
