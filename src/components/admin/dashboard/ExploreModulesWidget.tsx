import React from "react";
import { Link } from "react-router-dom";
import {
  GraduationCap,
  IndianRupee,
  Bus,
  BookOpen,
  Award,
  Users,
  Send,
  BookMarked,
  Package,
  LayoutGrid,
  SlidersHorizontal,
  ArrowUpRight,
} from "lucide-react";

export function ExploreModulesWidget() {
  const modules = [
    {
      label: "Student Management",
      description: "Admissions and student records",
      icon: GraduationCap,
      href: "/admin/students",
      iconBg: "bg-blue-50 border border-blue-100",
      iconColor: "text-[#2158E0]",
      hoverBorder: "hover:border-blue-300",
    },
    {
      label: "Fee Management",
      description: "Collections, invoices and dues",
      icon: IndianRupee,
      href: "/admin/fees",
      iconBg: "bg-amber-50 border border-amber-100",
      iconColor: "text-[#D97706]",
      hoverBorder: "hover:border-amber-300",
    },
    {
      label: "Transport Management",
      description: "Routes, vehicles and stops",
      icon: Bus,
      href: "/admin/transport",
      iconBg: "bg-emerald-50 border border-emerald-100",
      iconColor: "text-[#059669]",
      hoverBorder: "hover:border-emerald-300",
    },
    {
      label: "Academics",
      description: "Classes, subjects and timetables",
      icon: BookOpen,
      href: "/admin/settings/classes",
      iconBg: "bg-indigo-50 border border-indigo-100",
      iconColor: "text-[#4F46E5]",
      hoverBorder: "hover:border-indigo-300",
    },
    {
      label: "Examinations",
      description: "Exams, marks and results",
      icon: Award,
      href: "/admin/exams",
      iconBg: "bg-purple-50 border border-purple-100",
      iconColor: "text-[#9333EA]",
      hoverBorder: "hover:border-purple-300",
    },
    {
      label: "Staff & HR",
      description: "Staff records and payroll",
      icon: Users,
      href: "/admin/staff",
      iconBg: "bg-teal-50 border border-teal-100",
      iconColor: "text-[#0D9488]",
      hoverBorder: "hover:border-teal-300",
    },
    {
      label: "Communication",
      description: "Notices and parent updates",
      icon: Send,
      href: "/admin/communication",
      iconBg: "bg-sky-50 border border-sky-100",
      iconColor: "text-[#0284C7]",
      hoverBorder: "hover:border-sky-300",
    },
    {
      label: "Library Management",
      description: "Books and library records",
      icon: BookMarked,
      href: "/admin/library",
      iconBg: "bg-rose-50 border border-rose-100",
      iconColor: "text-[#E11D48]",
      hoverBorder: "hover:border-rose-300",
    },
    {
      label: "Inventory Management",
      description: "Assets and stock management",
      icon: Package,
      href: "/admin/inventory",
      iconBg: "bg-slate-100 border border-slate-200",
      iconColor: "text-[#475569]",
      hoverBorder: "hover:border-slate-300",
    },
  ];

  return (
    <div className="rounded-2xl border border-[#E6EAF3] bg-white p-5 sm:p-6 shadow-2xs">
      {/* Section Header with perfectly aligned Customize button */}
      <div className="flex items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#2158E0] flex items-center justify-center shrink-0 border border-blue-100/60">
            <LayoutGrid className="w-4.5 h-4.5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#141A2E] font-heading">
              Explore Modules
            </h2>
            <p className="text-xs text-[#5B6478]">
              Manage every part of your school from here
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {}}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E6EAF3] bg-white text-xs font-semibold text-[#475569] hover:bg-slate-50 hover:text-[#141A2E] hover:border-slate-300 transition-colors shadow-2xs cursor-pointer shrink-0"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-[#64748B]" />
          <span>Customize</span>
        </button>
      </div>

      {/* Responsive Grid: 5 columns on desktop (xl), 4 on laptop (lg), 3 on tablet (md), 2 on mobile */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5 sm:gap-4">
        {modules.map((m) => {
          const Icon = m.icon;
          return (
            <Link
              key={m.label}
              to={m.href}
              className={`group flex flex-col justify-between p-4 sm:p-5 rounded-2xl border border-[#E6EAF3] bg-white ${m.hoverBorder} hover:shadow-xs hover:-translate-y-0.5 transition-all duration-200 cursor-pointer h-full`}
            >
              <div>
                <div className="flex items-center justify-between mb-3.5">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${m.iconBg} ${m.iconColor} transition-transform duration-200 group-hover:scale-105`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-[#2158E0] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-colors duration-200" />
                </div>
                <h3 className="text-sm font-bold text-[#141A2E] group-hover:text-[#2158E0] transition-colors leading-snug">
                  {m.label}
                </h3>
                <p className="text-xs text-[#5B6478] mt-1.5 leading-relaxed">
                  {m.description}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
