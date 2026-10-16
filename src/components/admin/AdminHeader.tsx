import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Menu,
  Bell,
  Search,
  ChevronDown,
  User,
  Settings,
  LogOut,
} from "lucide-react";
import type { School } from "../../types/school";
import { useAuth } from "../../hooks/useAuth";

import { SchoolSelector } from "./SchoolSelector";

interface AdminHeaderProps {
  school: School | null;
  onMenuClick: () => void;
}

export function AdminHeader({ school, onMenuClick }: AdminHeaderProps) {
  const { profile, signOut, currentAcademicYear } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Generate basic breadcrumb from path
  const pathParts = location.pathname.split("/").filter(Boolean);
  const currentModule = pathParts.length > 1 ? pathParts[1] : "Dashboard";
  const formattedModule =
    currentModule.charAt(0).toUpperCase() + currentModule.slice(1);

  const activeYearLabel = currentAcademicYear?.label || "2025–2026";

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <header className="h-16 bg-white border-b border-[#E6EAF3] flex items-center justify-between px-4 md:px-6 sticky top-0 z-30">
      <div className="flex items-center gap-3 sm:gap-4">
        <button
          onClick={onMenuClick}
          className="p-2 -ml-2 text-[#5B6478] hover:bg-gray-100 rounded-lg md:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Mobile School Switcher */}
        <div className="md:hidden">
          <SchoolSelector variant="header" />
        </div>

        {/* Breadcrumb / Title area on desktop */}
        <div className="hidden md:flex items-center text-sm font-medium">
          <span className="text-[#5B6478]">Admin</span>
          <span className="mx-2 text-gray-300">/</span>
          <span className="text-[#141A2E] font-semibold">{formattedModule}</span>
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        <div className="hidden md:flex relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search students, invoices, receipts..."
            className="pl-9 pr-4 py-1.5 bg-[#F8FAFC] border border-[#E6EAF3] rounded-full text-xs focus:outline-none focus:border-[#0B7B49] focus:ring-1 focus:ring-[#0B7B49] transition-shadow w-72 text-[#141A2E]"
          />
        </div>

        {/* Academic Year: Shows only current academic year saved during onboarding */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-white border border-[#E6EAF3] rounded-xl shadow-2xs">
          <div className="flex flex-col items-start">
            <span className="text-[9px] font-semibold text-[#8A94A6] uppercase tracking-wider leading-none">Academic Year</span>
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#141A2E] mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span>{activeYearLabel}</span>
            </div>
          </div>
        </div>

        <button className="relative p-2 text-[#5B6478] hover:bg-gray-100 rounded-full transition-colors cursor-pointer">
          <Bell className="w-5 h-5" />
          <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center border-2 border-white">
            3
          </span>
        </button>

        <div className="h-6 w-px bg-gray-200 hidden sm:block mx-0.5"></div>

        {/* Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-2 hover:bg-gray-50 p-1 pr-2 rounded-full transition-colors border border-transparent hover:border-gray-200 cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-slate-200 text-[#141A2E] flex items-center justify-center text-xs font-bold shrink-0">
              {profile?.full_name ? profile.full_name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() : "PS"}
            </div>
            <div className="hidden md:flex flex-col items-start text-left leading-tight">
              <span className="text-xs font-bold text-[#141A2E]">
                {profile?.full_name || "Principal"}
              </span>
              <span className="text-[10px] text-[#5B6478]">
                School Admin
              </span>
            </div>
            <ChevronDown className="w-3 h-3 text-[#5B6478] hidden md:block" />
          </button>

          {isProfileOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setIsProfileOpen(false)}
              ></div>
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-[#E6EAF3] py-1 z-20">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-bold text-[#141A2E]">
                    {profile?.full_name || "Administrator"}
                  </p>
                  <p className="text-xs text-[#5B6478] truncate">
                    {profile?.email || "admin@school.com"}
                  </p>
                </div>
                <div className="py-1">
                  <Link
                    to="/admin/settings"
                    className="flex items-center gap-2 px-4 py-2 text-sm text-[#5B6478] hover:bg-gray-50 hover:text-[#141A2E]"
                    onClick={() => setIsProfileOpen(false)}
                  >
                    <User className="w-4 h-4" /> Profile
                  </Link>
                  <Link
                    to="/admin/settings"
                    className="flex items-center gap-2 px-4 py-2 text-sm text-[#5B6478] hover:bg-gray-50 hover:text-[#141A2E]"
                    onClick={() => setIsProfileOpen(false)}
                  >
                    <Settings className="w-4 h-4" /> Settings
                  </Link>
                </div>
                <div className="py-1 border-t border-gray-100">
                  <button
                    onClick={() => {
                      setIsProfileOpen(false);
                      handleSignOut();
                    }}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left"
                  >
                    <LogOut className="w-4 h-4" /> Sign Out
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
