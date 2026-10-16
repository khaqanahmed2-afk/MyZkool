import React, { useState, useEffect } from "react";
import {
  X,
  Plus,
  Trash2,
  Edit3,
  Check,
  FileText,
  Sliders,
  Sparkles,
  Smartphone,
  Info,
  Clock,
  ShieldCheck,
} from "lucide-react";
import type { ReminderTemplate } from "../../../types/duesReminders";
import type { FeeReminderRule } from "../../../types/feeOperations";
import {
  saveReminderTemplate,
  deleteReminderTemplate,
  interpolateTemplate,
} from "../../../services/duesRemindersService";
import { getReminderRules } from "../../../services/reminderJob";

interface ReminderTemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  templates: ReminderTemplate[];
  schoolId: string;
  schoolName: string;
  onTemplatesUpdated: () => void;
}

export function ReminderTemplatesModal({
  isOpen,
  onClose,
  templates,
  schoolId,
  schoolName,
  onTemplatesUpdated,
}: ReminderTemplatesModalProps) {
  const [activeTab, setActiveTab] = useState<"templates" | "rules">("templates");
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ReminderTemplate | null>(null);

  // Form state
  const [formName, setFormName] = useState<string>("");
  const [formPurpose, setFormPurpose] = useState<ReminderTemplate["purpose"]>("general");
  const [formChannel, setFormChannel] = useState<ReminderTemplate["channel"]>("whatsapp");
  const [formBody, setFormBody] = useState<string>("");
  const [formIsActive, setFormIsActive] = useState<boolean>(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Automated Rules state
  const [rules, setRules] = useState<FeeReminderRule[]>([]);
  const [rulesLoading, setRulesLoading] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      loadRules();
    }
  }, [isOpen, schoolId]);

  const loadRules = async () => {
    setRulesLoading(true);
    try {
      const data = await getReminderRules(schoolId);
      setRules(data);
    } finally {
      setRulesLoading(false);
    }
  };

  const handleStartCreate = () => {
    setSelectedTemplate(null);
    setFormName("");
    setFormPurpose("general");
    setFormChannel("whatsapp");
    setFormBody(
      "Dear Parent,\nThis is a reminder that fee amount of ₹{amount} for {student_name} (Class {class_section}) is pending against Invoice {invoice_no}.\nPlease pay before {due_date}.\n- {school_name}"
    );
    setFormIsActive(true);
    setFormError(null);
    setIsEditing(true);
  };

  const handleStartEdit = (tpl: ReminderTemplate) => {
    setSelectedTemplate(tpl);
    setFormName(tpl.name);
    setFormPurpose(tpl.purpose);
    setFormChannel(tpl.channel);
    setFormBody(tpl.body);
    setFormIsActive(tpl.isActive);
    setFormError(null);
    setIsEditing(true);
  };

  const handleSaveTemplate = async () => {
    if (!formName.trim()) {
      setFormError("Template name is required");
      return;
    }
    if (!formBody.trim()) {
      setFormError("Message body is required");
      return;
    }

    setIsSaving(true);
    setFormError(null);
    try {
      await saveReminderTemplate(schoolId, {
        id: selectedTemplate?.id,
        name: formName.trim(),
        purpose: formPurpose,
        channel: formChannel,
        body: formBody.trim(),
        isActive: formIsActive,
      });

      setIsEditing(false);
      onTemplatesUpdated();
    } catch (err: any) {
      setFormError(err.message || "Failed to save template");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (tplId: string) => {
    if (confirm("Are you sure you want to delete this reminder template?")) {
      await deleteReminderTemplate(schoolId, tplId);
      onTemplatesUpdated();
    }
  };

  const samplePreview = interpolateTemplate(formBody, {
    student_name: "Aarav Sharma",
    parent_name: "Ramesh Sharma",
    class_section: "10-A",
    amount: "15,000",
    invoice_no: "INV-2026-001",
    due_date: "10 Apr 2025",
    school_name: schoolName,
  });

  const availableVariables = [
    { tag: "{student_name}", desc: "Student Name" },
    { tag: "{parent_name}", desc: "Parent Name" },
    { tag: "{class_section}", desc: "Class-Section" },
    { tag: "{amount}", desc: "Balance Due (₹)" },
    { tag: "{invoice_no}", desc: "Invoice Number" },
    { tag: "{due_date}", desc: "Due Date" },
    { tag: "{school_name}", desc: "School Name" },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-2xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[88vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E6EAF3] flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#141A2E]">Reminder Templates & Rules</h2>
              <p className="text-[11px] text-[#5B6478]">Manage parent notification templates and dispatch rules</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="px-6 border-b border-[#E6EAF3] flex items-center gap-6 bg-slate-50/50 shrink-0 text-xs font-semibold">
          <button
            type="button"
            onClick={() => { setActiveTab("templates"); setIsEditing(false); }}
            className={`py-3 border-b-2 transition-colors ${
              activeTab === "templates"
                ? "border-[#0B7B49] text-[#0B7B49]"
                : "border-transparent text-[#5B6478] hover:text-[#141A2E]"
            }`}
          >
            Message Templates ({templates.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("rules")}
            className={`py-3 border-b-2 transition-colors ${
              activeTab === "rules"
                ? "border-[#0B7B49] text-[#0B7B49]"
                : "border-transparent text-[#5B6478] hover:text-[#141A2E]"
            }`}
          >
            Automated Reminder Rules
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {activeTab === "templates" && (
            <>
              {!isEditing ? (
                /* Templates List View */
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-[#5B6478]">
                      Pre-approved message layouts used when sending manual or scheduled payment reminders.
                    </p>
                    <button
                      type="button"
                      onClick={handleStartCreate}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0B7B49] hover:bg-[#096a3e] text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" /> New Template
                    </button>
                  </div>

                  <div className="space-y-3">
                    {templates.map((tpl) => (
                      <div
                        key={tpl.id}
                        className="p-4 border border-[#E6EAF3] rounded-xl hover:border-slate-300 transition-colors bg-white space-y-2.5"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-bold text-[#141A2E]">{tpl.name}</h4>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 uppercase">
                              {tpl.purpose.replace("_", " ")}
                            </span>
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                              {tpl.channel}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleStartEdit(tpl)}
                              className="p-1.5 text-gray-500 hover:text-[#141A2E] hover:bg-slate-100 rounded-lg"
                              title="Edit"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(tpl.id)}
                              className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <p className="text-xs text-[#5B6478] bg-slate-50 p-3 rounded-lg font-mono text-[11px] whitespace-pre-wrap leading-relaxed border border-slate-100">
                          {tpl.body}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                /* Template Create / Edit Form */
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-[#E6EAF3]">
                    <h3 className="text-sm font-bold text-[#141A2E]">
                      {selectedTemplate ? "Edit Template" : "Create New Reminder Template"}
                    </h3>
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="text-xs font-semibold text-[#5B6478] hover:text-[#141A2E]"
                    >
                      Back to list
                    </button>
                  </div>

                  {formError && (
                    <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
                      {formError}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-[#5B6478] mb-1">
                        Template Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        placeholder="e.g. Due Today Urgent Reminder"
                        className="w-full px-3 py-2 bg-white border border-[#E6EAF3] rounded-xl text-xs text-[#141A2E] focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-[#5B6478] mb-1">Purpose Category</label>
                      <select
                        value={formPurpose}
                        onChange={(e) => setFormPurpose(e.target.value as any)}
                        className="w-full px-3 py-2 bg-white border border-[#E6EAF3] rounded-xl text-xs text-[#141A2E] focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      >
                        <option value="general">General Payment Reminder</option>
                        <option value="upcoming">Upcoming Fee Due</option>
                        <option value="due_today">Due Today</option>
                        <option value="overdue">Overdue Fee</option>
                        <option value="partial">Partial Payment Follow-up</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#5B6478] mb-1">Communication Channel</label>
                    <select
                      value={formChannel}
                      onChange={(e) => setFormChannel(e.target.value as any)}
                      className="w-full px-3 py-2 bg-white border border-[#E6EAF3] rounded-xl text-xs text-[#141A2E] focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value="whatsapp">WhatsApp</option>
                      <option value="sms">SMS</option>
                      <option value="both">WhatsApp & SMS</option>
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-semibold text-[#5B6478]">
                        Message Body <span className="text-red-500">*</span>
                      </label>
                      <span className="text-[10px] text-gray-400">Click variable tag to insert</span>
                    </div>

                    {/* Variable insertion buttons */}
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {availableVariables.map((v) => (
                        <button
                          key={v.tag}
                          type="button"
                          onClick={() => setFormBody((prev) => prev + " " + v.tag)}
                          className="px-2 py-0.5 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-200 border border-slate-200 rounded text-[11px] font-mono text-slate-700 transition-colors"
                          title={v.desc}
                        >
                          {v.tag}
                        </button>
                      ))}
                    </div>

                    <textarea
                      rows={6}
                      value={formBody}
                      onChange={(e) => setFormBody(e.target.value)}
                      className="w-full p-3 bg-white border border-[#E6EAF3] rounded-xl text-xs text-[#141A2E] leading-relaxed font-sans focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  {/* Live Render Preview */}
                  <div>
                    <label className="block text-[11px] font-semibold text-[#5B6478] mb-1">Live Preview with Sample Data</label>
                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-[#141A2E] leading-relaxed whitespace-pre-wrap">
                      {samplePreview}
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#E6EAF3]">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="px-4 py-2 border border-[#E6EAF3] rounded-xl text-xs font-semibold text-[#5B6478] hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveTemplate}
                      disabled={isSaving}
                      className="px-5 py-2 bg-[#0B7B49] text-white rounded-xl text-xs font-bold hover:bg-[#096a3e] transition-colors"
                    >
                      {isSaving ? "Saving..." : "Save Template"}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === "rules" && (
            /* Automated Rules View */
            <div className="space-y-4">
              <div className="p-3.5 bg-blue-50/70 border border-blue-200/80 rounded-xl text-xs text-blue-900 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-600" /> Automated Schedule Trigger
                </p>
                <p className="text-[11px] text-blue-700">
                  Automated background cron evaluates student dues daily. Quiet hours (9:00 PM – 8:00 AM IST) are enforced to avoid disturbing parents at night.
                </p>
              </div>

              <div className="space-y-3">
                {rules.map((rule) => (
                  <div
                    key={rule.id}
                    className="p-3.5 border border-[#E6EAF3] rounded-xl bg-white flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-[#141A2E]">{rule.name}</h4>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          rule.days_offset < 0
                            ? "bg-blue-50 text-blue-700"
                            : rule.days_offset === 0
                            ? "bg-amber-50 text-amber-700"
                            : "bg-red-50 text-red-700"
                        }`}>
                          {rule.days_offset < 0
                            ? `${Math.abs(rule.days_offset)} days before`
                            : rule.days_offset === 0
                            ? "On due date"
                            : `${rule.days_offset} days overdue`}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#5B6478] mt-0.5">
                        Channel: <span className="capitalize">{rule.channel}</span> • Max sends: {rule.max_sends} • Min balance: ₹{(rule.min_balance_paise / 100).toLocaleString("en-IN")}
                      </p>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={rule.is_active}
                        onChange={() => {
                          const updated = rules.map((r) =>
                            r.id === rule.id ? { ...r, is_active: !r.is_active } : r
                          );
                          setRules(updated);
                          // Save locally
                          localStorage.setItem(`myzkool_fee_reminder_rules_${schoolId}`, JSON.stringify(updated));
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#0B7B49]"></div>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#E6EAF3] bg-slate-50 flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white border border-[#E6EAF3] rounded-xl text-xs font-semibold text-[#5B6478] hover:bg-slate-100"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
