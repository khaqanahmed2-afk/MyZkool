import React, { useState, useEffect } from "react";
import {
  Settings,
  Sliders,
  Mail,
  MessageSquare,
  CreditCard,
  ShieldAlert,
  Save,
  CheckCircle2,
  RefreshCw,
  ToggleLeft,
  ToggleRight,
  Sparkles,
} from "lucide-react";
import { useMasterAdminAuth } from "../../context/MasterAdminAuthContext";
import type { PlatformSetting, PlatformFeatureFlag } from "../../services/masterAdminSettingsService";

export const MasterAdminSettings: React.FC = () => {
  const { hasPermission } = useMasterAdminAuth();
  const [activeTab, setActiveTab] = useState<"branding" | "integrations" | "flags" | "maintenance">("branding");
  const [settings, setSettings] = useState<PlatformSetting[]>([]);
  const [flags, setFlags] = useState<PlatformFeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  // Form states for settings
  const [brandingForm, setBrandingForm] = useState({
    platformName: "MyZkool SaaS",
    supportEmail: "support@myzkool.com",
    tagline: "Next-Gen Multi-Tenant School Management Platform",
    logoUrl: "/logo.svg",
  });

  const [maintenanceForm, setMaintenanceForm] = useState({
    enabled: false,
    bannerMessage: "Scheduled platform maintenance in progress. All systems will resume shortly.",
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [settingsRes, flagsRes] = await Promise.all([
        fetch("/api/master-admin/settings"),
        fetch("/api/master-admin/settings/flags/all"),
      ]);

      const settingsJson = await settingsRes.json();
      const flagsJson = await flagsRes.json();

      if (settingsJson.success && Array.isArray(settingsJson.data)) {
        setSettings(settingsJson.data);
        const branding = settingsJson.data.find((s: any) => s.key === "branding.platform");
        if (branding) setBrandingForm(branding.value);

        const maint = settingsJson.data.find((s: any) => s.key === "maintenance.mode");
        if (maint) setMaintenanceForm(maint.value);
      }

      if (flagsJson.success && Array.isArray(flagsJson.data)) {
        setFlags(flagsJson.data);
      }
    } catch (err) {
      console.error("Failed to load settings:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveSetting = async (key: string, value: Record<string, unknown>) => {
    if (!hasPermission("settings.manage")) return;

    try {
      setSavingKey(key);
      const res = await fetch(`/api/master-admin/settings/${key}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value }),
      });

      const json = await res.json();
      if (json.success) {
        setSaveSuccess(key);
        setTimeout(() => setSaveSuccess(null), 3000);
      } else {
        alert(json.error || "Failed to update setting");
      }
    } catch (err) {
      alert("Error saving setting.");
    } finally {
      setSavingKey(null);
    }
  };

  const handleToggleFlag = async (flagKey: string, currentEnabled: boolean) => {
    if (!hasPermission("settings.manage")) return;

    try {
      const res = await fetch(`/api/master-admin/settings/flags/${flagKey}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isEnabled: !currentEnabled }),
      });

      const json = await res.json();
      if (json.success) {
        setFlags((prev) =>
          prev.map((f) => (f.flag_key === flagKey ? { ...f, is_enabled: !currentEnabled } : f))
        );
      }
    } catch (err) {
      alert("Error updating feature flag.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Global Platform Settings</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700">
              System Control
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Configure platform branding, communication gateways, feature flags, and emergency maintenance mode.
          </p>
        </div>

        <button
          onClick={loadData}
          className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition self-start"
          title="Refresh settings"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        {[
          { id: "branding", label: "Platform Branding", icon: Settings },
          { id: "integrations", label: "Integrations & APIs", icon: Mail },
          { id: "flags", label: "Feature Flags", icon: Sliders },
          { id: "maintenance", label: "Emergency & Maintenance", icon: ShieldAlert },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition ${
                isActive
                  ? "bg-blue-600 text-white shadow-sm shadow-blue-500/20"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab 1: Platform Branding */}
      {activeTab === "branding" && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6 max-w-2xl">
          <div>
            <h2 className="text-base font-bold text-slate-900">Platform Identity & Links</h2>
            <p className="text-xs text-slate-500 mt-1">
              Controls the white-label branding headers and system emails sent to school administrators.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Platform Name</label>
              <input
                type="text"
                value={brandingForm.platformName}
                onChange={(e) => setBrandingForm({ ...brandingForm, platformName: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Public Support Email</label>
              <input
                type="email"
                value={brandingForm.supportEmail}
                onChange={(e) => setBrandingForm({ ...brandingForm, supportEmail: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Tagline</label>
              <input
                type="text"
                value={brandingForm.tagline}
                onChange={(e) => setBrandingForm({ ...brandingForm, tagline: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Logo URL</label>
              <input
                type="text"
                value={brandingForm.logoUrl}
                onChange={(e) => setBrandingForm({ ...brandingForm, logoUrl: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            {saveSuccess === "branding.platform" && (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                <CheckCircle2 className="w-4 h-4" /> Branding saved successfully
              </span>
            )}
            <div className="ml-auto">
              <button
                disabled={savingKey === "branding.platform" || !hasPermission("settings.manage")}
                onClick={() => handleSaveSetting("branding.platform", brandingForm)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {savingKey === "branding.platform" ? "Saving..." : "Save Branding Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Integrations & APIs */}
      {activeTab === "integrations" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
          {/* Email Gateway */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Email Gateway (SendGrid)</h3>
                <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                  ● Operational (Connected)
                </span>
              </div>
            </div>
            <div className="text-xs text-slate-600 space-y-1.5 bg-slate-50 p-3 rounded-lg border border-slate-100">
              <p><strong>From Address:</strong> noreply@myzkool.com</p>
              <p><strong>Sender Name:</strong> MyZkool Platform Notifications</p>
              <p><strong>Daily Tier Quota:</strong> 50,000 emails/day</p>
            </div>
            <p className="text-xs text-slate-400">
              API credentials are automatically injected via production environment variables.
            </p>
          </div>

          {/* WhatsApp Gateway */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">WhatsApp Gateway (Gupshup)</h3>
                <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                  ● Webhook Verified
                </span>
              </div>
            </div>
            <div className="text-xs text-slate-600 space-y-1.5 bg-slate-50 p-3 rounded-lg border border-slate-100">
              <p><strong>Registered Number:</strong> +91 98765 43210</p>
              <p><strong>Webhook Sync:</strong> Active (2-way delivery receipts)</p>
              <p><strong>Template Status:</strong> 18 pre-approved templates</p>
            </div>
            <p className="text-xs text-slate-400">
              Enterprise WhatsApp Business Cloud API routing automated notices and report cards.
            </p>
          </div>

          {/* Razorpay Gateway */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 md:col-span-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Subscription Payment Gateway (Razorpay)</h3>
                <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                  ● Auto-Capture Enabled
                </span>
              </div>
            </div>
            <div className="text-xs text-slate-600 space-y-1.5 bg-slate-50 p-3 rounded-lg border border-slate-100">
              <p><strong>Merchant Name:</strong> MyZkool EdTech Pvt Ltd</p>
              <p><strong>Settlement Cycle:</strong> T+1 Next Business Day</p>
              <p><strong>GST Configuration:</strong> 18% Integrated IGST / CGST+SGST Auto Split</p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Feature Flags */}
      {activeTab === "flags" && (
        <div className="space-y-4 max-w-3xl">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-xs font-bold text-blue-900">Dynamic Feature Rollout Controls</h3>
              <p className="text-xs text-blue-700 mt-0.5">
                Toggle new platform capabilities globally or restrict access to specific subscription plans.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {flags.map((flag) => (
              <div
                key={flag.flag_key}
                className="bg-white rounded-xl border border-slate-200 p-5 flex items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-slate-900">{flag.name}</h4>
                    <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-100 text-slate-600">
                      {flag.flag_key}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{flag.description}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                    <span>
                      Target Plans: <strong>{flag.target_plans.join(", ").toUpperCase() || "ALL"}</strong>
                    </span>
                    <span>•</span>
                    <span>Rollout: <strong>{flag.rollout_percentage}%</strong></span>
                  </div>
                </div>

                {hasPermission("settings.manage") && (
                  <button
                    onClick={() => handleToggleFlag(flag.flag_key, flag.is_enabled)}
                    className="p-1 text-slate-600 hover:text-slate-900 transition"
                  >
                    {flag.is_enabled ? (
                      <ToggleRight className="w-8 h-8 text-emerald-600" />
                    ) : (
                      <ToggleLeft className="w-8 h-8 text-slate-300" />
                    )}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Maintenance Mode */}
      {activeTab === "maintenance" && (
        <div className="bg-white rounded-xl border border-rose-200 p-6 space-y-6 max-w-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Emergency Maintenance Control</h2>
              <p className="text-xs text-rose-600 font-medium mt-0.5">
                Caution: Enabling maintenance mode will block non-admin access across all schools.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-rose-50 rounded-lg border border-rose-100">
              <div>
                <strong className="text-sm text-slate-900">Enable Maintenance Mode</strong>
                <p className="text-xs text-slate-500 mt-0.5">
                  Displays maintenance banner to all school users and blocks mutations.
                </p>
              </div>
              <input
                type="checkbox"
                checked={maintenanceForm.enabled}
                onChange={(e) => setMaintenanceForm({ ...maintenanceForm, enabled: e.target.checked })}
                className="w-5 h-5 text-rose-600 rounded focus:ring-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Banner Notice Text</label>
              <textarea
                rows={3}
                value={maintenanceForm.bannerMessage}
                onChange={(e) => setMaintenanceForm({ ...maintenanceForm, bannerMessage: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            {saveSuccess === "maintenance.mode" && (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                <CheckCircle2 className="w-4 h-4" /> Maintenance status updated
              </span>
            )}
            <div className="ml-auto">
              <button
                disabled={savingKey === "maintenance.mode" || !hasPermission("settings.manage")}
                onClick={() => handleSaveSetting("maintenance.mode", maintenanceForm)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg shadow-sm transition disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {savingKey === "maintenance.mode" ? "Updating..." : "Update Maintenance Status"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MasterAdminSettings;
