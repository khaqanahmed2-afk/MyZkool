import React from "react";
import { Layers } from "lucide-react";
import type { PlanDistributionStats } from "../../types/masterAdmin";

interface SubscriptionDonutChartProps {
  distribution: PlanDistributionStats;
  totalSchools: number;
}

export const SubscriptionDonutChart: React.FC<SubscriptionDonutChartProps> = ({
  distribution,
  totalSchools,
}) => {
  const plans = [
    { label: "Pro Plan", count: distribution.pro.count, percent: distribution.pro.percentage, color: "#2563EB" },
    { label: "Basic Plan", count: distribution.basic.count, percent: distribution.basic.percentage, color: "#60A5FA" },
    { label: "Custom Plan", count: distribution.custom.count, percent: distribution.custom.percentage, color: "#A78BFA" },
    { label: "Trial", count: distribution.trial.count, percent: distribution.trial.percentage, color: "#94A3B8" },
  ];

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
            {plans.map((p, idx) => {
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
            })}
          </svg>

          {/* Center Text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-lg font-bold text-slate-900 font-heading leading-tight">
              {totalSchools}
            </span>
            <span className="text-[10px] text-slate-400 font-medium">Schools</span>
          </div>
        </div>

        {/* Legend */}
        <div className="space-y-2.5 flex-1 min-w-0">
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
    </div>
  );
};

