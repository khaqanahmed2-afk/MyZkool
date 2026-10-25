import React from "react";
import {
  Users,
  UserCheck,
  UserPlus,
  CreditCard,
  RotateCcw,
  AlertCircle,
} from "lucide-react";

import type { StudentSummaryData } from "../../../types/students";
export type { StudentSummaryData };

interface StudentSummaryStripProps {
  data: StudentSummaryData;
  activeFilter?: string;
  onFilterClick: (filterKey: string) => void;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

interface MetricCardConfig {
  key: string;
  label: string;
  count: number;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  activeRing: string;
  activeBg: string;
  description: string;
}

export function StudentSummaryStrip({
  data,
  activeFilter,
  onFilterClick,
  loading = false,
  error = null,
  onRetry,
}: StudentSummaryStripProps) {
  const cards: MetricCardConfig[] = [
    {
      key: "all",
      label: "Total Students",
      count: data.totalStudents,
      icon: Users,
      iconColor: "text-[#2158E0]",
      iconBg: "bg-blue-50",
      activeRing: "ring-[#2158E0]",
      activeBg: "bg-blue-50/50",
      description: "All registered students",
    },
    {
      key: "active",
      label: "Active Students",
      count: data.enrolledCount,
      icon: UserCheck,
      iconColor: "text-emerald-600",
      iconBg: "bg-emerald-50",
      activeRing: "ring-emerald-500",
      activeBg: "bg-emerald-50/50",
      description: "Currently enrolled",
    },
    {
      key: "new_admissions",
      label: "New Admissions",
      count: data.newAdmissionsCount,
      icon: UserPlus,
      iconColor: "text-indigo-600",
      iconBg: "bg-indigo-50",
      activeRing: "ring-indigo-500",
      activeBg: "bg-indigo-50/50",
      description: "Admitted this academic year",
    },
    {
      key: "fee_pending",
      label: "Pending Fees",
      count: data.feePendingCount,
      icon: CreditCard,
      iconColor: "text-amber-600",
      iconBg: "bg-amber-50",
      activeRing: "ring-amber-500",
      activeBg: "bg-amber-50/50",
      description: "Students with outstanding dues",
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="p-4 bg-white border border-[#E6EAF3] rounded-2xl shadow-2xs space-y-3 animate-pulse"
          >
            <div className="flex items-center justify-between">
              <div className="w-20 h-3 bg-slate-200 rounded-md" />
              <div className="w-8 h-8 rounded-xl bg-slate-100" />
            </div>
            <div className="space-y-1.5 pt-1">
              <div className="w-12 h-6 bg-slate-200 rounded-md" />
              <div className="w-24 h-2.5 bg-slate-100 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between gap-3 text-xs text-rose-700 shadow-2xs">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>Failed to load student statistics: {error}</span>
        </div>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-rose-300 font-semibold text-rose-700 hover:bg-rose-50 cursor-pointer shadow-2xs transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Retry</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((card) => {
        const Icon = card.icon;
        const isActive = activeFilter === card.key;

        return (
          <button
            key={card.key}
            type="button"
            onClick={() => onFilterClick(card.key)}
            aria-pressed={isActive}
            className={`p-4 bg-white border rounded-2xl text-left transition duration-150 cursor-pointer shadow-2xs hover:shadow-xs group flex flex-col justify-between ${
              isActive
                ? `border-transparent ring-2 ${card.activeRing} ${card.activeBg}`
                : "border-[#E6EAF3] hover:border-slate-300 hover:bg-slate-50/50"
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-medium text-slate-500 group-hover:text-slate-700 truncate">
                {card.label}
              </span>
              <div
                className={`w-8 h-8 rounded-xl ${card.iconBg} ${card.iconColor} flex items-center justify-center shrink-0 transition-transform group-hover:scale-105`}
              >
                <Icon className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900 tracking-tight font-display">
                {(card.count || 0).toLocaleString()}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                {card.description}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
