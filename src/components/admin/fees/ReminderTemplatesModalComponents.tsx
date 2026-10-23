import React from "react";
import { Plus, Edit3, Trash2, Clock } from "lucide-react";
import type { ReminderTemplate } from "../../../types/duesReminders";
import type { FeeReminderRule } from "../../../types/feeOperations";

interface TemplatesListViewProps {
  templates: ReminderTemplate[];
  onStartCreate: () => void;
  onStartEdit: (tpl: ReminderTemplate) => void;
  onDelete: (tplId: string) => void;
}

export function TemplatesListView({
  templates,
  onStartCreate,
  onStartEdit,
  onDelete,
}: TemplatesListViewProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-[#5B6478]">
          Pre-approved message layouts used when sending manual or scheduled payment reminders.
        </p>
        <button
          type="button"
          onClick={onStartCreate}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0B7B49] hover:bg-[#096a3e] text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
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
                  onClick={() => onStartEdit(tpl)}
                  className="p-1.5 text-gray-500 hover:text-[#141A2E] hover:bg-slate-100 rounded-lg cursor-pointer"
                  title="Edit"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(tpl.id)}
                  className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg cursor-pointer"
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
  );
}

interface TemplateEditorFormProps {
  selectedTemplate: ReminderTemplate | null;
  formName: string;
  setFormName: (v: string) => void;
  formPurpose: ReminderTemplate["purpose"];
  setFormPurpose: (v: ReminderTemplate["purpose"]) => void;
  formChannel: ReminderTemplate["channel"];
  setFormChannel: (v: ReminderTemplate["channel"]) => void;
  formBody: string;
  setFormBody: React.Dispatch<React.SetStateAction<string>>;
  formError: string | null;
  isSaving: boolean;
  onCancel: () => void;
  onSave: () => void;
  samplePreview: string;
  availableVariables: Array<{ tag: string; desc: string }>;
}

export function TemplateEditorForm({
  selectedTemplate,
  formName,
  setFormName,
  formPurpose,
  setFormPurpose,
  formChannel,
  setFormChannel,
  formBody,
  setFormBody,
  formError,
  isSaving,
  onCancel,
  onSave,
  samplePreview,
  availableVariables,
}: TemplateEditorFormProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-[#E6EAF3]">
        <h3 className="text-sm font-bold text-[#141A2E]">
          {selectedTemplate ? "Edit Template" : "Create New Reminder Template"}
        </h3>
        <button
          type="button"
          onClick={onCancel}
          className="text-xs font-semibold text-[#5B6478] hover:text-[#141A2E] cursor-pointer"
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
          <label htmlFor="template-editor-name" className="block text-[11px] font-semibold text-[#5B6478] mb-1">
            Template Name <span className="text-red-500">*</span>
          </label>
          <input
            id="template-editor-name"
            type="text"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            placeholder="e.g. Due Today Urgent Reminder"
            className="w-full px-3 py-2 bg-white border border-[#E6EAF3] rounded-xl text-xs text-[#141A2E] focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <div>
          <label htmlFor="template-editor-purpose" className="block text-[11px] font-semibold text-[#5B6478] mb-1">
            Purpose Category
          </label>
          <select
            id="template-editor-purpose"
            aria-label="Purpose Category"
            value={formPurpose}
            onChange={(e) => setFormPurpose(e.target.value as ReminderTemplate["purpose"])}
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
        <label htmlFor="template-editor-channel" className="block text-[11px] font-semibold text-[#5B6478] mb-1">
          Communication Channel
        </label>
        <select
          id="template-editor-channel"
          aria-label="Communication Channel"
          value={formChannel}
          onChange={(e) => setFormChannel(e.target.value as ReminderTemplate["channel"])}
          className="w-full px-3 py-2 bg-white border border-[#E6EAF3] rounded-xl text-xs text-[#141A2E] focus:outline-none focus:ring-1 focus:ring-emerald-500"
        >
          <option value="whatsapp">WhatsApp</option>
          <option value="sms">SMS</option>
          <option value="both">WhatsApp & SMS</option>
        </select>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label htmlFor="template-editor-body" className="text-[11px] font-semibold text-[#5B6478]">
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
              className="px-2 py-0.5 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-200 border border-slate-200 rounded text-[11px] font-mono text-slate-700 transition-colors cursor-pointer"
              title={v.desc}
            >
              {v.tag}
            </button>
          ))}
        </div>

        <textarea
          id="template-editor-body"
          aria-label="Message Body"
          rows={6}
          value={formBody}
          onChange={(e) => setFormBody(e.target.value)}
          className="w-full p-3 bg-white border border-[#E6EAF3] rounded-xl text-xs text-[#141A2E] leading-relaxed font-sans focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
      </div>

      {/* Live Render Preview */}
      <div>
        <span className="block text-[11px] font-semibold text-[#5B6478] mb-1">Live Preview with Sample Data</span>
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-[#141A2E] leading-relaxed whitespace-pre-wrap">
          {samplePreview}
        </div>
      </div>

      <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#E6EAF3]">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-[#E6EAF3] rounded-xl text-xs font-semibold text-[#5B6478] hover:bg-slate-50 cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={isSaving}
          className="px-5 py-2 bg-[#0B7B49] text-white rounded-xl text-xs font-bold hover:bg-[#096a3e] transition-colors cursor-pointer disabled:opacity-50"
        >
          {isSaving ? "Saving..." : "Save Template"}
        </button>
      </div>
    </div>
  );
}

interface AutomatedRulesViewProps {
  rules: FeeReminderRule[];
  schoolId: string;
  onToggleRule: (ruleId: string) => void;
}

export function AutomatedRulesView({
  rules,
  onToggleRule,
}: AutomatedRulesViewProps) {
  return (
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
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    rule.days_offset < 0
                      ? "bg-blue-50 text-blue-700"
                      : rule.days_offset === 0
                      ? "bg-amber-50 text-amber-700"
                      : "bg-red-50 text-red-700"
                  }`}
                >
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
                aria-label={`Toggle rule ${rule.name}`}
                type="checkbox"
                checked={rule.is_active}
                onChange={() => onToggleRule(rule.id)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-transform peer-checked:bg-[#0B7B49]"></div>
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}
