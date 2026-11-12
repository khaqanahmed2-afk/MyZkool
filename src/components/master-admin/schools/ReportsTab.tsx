import React from "react";
import type { MasterAdminSchoolSummary } from "../../../services/masterAdminSchoolService";
import {
  FileText,
  Download,
  BarChart3,
  PieChart,
  CheckCircle2,
  Ban,
  Clock,
  CreditCard,
  Building,
} from "lucide-react";

interface Props {
  schools: MasterAdminSchoolSummary[];
  onExport: () => void;
}

export const ReportsTab: React.FC<Props> = ({ schools, onExport }) => {
  const activeCount = schools.filter((s) => s.status === "active").length;
  const suspendedCount = schools.filter((s) => s.status === "suspended").length;
  const pendingCount = schools.filter((s) => !s.onboarding_completed).length;

  const proCount = schools.filter((s) => s.current_plan_slug === "pro").length;
  const basicCount = schools.filter((s) => s.current_plan_slug === "basic").length;
  const customCount = schools.filter((s) => s.current_plan_slug === "custom").length;

  const totalStudents = schools.reduce((sum, s) => sum + (s.student_count || 0), 0);
  const totalStaff = schools.reduce((sum, s) => sum + (s.staff_count || 0), 0);

  return (
    <div className="space-y-6">
      {/* Reports Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 font-heading">
            Institutional Analytics & Export Center
          </h3>
          <p className="text-xs text-slate-500">
            Generate audit reports, lifecycle distributions, and verified CSV exports.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer shrink-0"
          >
            <FileText className="w-3.5 h-3.5 text-slate-500" />
            <span>Print Executive Summary</span>
          </button>
          <button
            onClick={onExport}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer shrink-0"
          >
            <Download className="w-4 h-4" />
            <span>Export Verified CSV</span>
          </button>
        </div>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Report Card 1: Lifecycle Distribution */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 space-y-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-600" />
              <span>Status & Lifecycle Distribution</span>
            </h4>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-emerald-700">Active Institutions</span>
                <span className="font-bold">{activeCount} ({schools.length ? Math.round((activeCount / schools.length) * 100) : 0}%)</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{ width: `${schools.length ? (activeCount / schools.length) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-rose-700">Suspended Institutions</span>
                <span className="font-bold">{suspendedCount} ({schools.length ? Math.round((suspendedCount / schools.length) * 100) : 0}%)</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-rose-500 rounded-full"
                  style={{ width: `${schools.length ? (suspendedCount / schools.length) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-amber-700">Pending Onboarding</span>
                <span className="font-bold">{pendingCount} ({schools.length ? Math.round((pendingCount / schools.length) * 100) : 0}%)</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full"
                  style={{ width: `${schools.length ? (pendingCount / schools.length) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Report Card 2: Subscription Tier Distribution */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 space-y-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-purple-600" />
              <span>Subscription Tier Distribution</span>
            </h4>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-xl">
              <p className="text-lg font-extrabold text-purple-900">{proCount}</p>
              <p className="text-[11px] font-bold text-purple-700 mt-0.5">Pro Tier</p>
            </div>
            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl">
              <p className="text-lg font-extrabold text-amber-900">{basicCount}</p>
              <p className="text-[11px] font-bold text-amber-700 mt-0.5">Basic Tier</p>
            </div>
            <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl">
              <p className="text-lg font-extrabold text-blue-900">{customCount}</p>
              <p className="text-[11px] font-bold text-blue-700 mt-0.5">Custom Tier</p>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl space-y-1 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Total Enrolled Headcount:</span>
              <strong className="text-slate-900 font-bold">{totalStudents.toLocaleString("en-IN")} students</strong>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Total Faculty & Staff:</span>
              <strong className="text-slate-900 font-bold">{totalStaff.toLocaleString("en-IN")} staff</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
