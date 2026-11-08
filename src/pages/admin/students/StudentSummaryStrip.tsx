import React from "react";
import {
  Users,
  User,
  UserPlus,
  AlertTriangle,
  ChevronRight,
  Check,
  Plus,
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

export function StudentSummaryStrip({
  data,
  activeFilter,
  onFilterClick,
  loading = false,
  error = null,
  onRetry,
}: StudentSummaryStripProps) {
  const cards = [
    {
      key: "all",
      label: "Total Students",
      count: data.totalStudents,
      icon: Users,
      iconColor: "text-[#2158E0]",
      iconBg: "bg-blue-50 border border-blue-100/80",
      description: "All registered students",
      badgeType: "chevron",
      badgeColor: "text-[#2158E0]",
    },
    {
      key: "active",
      label: "Active Students",
      count: data.enrolledCount,
      icon: User,
      iconColor: "text-emerald-600",
      iconBg: "bg-emerald-50 border border-emerald-100/80",
      description: "Currently enrolled",
      badgeType: "check",
      badgeColor: "text-emerald-600 bg-emerald-100/80",
    },
    {
      key: "new_admissions",
      label: "New Admissions",
      count: data.newAdmissionsCount,
      icon: UserPlus,
      iconColor: "text-purple-600",
      iconBg: "bg-purple-50 border border-purple-100/80",
      description: "This academic year",
      badgeType: "plus",
      badgeColor: "text-purple-600 bg-purple-100/80",
    },
    {
      key: "fee_pending",
      label: "Pending Fees",
      count: data.feePendingCount,
      icon: AlertTriangle,
      iconColor: "text-amber-600",
      iconBg: "bg-amber-50 border border-amber-100/80",
      description: "With outstanding dues",
      badgeType: "chevron",
      badgeColor: "text-amber-600",
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="p-5 bg-white border border-[#E6EAF3] rounded-2xl shadow-2xs space-y-3 animate-pulse"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-full bg-slate-100 shrink-0" />
              <div className="space-y-2 flex-1">
                <div className="w-24 h-3.5 bg-slate-200 rounded" />
                <div className="w-16 h-6 bg-slate-200 rounded" />
                <div className="w-28 h-3 bg-slate-100 rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between gap-3 text-xs text-amber-800 shadow-2xs">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>Notice: Could not load some student metrics.</span>
        </div>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="font-bold underline hover:text-amber-900 cursor-pointer"
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const isSelected = activeFilter === card.key;
        const IconComponent = card.icon;

        return (
          <div
            key={card.key}
            onClick={() => onFilterClick(card.key)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onFilterClick(card.key);
              }
            }}
            className={`bg-white border rounded-2xl p-4 sm:p-5 shadow-2xs hover:shadow-xs transition-all duration-150 cursor-pointer text-left select-none group relative ${
              isSelected
                ? "border-[#2158E0] ring-2 ring-[#2158E0]/20 bg-blue-50/20"
                : "border-[#E6EAF3] hover:border-slate-300"
            }`}
          >
            <div className="flex items-center gap-3.5">
              {/* Icon Container */}
              <div
                className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105 ${card.iconBg} ${card.iconColor}`}
              >
                <IconComponent className="w-5 h-5" />
              </div>

              {/* Card Content */}
              <div className="flex-1 min-w-0">
                {/* Header Row: Label & Status Indicator */}
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-semibold text-slate-700 truncate">
                    {card.label}
                  </span>
                  {card.badgeType === "chevron" ? (
                    <ChevronRight
                      className={`w-3.5 h-3.5 shrink-0 ${card.badgeColor} transition-transform group-hover:translate-x-0.5`}
                    />
                  ) : card.badgeType === "check" ? (
                    <span
                      className={`w-4 h-4 rounded-full flex items-center justify-center ${card.badgeColor}`}
                    >
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </span>
                  ) : card.badgeType === "plus" ? (
                    <span
                      className={`w-4 h-4 rounded-full flex items-center justify-center ${card.badgeColor}`}
                    >
                      <Plus className="w-2.5 h-2.5 stroke-[3]" />
                    </span>
                  ) : null}
                </div>

                {/* Big Metric Number */}
                <div className="text-2xl font-bold text-slate-900 tracking-tight font-display mt-0.5">
                  {card.count.toLocaleString()}
                </div>

                {/* Subtext description */}
                <div className="text-[11px] text-slate-400 font-medium truncate mt-0.5">
                  {card.description}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
