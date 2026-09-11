import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import type { UserRole } from "../../types/auth";
import { MyZkoolLogo } from "../MyZkoolLogo";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  requireCompletedOnboarding?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
  requireCompletedOnboarding = true,
}) => {
  const { isAuthenticated, loading, profile, role } = useAuth();
  const location = useLocation();

  // 1. Display a clean loading indicator while checking authentication state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-pulse">
            <MyZkoolLogo size={48} showText={true} />
          </div>
          <div className="w-6 h-6 border-2 border-[#2158E0] border-t-transparent rounded-full animate-spin mt-2" />
          <p className="text-xs text-[#5B6478] font-medium tracking-wide">
            Verifying secure session...
          </p>
        </div>
      </div>
    );
  }

  // 2. If unauthenticated, redirect to login with return path
  if (!isAuthenticated) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }

  // 3. Role-based verification if specific roles are required
  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4 text-[#141A2E]">
        <div className="w-full max-w-md bg-white rounded-2xl border border-[#E6EAF3] shadow-sm p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 mx-auto flex items-center justify-center mb-4 font-bold text-lg">
            !
          </div>
          <h2 className="text-xl font-bold font-heading mb-2">Access Restricted</h2>
          <p className="text-sm text-[#5B6478] mb-6">
            Your account ({role}) does not have permission to view this section.
          </p>
          <a
            href="/"
            className="inline-flex items-center justify-center px-5 py-2.5 text-xs font-semibold text-white bg-[#2158E0] rounded-full hover:bg-[#1a4ec4] transition-colors"
          >
            Return to Home
          </a>
        </div>
      </div>
    );
  }

  // 4. Onboarding completion check for School Admins accessing ERP workspace
  if (requireCompletedOnboarding && role === "school_admin" && !profile?.onboarding_completed) {
    const nextStep = profile?.current_onboarding_step || "/onboarding/school";
    // Avoid infinite redirect if already on that step
    if (!location.pathname.startsWith("/onboarding")) {
      return <Navigate to={nextStep} replace />;
    }
  }

  return <>{children}</>;
};
