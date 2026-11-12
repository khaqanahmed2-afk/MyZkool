import React from "react";
import { Zap, School, CreditCard, Receipt, Headphones, Megaphone, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

export const QuickActionsCard: React.FC = () => {
  const actions = [
    {
      label: "Add New School",
      desc: "Register institutional tenant",
      href: "/master-admin/schools/new",
      icon: School,
      color: "bg-blue-50 text-blue-600",
    },
    {
      label: "Create Subscription Plan",
      desc: "Configure pricing & tiers",
      href: "/master-admin/subscriptions",
      icon: CreditCard,
      color: "bg-indigo-50 text-indigo-600",
    },
    {
      label: "View Pending Payments",
      desc: "Inspect invoices & dunning",
      href: "/master-admin/billing?status=unpaid",
      icon: Receipt,
      color: "bg-amber-50 text-amber-600",
    },
    {
      label: "Manage Support Tickets",
      desc: "Triage incoming inquiries",
      href: "/master-admin/support",
      icon: Headphones,
      color: "bg-purple-50 text-purple-600",
    },
    {
      label: "Send Announcement",
      desc: "Broadcast platform update",
      href: "/master-admin/announcements",
      icon: Megaphone,
      color: "bg-emerald-50 text-emerald-600",
    },
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
              className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200/70 transition-all text-xs font-semibold text-slate-700 hover:text-blue-600 group cursor-pointer"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`w-7 h-7 rounded-lg ${act.color} flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform`}
                >
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-slate-800 group-hover:text-blue-600 truncate leading-tight">
                    {act.label}
                  </p>
                  <p className="text-[10px] text-slate-400 font-normal truncate">{act.desc}</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors shrink-0" />
            </Link>
          );
        })}
      </div>
    </div>
  );
};
