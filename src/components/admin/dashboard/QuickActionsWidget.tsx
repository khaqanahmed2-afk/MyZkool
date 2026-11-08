import React from "react";
import { Link } from "react-router-dom";
import {
  UserPlus,
  CalendarCheck,
  IndianRupee,
  Receipt,
  Bus,
  Send,
  ClipboardList,
  BarChart3,
  Zap,
} from "lucide-react";

export function QuickActionsWidget() {
  const actions = [
    {
      label: "Add Student",
      icon: UserPlus,
      href: "/admin/students/new",
      bg: "bg-blue-50/50",
      border: "border-blue-100/80",
      hoverBorder: "hover:border-blue-300",
      hoverBg: "hover:bg-blue-50/90",
      iconBg: "bg-blue-100/70 border border-blue-200/50",
      iconColor: "text-[#2158E0]",
    },
    {
      label: "Mark Attendance",
      icon: CalendarCheck,
      href: "/admin/attendance",
      bg: "bg-emerald-50/50",
      border: "border-emerald-100/80",
      hoverBorder: "hover:border-emerald-300",
      hoverBg: "hover:bg-emerald-50/90",
      iconBg: "bg-emerald-100/70 border border-emerald-200/50",
      iconColor: "text-[#059669]",
    },
    {
      label: "Collect Fee",
      icon: IndianRupee,
      href: "/admin/fees/collect",
      bg: "bg-amber-50/50",
      border: "border-amber-100/80",
      hoverBorder: "hover:border-amber-300",
      hoverBg: "hover:bg-amber-50/90",
      iconBg: "bg-amber-100/70 border border-amber-200/50",
      iconColor: "text-[#D97706]",
    },
    {
      label: "Generate Invoice",
      icon: Receipt,
      href: "/admin/fees/invoices",
      bg: "bg-purple-50/50",
      border: "border-purple-100/80",
      hoverBorder: "hover:border-purple-300",
      hoverBg: "hover:bg-purple-50/90",
      iconBg: "bg-purple-100/70 border border-purple-200/50",
      iconColor: "text-[#9333EA]",
    },
    {
      label: "Assign Transport",
      icon: Bus,
      href: "/admin/transport/assign",
      bg: "bg-teal-50/50",
      border: "border-teal-100/80",
      hoverBorder: "hover:border-teal-300",
      hoverBg: "hover:bg-teal-50/90",
      iconBg: "bg-teal-100/70 border border-teal-200/50",
      iconColor: "text-[#0D9488]",
    },
    {
      label: "Send Notification",
      icon: Send,
      href: "/admin/communication",
      bg: "bg-sky-50/50",
      border: "border-sky-100/80",
      hoverBorder: "hover:border-sky-300",
      hoverBg: "hover:bg-sky-50/90",
      iconBg: "bg-sky-100/70 border border-sky-200/50",
      iconColor: "text-[#0284C7]",
    },
    {
      label: "Create Examination",
      icon: ClipboardList,
      href: "/admin/exams",
      bg: "bg-rose-50/50",
      border: "border-rose-100/80",
      hoverBorder: "hover:border-rose-300",
      hoverBg: "hover:bg-rose-50/90",
      iconBg: "bg-rose-100/70 border border-rose-200/50",
      iconColor: "text-[#E11D48]",
    },
    {
      label: "View Reports",
      icon: BarChart3,
      href: "/admin/fees/reports",
      bg: "bg-indigo-50/50",
      border: "border-indigo-100/80",
      hoverBorder: "hover:border-indigo-300",
      hoverBg: "hover:bg-indigo-50/90",
      iconBg: "bg-indigo-100/70 border border-indigo-200/50",
      iconColor: "text-[#4F46E5]",
    },
  ];

  return (
    <div className="rounded-2xl border border-[#E6EAF3] bg-white p-5 sm:p-6 shadow-2xs">
      {/* Section Header */}
      <div className="flex items-center gap-2.5 mb-5">
        <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#2158E0] flex items-center justify-center shrink-0 border border-blue-100/60">
          <Zap className="w-4.5 h-4.5" />
        </div>
        <div>
          <h2 className="text-base font-bold text-[#141A2E] font-heading">
            Quick Actions
          </h2>
          <p className="text-xs text-[#5B6478]">
            Frequently used tasks, just a single click away
          </p>
        </div>
      </div>

      {/* Responsive Grid: 4 columns desktop, 3 columns tablet, 2 columns mobile */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.label}
              to={action.href}
              className={`group flex items-center gap-3 sm:gap-3.5 p-3.5 sm:p-4 rounded-xl border ${action.border} ${action.bg} ${action.hoverBg} ${action.hoverBorder} transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xs cursor-pointer`}
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${action.iconBg} ${action.iconColor} transition-transform duration-200 group-hover:scale-105`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-xs sm:text-sm font-semibold text-[#141A2E] group-hover:text-[#2158E0] transition-colors leading-snug block">
                  {action.label}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
