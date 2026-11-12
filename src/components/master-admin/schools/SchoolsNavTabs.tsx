import React from "react";
import {
  LayoutGrid,
  School,
  Rocket,
  CreditCard,
  ShieldCheck,
  Activity,
  FileText,
} from "lucide-react";

export type NavTab =
  | "overview"
  | "all_schools"
  | "onboarding"
  | "subscriptions"
  | "tenants"
  | "activity"
  | "reports";

interface SchoolsNavTabsProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  pendingOnboardingCount: number;
}

export const SchoolsNavTabs: React.FC<SchoolsNavTabsProps> = ({
  activeTab,
  onTabChange,
  pendingOnboardingCount,
}) => {
  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-slate-200/90 text-xs font-bold">
      <button
        type="button"
        onClick={() => onTabChange("overview")}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-colors cursor-pointer whitespace-nowrap ${
          activeTab === "overview"
            ? "bg-indigo-600 text-white shadow-xs"
            : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
        }`}
      >
        <LayoutGrid className="w-4 h-4" />
        <span>Overview</span>
      </button>

      <button
        type="button"
        onClick={() => onTabChange("all_schools")}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-colors cursor-pointer whitespace-nowrap ${
          activeTab === "all_schools"
            ? "bg-indigo-600 text-white shadow-xs"
            : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
        }`}
      >
        <School className="w-4 h-4" />
        <span>All Schools</span>
      </button>

      <button
        type="button"
        onClick={() => onTabChange("onboarding")}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-colors cursor-pointer whitespace-nowrap ${
          activeTab === "onboarding"
            ? "bg-indigo-600 text-white shadow-xs"
            : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
        }`}
      >
        <Rocket className="w-4 h-4" />
        <span>Onboarding</span>
        {pendingOnboardingCount > 0 && (
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
              activeTab === "onboarding"
                ? "bg-white text-indigo-700"
                : "bg-rose-100 text-rose-700"
            }`}
          >
            {pendingOnboardingCount}
          </span>
        )}
      </button>

      <button
        type="button"
        onClick={() => onTabChange("subscriptions")}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-colors cursor-pointer whitespace-nowrap ${
          activeTab === "subscriptions"
            ? "bg-indigo-600 text-white shadow-xs"
            : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
        }`}
      >
        <CreditCard className="w-4 h-4" />
        <span>Subscriptions</span>
      </button>

      <button
        type="button"
        onClick={() => onTabChange("tenants")}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-colors cursor-pointer whitespace-nowrap ${
          activeTab === "tenants"
            ? "bg-indigo-600 text-white shadow-xs"
            : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
        }`}
      >
        <ShieldCheck className="w-4 h-4" />
        <span>Tenants</span>
      </button>

      <button
        type="button"
        onClick={() => onTabChange("activity")}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-colors cursor-pointer whitespace-nowrap ${
          activeTab === "activity"
            ? "bg-indigo-600 text-white shadow-xs"
            : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
        }`}
      >
        <Activity className="w-4 h-4" />
        <span>Activity & Monitoring</span>
      </button>

      <button
        type="button"
        onClick={() => onTabChange("reports")}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-colors cursor-pointer whitespace-nowrap ${
          activeTab === "reports"
            ? "bg-indigo-600 text-white shadow-xs"
            : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
        }`}
      >
        <FileText className="w-4 h-4" />
        <span>Reports</span>
      </button>
    </div>
  );
};
