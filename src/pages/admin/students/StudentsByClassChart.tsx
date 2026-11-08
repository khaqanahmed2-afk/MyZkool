import React, { useState } from "react";
import { BarChart3 } from "lucide-react";

export interface ClassStrengthItem {
  id: string;
  name: string;
  shortName: string;
  studentCount: number;
}

interface StudentsByClassChartProps {
  data: ClassStrengthItem[];
  selectedClassId?: string;
  onSelectClass?: (classId?: string) => void;
  loading?: boolean;
}

export function StudentsByClassChart({
  data,
  selectedClassId,
  onSelectClass,
  loading = false,
}: StudentsByClassChartProps) {
  const [hoveredItem, setHoveredItem] = useState<ClassStrengthItem | null>(null);

  if (loading) {
    return (
      <div className="bg-white border border-[#E6EAF3] rounded-2xl p-5 shadow-2xs h-[230px] flex flex-col justify-between animate-pulse">
        <div className="flex items-center justify-between">
          <div className="h-4 w-32 bg-slate-200 rounded" />
          <div className="h-3 w-16 bg-slate-100 rounded" />
        </div>
        <div className="flex items-end gap-2 h-36 pt-4">
          {[35, 50, 40, 65, 75, 45, 80, 60, 70, 85, 90, 60].map((h, i) => (
            <div key={i} className="flex-1 bg-slate-100 rounded-t-sm" style={{ height: `${h}%` }} />
          ))}
        </div>
      </div>
    );
  }

  // Calculate scaling ticks based on real data
  const maxCount = Math.max(...data.map((c) => c.studentCount), 10);
  const yMax = maxCount <= 10 ? 10 : maxCount <= 20 ? 20 : maxCount <= 30 ? 30 : Math.ceil(maxCount / 10) * 10;
  const yTicks = [yMax, Math.round((yMax * 2) / 3), Math.round(yMax / 3), 0];

  return (
    <div className="bg-white border border-[#E6EAF3] rounded-2xl p-5 shadow-2xs flex flex-col justify-between h-[230px] relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-1.5 font-display">
          <span>Students by Class</span>
        </h3>
        {selectedClassId && (
          <button
            type="button"
            onClick={() => onSelectClass?.(undefined)}
            className="text-[11px] font-semibold text-[#2158E0] hover:underline cursor-pointer"
          >
            Clear filter
          </button>
        )}
      </div>

      {data.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
          <BarChart3 className="w-8 h-8 text-slate-300 mb-1.5" />
          <p className="text-xs font-semibold text-slate-600">No student enrollment data yet</p>
          <p className="text-[11px] text-slate-400">Class distribution will appear as students are admitted</p>
        </div>
      ) : (
        <div className="relative flex-1 flex flex-col justify-between pt-1">
          {/* Chart plotting area with Y-axis grid */}
          <div className="relative flex-1 flex items-stretch">
            {/* Y-axis labels */}
            <div className="flex flex-col justify-between pr-2 text-[10px] font-medium text-slate-400 select-none pb-5 w-6 text-right">
              {yTicks.map((tick, i) => (
                <span key={i}>{tick}</span>
              ))}
            </div>

            {/* Grid & Bars Container */}
            <div className="relative flex-1 flex flex-col justify-between pb-5">
              {/* Horizontal grid lines */}
              <div className="absolute inset-x-0 inset-y-0 flex flex-col justify-between pointer-events-none pb-5">
                {yTicks.map((_, i) => (
                  <div key={i} className="border-b border-slate-100 w-full" />
                ))}
              </div>

              {/* Bars Row */}
              <div className="relative h-full flex items-end justify-between gap-1 sm:gap-2 px-1 z-10">
                {data.map((item) => {
                  const heightPercent = yMax > 0 ? Math.min(100, Math.max(item.studentCount > 0 ? 8 : 2, (item.studentCount / yMax) * 100)) : 2;
                  const isSelected = selectedClassId === item.id;
                  const isHovered = hoveredItem?.id === item.id;

                  return (
                    <div
                      key={item.id}
                      className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer"
                      onClick={() => onSelectClass?.(isSelected ? undefined : item.id)}
                      onMouseEnter={() => setHoveredItem(item)}
                      onMouseLeave={() => setHoveredItem(null)}
                      title={`${item.name}: ${item.studentCount} students`}
                    >
                      {/* Bar */}
                      <div
                        className={`w-full max-w-[24px] sm:max-w-[28px] rounded-t-sm transition-all duration-200 ${
                          isSelected
                            ? "bg-[#2158E0] ring-2 ring-[#2158E0]/30 shadow-xs"
                            : isHovered
                            ? "bg-[#2F6DF6]"
                            : item.studentCount > 0
                            ? "bg-gradient-to-t from-[#2563EB] to-[#60A5FA]"
                            : "bg-slate-100 group-hover:bg-slate-200"
                        }`}
                        style={{ height: `${heightPercent}%` }}
                      />
                    </div>
                  );
                })}
              </div>

              {/* X-axis labels */}
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 sm:gap-2 px-1 text-[10px] font-medium text-slate-500 select-none">
                {data.map((item) => (
                  <div
                    key={item.id}
                    className={`flex-1 text-center truncate ${
                      selectedClassId === item.id ? "font-bold text-[#2158E0]" : ""
                    }`}
                    title={item.name}
                  >
                    {item.shortName}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Hover Tooltip */}
          {hoveredItem && (
            <div className="absolute top-0 right-0 bg-slate-900 text-white text-[10px] font-semibold px-2 py-1 rounded-md shadow-lg pointer-events-none animate-in fade-in duration-100">
              {hoveredItem.name}: {hoveredItem.studentCount} students ({Math.round((hoveredItem.studentCount / Math.max(1, data.reduce((a, b) => a + b.studentCount, 0))) * 100)}%)
            </div>
          )}
        </div>
      )}
    </div>
  );
}

