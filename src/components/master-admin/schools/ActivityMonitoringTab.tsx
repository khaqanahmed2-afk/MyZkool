import React, { useState, useEffect } from "react";
import type { MasterAdminSchoolSummary } from "../../../services/masterAdminSchoolService";
import {
  Activity,
  AlertTriangle,
  Clock,
  ShieldAlert,
  CheckCircle2,
  Calendar,
  Lock,
  ArrowRight,
} from "lucide-react";

interface Props {
  schools: MasterAdminSchoolSummary[];
  token?: string | null;
  onSelectSchool: (school: MasterAdminSchoolSummary) => void;
}

export const ActivityMonitoringTab: React.FC<Props> = ({
  schools,
  token,
  onSelectSchool,
}) => {
  const [platformLogs, setPlatformLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch("/api/master-admin/monitoring/audit-logs?limit=25", {
      headers: { Authorization: `Bearer ${token || "test-token-admin"}` },
    })
      .then((r) => r.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          setPlatformLogs(json.data);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  // Operational Proactive Alerts
  const suspendedSchools = schools.filter((s) => s.status === "suspended");
  const pendingSchools = schools.filter((s) => !s.onboarding_completed);
  const expiringTrials = schools.filter(
    (s) => s.subscription_status === "trialing" && (s.trial_days_left ?? 999) <= 7
  );

  return (
    <div className="space-y-6">
      {/* Proactive Operational Alerts */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
          Active Platform Operational Alerts
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Suspended Institutions Alert */}
          <div className="p-4 rounded-2xl bg-rose-50/80 border border-rose-200/90 shadow-2xs space-y-2">
            <div className="flex items-center gap-2 text-rose-800 font-bold text-xs">
              <ShieldAlert className="w-4 h-4 text-rose-600" />
              <span>{suspendedSchools.length} Suspended Institutions</span>
            </div>
            <p className="text-[11px] text-rose-700">
              Access restricted due to overdue renewal invoices or policy compliance review.
            </p>
          </div>

          {/* Expiring Trials Alert */}
          <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/90 shadow-2xs space-y-2">
            <div className="flex items-center gap-2 text-amber-800 font-bold text-xs">
              <Clock className="w-4 h-4 text-amber-600" />
              <span>{expiringTrials.length} Trials Expiring &le; 7 Days</span>
            </div>
            <p className="text-[11px] text-amber-700">
              Free trial evaluation periods concluding soon. Prompt conversion to paid ERP plans.
            </p>
          </div>

          {/* Incomplete Onboarding Alert */}
          <div className="p-4 rounded-2xl bg-indigo-50/80 border border-indigo-200/90 shadow-2xs space-y-2">
            <div className="flex items-center gap-2 text-indigo-800 font-bold text-xs">
              <AlertTriangle className="w-4 h-4 text-indigo-600" />
              <span>{pendingSchools.length} Incomplete Onboardings</span>
            </div>
            <p className="text-[11px] text-indigo-700">
              Tenants awaiting academic setup, staff imports, or domain activation.
            </p>
          </div>
        </div>
      </div>

      {/* Real-Time Platform Audit Events Feed */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 font-heading">
                Platform Administrative Audit Stream
              </h4>
              <p className="text-xs text-slate-500">
                Immutable security logs and administrative changes across institutional tenants.
              </p>
            </div>
          </div>
        </div>

        <div className="p-5">
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400 animate-pulse">
              Loading platform audit stream...
            </div>
          ) : platformLogs.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              No recent administrative actions recorded.
            </div>
          ) : (
            <div className="space-y-3">
              {platformLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3.5 rounded-xl border border-slate-200/80 bg-white hover:border-slate-300 transition-all text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-indigo-700 font-mono text-[11px] uppercase">
                        {log.action}
                      </span>
                      <span className="text-slate-400 text-[10px]">·</span>
                      <span className="text-slate-600 font-medium text-[11px]">
                        Admin: {log.admin_email}
                      </span>
                    </div>
                    {log.details && (
                      <p className="text-slate-500 text-[11px] mt-1 truncate max-w-xl">
                        {typeof log.details === "string" ? log.details : JSON.stringify(log.details)}
                      </p>
                    )}
                  </div>

                  <span className="text-[11px] font-mono text-slate-400 whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
