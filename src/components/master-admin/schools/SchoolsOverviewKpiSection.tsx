import React from "react";
import type { SchoolsOverviewKPIs } from "../../../services/masterAdminSchoolService";
import {
  School,
  CheckCircle2,
  Clock,
  CreditCard,
  Users,
  GraduationCap,
  Coins,
  UserPlus,
  FlaskConical,
  Ban,
  ArrowUp,
  ArrowDown,
} from "lucide-react";

interface Props {
  kpis: SchoolsOverviewKPIs;
  loading?: boolean;
}

export const SchoolsOverviewKpiSection: React.FC<Props> = ({ kpis, loading }) => {
  return (
    <div className="space-y-4">
      {/* ── 4 Top Large Cards (matches mockup top row) ───────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Schools */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Schools
            </span>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100/80 flex items-center justify-center text-indigo-600">
              <School className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight font-heading">
              {loading ? "..." : kpis.total_schools.toLocaleString("en-IN")}
            </h3>
            <div className="flex items-center gap-1.5 mt-2 text-xs font-semibold text-emerald-600">
              <ArrowUp className="w-3.5 h-3.5" />
              <span>+{kpis.new_schools_this_month} this month</span>
            </div>
          </div>
        </div>

        {/* Active Schools */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Active Schools
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100/80 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight font-heading">
              {loading ? "..." : kpis.active_schools.toLocaleString("en-IN")}
            </h3>
            <div className="flex items-center gap-1.5 mt-2 text-xs font-medium text-emerald-700">
              <span>{kpis.active_schools_percent}% of total</span>
            </div>
          </div>
        </div>

        {/* Pending Onboarding */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Pending Onboarding
            </span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100/80 flex items-center justify-center text-amber-600">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight font-heading">
              {loading ? "..." : kpis.pending_onboarding.toLocaleString("en-IN")}
            </h3>
            <div className="flex items-center gap-1.5 mt-2 text-xs font-medium text-amber-700">
              <span>{kpis.pending_onboarding_percent}% of total</span>
            </div>
          </div>
        </div>

        {/* Expired Subscriptions */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Expired Subscriptions
            </span>
            <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100/80 flex items-center justify-center text-purple-600">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight font-heading">
              {loading ? "..." : kpis.expired_subscriptions.toLocaleString("en-IN")}
            </h3>
            <div className="flex items-center gap-1.5 mt-2 text-xs font-semibold text-rose-600">
              <ArrowUp className="w-3.5 h-3.5" />
              <span>{kpis.expired_subscriptions_change}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 6 Compact Metric Pills (matches mockup second row) ───────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Students */}
        <div className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-2xs flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Users className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-slate-500 truncate">Total Students</p>
            <p className="text-sm font-bold text-slate-900 tracking-tight">
              {loading ? "..." : kpis.total_students.toLocaleString("en-IN")}
            </p>
          </div>
        </div>

        {/* Total Staff */}
        <div className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-2xs flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <GraduationCap className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-slate-500 truncate">Total Staff</p>
            <p className="text-sm font-bold text-slate-900 tracking-tight">
              {loading ? "..." : kpis.total_staff.toLocaleString("en-IN")}
            </p>
          </div>
        </div>

        {/* Monthly Recurring Revenue */}
        <div className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-2xs flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Coins className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-slate-500 truncate">Monthly Recurring (MRR)</p>
            <p className="text-sm font-bold text-slate-900 tracking-tight truncate">
              {loading ? "..." : kpis.mrr_formatted}
            </p>
          </div>
        </div>

        {/* New Schools This Month */}
        <div className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-2xs flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
            <UserPlus className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-slate-500 truncate">New Schools (Month)</p>
            <p className="text-sm font-bold text-slate-900 tracking-tight">
              {loading ? "..." : kpis.new_schools_this_month}
            </p>
          </div>
        </div>

        {/* Trial Schools */}
        <div className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-2xs flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <FlaskConical className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-slate-500 truncate">Trial Schools</p>
            <p className="text-sm font-bold text-slate-900 tracking-tight">
              {loading ? "..." : kpis.trial_schools}
            </p>
          </div>
        </div>

        {/* Suspended Institutions */}
        <div className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-2xs flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <Ban className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-slate-500 truncate">Suspended</p>
            <p className="text-sm font-bold text-slate-900 tracking-tight">
              {loading ? "..." : kpis.suspended_institutions}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

