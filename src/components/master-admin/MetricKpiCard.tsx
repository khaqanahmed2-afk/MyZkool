import React from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface MetricKpiCardProps {
  title: string;
  value: string | number;
  trendPercent?: number | null;
  trendLabel?: string;
  isPositive?: boolean;
  subtext?: string;
  icon: React.ElementType;
  iconBgColor: string;
  iconColor: string;
  loading?: boolean;
  error?: string | null;
}

export const MetricKpiCard: React.FC<MetricKpiCardProps> = ({
  title,
  value,
  trendPercent,
  trendLabel,
  isPositive = true,
  subtext = "vs. previous equivalent period",
  icon: Icon,
  iconBgColor,
  iconColor,
  loading = false,
  error = null,
}) => {
  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs animate-pulse">
        <div className="flex items-center justify-between mb-3">
          <div className="w-11 h-11 rounded-xl bg-slate-100" />
          <div className="w-16 h-5 rounded-full bg-slate-100" />
        </div>
        <div className="space-y-2">
          <div className="w-20 h-3 bg-slate-100 rounded" />
          <div className="w-28 h-7 bg-slate-100 rounded" />
          <div className="w-36 h-3 bg-slate-100 rounded" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl border border-rose-200 p-5 shadow-2xs">
        <p className="text-xs font-semibold text-rose-600 mb-1">{title}</p>
        <p className="text-xs text-slate-500">Error loading metric</p>
      </div>
    );
  }

  // Display trend badge
  const hasTrend = typeof trendPercent === "number" && !isNaN(trendPercent);
  const displayLabel = trendLabel || (hasTrend ? `${isPositive ? "+" : ""}${trendPercent}%` : null);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs hover:shadow-xs transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-11 h-11 rounded-xl ${iconBgColor} flex items-center justify-center ${iconColor}`}>
          <Icon className="w-5 h-5" />
        </div>

        {displayLabel ? (
          <div
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${
              isPositive
                ? "bg-emerald-50 text-emerald-600 border border-emerald-200/60"
                : "bg-rose-50 text-rose-600 border border-rose-200/60"
            }`}
          >
            {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            <span>{displayLabel}</span>
          </div>
        ) : (
          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-50 text-slate-500 border border-slate-200/60">
            <Minus className="w-3 h-3" />
            <span>Cumulative</span>
          </div>
        )}
      </div>

      <div>
        <p className="text-xs font-medium text-slate-500 mb-1">{title}</p>
        <p className="text-2xl font-bold tracking-tight text-slate-900 font-heading">{value}</p>
        <p className="text-[11px] text-slate-400 font-medium mt-1 truncate">{subtext}</p>
      </div>
    </div>
  );
};
