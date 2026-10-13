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
  feePendingCount: number;
  boysCount?: number;
  girlsCount?: number;
  documentsPending?: number;
  transportCount?: number;
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
  description: string;
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
      description: "This academic year",
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
      description: "With outstanding dues",
    },
  ];

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
            className={`p-4 bg-white border rounded-2xl text-left transition-all duration-150 cursor-pointer shadow-2xs hover:shadow-xs group flex flex-col justify-between ${
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
                {card.count.toLocaleString()}
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
