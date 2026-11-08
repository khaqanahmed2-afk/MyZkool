import React, { useState } from "react";
import { Link } from "react-router-dom";
import { TrendingUp, Users, CalendarCheck, ArrowRight } from "lucide-react";
import type { ClassStrengthItem } from "../../../services/adminDashboardService";

interface StudentStrengthChartProps {
  data: ClassStrengthItem[];
  loading?: boolean;
}

export function StudentStrengthChart({ data, loading = false }: StudentStrengthChartProps) {
  const [viewMode, setViewMode] = useState<"students" | "attendance">("students");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (loading) {
    return (
      <div className="rounded-2xl border border-[#E6EAF3] bg-white p-4 sm:p-5 shadow-2xs h-[310px] animate-pulse flex flex-col justify-between">
        <div className="flex justify-between items-center">
          <div className="space-y-1.5">
            <div className="h-4 w-28 bg-slate-200 rounded" />
            <div className="h-2.5 w-36 bg-slate-100 rounded" />
          </div>
          <div className="h-7 w-28 bg-slate-100 rounded-lg" />
        </div>
        <div className="flex items-end justify-between gap-1 h-36 pt-4">
          {[40, 65, 80, 55, 90, 70, 85, 95, 60, 75, 85, 70].map((h, i) => (
            <div
              key={i}
              className="flex-1 bg-slate-100 rounded-t-md"
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
        <div className="h-3 w-28 bg-slate-100 rounded pt-2" />
      </div>
    );
  }

  // Calculate total students and max count for scaling
  const totalStudents = data.reduce((acc, c) => acc + c.studentCount, 0);
  const maxCount = Math.max(...data.map((c) => c.studentCount), 10);
  // Round up to nearest clean tick interval (e.g. 10, 20, 50, 100, 250)
  const yMax = maxCount <= 10 ? 10 : maxCount <= 25 ? 25 : maxCount <= 50 ? 50 : Math.ceil(maxCount / 50) * 50;
  const yTicks = [yMax, Math.round(yMax * 0.75), Math.round(yMax * 0.5), Math.round(yMax * 0.25), 0];

  return (
    <div className="rounded-2xl border border-[#E6EAF3] bg-white p-4 sm:p-5 shadow-2xs flex flex-col justify-between h-full min-w-0 overflow-hidden">
      {/* Header with Title and Toggle */}
      <div className="flex items-center justify-between gap-1.5 mb-2 sm:mb-2.5 shrink-0">
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-blue-50 text-[#2158E0] flex items-center justify-center shrink-0">
            <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-xs sm:text-sm font-bold text-[#141A2E] font-heading truncate">
              Student Strength
            </h2>
            <p className="text-[10px] text-[#5B6478] truncate hidden xl:block">
              {viewMode === "students"
                ? "Class-wise count"
                : "Class-wise attendance"}
            </p>
          </div>
        </div>

        {/* View Mode Toggle Pill */}
        <div className="inline-flex items-center rounded-lg bg-[#F1F5F9] p-0.5 border border-slate-200/60 shrink-0">
          <button
            type="button"
            onClick={() => setViewMode("students")}
            className={`px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-[11px] font-semibold rounded-md transition-all cursor-pointer ${
              viewMode === "students"
                ? "bg-[#2158E0] text-white shadow-xs"
                : "text-[#5B6478] hover:text-[#141A2E]"
            }`}
          >
            Students
          </button>
          <button
            type="button"
            onClick={() => setViewMode("attendance")}
            className={`px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-[11px] font-semibold rounded-md transition-all cursor-pointer ${
              viewMode === "attendance"
                ? "bg-[#2158E0] text-white shadow-xs"
                : "text-[#5B6478] hover:text-[#141A2E]"
            }`}
          >
            <span className="hidden sm:inline">Attendance</span>
            <span className="sm:hidden">Attd</span>
          </button>
        </div>
      </div>

      {/* Chart Canvas Area */}
      {data.length === 0 ? (
        <div className="h-36 sm:h-40 flex flex-col items-center justify-center text-center p-3 bg-[#F8FAFC] rounded-xl border border-dashed border-slate-200 my-auto">
          <Users className="w-5 h-5 text-slate-300 mb-1" />
          <p className="text-xs font-semibold text-slate-700">No classes configured</p>
          <p className="text-[10px] text-slate-500 mt-0.5 max-w-xs">
            Add classes and sections in School Settings.
          </p>
          <Link
            to="/admin/settings/classes"
            className="mt-1.5 text-xs font-bold text-[#2158E0] hover:underline"
          >
            Configure Classes →
          </Link>
        </div>
      ) : viewMode === "attendance" ? (
        <div className="h-36 sm:h-40 flex flex-col items-center justify-center text-center p-3 bg-[#F8FAFC] rounded-xl border border-dashed border-slate-200 my-auto">
          <CalendarCheck className="w-5 h-5 text-emerald-500 mb-1" />
          <p className="text-xs font-bold text-[#141A2E]">Attendance Not Yet Recorded Today</p>
          <p className="text-[10px] text-[#5B6478] mt-0.5 max-w-sm">
            Class-wise attendance trends will display here once recorded.
          </p>
          <Link
            to="/admin/attendance"
            className="mt-2 inline-flex items-center gap-1 px-2.5 py-1 bg-[#2158E0] text-white rounded-lg text-xs font-semibold shadow-xs hover:bg-[#1748C5] transition-colors"
          >
            <CalendarCheck className="w-3 h-3" />
            Mark Today&apos;s Attendance
          </Link>
        </div>
      ) : (
        <div className="relative my-auto min-w-0">
          {/* Tooltip when hovering a bar */}
          {hoveredIndex !== null && data[hoveredIndex] && (
            <div
              className="absolute -top-7 z-30 transform -translate-x-1/2 bg-[#0F172A] text-white px-2 py-0.5 rounded text-[10px] font-medium shadow-md pointer-events-none whitespace-nowrap animate-in fade-in zoom-in-95 duration-150"
              style={{
                left: `${((hoveredIndex + 0.5) / data.length) * 100}%`,
              }}
            >
              <span className="font-bold">{data[hoveredIndex].name}</span>:{" "}
              {data[hoveredIndex].studentCount} students (
              {totalStudents > 0
                ? Math.round((data[hoveredIndex].studentCount / totalStudents) * 100)
                : 0}
              %)
            </div>
          )}

          <div className="flex h-36 sm:h-40 pt-1 min-w-0">
            {/* Y Axis Labels */}
            <div className="flex flex-col justify-between text-[10px] text-[#94A3B8] pr-1.5 select-none w-5 sm:w-6 shrink-0 text-right font-medium">
              {yTicks.map((tick, idx) => (
                <span key={idx}>{tick}</span>
              ))}
            </div>

            {/* Bars container */}
            <div className="relative flex-1 flex flex-col justify-between min-w-0">
              {/* Horizontal Grid Lines */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                {yTicks.map((_, idx) => (
                  <div
                    key={idx}
                    className="w-full border-b border-dashed border-slate-100"
                  />
                ))}
              </div>

              {/* Bars Row */}
              <div className="relative h-full flex items-end gap-0.5 sm:gap-1 px-0.5 min-w-0">
                {data.map((item, idx) => {
                  const heightPercent = yMax > 0 ? (item.studentCount / yMax) * 100 : 0;
                  const isHovered = hoveredIndex === idx;

                  return (
                    <div
                      key={item.id}
                      className="flex-1 h-full flex flex-col justify-end items-center group cursor-pointer min-w-0"
                      onMouseEnter={() => setHoveredIndex(idx)}
                      onMouseLeave={() => setHoveredIndex(null)}
                    >
                      {/* Bar Column */}
                      <div
                        className={`w-full max-w-[18px] sm:max-w-[22px] rounded-t-md transition-all duration-300 ${
                          isHovered
                            ? "bg-[#2158E0] shadow-sm"
                            : "bg-[#7AA6FA] hover:bg-[#4C85F8]"
                        }`}
                        style={{
                          height: `${Math.max(heightPercent, 4)}%`,
                        }}
                      />
                    </div>
                  );
                })}
              </div>

              {/* X Axis Labels */}
              <div className="flex items-center justify-between gap-0.5 sm:gap-1 px-0.5 pt-1.5 border-t border-slate-200 min-w-0">
                {data.map((item, idx) => (
                  <div
                    key={item.id}
                    className="flex-1 text-center truncate min-w-0"
                  >
                    <span
                      className={`text-[7px] sm:text-[8px] xl:text-[9px] font-semibold tracking-tighter transition-colors block truncate ${
                        hoveredIndex === idx ? "text-[#2158E0] font-bold" : "text-[#64748B]"
                      }`}
                    >
                      {item.shortName}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer Action */}
      <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between text-xs shrink-0">
        <span className="text-[11px] text-[#94A3B8] truncate">
          {totalStudents} enrolled<span className="hidden xl:inline"> students</span>
        </span>
        <Link
          to="/admin/students"
          className="inline-flex items-center gap-1 text-xs font-bold text-[#2158E0] hover:underline shrink-0"
        >
          View Students
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}
