import React, { useState } from "react";
import { IndianRupee, TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { RevenueMonthlyPoint } from "../../types/masterAdmin";

interface SubscriptionRevenueChartProps {
  monthlyData: RevenueMonthlyPoint[];
  totalRevenueFormatted: string;
  trendPercent: number | null;
  loading?: boolean;
}

export const SubscriptionRevenueChart: React.FC<SubscriptionRevenueChartProps> = ({
  monthlyData,
  totalRevenueFormatted,
  trendPercent,
  loading = false,
}) => {
  const [hoveredMonth, setHoveredMonth] = useState<RevenueMonthlyPoint | null>(null);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs h-full animate-pulse">
        <div className="h-5 w-36 bg-slate-100 rounded mb-2" />
        <div className="h-8 w-24 bg-slate-100 rounded mb-4" />
        <div className="h-44 bg-slate-100 rounded-xl" />
      </div>
    );
  }

  // Calculate highest revenue point for scaling
  const maxRevenue = Math.max(...monthlyData.map((d) => d.revenuePaise), 200000); // at least ₹2,000 ceiling
  const isPositive = (trendPercent ?? 0) >= 0;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs flex flex-col justify-between h-full">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <IndianRupee className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">Subscription Revenue</h3>
          </div>
          <span className="text-[11px] font-semibold text-slate-400 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
            6-Month Trajectory
          </span>
        </div>

        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-2xl font-bold text-slate-900 font-heading">{totalRevenueFormatted}</span>
          {trendPercent !== null ? (
            <span
              className={`inline-flex items-center gap-0.5 text-xs font-bold px-1.5 py-0.5 rounded-full border ${
                isPositive
                  ? "text-emerald-600 bg-emerald-50 border-emerald-200/60"
                  : "text-rose-600 bg-rose-50 border-rose-200/60"
              }`}
            >
              {trendPercent !== 0 ? (
                isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />
              ) : (
                <Minus className="w-3 h-3" />
              )}
              {isPositive ? "+" : ""}
              {trendPercent}%
            </span>
          ) : (
            <span className="inline-flex items-center gap-0.5 text-xs font-medium px-2 py-0.5 rounded-full bg-slate-50 text-slate-500 border border-slate-200/60">
              <Minus className="w-3 h-3" />
              Cumulative
            </span>
          )}
          <span className="text-xs text-slate-400 ml-1">Recurring & collected revenue</span>
        </div>
      </div>

      {/* Bar Chart Visualization */}
      <div className="flex items-end gap-3 h-44 pt-4 border-b border-slate-100 relative">
        {monthlyData.map((item, idx) => {
          const heightPercent =
            item.revenuePaise > 0
              ? Math.min(100, Math.max(16, (item.revenuePaise / maxRevenue) * 100))
              : 8; // subtle base height for zero-revenue months
          const isLatest = idx === monthlyData.length - 1;

          return (
            <div
              key={idx}
              className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer"
              onMouseEnter={() => setHoveredMonth(item)}
              onMouseLeave={() => setHoveredMonth(null)}
            >
              {/* Bar */}
              <div
                className={`w-full max-w-[42px] rounded-t-lg transition-all duration-300 relative ${
                  item.revenuePaise > 0
                    ? isLatest
                      ? "bg-[#2563EB] shadow-md shadow-blue-500/20"
                      : "bg-blue-400/80 hover:bg-blue-500"
                    : "bg-slate-200 hover:bg-slate-300"
                }`}
                style={{ height: `${heightPercent}%` }}
              />

              {/* Month Label */}
              <span
                className={`text-[10px] mt-2 font-medium ${
                  isLatest ? "text-blue-600 font-bold" : "text-slate-400"
                }`}
              >
                {item.month}
              </span>
            </div>
          );
        })}

        {/* Hover Tooltip */}
        {hoveredMonth && (
          <div className="absolute top-2 right-2 bg-slate-900 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg shadow-lg pointer-events-none">
            {hoveredMonth.month}: {hoveredMonth.formatted}
          </div>
        )}
      </div>
    </div>
  );
};
