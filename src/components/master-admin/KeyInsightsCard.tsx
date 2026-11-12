import React from "react";
import { BarChart2, TrendingUp, Users, IndianRupee, Calendar } from "lucide-react";
import type { KeyInsightSummary } from "../../types/masterAdmin";

interface KeyInsightsCardProps {
  insights: KeyInsightSummary;
  loading?: boolean;
}

export const KeyInsightsCard: React.FC<KeyInsightsCardProps> = ({ insights, loading = false }) => {
  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs animate-pulse">
        <div className="h-5 w-28 bg-slate-100 rounded mb-4" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-slate-100 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs">
      <div className="flex items-center gap-2 mb-4">
        <BarChart2 className="w-4 h-4 text-blue-600" />
        <h3 className="text-sm font-bold text-slate-900">Key Insights</h3>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Insight 1: School Growth */}
        <div className="p-3.5 rounded-xl bg-emerald-50/50 border border-emerald-100 flex flex-col justify-between">
          <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center mb-2">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <p className="text-base font-bold text-emerald-700">
              {insights.schoolGrowthLabel || (insights.schoolGrowthPercent > 0 ? `+${insights.schoolGrowthPercent}%` : `${insights.schoolGrowthPercent}%`)}
            </p>
            <p className="text-[11px] font-semibold text-slate-700">School Growth</p>
            <p className="text-[10px] text-slate-400">vs. previous period</p>
          </div>
        </div>

        {/* Insight 2: Student Growth */}
        <div className="p-3.5 rounded-xl bg-blue-50/50 border border-blue-100 flex flex-col justify-between">
          <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center mb-2">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <p className="text-base font-bold text-blue-700">
              {insights.studentGrowthLabel || (insights.studentGrowthPercent > 0 ? `+${insights.studentGrowthPercent}%` : `${insights.studentGrowthPercent}%`)}
            </p>
            <p className="text-[11px] font-semibold text-slate-700">Student Growth</p>
            <p className="text-[10px] text-slate-400">vs. previous period</p>
          </div>
        </div>

        {/* Insight 3: Pending Payments */}
        <div className="p-3.5 rounded-xl bg-amber-50/50 border border-amber-100 flex flex-col justify-between">
          <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center mb-2">
            <IndianRupee className="w-4 h-4" />
          </div>
          <div>
            <p className="text-base font-bold text-amber-800">{insights.pendingPaymentsFormatted}</p>
            <p className="text-[11px] font-semibold text-slate-700">Pending Payments</p>
            <p className="text-[10px] text-slate-400">
              {insights.pendingPaymentsSchoolCount > 0
                ? `${insights.pendingPaymentsSchoolCount} school${insights.pendingPaymentsSchoolCount > 1 ? "s" : ""}`
                : "None outstanding"}
            </p>
          </div>
        </div>

        {/* Insight 4: Expiring Soon */}
        <div className="p-3.5 rounded-xl bg-indigo-50/50 border border-indigo-100 flex flex-col justify-between">
          <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center mb-2">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <p className="text-base font-bold text-indigo-700">{insights.expiringSoonDaysCount}</p>
            <p className="text-[11px] font-semibold text-slate-700">Expiring Soon</p>
            <p className="text-[10px] text-slate-400">in next 7 days</p>
          </div>
        </div>
      </div>
    </div>
  );
};
