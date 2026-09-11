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
            <Route path="students" element={<ModulePlaceholder />} />
            <Route path="attendance" element={<ModulePlaceholder />} />
            <Route path="fees" element={<ModulePlaceholder />} />
            <Route path="staff" element={<ModulePlaceholder />} />
            <Route path="timetable" element={<ModulePlaceholder />} />
            <Route path="exams" element={<ModulePlaceholder />} />
            <Route path="communication" element={<ModulePlaceholder />} />
            <Route path="reports" element={<ModulePlaceholder />} />
            <Route path="settings" element={<ModulePlaceholder />} />
          </Route>

          {/* Fallback route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
