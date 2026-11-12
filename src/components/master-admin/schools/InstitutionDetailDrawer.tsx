import React, { useState, useEffect } from "react";
import type { MasterAdminSchoolSummary } from "../../../services/masterAdminSchoolService";
import {
  X,
  MapPin,
  Users,
  UserCheck,
  HardDrive,
  Calendar,
  Clock,
  ArrowUpCircle,
  CalendarPlus,
  ShieldAlert,
  ShieldCheck,
  Layers,
  History,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  ChevronRight,
  Activity,
  FileText,
  Mail,
  Phone,
  Building,
} from "lucide-react";

interface Props {
  school: MasterAdminSchoolSummary;
  onClose: () => void;
  onAction: (school: MasterAdminSchoolSummary, action: string) => void;
  token?: string | null;
}

export const InstitutionDetailDrawer: React.FC<Props> = ({
  school,
  onClose,
  onAction,
  token,
}) => {
  const [activeTab, setActiveTab] = useState<"overview" | "subscription" | "usage" | "activity">("overview");
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(false);

  useEffect(() => {
    if (activeTab === "activity") {
      setLoadingActivity(true);
      fetch(`/api/master-admin/schools/${school.id}/activity?limit=15`, {
        headers: { Authorization: `Bearer ${token || "test-token-admin"}` },
      })
        .then((r) => r.json())
        .then((json) => {
          if (json.success && Array.isArray(json.data)) {
            setActivityLogs(json.data);
          }
        })
        .catch(() => {})
        .finally(() => setLoadingActivity(false));
    }
  }, [activeTab, school.id, token]);

  const studentUsagePercent = school.student_limit
    ? Math.min(100, Math.round((school.student_count / school.student_limit) * 100))
    : 0;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-md p-5 flex flex-col h-full sticky top-6">
      {/* ── Panel Header (matches mockup) ────────────────────────────── */}
      <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center font-bold text-sm text-indigo-700 shadow-xs">
            {school.logo_url ? (
              <img
                src={school.logo_url}
                alt={school.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = "none";
                }}
              />
            ) : (
              school.name.slice(0, 2).toUpperCase()
            )}
          </div>
          <div className="min-w-0">
            <h4 className="text-base font-bold text-slate-900 tracking-tight font-heading truncate">
              {school.name}
            </h4>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="font-mono text-[11px] font-semibold text-slate-500">
                {school.institution_code}
              </span>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  school.status === "active"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : school.status === "suspended"
                    ? "bg-rose-50 text-rose-700 border border-rose-200"
                    : "bg-amber-50 text-amber-700 border border-amber-200"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    school.status === "active"
                      ? "bg-emerald-500"
                      : school.status === "suspended"
                      ? "bg-rose-500"
                      : "bg-amber-500"
                  }`}
                />
                <span className="capitalize">{school.status}</span>
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          title="Close details"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* ── Location ─────────────────────────────────────────────────── */}
      <div className="pt-3 flex items-center gap-1.5 text-xs text-slate-500 font-medium">
        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <span className="truncate">{school.city}, {school.state}</span>
      </div>

      {/* ── 3 Quick Counters (matches mockup) ────────────────────────── */}
      <div className="grid grid-cols-3 gap-2 mt-3 pt-2">
        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 text-center">
          <div className="flex items-center justify-center gap-1 text-slate-500 mb-0.5">
            <Users className="w-3.5 h-3.5" />
            <span className="text-[10px] font-semibold uppercase">Students</span>
          </div>
          <p className="text-sm font-extrabold text-slate-900 tracking-tight">
            {school.student_count.toLocaleString("en-IN")}
          </p>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 text-center">
          <div className="flex items-center justify-center gap-1 text-slate-500 mb-0.5">
            <UserCheck className="w-3.5 h-3.5" />
            <span className="text-[10px] font-semibold uppercase">Staff</span>
          </div>
          <p className="text-sm font-extrabold text-slate-900 tracking-tight">
            {school.staff_count.toLocaleString("en-IN")}
          </p>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 text-center">
          <div className="flex items-center justify-center gap-1 text-slate-500 mb-0.5">
            <HardDrive className="w-3.5 h-3.5" />
            <span className="text-[10px] font-semibold uppercase">Storage</span>
          </div>
          <p className="text-sm font-extrabold text-slate-900 tracking-tight truncate">
            {school.storage_used_gb}
          </p>
        </div>
      </div>

      {/* ── Tab Navigation (matches mockup) ──────────────────────────── */}
      <div className="flex items-center gap-1 border-b border-slate-200/80 mt-4 text-xs font-semibold select-none">
        {(["overview", "subscription", "usage", "activity"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-2.5 px-2.5 transition-colors capitalize relative cursor-pointer ${
              activeTab === tab
                ? "text-indigo-600 font-bold"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            {tab}
            {activeTab === tab && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* ── Tab Content ──────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto py-4 space-y-5 scrollbar-thin scrollbar-thumb-slate-200">
        {/* TAB 1: OVERVIEW & SUBSCRIPTION DETAILS */}
        {(activeTab === "overview" || activeTab === "subscription") && (
          <div className="space-y-4">
            {/* Subscription Details Box */}
            <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-3">
              <h5 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Subscription Details
              </h5>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Current Plan</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-purple-100 text-purple-700 border border-purple-200">
                    {school.current_plan_name}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Subscription Status</span>
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-bold ${
                      school.subscription_status === "active"
                        ? "text-emerald-600"
                        : school.subscription_status === "trialing"
                        ? "text-amber-600"
                        : "text-rose-600"
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        school.subscription_status === "active"
                          ? "bg-emerald-500"
                          : school.subscription_status === "trialing"
                          ? "bg-amber-500"
                          : "bg-rose-500"
                      }`}
                    />
                    <span className="capitalize">{school.subscription_status}</span>
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Valid Till</span>
                  <span className="font-semibold text-slate-800 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>{school.subscription_valid_till_formatted}</span>
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Trial Status</span>
                  <span className="font-semibold text-slate-800">
                    {school.trial_days_left ? `${school.trial_days_left} days remaining` : "Not Applicable"}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Student Limit</span>
                  <span className="font-semibold text-slate-800">
                    {school.student_limit?.toLocaleString("en-IN") || "Unlimited"} ({school.student_count} used)
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Storage Limit</span>
                  <span className="font-semibold text-slate-800">
                    {school.storage_limit_gb} ({school.storage_used_gb} used)
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Actions (matches mockup 2x3 grid) */}
            <div>
              <h5 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2.5">
                Quick Actions
              </h5>

              <div className="grid grid-cols-2 gap-2">
                {/* 1. Change Plan */}
                <button
                  onClick={() => onAction(school, "change_plan")}
                  className="p-3 rounded-xl border border-indigo-200 bg-indigo-50/30 hover:bg-indigo-50 text-left transition-colors cursor-pointer group"
                >
                  <div className="w-7 h-7 rounded-lg bg-indigo-600/10 text-indigo-600 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
                    <ArrowUpCircle className="w-4 h-4" />
                  </div>
                  <p className="text-xs font-bold text-slate-900 leading-tight">Change Plan</p>
                  <p className="text-[10px] text-slate-500 leading-tight mt-0.5">Upgrade or downgrade</p>
                </button>

                {/* 2. Extend Trial */}
                <button
                  onClick={() => onAction(school, "extend_trial")}
                  className="p-3 rounded-xl border border-sky-200 bg-sky-50/30 hover:bg-sky-50 text-left transition-colors cursor-pointer group"
                >
                  <div className="w-7 h-7 rounded-lg bg-sky-600/10 text-sky-600 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
                    <Clock className="w-4 h-4" />
                  </div>
                  <p className="text-xs font-bold text-slate-900 leading-tight">Extend Trial</p>
                  <p className="text-[10px] text-slate-500 leading-tight mt-0.5">Give additional days</p>
                </button>

                {/* 3. Extend Subscription */}
                <button
                  onClick={() => onAction(school, "extend_subscription")}
                  className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/30 hover:bg-emerald-50 text-left transition-colors cursor-pointer group"
                >
                  <div className="w-7 h-7 rounded-lg bg-emerald-600/10 text-emerald-600 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
                    <CalendarPlus className="w-4 h-4" />
                  </div>
                  <p className="text-xs font-bold text-slate-900 leading-tight">Extend Subscription</p>
                  <p className="text-[10px] text-slate-500 leading-tight mt-0.5">Add extra validity</p>
                </button>

                {/* 4. Suspend Institution */}
                {school.status !== "suspended" && (
                  <button
                    onClick={() => onAction(school, "suspend")}
                    className="p-3 rounded-xl border border-amber-200 bg-amber-50/30 hover:bg-amber-50 text-left transition-colors cursor-pointer group"
                  >
                    <div className="w-7 h-7 rounded-lg bg-amber-600/10 text-amber-600 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
                      <ShieldAlert className="w-4 h-4" />
                    </div>
                    <p className="text-xs font-bold text-slate-900 leading-tight">Suspend Institution</p>
                    <p className="text-[10px] text-slate-500 leading-tight mt-0.5">Temporarily restrict</p>
                  </button>
                )}

                {/* 5. Reactivate */}
                {school.status === "suspended" && (
                  <button
                    onClick={() => onAction(school, "reactivate")}
                    className="p-3 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100/70 text-left transition-colors cursor-pointer group col-span-1"
                  >
                    <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <p className="text-xs font-bold text-emerald-900 leading-tight">Reactivate</p>
                    <p className="text-[10px] text-emerald-700 leading-tight mt-0.5">Restore suspended access</p>
                  </button>
                )}

                {/* 6. Manage Modules */}
                <button
                  onClick={() => onAction(school, "manage_modules")}
                  className="p-3 rounded-xl border border-purple-200 bg-purple-50/30 hover:bg-purple-50 text-left transition-colors cursor-pointer group"
                >
                  <div className="w-7 h-7 rounded-lg bg-purple-600/10 text-purple-600 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
                    <Layers className="w-4 h-4" />
                  </div>
                  <p className="text-xs font-bold text-slate-900 leading-tight">Manage Modules</p>
                  <p className="text-[10px] text-slate-500 leading-tight mt-0.5">Enable/disable features</p>
                </button>
              </div>
            </div>

            {/* View Subscription History Button */}
            <div className="pt-2">
              <button
                onClick={() => onAction(school, "subscription_history")}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
              >
                <History className="w-4 h-4 text-slate-500" />
                <span>View Subscription History</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: USAGE METRICS */}
        {activeTab === "usage" && (
          <div className="space-y-4">
            {/* Student Capacity Gauge */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-bold text-slate-700">Student Capacity</span>
                <span className="font-extrabold text-indigo-600">{studentUsagePercent}%</span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-slate-200 overflow-hidden">
                <div
                  className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                  style={{ width: `${studentUsagePercent}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-[10px] text-slate-500 mt-1.5">
                <span>{school.student_count.toLocaleString("en-IN")} enrolled</span>
                <span>Limit: {school.student_limit?.toLocaleString("en-IN") || "Unlimited"}</span>
              </div>
            </div>

            {/* Storage Usage */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-bold text-slate-700">Storage Used</span>
                <span className="font-extrabold text-slate-800">{school.storage_used_gb}</span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-slate-200 overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full w-[10%]" />
              </div>
              <div className="flex justify-between items-center text-[10px] text-slate-500 mt-1.5">
                <span>Allocation: {school.storage_limit_gb}</span>
                <span>Tier: Cloud Storage</span>
              </div>
            </div>

            {/* Modules List */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
              <h6 className="text-xs font-bold text-slate-800 mb-2.5">Enabled Modules ({school.enabled_modules.length})</h6>
              <div className="flex flex-wrap gap-1.5">
                {school.enabled_modules.map((m) => (
                  <span
                    key={m}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white border border-slate-200 text-slate-700 capitalize"
                  >
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>{m.replace(/_/g, " ")}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: ACTIVITY LOGS */}
        {activeTab === "activity" && (
          <div className="space-y-3">
            {loadingActivity ? (
              <div className="py-8 text-center text-xs text-slate-400 animate-pulse">
                Loading activity logs...
              </div>
            ) : activityLogs.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-xs font-semibold text-slate-700">No activity logs recorded yet.</p>
                <p className="text-[10px] text-slate-400 mt-1">Actions performed on this school will appear here.</p>
              </div>
            ) : (
              activityLogs.map((log) => (
                <div key={log.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-indigo-700 uppercase text-[10px] tracking-wider">
                      {log.action}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-slate-600 text-[11px]">
                    By: <span className="font-medium text-slate-800">{log.admin_email}</span>
                  </p>
                  {log.details && (
                    <div className="mt-1 text-[10px] font-mono bg-white p-1.5 rounded border border-slate-200 text-slate-600 overflow-x-auto">
                      {JSON.stringify(log.details)}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

