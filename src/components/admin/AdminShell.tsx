import React, { useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { AdminHeader } from "./AdminHeader";
import { useAuth } from "../../hooks/useAuth";
import { getSchoolForCurrentUser } from "../../services/schoolService";
import type { School } from "../../types/school";

export function AdminShell() {
  const { user, schoolId, loading: authLoading } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [school, setSchool] = useState<School | null>(null);
  const [isSchoolLoading, setIsSchoolLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    async function loadSchool() {
      if (!user) {
        setIsSchoolLoading(false);
        return;
      }
      const { school } = await getSchoolForCurrentUser(user.id, schoolId);
      setSchool(school);
      setIsSchoolLoading(false);
    }
    loadSchool();
  }, [user, schoolId]);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  if (authLoading || isSchoolLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-200 border-t-[#2158E0] rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] text-[#141A2E] font-sans">
      {/* Sidebar */}
      <Sidebar
        school={school}
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col min-w-0 md:pl-64 transition-all duration-300">
        <AdminHeader
          school={school}
          onMenuClick={() => setIsMobileMenuOpen(true)}
        />

        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-x-hidden">
          <Outlet context={{ school }} />
        </main>
      </div>
    </div>
  );
}
