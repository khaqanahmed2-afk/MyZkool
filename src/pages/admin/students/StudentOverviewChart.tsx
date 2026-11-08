import React, { useState } from "react";
import type { StudentStatus } from "../../../types/students";

interface StudentOverviewChartProps {
  totalCount: number;
  enrolledCount: number;
  onHoldCount?: number;
  transferredCount?: number;
  leftInactiveCount?: number;
  activeStatusFilter?: StudentStatus;
  onSelectStatus?: (status?: StudentStatus) => void;
  loading?: boolean;
}

export function StudentOverviewChart({
  totalCount,
  enrolledCount,
  onHoldCount = 0,
  transferredCount = 0,
  leftInactiveCount = 0,
  activeStatusFilter,
  onSelectStatus,
  loading = false,
}: StudentOverviewChartProps) {
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="bg-white border border-[#E6EAF3] rounded-2xl p-5 shadow-2xs h-[230px] flex items-center justify-between animate-pulse">
        <div className="w-28 h-28 rounded-full border-8 border-slate-100 flex items-center justify-center mx-auto" />
      </div>
    );
  }

  // Define status items and calculate percentages
  const safeTotal = totalCount > 0 ? totalCount : 0;
  const items = [
    {
      key: "enrolled",
      status: "enrolled" as StudentStatus,
      label: "Enrolled",
      count: enrolledCount,
      color: "#10B981", // Emerald
      bgClass: "bg-emerald-500",
      textClass: "text-emerald-700",
    },
    {
      key: "on_hold",
      status: "inactive" as StudentStatus,
      label: "On Hold",
      count: onHoldCount,
      color: "#3B82F6", // Blue
      bgClass: "bg-blue-500",
      textClass: "text-blue-700",
    },
    {
      key: "transferred",
      status: "transferred" as StudentStatus,
      label: "Transferred",
      count: transferredCount,
      color: "#F59E0B", // Amber
      bgClass: "bg-amber-500",
      textClass: "text-amber-700",
    },
    {
      key: "left",
      status: "withdrawn" as StudentStatus,
      label: "Left/Inactive",
      count: leftInactiveCount,
      color: "#EF4444", // Red/Rose
      bgClass: "bg-rose-500",
      textClass: "text-rose-700",
    },
  ];

  // SVG Donut geometry
  const size = 130;
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Compute strokeDasharray and offsets
  let accumulatedPercent = 0;
  const slices = items.map((item) => {
    const percent = safeTotal > 0 ? item.count / safeTotal : 0;
    const strokeDasharray = `${percent * circumference} ${circumference}`;
    const strokeDashoffset = -accumulatedPercent * circumference;
    accumulatedPercent += percent;
    return {
      ...item,
      percent,
      strokeDasharray,
      strokeDashoffset,
    };
  });

  return (
    <div className="bg-white border border-[#E6EAF3] rounded-2xl p-5 shadow-2xs flex flex-col justify-between h-[230px]">
      {/* Title */}
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-bold text-slate-900 tracking-tight font-display">
          Student Overview
        </h3>
        {activeStatusFilter && (
          <button
            type="button"
            onClick={() => onSelectStatus?.(undefined)}
            className="text-[11px] font-semibold text-[#2158E0] hover:underline cursor-pointer"
          >
            Reset
          </button>
        )}
      </div>

      {/* Donut and Legend Row */}
      <div className="flex items-center justify-between sm:justify-around lg:justify-between gap-6 sm:gap-10 flex-1 px-1 sm:px-4">
        {/* Donut SVG */}
        <div className="relative shrink-0 flex items-center justify-center">
          <svg width={size} height={size} className="transform -rotate-90">
            {/* Background empty ring */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="transparent"
              stroke="#F1F5F9"
              strokeWidth={strokeWidth}
            />

            {/* Filled arcs */}
            {safeTotal > 0 &&
              slices.map((slice) => {
                if (slice.count <= 0) return null;
                const isHovered = hoveredKey === slice.key;
                const isSelected = activeStatusFilter === slice.status;

                return (
                  <circle
                    key={slice.key}
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="transparent"
                    stroke={slice.color}
                    strokeWidth={isHovered || isSelected ? strokeWidth + 2 : strokeWidth}
                    strokeDasharray={slice.strokeDasharray}
                    strokeDashoffset={slice.strokeDashoffset}
                    strokeLinecap="round"
                    className="transition-all duration-300 cursor-pointer"
                    onMouseEnter={() => setHoveredKey(slice.key)}
                    onMouseLeave={() => setHoveredKey(null)}
                    onClick={() => onSelectStatus?.(isSelected ? undefined : slice.status)}
                  />
                );
              })}
          </svg>

          {/* Central Counter */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-xl font-bold text-slate-900 font-display leading-tight">
              {safeTotal}
            </span>
            <span className="text-[11px] font-medium text-slate-400">Total</span>
          </div>
        </div>

        {/* Legend List */}
        <div className="flex-1 max-w-sm space-y-2 text-xs">
          {items.map((item) => {
            const pct = safeTotal > 0 ? Math.round((item.count / safeTotal) * 100) : 0;
            const isHovered = hoveredKey === item.key;
            const isSelected = activeStatusFilter === item.status;

            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onSelectStatus?.(isSelected ? undefined : item.status)}
                onMouseEnter={() => setHoveredKey(item.key)}
                onMouseLeave={() => setHoveredKey(null)}
                className={`w-full flex items-center justify-between text-left p-1 rounded-lg transition-colors cursor-pointer group ${
                  isSelected ? "bg-slate-100 font-semibold" : "hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2.5 h-2.5 rounded-full shrink-0 transition-transform ${item.bgClass} ${
                      isHovered || isSelected ? "scale-125" : ""
                    }`}
                  />
                  <span className={`text-slate-700 ${isSelected ? "font-bold text-slate-900" : ""}`}>
                    {item.label}
                  </span>
                </div>
                <div className="text-slate-500 font-medium text-[11px]">
                  <span className="font-semibold text-slate-800">{item.count}</span>{" "}
                  <span className="text-slate-400">({pct}%)</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

