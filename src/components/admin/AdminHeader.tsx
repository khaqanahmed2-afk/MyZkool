import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Menu,
  Bell,
  Search,
  ChevronDown,
  User,
  Settings,
  LogOut,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
} from "lucide-react";
import type { School } from "../../types/school";
import { useAuth } from "../../hooks/useAuth";
import { SchoolSelector } from "./SchoolSelector";
import { GlobalSearchModal } from "./dashboard/GlobalSearchModal";

interface AdminHeaderProps {
  school: School | null;
  onMenuClick: () => void;
}

export function AdminHeader({ school, onMenuClick }: AdminHeaderProps) {
  const { profile, signOut, currentAcademicYear } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isYearDropdownOpen, setIsYearDropdownOpen] = useState(false);

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

          {/* Breadcrumb matching mockup: Admin > Dashboard */}
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
            className="w-full flex items-center justify-between pl-3.5 pr-2.5 py-1.5 bg-[#F8FAFC] border border-[#E6EAF3] hover:border-blue-300 rounded-full text-xs text-[#64748B] transition-all cursor-pointer shadow-2xs group"
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

          {/* Academic Year Selector Pill */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsYearDropdownOpen(!isYearDropdownOpen)}
              className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-white border border-[#E6EAF3] hover:border-slate-300 rounded-xl shadow-2xs transition-all cursor-pointer text-left"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <div className="flex flex-col">
                <span className="text-[9px] font-bold text-[#8A94A6] uppercase tracking-wider leading-none">
                  Academic Year
                </span>
                <span className="text-xs font-bold text-[#141A2E] leading-tight mt-0.5">
                  {activeYearLabel}
                </span>
              </div>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 ml-1 transition-transform ${
                  isYearDropdownOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {/* Academic Year Dropdown */}
            {isYearDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setIsYearDropdownOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-lg border border-[#E6EAF3] p-1.5 z-40 animate-in fade-in zoom-in-95">
                  <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                    Active Academic Session
                  </div>
                  <div className="py-1">
                    <button
                      type="button"
                      onClick={() => setIsYearDropdownOpen(false)}
                      className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-[#2158E0] bg-blue-50 rounded-lg cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span>{activeYearLabel}</span>
                      </div>
                      <Check className="w-3.5 h-3.5 text-[#2158E0]" />
                    </button>
                  </div>
                  <div className="pt-1 border-t border-slate-100">
                    <Link
                      to="/admin/settings"
                      onClick={() => setIsYearDropdownOpen(false)}
                      className="w-full block px-3 py-1.5 text-[11px] font-medium text-slate-500 hover:text-[#141A2E] hover:bg-slate-50 rounded"
                    >
                      Manage Academic Years →
                    </Link>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Notifications Bell */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              className="relative p-2 text-[#5B6478] hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
              aria-label="View notifications"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center border-2 border-white shadow-2xs">
                3
              </span>
            </button>

            {/* Notifications Popup */}
            {isNotificationsOpen && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setIsNotificationsOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-[#E6EAF3] py-2 z-40 animate-in fade-in zoom-in-95">
                  <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#141A2E]">Notifications</span>
                      <span className="px-1.5 py-0.2 bg-red-100 text-red-700 text-[10px] font-bold rounded-full">
                        3 new
                      </span>
                    </div>
                    <span className="text-[11px] text-[#2158E0] font-semibold cursor-pointer hover:underline">
                      Mark all read
                    </span>
                  </div>

                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                    <div className="p-3 hover:bg-slate-50 transition-colors flex gap-2.5">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-[#141A2E]">
                          Fee payment of ₹12,000 received
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Class IX • Ayaan Khan • 5 min ago
                        </p>
                      </div>
                    </div>

                    <div className="p-3 hover:bg-slate-50 transition-colors flex gap-2.5">
                      <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-[#141A2E]">
                          New student admission verified
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Class VI • Admission No. 2026/089 • 18 min ago
                        </p>
                      </div>
                    </div>

                    <div className="p-3 hover:bg-slate-50 transition-colors flex gap-2.5">
                      <div className="w-2 h-2 rounded-full bg-purple-500 mt-1.5 shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-[#141A2E]">
                          PTM notice scheduled
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Parent notification queued for 15 Nov 2026 • 42 min ago
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="px-4 py-2 border-t border-slate-100 text-center">
                    <Link
                      to="/admin/reports"
                      onClick={() => setIsNotificationsOpen(false)}
                      className="text-xs font-semibold text-[#2158E0] hover:underline"
                    >
                      View all activity logs →
                    </Link>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="h-6 w-px bg-gray-200 hidden sm:block mx-0.5" />

          {/* Profile Avatar Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center gap-2 hover:bg-gray-50 p-1 pr-1.5 rounded-full transition-colors border border-transparent hover:border-gray-200 cursor-pointer"
              aria-label="User menu"
            >
              <div className="w-8 h-8 rounded-full bg-slate-200 text-[#141A2E] flex items-center justify-center text-xs font-bold shrink-0">
                {initials}
              </div>
              <ChevronDown className="w-3 h-3 text-[#5B6478] hidden sm:block" />
            </button>

            {isProfileOpen && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  aria-hidden="true"
                  onClick={() => setIsProfileOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-[#E6EAF3] py-1 z-40 animate-in fade-in zoom-in-95">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-sm font-bold text-[#141A2E]">
                      {profile?.full_name || "Rashid Khan"}
                    </p>
                    <p className="text-xs text-[#5B6478] truncate">
                      {profile?.email || "admin@peaceconvent.edu"}
                    </p>
                  </div>
                  <div className="py-1">
                    <Link
                      to="/admin/settings"
                      className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-[#5B6478] hover:bg-gray-50 hover:text-[#141A2E]"
                      onClick={() => setIsProfileOpen(false)}
                    >
                      <User className="w-4 h-4" /> Profile & Account
                    </Link>
                    <Link
                      to="/admin/settings"
                      className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-[#5B6478] hover:bg-gray-50 hover:text-[#141A2E]"
                      onClick={() => setIsProfileOpen(false)}
                    >
                      <Settings className="w-4 h-4" /> School Settings
                    </Link>
                  </div>
                  <div className="pt-1 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 cursor-pointer text-left"
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

      {/* Global Search Command Palette Modal */}
      <GlobalSearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
      />
    </>
  );
}
