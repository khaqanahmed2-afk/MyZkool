import React from "react";
import { IndianRupee, TrendingUp, ChevronDown } from "lucide-react";
import type { RevenueMonthlyPoint } from "../../types/masterAdmin";

interface SubscriptionRevenueChartProps {
  monthlyData: RevenueMonthlyPoint[];
  totalRevenueFormatted: string;
  trendPercent: number;
}

export const SubscriptionRevenueChart: React.FC<SubscriptionRevenueChartProps> = ({
  monthlyData,
  totalRevenueFormatted,
  trendPercent,
}) => {
  const maxRevenue = 200000000; // 20L max scale

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs flex flex-col justify-between">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <IndianRupee className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">Subscription Revenue</h3>
          </div>
          <button className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-slate-600 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors">
            <span>Last 6 Months</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>
        </div>

        <div className="flex items-baseline gap-2 mb-4">
          <span className="text-2xl font-bold text-slate-900 font-heading">{totalRevenueFormatted}</span>
          <span className="inline-flex items-center gap-0.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-200/60">
            <TrendingUp className="w-3 h-3" />
            +{trendPercent}%
          </span>
          <span className="text-xs text-slate-400 ml-1">Recurring revenue (MRR)</span>
        </div>
      </div>

      {/* Bar Chart Visualization */}
      <div className="flex items-end gap-3 h-44 pt-4 border-b border-slate-100">
        {monthlyData.map((item, idx) => {
          const heightPercent = Math.min(100, Math.max(15, (item.revenuePaise / maxRevenue) * 100));
          const isLatest = idx === monthlyData.length - 1;

          return (
            <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group">
              {/* Bar */}
              <div
                className={`w-full max-w-[42px] rounded-t-lg transition-all duration-300 relative ${
                  isLatest
                    ? "bg-[#2563EB] shadow-md shadow-blue-500/20"
                    : "bg-blue-400/80 hover:bg-blue-500"
                }`}
                style={{ height: `${heightPercent}%` }}
              >
                {/* Tooltip on hover */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                  <div className="bg-slate-900 text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg whitespace-nowrap">
                    {item.formatted}
                  </div>
                </div>
              </div>

              {/* Month Label */}
              <span className={`text-[10px] mt-2 font-medium ${isLatest ? "text-blue-600 font-bold" : "text-slate-400"}`}>
                {item.month}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

