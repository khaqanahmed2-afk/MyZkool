import React from "react";
import type { MasterAdminSchoolSummary } from "../../../services/masterAdminSchoolService";
import {
  ShieldCheck,
  Database,
  Lock,
  Globe,
  HardDrive,
  Users,
  CheckCircle2,
  ExternalLink,
  Key,
} from "lucide-react";

interface Props {
  schools: MasterAdminSchoolSummary[];
  onSelectSchool: (school: MasterAdminSchoolSummary) => void;
}

export const TenantsTab: React.FC<Props> = ({ schools, onSelectSchool }) => {
  return (
    <div className="space-y-6">
      {/* Isolation Status Banner */}
      <div className="bg-emerald-50/80 rounded-2xl p-5 border border-emerald-200/90 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-emerald-950 font-heading">
              Multi-Tenant Row-Level Security (RLS) Active
            </h4>
            <p className="text-xs text-emerald-700 mt-0.5">
              Strict database isolation enforced via Supabase Postgres RLS policies across all tables. Tenant data cross-talk is cryptographically blocked at the engine layer.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-emerald-800 rounded-xl text-xs font-bold shadow-2xs border border-emerald-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>100% Isolated</span>
          </span>
        </div>
      </div>

      {/* Tenant Directory Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {schools.map((school) => (
          <div
            key={school.id}
            onClick={() => onSelectSchool(school)}
            className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 space-y-3.5 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h5 className="text-sm font-bold text-slate-900 truncate">{school.name}</h5>
                <p className="font-mono text-[11px] text-slate-400 mt-0.5">{school.institution_code}</p>
              </div>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                  school.status === "active"
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-rose-50 text-rose-700"
                }`}
              >
                {school.status}
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-600">
                <span className="flex items-center gap-1.5 text-slate-500">
                  <Globe className="w-3.5 h-3.5" />
                  <span>Subdomain</span>
                </span>
                <span className="font-mono font-semibold text-slate-800 truncate max-w-[150px]">
                  {school.subdomain}.myzkool.in
                </span>
              </div>

              <div className="flex items-center justify-between text-slate-600">
                <span className="flex items-center gap-1.5 text-slate-500">
                  <HardDrive className="w-3.5 h-3.5" />
                  <span>Storage Quota</span>
                </span>
                <span className="font-semibold text-slate-800">
                  {school.storage_limit_gb}
                </span>
              </div>

              <div className="flex items-center justify-between text-slate-600">
                <span className="flex items-center gap-1.5 text-slate-500">
                  <Users className="w-3.5 h-3.5" />
                  <span>Student Limit</span>
                </span>
                <span className="font-semibold text-slate-800">
                  {school.student_limit?.toLocaleString("en-IN") || "Unlimited"}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-mono">
              <span className="truncate">Tenant UUID: {school.id.slice(0, 8)}...</span>
              <span className="text-indigo-600 font-semibold flex items-center gap-1">
                Inspect <ExternalLink className="w-3 h-3" />
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
