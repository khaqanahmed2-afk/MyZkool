import React from "react";
import { Activity, School, CreditCard, UserPlus, Ticket, Layers, ArrowUpRight } from "lucide-react";
import type { PlatformRecentActivity } from "../../types/masterAdmin";

interface RecentActivitiesCardProps {
  activities: PlatformRecentActivity[];
}

export const RecentActivitiesCard: React.FC<RecentActivitiesCardProps> = ({ activities }) => {
  const getIcon = (type: string) => {
    switch (type) {
      case "school_registered":
        return { icon: School, bg: "bg-blue-50", text: "text-blue-600" };
      case "subscription_upgraded":
        return { icon: CreditCard, bg: "bg-emerald-50", text: "text-emerald-600" };
      case "admin_added":
        return { icon: UserPlus, bg: "bg-indigo-50", text: "text-indigo-600" };
      case "ticket_resolved":
        return { icon: Ticket, bg: "bg-purple-50", text: "text-purple-600" };
      case "plan_renewed":
      default:
        return { icon: Layers, bg: "bg-amber-50", text: "text-amber-600" };
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">Recent Activities</h3>
          </div>
          <a
            href="/master-admin/audit-logs"
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-0.5 transition-colors"
          >
            <span>View All</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </a>
        </div>

        <div className="space-y-4">
          {activities.map((act) => {
            const { icon: Icon, bg, text } = getIcon(act.type);

            return (
              <div key={act.id} className="flex items-start justify-between gap-3 text-xs">
                <div className="flex items-start gap-3 min-w-0">
                  <div className={`w-8 h-8 rounded-lg ${bg} ${text} flex items-center justify-center shrink-0 mt-0.5`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 truncate">{act.title}</p>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">{act.detail}</p>
                  </div>
                </div>
                <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap shrink-0 mt-0.5">
                  {act.timeAgo}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

