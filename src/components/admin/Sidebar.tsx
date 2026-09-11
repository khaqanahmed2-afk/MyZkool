import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  IndianRupee,
  Briefcase,
  CalendarDays,
  GraduationCap,
  MessageSquare,
  BarChart3,
  Settings,
  X,
  HelpCircle,
} from "lucide-react";
import { MyZkoolLogo } from "../MyZkoolLogo";
import type { School } from "../../types/school";
import { useAuth } from "../../hooks/useAuth";

interface SidebarProps {
  school: School | null;
  isOpen: boolean;
  onClose: () => void;
}

const NAVIGATION = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Students", href: "/admin/students", icon: Users },
  { label: "Attendance", href: "/admin/attendance", icon: CalendarCheck },
  { label: "Fees", href: "/admin/fees", icon: IndianRupee },
  { label: "Staff", href: "/admin/staff", icon: Briefcase },
  { label: "Timetable", href: "/admin/timetable", icon: CalendarDays },
  { label: "Exams & Results", href: "/admin/exams", icon: GraduationCap },
  { label: "Communication", href: "/admin/communication", icon: MessageSquare },
  { label: "Reports", href: "/admin/reports", icon: BarChart3 },
  { label: "Settings", href: "/admin/settings", icon: Settings },
];

export function Sidebar({ school, isOpen, onClose }: SidebarProps) {
  const location = useLocation();
  const { profile } = useAuth();

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 left-0 h-screen w-64 bg-white border-r border-[#E6EAF3] z-50 flex flex-col transition-transform duration-300 ease-in-out shadow-lg md:shadow-none ${
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        {/* Header / Logo */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-[#E6EAF3] shrink-0">
          <Link
            to="/admin"
            className="flex items-center"
            onClick={() => onClose()}
          >
            <MyZkoolLogo size={28} showText={true} />
          </Link>
          <button
            onClick={onClose}
            className="p-1.5 md:hidden text-[#5B6478] hover:bg-gray-100 rounded-md"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* School Identity */}
        <div className="p-4 border-b border-[#E6EAF3]/60 shrink-0 bg-gray-50/50">
          <div className="flex items-center gap-3">
            {school?.logo_url ? (
              <img
                src={school.logo_url}
                alt={school.name}
                className="w-10 h-10 rounded-lg object-cover border border-[#E6EAF3]"
              />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-[#F0F5FE] text-[#2158E0] flex items-center justify-center font-bold text-sm border border-blue-100 shrink-0">
                {school?.name?.charAt(0) || "S"}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h2
                className="text-sm font-bold text-[#141A2E] truncate"
                title={school?.name || "School Name"}
              >
                {school?.name || "Loading School..."}
              </h2>
              <p className="text-[11px] text-[#5B6478] truncate">
                {school?.subdomain
                  ? `${school.subdomain}.myzkool.com`
                  : "Setup pending"}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1 scrollbar-thin scrollbar-thumb-gray-200">
          {NAVIGATION.map((item) => {
            const isActive =
              location.pathname === item.href ||
              (item.href !== "/admin" &&
                location.pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-[#2158E0] text-white shadow-sm"
                    : "text-[#5B6478] hover:bg-[#F0F5FE] hover:text-[#2158E0]"
                }`}
                onClick={() => {
                  if (window.innerWidth < 768) {
                    onClose();
                  }
                }}
              >
                <Icon
                  className={`w-4 h-4 ${isActive ? "text-white" : "text-[#5B6478]"}`}
                />
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* Bottom Area */}
        <div className="p-4 border-t border-[#E6EAF3] shrink-0 space-y-2">
          <button className="flex items-center gap-2 w-full px-3 py-2 text-xs font-medium text-[#5B6478] hover:text-[#141A2E] hover:bg-gray-50 rounded-lg transition-colors">
            <HelpCircle className="w-4 h-4" />
            Help & Support
          </button>

          <div className="flex items-center gap-3 px-3 py-2 mt-2 bg-[#F8FAFC] rounded-lg border border-[#E6EAF3]/60">
            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold shrink-0">
              {profile?.full_name?.charAt(0) || "A"}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-[#141A2E] truncate">
                {profile?.full_name || "Admin User"}
              </p>
              <p className="text-[10px] text-[#5B6478] uppercase tracking-wide truncate">
                {profile?.role || "School Admin"}
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
