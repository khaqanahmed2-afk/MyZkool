import React from "react";
import {
  Users,
  UserCheck,
  UserPlus,
  FileText,
  CreditCard,
  Bus,
} from "lucide-react";

export interface StudentSummaryData {
  totalStudents: number;
  enrolledCount: number;
  newAdmissionsCount: number;
  boysCount: number;
  girlsCount: number;
  documentsPending: number;
  feePendingCount: number;
  transportCount: number;
}

interface StudentSummaryStripProps {
  data: StudentSummaryData;
  activeFilter?: string;
  onFilterClick: (filterKey: string) => void;
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
}

export function StudentSummaryStrip({ data, activeFilter, onFilterClick }: StudentSummaryStripProps) {
  const cards: MetricCardConfig[] = [
    {
      key: "all",
      label: "Total Students",
      count: data.totalStudents,
      icon: Users,
      iconColor: "text-[#2158E0]",
      iconBg: "bg-blue-50",
      activeRing: "ring-[#2158E0]",
      activeBg: "bg-blue-50/60",
    },
    {
      key: "active",
      label: "Active / Enrolled",
      count: data.enrolledCount,
      icon: UserCheck,
      iconColor: "text-emerald-600",
      iconBg: "bg-emerald-50",
      activeRing: "ring-emerald-500",
      activeBg: "bg-emerald-50/60",
    },
    {
      key: "new_admissions",
      label: "New Admissions",
      count: data.newAdmissionsCount,
      icon: UserPlus,
      iconColor: "text-indigo-600",
      iconBg: "bg-indigo-50",
      activeRing: "ring-indigo-500",
      activeBg: "bg-indigo-50/60",
    },
    {
      key: "boys",
      label: "Boys",
      count: data.boysCount,
      icon: Users,
      iconColor: "text-sky-600",
      iconBg: "bg-sky-50",
      activeRing: "ring-sky-500",
      activeBg: "bg-sky-50/60",
    },
    {
      key: "girls",
      label: "Girls",
      count: data.girlsCount,
      icon: Users,
      iconColor: "text-pink-600",
      iconBg: "bg-pink-50",
      activeRing: "ring-pink-500",
      activeBg: "bg-pink-50/60",
    },
    {
      key: "docs_pending",
      label: "Docs Pending",
      count: data.documentsPending,
      icon: FileText,
      iconColor: "text-amber-600",
      iconBg: "bg-amber-50",
      activeRing: "ring-amber-500",
      activeBg: "bg-amber-50/60",
    },
    {
      key: "fee_pending",
      label: "Fee Pending",
      count: data.feePendingCount,
      icon: CreditCard,
      iconColor: "text-orange-600",
      iconBg: "bg-orange-50",
      activeRing: "ring-orange-500",
      activeBg: "bg-orange-50/60",
    },
    {
      key: "transport",
      label: "Transport",
      count: data.transportCount,
      icon: Bus,
      iconColor: "text-cyan-600",
      iconBg: "bg-cyan-50",
      activeRing: "ring-cyan-500",
      activeBg: "bg-cyan-50/60",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 mb-4">
      {cards.map((card) => {
        const Icon = card.icon;
        const isActive = activeFilter === card.key;

        return (
          <button
            key={card.key}
            type="button"
            onClick={() => onFilterClick(card.key)}
            aria-pressed={isActive}
            className={`p-3 bg-white border rounded-xl text-left transition-all duration-150 cursor-pointer shadow-2xs hover:shadow-xs group flex flex-col justify-between ${
              isActive
                ? `border-transparent ring-2 ${card.activeRing} ${card.activeBg}`
                : "border-[#E6EAF3] hover:border-slate-300 hover:bg-slate-50/60"
            }`}
          >
            <div className="flex items-center justify-between gap-1 mb-2">
              <span className="text-[11px] font-medium text-slate-500 group-hover:text-slate-700 truncate">
                {card.label}
              </span>
              <div
                className={`w-6 h-6 rounded-lg ${card.iconBg} ${card.iconColor} flex items-center justify-center shrink-0`}
              >
                <Icon className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-xl font-bold text-slate-900 font-display tracking-tight">
              {card.count}
            </div>
          </button>
        );
      })}
    </div>
  );
}
