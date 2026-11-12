import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Menu, Search } from "lucide-react";
import type { School } from "../../types/school";
import { useAuth } from "../../hooks/useAuth";
import { SchoolSelector } from "./SchoolSelector";
import { GlobalSearchModal } from "./dashboard/GlobalSearchModal";
import { AcademicYearDropdown } from "./header/AcademicYearDropdown";
import { NotificationsDropdown } from "./header/NotificationsDropdown";
import { AdminProfileDropdown } from "./header/AdminProfileDropdown";

interface AdminHeaderProps {
  school: School | null;
  onMenuClick: () => void;
}

export function AdminHeader({ onMenuClick }: AdminHeaderProps) {
  const { profile, signOut, currentAcademicYear } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

  // Keyboard shortcut listener for Ctrl+K or Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsSearchModalOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Generate breadcrumb from path
  const pathParts = location.pathname.split("/").filter(Boolean);
  const currentModule = pathParts.length > 1 ? pathParts[1] : "Dashboard";
  const formattedModule =
    currentModule.charAt(0).toUpperCase() + currentModule.slice(1);

  const activeYearLabel = currentAcademicYear?.label || "2026 – 2027";

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const initials = profile?.full_name
    ? profile.full_name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "RK";

  return (
    <>
      <header className="h-16 bg-white border-b border-[#E6EAF3] flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30">
        {/* Left Side: Mobile Menu & Breadcrumbs */}
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            type="button"
            onClick={onMenuClick}
            aria-label="Open sidebar menu"
            className="p-2 -ml-2 text-[#5B6478] hover:bg-gray-100 rounded-lg md:hidden cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Mobile School Switcher */}
          <div className="md:hidden">
            <SchoolSelector variant="header" />
          </div>

          {/* Breadcrumb: Admin > Dashboard */}
          <div className="hidden md:flex items-center gap-2 text-sm font-medium">
            <span className="text-[#5B6478]">Admin</span>
            <span className="text-[#B1B8C8] font-bold">&gt;</span>
            <span className="text-[#141A2E] font-bold">
              {location.pathname === "/admin" ? "Dashboard" : formattedModule}
            </span>
          </div>
        </div>

        {/* Center: Global Search Input */}
        <div className="flex-1 max-w-md mx-4 hidden md:block">
          <button
            type="button"
            onClick={() => setIsSearchModalOpen(true)}
            className="w-full flex items-center justify-between pl-3.5 pr-2.5 py-1.5 bg-[#F8FAFC] border border-[#E6EAF3] hover:border-blue-300 rounded-full text-xs text-[#64748B] transition-colors cursor-pointer shadow-2xs group"
          >
            <div className="flex items-center gap-2.5 truncate">
              <Search className="w-4 h-4 text-[#94A3B8] group-hover:text-[#2158E0] transition-colors shrink-0" />
              <span className="truncate">Search students, invoices, receipts, staff...</span>
            </div>
            <kbd className="inline-flex items-center px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[10px] font-bold text-slate-500 shadow-2xs">
              Ctrl K
            </kbd>
          </button>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Mobile Search Button */}
          <button
            type="button"
            onClick={() => setIsSearchModalOpen(true)}
            aria-label="Search"
            className="p-2 text-[#5B6478] hover:bg-gray-100 rounded-full md:hidden cursor-pointer"
          >
            <Search className="w-5 h-5" />
          </button>

          {/* Academic Year Selector */}
          <AcademicYearDropdown activeYearLabel={activeYearLabel} />

          {/* Notifications Bell */}
          <NotificationsDropdown />

          <div className="h-6 w-px bg-gray-200 hidden sm:block mx-0.5" />

          {/* Profile Avatar Dropdown */}
          <AdminProfileDropdown
            profile={profile}
            initials={initials}
            onSignOut={handleSignOut}
          />
        </div>
      </header>

      {/* Global Search Command Palette Modal */}
      <GlobalSearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
      />
    </>
  );
}
