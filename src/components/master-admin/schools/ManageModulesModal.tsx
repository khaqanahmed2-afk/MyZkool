import React, { useState } from "react";
import type { MasterAdminSchoolSummary } from "../../../services/masterAdminSchoolService";
import { X, Layers, Check, ShieldCheck, AlertCircle } from "lucide-react";

interface Props {
  school: MasterAdminSchoolSummary;
  onClose: () => void;
  onSuccess: () => void;
  token?: string | null;
}

interface ModuleOption {
  key: string;
  name: string;
  description: string;
  category: "core" | "academic" | "operations" | "advanced";
}

const AVAILABLE_MODULES: ModuleOption[] = [
  { key: "students", name: "Student Information System (SIS)", description: "Profiles, enrollment, family links, and ID cards", category: "core" },
  { key: "fees", name: "Fee Management & Online Collections", description: "Invoicing, receipts, ledger, dues, and payment gateway", category: "core" },
  { key: "attendance", name: "Daily Attendance & Leave", description: "Biometric & manual student & staff attendance", category: "core" },
  { key: "admissions", name: "Admissions & Inquiries", description: "Online application forms, tracking, and onboarding", category: "academic" },
  { key: "exams", name: "Exams & Report Cards", description: "Grading system, CBSE/ICSE marks sheets, and transcripts", category: "academic" },
  { key: "timetable", name: "Timetable & Schedules", description: "Period allocations and teacher workload planner", category: "academic" },
  { key: "transport", name: "Bus Transport & Fleet", description: "Route builder, fee zones, vehicle GPS, and stops", category: "operations" },
  { key: "communication", name: "Parent Communication", description: "SMS alerts, circulars, notifications, and consents", category: "operations" },
  { key: "website", name: "Public School Website & CMS", description: "Brand portal, admissions enquiry widget, and news", category: "operations" },
  { key: "reports", name: "Advanced Analytics & MIS", description: "Financial audits, enrollment trends, and government reports", category: "advanced" },
  { key: "approvals", name: "Multi-Tier Approval Workflows", description: "Fee concessions, refunds, and TC issuance authorization", category: "advanced" },
];

export const ManageModulesModal: React.FC<Props> = ({
  school,
  onClose,
  onSuccess,
  token,
}) => {
  const [selectedModules, setSelectedModules] = useState<string[]>(
    school.enabled_modules || ["students", "fees", "attendance", "admissions", "website", "communication"]
  );
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleModule = (key: string) => {
    if (selectedModules.includes(key)) {
      setSelectedModules(selectedModules.filter((m) => m !== key));
    } else {
      setSelectedModules([...selectedModules, key]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim() || reason.trim().length < 5) {
      setError("Please provide an administrative reason (min 5 characters).");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/master-admin/schools/${school.id}/modules`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token || "test-token-admin"}`,
        },
        body: JSON.stringify({
          enabledModules: selectedModules,
          reason: reason.trim(),
        }),
      });

      const json = await res.json();
      if (json.success) {
        onSuccess();
        onClose();
      } else {
        setError(json.error || "Failed to update school modules.");
      }
    } catch (err: any) {
      setError(err.message || "Network request failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 font-heading">
                Manage Institution Modules
              </h3>
              <p className="text-xs text-slate-500">
                {school.name} ({school.institution_code})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-500">
              Select or deselect modules enabled for this institutional tenant:
            </p>

            <div className="space-y-2">
              {AVAILABLE_MODULES.map((mod) => {
                const isEnabled = selectedModules.includes(mod.key);
                return (
                  <button
                    type="button"
                    key={mod.key}
                    onClick={() => toggleModule(mod.key)}
                    className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-colors w-full text-left ${
                      isEnabled
                        ? "bg-indigo-50/50 border-indigo-200 shadow-2xs"
                        : "bg-white border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="min-w-0 pr-3">
                      <p className={`text-xs font-bold ${isEnabled ? "text-indigo-900" : "text-slate-800"}`}>
                        {mod.name}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">{mod.description}</p>
                    </div>

                    <div
                      className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                        isEnabled
                          ? "bg-indigo-600 border-indigo-600 text-white"
                          : "border-slate-300 bg-white"
                      }`}
                    >
                      {isEnabled && <Check className="w-3.5 h-3.5" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5 pt-2">
            <label htmlFor="manage-modules-reason" className="text-xs font-bold text-slate-700">Administrative Reason</label>
            <textarea
              id="manage-modules-reason"
              name="reason"
              required
              rows={2}
              placeholder="e.g. Added Bus Transport and Timetable module under upgraded campus tier..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-500 font-medium">
            {selectedModules.length} of {AVAILABLE_MODULES.length} modules active
          </span>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{submitting ? "Saving..." : "Save Modules"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
