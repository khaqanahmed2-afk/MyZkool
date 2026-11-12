import React from "react";
import { AlertTriangle, Clock, RefreshCw, MessageSquare, UserCheck, ArrowUpRight, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import type { PendingAttentionSummary } from "../../types/masterAdmin";

interface PendingAttentionCardProps {
  summary: PendingAttentionSummary;
  loading?: boolean;
}

export const PendingAttentionCard: React.FC<PendingAttentionCardProps> = ({ summary, loading = false }) => {
  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs h-full animate-pulse">
        <div className="h-6 w-36 bg-slate-100 rounded mb-4" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 bg-slate-100 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const items = [
    {
      title: `${summary.pendingSchoolApprovalsCount} new school registrations pending review`,
      icon: UserCheck,
      color: "text-indigo-600 bg-indigo-50",
      actionText: "Review",
      actionHref: "/master-admin/schools?status=pending",
      count: summary.pendingSchoolApprovalsCount,
    },
    {
      title: `${summary.expiringSubscriptionsCount} subscriptions expiring in next 7 days`,
      icon: Clock,
      color: "text-amber-600 bg-amber-50",
      actionText: "View",
      actionHref: "/master-admin/subscriptions?filter=expiring",
      count: summary.expiringSubscriptionsCount,
    },
    {
      title: `${summary.failedPaymentsCount} failed payment transactions`,
      icon: RefreshCw,
      color: "text-rose-600 bg-rose-50",
      actionText: "Retry",
      actionHref: "/master-admin/billing?status=failed",
      count: summary.failedPaymentsCount,
    },
    {
      title: `${summary.openSupportTicketsCount} open support tickets`,
      icon: MessageSquare,
      color: "text-blue-600 bg-blue-50",
      actionText: "Manage",
      actionHref: "/master-admin/support?status=open",
      count: summary.openSupportTicketsCount,
    },
  ];

  const totalActionItems =
    summary.pendingSchoolApprovalsCount +
    summary.expiringSubscriptionsCount +
    summary.failedPaymentsCount +
    summary.openSupportTicketsCount;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-bold text-slate-900">Pending & Attention</h3>
          </div>
          <Link
            to="/master-admin/schools"
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-0.5 transition-colors"
          >
            <span>Control Center</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {totalActionItems > 0 ? (
          <div className="space-y-2.5">
            {items.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div
                  key={idx}
                  className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100/70 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-7 h-7 rounded-lg ${item.color} flex items-center justify-center shrink-0`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-medium text-slate-700 truncate">{item.title}</span>
                  </div>
                  <Link
                    to={item.actionHref}
                    className="px-3 py-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 bg-white hover:bg-blue-50 border border-slate-200 rounded-lg shrink-0 transition-colors shadow-2xs cursor-pointer"
                  >
                    {item.actionText}
                  </Link>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-8 px-4 text-center bg-emerald-50/50 rounded-xl border border-emerald-100">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
            <p className="text-xs font-bold text-emerald-800">All Systems Clear</p>
            <p className="text-[11px] text-emerald-600 max-w-xs mx-auto mt-0.5 leading-relaxed">
              No pending institutional reviews, failed invoices, or unassigned helpdesk cases.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
