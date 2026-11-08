import React from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

interface MetricKpiCardProps {
  title: string;
  value: string | number;
  trendPercent: number;
  isPositive: boolean;
  subtext?: string;
  icon: React.ElementType;
  iconBgColor: string;
  iconColor: string;
}

export const MetricKpiCard: React.FC<MetricKpiCardProps> = ({
  title,
  value,
  trendPercent,
  isPositive,
  subtext = "vs. previous 30 days",
  icon: Icon,
  iconBgColor,
  iconColor,
}) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs hover:shadow-xs transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-11 h-11 rounded-xl ${iconBgColor} flex items-center justify-center ${iconColor}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${
            isPositive
              ? "bg-emerald-50 text-emerald-600 border border-emerald-200/60"
              : "bg-rose-50 text-rose-600 border border-rose-200/60"
          }`}
        >
          {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          <span>
            {isPositive ? "+" : ""}
            {trendPercent}%
          </span>
        </div>
      </div>

      <div>
        <p className="text-xs font-medium text-slate-500 mb-1">{title}</p>
        <p className="text-2xl font-bold tracking-tight text-slate-900 font-heading">{value}</p>
        <p className="text-[11px] text-slate-400 font-medium mt-1">{subtext}</p>
      </div>
    </div>
  );
};

