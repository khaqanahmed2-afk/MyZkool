import React from "react";
import { AlertTriangle, Clock, RefreshCw, MessageSquare, UserCheck, ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import type { PendingAttentionSummary } from "../../types/masterAdmin";

interface PendingAttentionCardProps {
  summary: PendingAttentionSummary;
}

export const PendingAttentionCard: React.FC<PendingAttentionCardProps> = ({ summary }) => {
  const items = [
    {
      title: `${summary.expiringSubscriptionsCount} subscriptions expiring in next 7 days`,
      icon: Clock,
      color: "text-amber-600 bg-amber-50",
      actionText: "View",
      actionHref: "/master-admin/subscriptions",
    },
    {
      title: `${summary.failedPaymentsCount} failed payment transactions`,
      icon: RefreshCw,
      color: "text-rose-600 bg-rose-50",
      actionText: "Retry",
      actionHref: "/master-admin/billing",
    },
    {
      title: `${summary.openSupportTicketsCount} open support tickets`,
      icon: MessageSquare,
      color: "text-blue-600 bg-blue-50",
      actionText: "Manage",
      actionHref: "/master-admin/support",
    },
    {
      title: `${summary.pendingSchoolApprovalsCount} new school registrations pending approval`,
      icon: UserCheck,
      color: "text-indigo-600 bg-indigo-50",
      actionText: "Review",
      actionHref: "/master-admin/schools",
    },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-bold text-slate-900">Pending & Attention</h3>
          </div>
          <Link
            to="/master-admin/reports"
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-0.5 transition-colors"
          >
            <span>View All</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="space-y-2.5">
          {items.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100/70 transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-6 h-6 rounded-md ${item.color} flex items-center justify-center shrink-0`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-medium text-slate-700 truncate">{item.title}</span>
                </div>
                <Link
                  to={item.actionHref}
                  className="px-2.5 py-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 bg-white hover:bg-blue-50 border border-slate-200 rounded-lg shrink-0 transition-colors shadow-2xs"
                >
                  {item.actionText}
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

