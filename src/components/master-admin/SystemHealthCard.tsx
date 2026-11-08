import React from "react";
import { Activity, Zap, CheckCircle2 } from "lucide-react";
import type { SystemHealthOverview } from "../../types/masterAdmin";

interface SystemHealthCardProps {
  health: SystemHealthOverview;
}

export const SystemHealthCard: React.FC<SystemHealthCardProps> = ({ health }) => {
  const serviceList = [
    { name: "Application (Web App)", status: health.services.webApp.status },
    { name: "Database (Supabase)", status: health.services.database.status },
    { name: "Storage", status: health.services.storage.status },
    { name: "Background Jobs (Cron)", status: health.services.backgroundJobs.status },
    { name: "API & Integrations", status: health.services.apiIntegrations.status },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs flex flex-col justify-between">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">System Health</h3>
          </div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200/80">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            All Systems Operational
          </span>
        </div>

        {/* Services List */}
        <div className="space-y-3">
          {serviceList.map((service, idx) => (
            <div key={idx} className="flex items-center justify-between text-xs py-0.5">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-slate-700 font-medium">{service.name}</span>
              </div>
              <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-600 font-semibold text-[10px] capitalize">
                {service.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Metrics Footer */}
      <div className="grid grid-cols-2 gap-3 pt-4 mt-4 border-t border-slate-100">
        <div className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-50 border border-slate-100">
          <div className="w-7 h-7 rounded-lg bg-emerald-100/70 text-emerald-700 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-900">{health.uptimePercent}%</p>
            <p className="text-[10px] text-slate-400">Uptime (30 days)</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-50 border border-slate-100">
          <div className="w-7 h-7 rounded-lg bg-blue-100/70 text-blue-700 flex items-center justify-center shrink-0">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-900">{health.avgResponseMs} ms</p>
            <p className="text-[10px] text-slate-400">Avg. Response</p>
          </div>
        </div>
      </div>
    </div>
  );
};

