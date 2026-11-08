import React from "react";
import { Zap, School, CreditCard, Receipt, Headphones, Megaphone, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

export const QuickActionsCard: React.FC = () => {
  const actions = [
    { label: "Add New School", href: "/master-admin/schools/new", icon: School },
    { label: "Create Subscription Plan", href: "/master-admin/subscriptions", icon: CreditCard },
    { label: "View Pending Payments", href: "/master-admin/billing", icon: Receipt },
    { label: "Manage Support Tickets", href: "/master-admin/support", icon: Headphones },
    { label: "Send Announcement", href: "/master-admin/announcements", icon: Megaphone },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs flex flex-col justify-between">
      <div className="flex items-center gap-2 mb-3">
        <Zap className="w-4 h-4 text-blue-600" />
        <h3 className="text-sm font-bold text-slate-900">Quick Actions</h3>
      </div>

      <div className="space-y-1.5">
        {actions.map((act, idx) => {
          const Icon = act.icon;
          return (
            <Link
              key={idx}
              to={act.href}
              className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200/70 transition-all text-xs font-semibold text-slate-700 hover:text-blue-600 group"
            >
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <span>{act.label}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
            </Link>
          );
        })}
      </div>
    </div>
  );
};

