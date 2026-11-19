import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Settings,
  Save,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Clock,
  Calendar,
  Shield,
  HelpCircle,
} from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { AttendanceNavHeader } from "../../../components/admin/attendance/AttendanceNavHeader";
import {
  getAttendanceSettings,
  updateAttendanceSettings,
} from "../../../services/attendanceService";
import type { AttendanceSettings } from "../../../types/attendance";

export function AttendanceSettingsPage() {
  const { school } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<AttendanceSettings | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (!school?.id) return;
    const fetchSettings = async () => {
      setLoading(true);
      try {
        const data = await getAttendanceSettings(school.id);
        setSettings(data);
      } catch (err) {
        console.error("Failed to fetch attendance settings:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, [school?.id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!school?.id || !settings) return;

    setSaving(true);
    setMessage(null);
    try {
      const res = await updateAttendanceSettings({
        schoolId: school.id,
        settings,
      });

      if (res.success) {
        setMessage({ type: "success", text: "Attendance settings updated successfully!" });
      } else {
        setMessage({ type: "error", text: res.message });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err?.message || "Failed to update settings." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <AttendanceNavHeader
        title="Attendance Settings"
        subtitle="Configure school-level attendance rules, defaults, and late cutoffs"
        actions={
          <div className="flex items-center gap-2">
            <Link
              to="/admin/attendance"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E6EAF3] bg-white text-xs sm:text-sm font-semibold text-[#5B6478] hover:text-[#141A2E] hover:bg-slate-50 transition-colors shadow-2xs"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Link>
          </div>
        }
      />

      <div className="max-w-3xl">
        <form onSubmit={handleSave} className="space-y-6">
          {message && (
            <div
              className={`p-3.5 rounded-xl text-xs flex items-center gap-2 border ${
                message.type === "success"
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                  : "bg-rose-50 text-rose-800 border-rose-200"
              }`}
            >
              {message.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{message.text}</span>
            </div>
          )}

          {/* Section 1: Default Status & Marking Rules */}
          <div className="bg-white rounded-2xl border border-[#E6EAF3] p-5 sm:p-6 shadow-2xs space-y-4">
            <h3 className="text-sm font-bold text-[#141A2E] font-heading flex items-center gap-2 pb-2 border-b border-[#E6EAF3]">
              <Settings className="w-4 h-4 text-[#2158E0]" />
              Attendance Defaults & Policies
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#141A2E] mb-1">
                  Default Attendance Status
                </label>
                <p className="text-[11px] text-[#5B6478] mb-2">
                  Pre-selected attendance state when loading a class student list in Take Attendance.
                </p>
                <select
                  disabled={loading || !settings}
                  value={settings?.default_status || "present"}
                  onChange={(e) =>
                    setSettings((prev) =>
                      prev ? { ...prev, default_status: e.target.value as any } : null
                    )
                  }
                  className="w-full sm:w-64 px-3 py-2 text-xs rounded-lg border border-[#E6EAF3] bg-white text-[#141A2E] focus:outline-none focus:border-[#2158E0]"
                >
                  <option value="present">Present (Recommended for fast marking)</option>
                  <option value="absent">Absent</option>
                  <option value="unmarked">Unmarked (Requires individual check)</option>
                </select>
              </div>

              <div className="pt-3 border-t border-[#E6EAF3] flex items-center justify-between">
                <div>
                  <label className="text-xs font-semibold text-[#141A2E] block">
                    Allow Late Attendance Status
                  </label>
                  <p className="text-[11px] text-[#5B6478]">
                    Permits marking students as &ldquo;Late&rdquo; in manual and QR attendance.
                  </p>
                </div>
                <input
                  type="checkbox"
                  disabled={loading || !settings}
                  checked={settings?.allow_late_marking ?? true}
                  onChange={(e) =>
                    setSettings((prev) =>
                      prev ? { ...prev, allow_late_marking: e.target.checked } : null
                    )
                  }
                  className="w-4 h-4 text-[#2158E0] rounded border-slate-300 focus:ring-[#2158E0]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#141A2E] mb-1">
                  Late Arrival Cutoff Time
                </label>
                <p className="text-[11px] text-[#5B6478] mb-2">
                  Students scanned or marked after this time will be considered late.
                </p>
                <div className="relative w-full sm:w-48">
                  <Clock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#5B6478]" />
                  <input
                    type="time"
                    disabled={loading || !settings}
                    value={settings?.late_cutoff_time || "08:30:00"}
                    onChange={(e) =>
                      setSettings((prev) =>
                        prev ? { ...prev, late_cutoff_time: e.target.value } : null
                      )
                    }
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-[#E6EAF3] bg-white text-[#141A2E] focus:outline-none focus:border-[#2158E0]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Audit & Correction Policies */}
          <div className="bg-white rounded-2xl border border-[#E6EAF3] p-5 sm:p-6 shadow-2xs space-y-4">
            <h3 className="text-sm font-bold text-[#141A2E] font-heading flex items-center gap-2 pb-2 border-b border-[#E6EAF3]">
              <Shield className="w-4 h-4 text-[#2158E0]" />
              Audit Trail & Correction Windows
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#141A2E] mb-1">
                  Prevent Past Edit Lockout (Days)
                </label>
                <p className="text-[11px] text-[#5B6478] mb-2">
                  Number of days after which past attendance records are permanently locked from modifications.
                </p>
                <input
                  type="number"
                  min={1}
                  max={365}
                  disabled={loading || !settings}
                  value={settings?.prevent_past_edit_days || 30}
                  onChange={(e) =>
                    setSettings((prev) =>
                      prev
                        ? { ...prev, prevent_past_edit_days: parseInt(e.target.value, 10) || 30 }
                        : null
                    )
                  }
                  className="w-full sm:w-36 px-3 py-2 text-xs rounded-lg border border-[#E6EAF3] bg-white text-[#141A2E] focus:outline-none focus:border-[#2158E0]"
                />
              </div>

              <div className="pt-3 border-t border-[#E6EAF3] flex items-center justify-between">
                <div>
                  <label className="text-xs font-semibold text-[#141A2E] block">
                    Require Leave Reason
                  </label>
                  <p className="text-[11px] text-[#5B6478]">
                    Mandates entering an explanation whenever marking a student on leave.
                  </p>
                </div>
                <input
                  type="checkbox"
                  disabled={loading || !settings}
                  checked={settings?.require_leave_reason ?? false}
                  onChange={(e) =>
                    setSettings((prev) =>
                      prev ? { ...prev, require_leave_reason: e.target.checked } : null
                    )
                  }
                  className="w-4 h-4 text-[#2158E0] rounded border-slate-300 focus:ring-[#2158E0]"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="submit"
              disabled={saving || loading}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2158E0] text-white text-xs sm:text-sm font-semibold hover:bg-blue-700 shadow-sm transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AttendanceSettingsPage;
