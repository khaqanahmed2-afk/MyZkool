import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, WalletCards } from "lucide-react";
import type { DashboardMetricsResult } from "../../../services/feeDashboardService";

interface FeeCollectionDonutWidgetProps {
  feeMetrics: DashboardMetricsResult;
  loading?: boolean;
}

export function FeeCollectionDonutWidget({
  feeMetrics,
  loading = false,
}: FeeCollectionDonutWidgetProps) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-[#E6EAF3] bg-white p-4 sm:p-5 shadow-2xs h-[310px] animate-pulse flex flex-col justify-between">
        <div className="space-y-1.5">
          <div className="h-4 w-28 bg-slate-200 rounded" />
          <div className="h-2.5 w-36 bg-slate-100 rounded" />
        </div>
        <div className="flex items-center justify-center my-auto">
          <div className="w-20 h-20 rounded-full border-6 border-slate-100" />
        </div>
        <div className="h-3 w-28 bg-slate-100 rounded pt-2" />
      </div>
    );
  }

  // Real data calculations
  const collectedPaise = feeMetrics.totalCollectedPaise || 0;
  const pendingPaise = feeMetrics.totalOutstandingPaise || 0;
  const totalBilledPaise = feeMetrics.totalNetBilledPaise || collectedPaise + pendingPaise || 0;

  const collectionRate =
    totalBilledPaise > 0
      ? Math.round((collectedPaise / totalBilledPaise) * 1000) / 10
      : 0;

  // Format currency in Indian Rupees
  const formatRupees = (paise: number) =>
    `₹${Math.round(paise / 100).toLocaleString("en-IN")}`;

  // SVG Circle calculations (compact & responsive)
  const size = 100;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (collectionRate / 100) * circumference;

  return (
    <div className="rounded-2xl border border-[#E6EAF3] bg-white p-4 sm:p-5 shadow-2xs flex flex-col justify-between h-full min-w-0 overflow-hidden">
      {/* Header */}
      <div className="shrink-0 mb-1.5 sm:mb-2">
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-blue-50 text-[#2158E0] flex items-center justify-center shrink-0">
            <WalletCards className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-xs sm:text-sm font-bold text-[#141A2E] font-heading truncate">
              Fee Collection
            </h2>
            <p className="text-[10px] sm:text-[11px] text-[#5B6478] truncate">Collections vs. Pending</p>
          </div>
        </div>
      </div>

      {/* Donut Chart + Legend */}
      <div className="my-auto py-1 flex flex-col xl:flex-row items-center justify-center gap-2.5 sm:gap-3 xl:gap-3.5 min-w-0 w-full">
        {/* SVG Donut */}
        <div className="relative w-20 h-20 sm:w-22 sm:h-22 shrink-0 flex items-center justify-center">
          <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full transform -rotate-90">
            {/* Background Track Circle */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="#BAE6FD"
              strokeWidth={strokeWidth}
              fill="transparent"
            />
            {/* Collected Progress Arc */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="#0284C7"
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              className="transition-opacity duration-1000 ease-out"
            />
          </svg>

          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none">
            <span className="text-sm sm:text-base font-extrabold text-[#141A2E] tracking-tight leading-none">
              {collectionRate}%
            </span>
            <span className="text-[9px] sm:text-[10px] font-medium text-[#64748B] mt-0.5">Collected</span>
          </div>
        </div>

        {/* Legend / Metrics */}
        <div className="flex flex-col gap-1 sm:gap-1.5 w-full min-w-0 flex-1 max-w-[210px]">
          {/* Collected */}
          <div className="flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="w-2 h-2 rounded-full bg-[#0284C7] shrink-0" />
              <span className="text-[#5B6478] font-medium text-[11px] truncate">Collected</span>
            </div>
            <span className="font-bold text-[#141A2E] text-xs shrink-0">
              {formatRupees(collectedPaise)}
            </span>
          </div>

          {/* Pending */}
          <div className="flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="w-2 h-2 rounded-full bg-[#38BDF8] shrink-0" />
              <span className="text-[#5B6478] font-medium text-[11px] truncate">Pending</span>
            </div>
            <span className="font-bold text-[#141A2E] text-xs shrink-0">
              {formatRupees(pendingPaise)}
            </span>
          </div>

          {/* Divider */}
          <div className="border-t border-slate-100 my-0.5" />

          {/* Total */}
          <div className="flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="w-2 h-2 rounded-full bg-[#94A3B8] shrink-0" />
              <span className="text-[#5B6478] font-semibold text-[11px] truncate">Total</span>
            </div>
            <span className="font-bold text-[#141A2E] text-xs shrink-0">
              {formatRupees(totalBilledPaise)}
            </span>
          </div>
        </div>
      </div>

      {/* Footer link */}
      <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between shrink-0">
        <span className="text-[11px] text-[#94A3B8] truncate">
          {feeMetrics.totalStudentsCount} billed<span className="hidden xl:inline"> students</span>
        </span>
        <Link
          to="/admin/fees"
          className="inline-flex items-center gap-1 text-xs font-bold text-[#2158E0] hover:underline shrink-0"
        >
          Manage Fees
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}
