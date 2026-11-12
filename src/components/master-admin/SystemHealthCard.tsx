import React from "react";
import { Activity, Zap, CheckCircle2, AlertCircle, Database, Server, HardDrive, Cpu, Radio } from "lucide-react";
import type { SystemHealthOverview } from "../../types/masterAdmin";

interface SystemHealthCardProps {
  health: SystemHealthOverview;
  loading?: boolean;
}

export const SystemHealthCard: React.FC<SystemHealthCardProps> = ({ health, loading = false }) => {
  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs h-full animate-pulse">
        <div className="h-6 w-32 bg-slate-100 rounded mb-4" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-4 bg-slate-100 rounded" />
          ))}
        </div>
      </div>
    );
  }

  const serviceList = [
    {
      name: "Application Server",
      detail: "Express / Node Runtime",
      icon: Server,
      status: health.services.webApp.status,
      latency: health.services.webApp.latencyMs,
      label: health.services.webApp.label || "Operational",
    },
    {
      name: "Database (Supabase)",
      detail: "PostgreSQL Production Pool",
      icon: Database,
      status: health.services.database.status,
      latency: health.services.database.latencyMs,
      label: health.services.database.label || "Operational",
    },
    {
      name: "Cloud Storage",
      detail: "Supabase Object Buckets",
      icon: HardDrive,
      status: health.services.storage.status,
      latency: health.services.storage.latencyMs,
      label: health.services.storage.label || "Operational",
    },
    {
      name: "Background Crons",
      detail: "Automated Dues & Reminders",
      icon: Cpu,
      status: health.services.backgroundJobs.status,
      latency: health.services.backgroundJobs.latencyMs,
      label: health.services.backgroundJobs.label || "Operational",
    },
    {
      name: "External Integrations",
      detail: "Razorpay / Communications",
      icon: Radio,
      status: health.services.apiIntegrations.status,
      latency: health.services.apiIntegrations.latencyMs,
      label: health.services.apiIntegrations.label || "Operational",
    },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "operational":
        return {
          dot: "bg-emerald-500",
          badge: "bg-emerald-50 text-emerald-700 border-emerald-200/60",
          text: "Operational",
        };
      case "degraded":
        return {
          dot: "bg-amber-500",
          badge: "bg-amber-50 text-amber-700 border-amber-200/60",
          text: "Degraded",
        };
      case "outage":
      case "down":
        return {
          dot: "bg-rose-500",
          badge: "bg-rose-50 text-rose-700 border-rose-200/60",
          text: "Outage",
        };
      case "unavailable":
      default:
        return {
          dot: "bg-slate-400",
          badge: "bg-slate-100 text-slate-600 border-slate-200",
          text: "Monitoring unavailable",
        };
    }
  };

  const isDegraded = health.overall === "degraded" || health.overall === "outage";

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs flex flex-col justify-between h-full">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">System Health</h3>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${
              isDegraded
                ? "bg-amber-50 text-amber-700 border-amber-200/80"
                : "bg-emerald-50 text-emerald-700 border-emerald-200/80"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isDegraded ? "bg-amber-500" : "bg-emerald-500"
              } animate-pulse`}
            />
            {isDegraded ? "Performance Alert" : "Core Systems Operational"}
          </span>
        </div>

        {/* Services List */}
        <div className="space-y-2.5">
          {serviceList.map((service, idx) => {
            const badge = getStatusBadge(service.status);
            const Icon = service.icon;

            return (
              <div
                key={idx}
                className="flex items-center justify-between text-xs py-1 px-2 rounded-xl hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-6 h-6 rounded-md bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-slate-800 font-bold truncate leading-tight">{service.name}</p>
                    <p className="text-[10px] text-slate-400 truncate">{service.detail}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 ml-2">
                  {service.latency !== undefined && (
                    <span className="text-[10px] font-mono text-slate-400 hidden sm:inline">
                      {service.latency}ms
                    </span>
                  )}
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border ${badge.badge}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                    <span>{badge.text}</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Real Diagnostics Metrics Footer */}
      <div className="grid grid-cols-2 gap-3 pt-4 mt-4 border-t border-slate-100">
        <div className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-50 border border-slate-100">
          <div className="w-7 h-7 rounded-lg bg-emerald-100/70 text-emerald-700 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-900 truncate">
              {health.serverUptimeFormatted || "Live"}
            </p>
            <p className="text-[10px] text-slate-400">Process Uptime</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-50 border border-slate-100">
          <div className="w-7 h-7 rounded-lg bg-blue-100/70 text-blue-700 flex items-center justify-center shrink-0">
            <Zap className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-900 truncate">{health.avgResponseMs} ms</p>
            <p className="text-[10px] text-slate-400">Database Ping</p>
          </div>
        </div>
      </div>
    </div>
  );
};
