import React from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, ArrowRight } from "lucide-react";
import type { DashboardKpis } from "../../../services/adminDashboardService";

interface AttendanceDonutWidgetProps {
  kpis: DashboardKpis;
  loading?: boolean;
}

export function AttendanceDonutWidget({ kpis, loading = false }: AttendanceDonutWidgetProps) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-[#E6EAF3] bg-white p-4 sm:p-5 shadow-2xs h-[310px] animate-pulse flex flex-col justify-between">
        <div className="space-y-1.5">
          <div className="h-4 w-28 bg-slate-200 rounded" />
          <div className="h-2.5 w-36 bg-slate-100 rounded" />
        </div>
        <div className="flex items-center justify-center my-auto">
          <div className="w-20 h-20 rounded-full border-6 border-slate-100" />
        </div>
        <div className="h-3 w-28 bg-slate-100 rounded pt-2" />
      </div>
    );
  }

  const isRecorded = kpis.attendanceRecorded && kpis.attendanceTotal > 0;
  const presentPct = isRecorded
    ? Math.round((kpis.attendancePresent / kpis.attendanceTotal) * 1000) / 10
    : 0;

  // SVG Circle calculations (compact & responsive)
  const size = 100;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const presentStrokeDashoffset = circumference - (presentPct / 100) * circumference;

  return (
    <div className="rounded-2xl border border-[#E6EAF3] bg-white p-4 sm:p-5 shadow-2xs flex flex-col justify-between h-full min-w-0 overflow-hidden">
      {/* Header */}
      <div className="shrink-0 mb-1.5 sm:mb-2">
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-50 text-[#059669] flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-xs sm:text-sm font-bold text-[#141A2E] font-heading truncate">
              Today&apos;s Attendance
            </h2>
            <p className="text-[10px] sm:text-[11px] text-[#5B6478] truncate">Overall school attendance</p>
          </div>
        </div>
      </div>

      {/* Main Content: Donut + Legend */}
      <div className="my-auto py-1 flex flex-col xl:flex-row items-center justify-center gap-2.5 sm:gap-3 xl:gap-3.5 min-w-0 w-full">
        {/* SVG Donut Chart */}
        <div className="relative w-20 h-20 sm:w-22 sm:h-22 shrink-0 flex items-center justify-center">
          <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full transform -rotate-90">
            {/* Background Track Circle */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={isRecorded ? "#FEE2E2" : "#E2E8F0"}
              strokeWidth={strokeWidth}
              fill="transparent"
            />
            {/* Present Value Arc */}
            {isRecorded && (
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke="#10B981"
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                strokeDashoffset={presentStrokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
                className="transition-all duration-1000 ease-out"
              />
            )}
          </svg>

          {/* Center Text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none">
            {isRecorded ? (
              <>
                <span className="text-sm sm:text-base font-extrabold text-[#141A2E] tracking-tight leading-none">
                  {presentPct}%
                </span>
                <span className="text-[9px] sm:text-[10px] font-medium text-[#64748B] mt-0.5">Present</span>
              </>
            ) : (
              <>
                <span className="text-xs sm:text-sm font-bold text-amber-600 leading-tight">Pending</span>
                <span className="text-[9px] text-slate-400">Not recorded</span>
              </>
            )}
          </div>
        </div>

        {/* Legend / Metrics breakdown */}
        <div className="flex flex-col gap-1 sm:gap-1.5 w-full min-w-0 flex-1 max-w-[210px]">
          {/* Present */}
          <div className="flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="w-2 h-2 rounded-full bg-[#10B981] shrink-0" />
              <span className="text-[#5B6478] font-medium text-[11px] truncate">Present</span>
            </div>
            <span className="font-bold text-[#141A2E] text-xs shrink-0">
              {isRecorded ? kpis.attendancePresent.toLocaleString("en-IN") : "---"}
            </span>
          </div>

          {/* Absent */}
          <div className="flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="w-2 h-2 rounded-full bg-[#F87171] shrink-0" />
              <span className="text-[#5B6478] font-medium text-[11px] truncate">Absent</span>
            </div>
            <span className="font-bold text-[#141A2E] text-xs shrink-0">
              {isRecorded ? kpis.attendanceAbsent.toLocaleString("en-IN") : "---"}
            </span>
          </div>

          {/* Divider */}
          <div className="border-t border-slate-100 my-0.5" />

          {/* Total */}
          <div className="flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="w-2 h-2 rounded-full bg-[#94A3B8] shrink-0" />
              <span className="text-[#5B6478] font-semibold text-[11px] truncate">Total</span>
            </div>
            <span className="font-bold text-[#141A2E] text-xs shrink-0">
              {(isRecorded ? kpis.attendanceTotal : kpis.totalStudents).toLocaleString("en-IN")}
            </span>
          </div>
        </div>
      </div>

      {/* Footer action */}
      <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between shrink-0">
        <span className="text-[11px] text-[#94A3B8] truncate">
          {isRecorded ? "Recorded" : "Roster"}<span className="hidden xl:inline"> today</span>
        </span>
        <Link
          to="/admin/attendance"
          className="inline-flex items-center gap-1 text-xs font-bold text-[#2158E0] hover:underline shrink-0"
        >
          {isRecorded ? "Details" : "Mark Now"}
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}
