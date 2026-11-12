import React from "react";
import type { MasterAdminSchoolSummary } from "../../../services/masterAdminSchoolService";
import {
  CreditCard,
  Calendar,
  Clock,
  ArrowUpCircle,
  CalendarPlus,
  ShieldAlert,
  Coins,
  CheckCircle2,
  AlertTriangle,
  History,
} from "lucide-react";

interface Props {
  schools: MasterAdminSchoolSummary[];
  onAction: (school: MasterAdminSchoolSummary, action: string) => void;
  onSelectSchool: (school: MasterAdminSchoolSummary) => void;
}

export const SubscriptionsTab: React.FC<Props> = ({
  schools,
  onAction,
  onSelectSchool,
}) => {
  const proCount = schools.filter((s) => s.current_plan_slug === "pro").length;
  const basicCount = schools.filter((s) => s.current_plan_slug === "basic").length;
  const customCount = schools.filter((s) => s.current_plan_slug === "custom").length;
  const trialCount = schools.filter((s) => s.subscription_status === "trialing").length;

  return (
    <div className="space-y-6">
      {/* Plan Breakdown Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pro Plan</span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700">₹1,799/mo</span>
          </div>
          <h3 className="text-2xl font-extrabold text-slate-900 mt-2 font-heading">{proCount}</h3>
          <p className="text-xs text-slate-500 mt-1">Full K-12 ERP with Transport & Timetable</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Basic Plan</span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">₹999/mo</span>
          </div>
          <h3 className="text-2xl font-extrabold text-slate-900 mt-2 font-heading">{basicCount}</h3>
          <p className="text-xs text-slate-500 mt-1">Essential SIS, Fees, Attendance & Website</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Custom Enterprise</span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">Annual</span>
          </div>
          <h3 className="text-2xl font-extrabold text-slate-900 mt-2 font-heading">{customCount}</h3>
          <p className="text-xs text-slate-500 mt-1">Multi-branch network institutions</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Free Trials</span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700">14-30 Days</span>
          </div>
          <h3 className="text-2xl font-extrabold text-slate-900 mt-2 font-heading">{trialCount}</h3>
          <p className="text-xs text-slate-500 mt-1">Active evaluation campus trials</p>
        </div>
      </div>

      {/* Institutional Subscriptions Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-slate-900 font-heading">Institutional Subscription Control</h4>
            <p className="text-xs text-slate-500">Manage plan tiering, trial grace periods, and annual renewals.</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Institution</th>
                <th className="py-3 px-4">Current Plan</th>
                <th className="py-3 px-4">Billing Cycle</th>
                <th className="py-3 px-4">Payment Status</th>
                <th className="py-3 px-4">Valid Till / Trial</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Quick Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {schools.map((school) => (
                <tr key={school.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 font-bold flex items-center justify-center shrink-0 text-xs">
                        {school.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{school.name}</p>
                        <p className="font-mono text-[10px] text-slate-400">{school.institution_code}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-semibold">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800">
                      {school.current_plan_name}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 capitalize text-slate-600 font-medium">
                    {school.billing_cycle || "Annual"}
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                        school.payment_status === "paid"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : school.payment_status === "trial"
                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                          : "bg-rose-50 text-rose-700 border border-rose-200"
                      }`}
                    >
                      {school.payment_status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-700 font-medium">
                    {school.subscription_valid_till_formatted}
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                        school.status === "active"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-rose-50 text-rose-700"
                      }`}
                    >
                      {school.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => onAction(school, "change_plan")}
                        className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                        title="Change Plan"
                      >
                        <ArrowUpCircle className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onAction(school, "extend_trial")}
                        className="p-1.5 rounded-lg text-sky-600 hover:bg-sky-50 transition-colors cursor-pointer"
                        title="Extend Trial"
                      >
                        <Clock className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onAction(school, "extend_subscription")}
                        className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
                        title="Extend Subscription"
                      >
                        <CalendarPlus className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onAction(school, "subscription_history")}
                        className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer"
                        title="Subscription History"
                      >
                        <History className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
