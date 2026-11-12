import React from "react";
import { Activity, School, CreditCard, UserPlus, Ticket, Layers, ArrowUpRight, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import type { PlatformRecentActivity } from "../../types/masterAdmin";

interface RecentActivitiesCardProps {
  activities: PlatformRecentActivity[];
  loading?: boolean;
}

export const RecentActivitiesCard: React.FC<RecentActivitiesCardProps> = ({ activities, loading = false }) => {
  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs h-full animate-pulse">
        <div className="h-6 w-36 bg-slate-100 rounded mb-4" />
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-100 shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-3/4 bg-slate-100 rounded" />
                <div className="h-2.5 w-1/2 bg-slate-100 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

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

  const getTargetLink = (act: PlatformRecentActivity) => {
    if (act.type === "school_registered") return "/master-admin/schools";
    if (act.type === "subscription_upgraded" || act.type === "plan_renewed") return "/master-admin/subscriptions";
    if (act.type === "ticket_resolved") return "/master-admin/support";
    return "/master-admin/audit-logs";
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">Recent Activities</h3>
          </div>
          <Link
            to="/master-admin/audit-logs"
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-0.5 transition-colors"
          >
            <span>Audit Trail</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {activities.length > 0 ? (
          <div className="space-y-3.5">
            {activities.map((act) => {
              const { icon: Icon, bg, text } = getIcon(act.type);
              const targetUrl = getTargetLink(act);

              return (
                <Link
                  key={act.id}
                  to={targetUrl}
                  className="flex items-start justify-between gap-3 text-xs p-2 rounded-xl hover:bg-slate-50 transition-colors group"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-lg ${bg} ${text} flex items-center justify-center shrink-0 mt-0.5`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                        {act.title}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">{act.detail}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end shrink-0 mt-0.5 ml-2">
                    <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">
                      {act.timeAgo}
                    </span>
                    <ArrowRight className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity mt-1 text-blue-600" />
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="py-12 px-4 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <Activity className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-700">No activity records</p>
            <p className="text-[11px] text-slate-400 max-w-xs mx-auto mt-0.5 leading-relaxed">
              Administrative events, institutional onboarding, and payments will be recorded here automatically.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
