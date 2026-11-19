import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  ClipboardCheck,
  QrCode,
  History,
  BarChart3,
  Settings,
  Calendar,
} from "lucide-react";

interface AttendanceNavHeaderProps {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function AttendanceNavHeader({
  title,
  subtitle,
  actions,
}: AttendanceNavHeaderProps) {
  const location = useLocation();
  const currentPath = location.pathname;

  const NAV_ITEMS = [
    {
      label: "Dashboard",
      href: "/admin/attendance",
      icon: LayoutDashboard,
      exact: true,
    },
    {
      label: "Take Attendance",
      href: "/admin/attendance/take",
      icon: ClipboardCheck,
      exact: false,
    },
    {
      label: "QR Attendance",
      href: "/admin/attendance/qr",
      icon: QrCode,
      exact: false,
    },
    {
      label: "Attendance History",
      href: "/admin/attendance/history",
      icon: History,
      exact: false,
    },
    {
      label: "Attendance Reports",
      href: "/admin/attendance/reports",
      icon: BarChart3,
      exact: false,
    },
    {
      label: "Settings",
      href: "/admin/attendance/settings",
      icon: Settings,
      exact: false,
    },
  ];

  const isActive = (item: (typeof NAV_ITEMS)[0]) => {
    if (item.exact) {
      return currentPath === item.href || currentPath === `${item.href}/`;
    }
    return currentPath.startsWith(item.href);
  };

  return (
    <div className="bg-white border-b border-[#E6EAF3] -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 mb-6">
      {/* Top Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#2158E0] flex items-center justify-center font-bold">
              <Calendar className="w-4 h-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#141A2E] font-heading">
              {title || "Attendance Management"}
            </h1>
          </div>
          {subtitle && (
            <p className="text-xs sm:text-sm text-[#5B6478] mt-1 ml-10">
              {subtitle}
            </p>
          )}
        </div>

        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar pt-1">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              to={item.href}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                active
                  ? "border-[#2158E0] text-[#2158E0] font-semibold"
                  : "border-transparent text-[#5B6478] hover:text-[#141A2E] hover:border-slate-300"
              }`}
            >
              <Icon className={`w-4 h-4 ${active ? "text-[#2158E0]" : "text-[#5B6478]"}`} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
