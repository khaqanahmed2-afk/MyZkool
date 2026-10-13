/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// Minimal loading state for code-split route transitions
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

// ─── PUBLIC PAGES (no auth, no Supabase on critical path) ─────────────────────

// Landing Page — critical public surface, code-split for clean chunk
const LandingPage = lazy(() => import("./pages/LandingPage"));

// Dedicated About Us Page
const AboutPage = lazy(() => import("./pages/AboutPage"));

// Public auth pages — code-split, AuthProvider loaded lazily with them
const ParentPayPage = lazy(() => import("./pages/public/ParentPayPage"));

// Public School Website — dynamic school portal matching Oakridge reference
const PublicSchoolWebsite = lazy(() => import("./pages/public/PublicSchoolWebsite"));

// Helper for subdomain routing
import { getSubdomainFromHost } from "./services/websiteService";
import { ErrorBoundary } from "./components/common/ErrorBoundary";

function RootPage() {
  const hostSubdomain =
    typeof window !== "undefined"
      ? getSubdomainFromHost(window.location.hostname)
      : null;
  if (hostSubdomain) {
    return (
      <ErrorBoundary fallbackTitle="School Website Error">
        <PublicSchoolWebsite />
      </ErrorBoundary>
    );
  }
  return <LandingPage />;
}

// ─── AUTH + APP PAGES (loaded lazily — AuthProvider only mounts for these) ───
// We import a combined "AppRoutes" component that includes AuthProvider so that
// Supabase is never initialized on the landing page critical path.
const AppRoutes = lazy(() => import("./routes/AppRoutes"));

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoading />}>
        <Routes>
          {/* Public landing page or custom tenant subdomain on root */}
          <Route path="/" element={<RootPage />} />

          {/* Dedicated About Us page */}
          <Route path="/about" element={<AboutPage />} />

          {/* Public School Website direct path routes */}
          <Route
            path="/s/:subdomain"
            element={
              <ErrorBoundary fallbackTitle="School Website Error">
                <PublicSchoolWebsite />
              </ErrorBoundary>
            }
          />
          <Route
            path="/school/:subdomain"
            element={
              <ErrorBoundary fallbackTitle="School Website Error">
                <PublicSchoolWebsite />
              </ErrorBoundary>
            }
          />

          {/* Public payment link — no auth required */}
          <Route path="/pay/:token" element={<ParentPayPage />} />

          {/* All auth/onboarding/admin routes — AuthProvider loads lazily here */}
          <Route path="/*" element={<AppRoutes />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
