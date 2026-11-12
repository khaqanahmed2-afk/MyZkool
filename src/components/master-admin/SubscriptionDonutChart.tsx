import React from "react";
import { Layers } from "lucide-react";
import type { PlanDistributionStats } from "../../types/masterAdmin";

interface SubscriptionDonutChartProps {
  distribution: PlanDistributionStats;
  totalSchools: number;
  loading?: boolean;
}

export const SubscriptionDonutChart: React.FC<SubscriptionDonutChartProps> = ({
  distribution,
  totalSchools,
  loading = false,
}) => {
  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs animate-pulse">
        <div className="h-5 w-36 bg-slate-100 rounded mb-4" />
        <div className="flex gap-4 items-center">
          <div className="w-28 h-28 rounded-full bg-slate-100 shrink-0" />
          <div className="flex-1 space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-3 bg-slate-100 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const plans = [
    { label: "Pro Plan", count: distribution.pro.count, percent: distribution.pro.percentage, color: "#2563EB" },
    { label: "Basic Plan", count: distribution.basic.count, percent: distribution.basic.percentage, color: "#60A5FA" },
    { label: "Custom Plan", count: distribution.custom.count, percent: distribution.custom.percentage, color: "#A78BFA" },
    { label: "Trial Period", count: distribution.trial.count, percent: distribution.trial.percentage, color: "#94A3B8" },
  ];

  const totalCount = plans.reduce((sum, p) => sum + p.count, 0) || totalSchools;

  // SVG Circular stroke calculation
  const radius = 54;
  const circumference = 2 * Math.PI * radius;

  let cumulativePercent = 0;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs flex flex-col justify-between">
      <div className="flex items-center gap-2 mb-4">
        <Layers className="w-4 h-4 text-blue-600" />
        <h3 className="text-sm font-bold text-slate-900">Subscription Overview</h3>
      </div>

      <div className="flex items-center justify-between gap-6">
        {/* SVG Donut */}
        <div className="relative w-36 h-36 shrink-0 flex items-center justify-center">
          <svg viewBox="0 0 140 140" className="w-full h-full -rotate-90">
            {totalCount > 0 ? (
              plans.map((p, idx) => {
                const strokeDasharray = `${(p.percent / 100) * circumference} ${circumference}`;
                const strokeDashoffset = -((cumulativePercent / 100) * circumference);
                cumulativePercent += p.percent;

                return (
                  <circle
                    key={idx}
                    cx="70"
                    cy="70"
                    r={radius}
                    fill="none"
                    stroke={p.color}
                    strokeWidth="16"
                    strokeDasharray={strokeDasharray}
                    strokeDashoffset={strokeDashoffset}
                    className="transition-all duration-500"
                  />
                );
              })
            ) : (
              <circle
                cx="70"
                cy="70"
                r={radius}
                fill="none"
                stroke="#E2E8F0"
                strokeWidth="16"
              />
            )}
          </svg>

          {/* Center Text: Mathematically matches sum of active plan slices */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-lg font-bold text-slate-900 font-heading leading-tight">
              {totalCount}
            </span>
            <span className="text-[10px] text-slate-400 font-medium">Subscriptions</span>
          </div>
        </div>

        {/* Legend */}
        <div className="space-y-2 flex-1 min-w-0">
          {plans.map((p, idx) => (
            <div key={idx} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 truncate">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                <span className="text-slate-600 font-medium truncate">{p.label}</span>
              </div>
              <span className="text-slate-900 font-bold shrink-0 ml-2">
                {p.count} <span className="text-slate-400 font-normal text-[11px]">({p.percent}%)</span>
              </span>
            </div>
          ))}
        </div>
      </div>

      {totalSchools > 0 && (
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
          <span>Active Subscriptions</span>
          <span className="font-semibold text-slate-600">{totalCount} active / {totalSchools} total schools</span>
        </div>
      )}
    </div>
  );
};
