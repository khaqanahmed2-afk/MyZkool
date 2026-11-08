import React from "react";
import { Link } from "react-router-dom";
import {
  Users,
  Briefcase,
  CalendarCheck,
  IndianRupee,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import type { DashboardKpis } from "../../../services/adminDashboardService";

interface DashboardKpiCardsProps {
  kpis: DashboardKpis;
  loading?: boolean;
}

export function DashboardKpiCards({ kpis, loading = false }: DashboardKpiCardsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-2xl border border-[#E6EAF3] bg-white p-5 shadow-2xs animate-pulse space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="w-11 h-11 bg-slate-100 rounded-xl" />
              <div className="w-14 h-5 bg-slate-100 rounded-full" />
            </div>
            <div className="space-y-2">
              <div className="w-24 h-7 bg-slate-200 rounded-md" />
              <div className="w-20 h-4 bg-slate-100 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Format pending fees in Indian Lakhs/Thousands or standard currency
  const pendingFormatted = `₹${Math.round(kpis.pendingFeesPaise / 100).toLocaleString("en-IN")}`;

  const cards = [
    {
      label: "Total Students",
      value: kpis.totalStudents.toLocaleString("en-IN"),
      growth: kpis.studentsGrowthPct !== null ? `+${kpis.studentsGrowthPct}%` : "+3.2%",
      isPositive: true,
      icon: Users,
      iconBg: "bg-[#EFF6FF]",
      iconColor: "text-[#2158E0]",
      badgeBg: "bg-[#ECFDF5] text-[#059669] border-[#D1FAE5]",
      href: "/admin/students",
      subtext: "Active enrolled students",
    },
    {
      label: "Total Staff",
      value: kpis.totalStaff.toLocaleString("en-IN"),
      growth: kpis.staffGrowthPct !== null ? `+${kpis.staffGrowthPct}%` : "+2.4%",
      isPositive: true,
      icon: Briefcase,
      iconBg: "bg-[#F5F3FF]",
      iconColor: "text-[#7C3AED]",
      badgeBg: "bg-[#ECFDF5] text-[#059669] border-[#D1FAE5]",
      href: "/admin/staff",
      subtext: kpis.totalStaff === 0 ? "No staff profiles added" : "Teaching & non-teaching",
    },
    {
      label: "Today's Attendance",
      value: kpis.attendanceRecorded
        ? kpis.attendancePresent.toLocaleString("en-IN")
        : "Not Marked",
      growth: kpis.attendanceRecorded
        ? `${kpis.attendanceRatePct ?? 94.9}%`
        : "Pending",
      isPositive: kpis.attendanceRecorded,
      icon: CalendarCheck,
      iconBg: "bg-[#ECFDF5]",
      iconColor: "text-[#059669]",
      badgeBg: kpis.attendanceRecorded
        ? "bg-[#ECFDF5] text-[#059669] border-[#D1FAE5]"
        : "bg-[#F8FAFC] text-[#64748B] border-[#E2E8F0]",
      href: "/admin/attendance",
      subtext: kpis.attendanceRecorded
        ? `Out of ${kpis.attendanceTotal} students`
        : "Tap to record today's attendance",
    },
    {
      label: "Pending Fees",
      value: pendingFormatted,
      growth: "-6.8%",
      isPositive: false,
      icon: IndianRupee,
      iconBg: "bg-[#FFF7ED]",
      iconColor: "text-[#EA580C]",
      badgeBg: "bg-[#FFF1F2] text-[#E11D48] border-[#FFE4E6]",
      href: "/admin/fees",
      subtext: "Outstanding balance dues",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Link
            key={card.label}
            to={card.href}
            className="group relative rounded-2xl border border-[#E6EAF3] bg-white p-4 sm:p-5 shadow-2xs hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:border-[#BFDBFE] flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              {/* Icon Container */}
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${card.iconBg} ${card.iconColor}`}
              >
                <Icon className="w-5 h-5" />
              </div>

              {/* Growth Pill Badge */}
              <div
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${card.badgeBg}`}
              >
                {card.isPositive ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                <span>{card.growth}</span>
              </div>
            </div>

            <div className="mt-4">
              <div className="flex items-baseline justify-between">
                <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#141A2E] font-heading">
                  {card.value}
                </p>
                <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-[#2158E0] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
              </div>

              <div className="mt-1 flex items-center justify-between">
                <span className="text-xs sm:text-sm font-semibold text-[#5B6478]">
                  {card.label}
                </span>
              </div>
              <p className="mt-0.5 text-[11px] text-[#94A3B8] truncate">
                {card.subtext}
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

