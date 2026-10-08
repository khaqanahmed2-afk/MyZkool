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

// ─── AUTH + APP PAGES (loaded lazily — AuthProvider only mounts for these) ───
// We import a combined "AppRoutes" component that includes AuthProvider so that
// Supabase is never initialized on the landing page critical path.
const AppRoutes = lazy(() => import("./routes/AppRoutes"));

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoading />}>
        <Routes>
          {/* Public landing page — no auth context, no Supabase */}
          <Route path="/" element={<LandingPage />} />

          {/* Dedicated About Us page */}
          <Route path="/about" element={<AboutPage />} />

          {/* Public payment link — no auth required */}
          <Route path="/pay/:token" element={<ParentPayPage />} />

          {/* All auth/onboarding/admin routes — AuthProvider loads lazily here */}
          <Route path="/*" element={<AppRoutes />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
