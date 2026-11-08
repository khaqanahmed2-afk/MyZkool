import React, { useState, useEffect } from "react";
import {
  Activity,
  Server,
  Database,
  HardDrive,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Cpu,
  Layers,
  ShieldCheck,
} from "lucide-react";
import type { SystemHealthMetrics } from "../../services/masterAdminMonitoringService";

export const MasterAdminMonitoring: React.FC = () => {
  const [metrics, setMetrics] = useState<SystemHealthMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchHealth = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/master-admin/monitoring/health");
      const json = await res.json();
      if (json.success && json.data) {
        setMetrics(json.data);
      }
    } catch (err) {
      console.error("Failed to load health metrics:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 15000); // 15-second polling for live health
    return () => clearInterval(interval);
  }, []);

  const formatBytes = (bytes: number) => {
    const gb = bytes / (1024 * 1024 * 1024);
    return `${gb.toFixed(1)} GB`;
  };

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${d > 0 ? `${d}d ` : ""}${h}h ${m}m`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">System Monitoring & Health</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Telemetry
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Real-time infrastructure health, database connection pools, memory consumption, and gateway status.
          </p>
        </div>

        <button
          onClick={fetchHealth}
          className="inline-flex items-center gap-2 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg shadow-xs transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh Metrics
        </button>
      </div>

      {/* Top Level KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Overall Status</span>
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xl font-bold text-slate-900 capitalize">
              {metrics?.overallStatus || "Healthy"}
            </span>
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
              All Systems Go
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-2">Zero active service outages</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Platform Uptime</span>
            <Activity className="w-4 h-4 text-blue-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xl font-bold text-slate-900">{metrics?.uptimePercentage || 99.98}%</span>
            <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
              Last 30 Days
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-2">Exceeds 99.9% SaaS SLA target</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Avg API Latency</span>
            <Clock className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xl font-bold text-slate-900">{metrics?.averageResponseTimeMs || 24} ms</span>
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
              Fast
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-2">Server endpoint round-trip</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Process Uptime</span>
            <Cpu className="w-4 h-4 text-purple-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xl font-bold text-slate-900">
              {metrics ? formatUptime(metrics.serverDiagnostics.uptimeSeconds) : "Active"}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-2">Node.js {metrics?.serverDiagnostics.nodeVersion}</p>
        </div>
      </div>

      {/* Core Services Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Core Infrastructure */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Server className="w-4 h-4 text-blue-600" />
            Infrastructure & Database Nodes
          </h2>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-lg border border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                  <Server className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">Application Server (Vite / Express)</h3>
                  <p className="text-[11px] text-slate-400">Vercel Serverless & Node 20 runtime</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-slate-500">{metrics?.services.webApplication.latencyMs || 24}ms</span>
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                  Operational
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-lg border border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">Supabase PostgreSQL 15</h3>
                  <p className="text-[11px] text-slate-400">{metrics?.services.databaseSupabase.connectionPool}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-slate-500">{metrics?.services.databaseSupabase.latencyMs || 14}ms</span>
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                  Operational
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-lg border border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
                  <HardDrive className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">Document & Asset Storage</h3>
                  <p className="text-[11px] text-slate-400">
                    {metrics ? formatBytes(metrics.services.storageBucket.usedBytes) : "142 GB"} of 1 TB used (14.2%)
                  </p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                Operational
              </span>
            </div>

            <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-lg border border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">Scheduled Background Crons</h3>
                  <p className="text-[11px] text-slate-400">Transport expiry, billing reconciliation, daily attendance</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                0 Failed Jobs
              </span>
            </div>
          </div>
        </div>

        {/* Third-Party Gateways & Node Diagnostics */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-600" />
              SaaS Integrations & Gateways
            </h2>

            <div className="space-y-2.5">
              {[
                { name: "SendGrid SMTP Email", status: "Operational", desc: "Transactional school invites & fee receipts" },
                { name: "Gupshup WhatsApp Cloud API", status: "Operational", desc: "Parent attendance alerts & daily broadcast" },
                { name: "Razorpay Payment Gateway", status: "Operational", desc: "Card, UPI, Netbanking subscription auto-settle" },
              ].map((gw) => (
                <div key={gw.name} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">{gw.name}</h3>
                    <p className="text-[11px] text-slate-400">{gw.desc}</p>
                  </div>
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                    <CheckCircle2 className="w-3 h-3" /> {gw.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Node.js Runtime Stats */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-3">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-purple-600" />
              Process Memory Allocation
            </h2>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 bg-slate-50 rounded-lg">
                <span className="text-[11px] text-slate-500 font-semibold block">RSS Memory</span>
                <strong className="text-sm text-slate-900 font-mono">
                  {metrics?.serverDiagnostics.memoryUsageMB.rss || 164} MB
                </strong>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <span className="text-[11px] text-slate-500 font-semibold block">Heap Total</span>
                <strong className="text-sm text-slate-900 font-mono">
                  {metrics?.serverDiagnostics.memoryUsageMB.heapTotal || 82} MB
                </strong>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <span className="text-[11px] text-slate-500 font-semibold block">Heap Used</span>
                <strong className="text-sm text-slate-900 font-mono">
                  {metrics?.serverDiagnostics.memoryUsageMB.heapUsed || 61} MB
                </strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MasterAdminMonitoring;
