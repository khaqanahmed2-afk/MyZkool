import React from "react";
import {
  Users,
  Search,
  Edit2,
  Smartphone,
  Send,
  AlertTriangle,
  CheckCircle2,
  X,
  Check,
  ChevronRight,
} from "lucide-react";
import type { DuesReminderRow, ReminderTemplate, SendRemindersResult } from "../../../types/duesReminders";

export interface Step1Props {
  finalRecipientCount: number;
  selectionMode: "filter" | "manual";
  setSelectionMode: (mode: "filter" | "manual") => void;
  // Filter mode
  filterDueStatus: string;
  setFilterDueStatus: (val: string) => void;
  filterClass: string;
  setFilterClass: (val: string) => void;
  filterSection: string;
  setFilterSection: (val: string) => void;
  filterPeriod: string;
  setFilterPeriod: (val: string) => void;
  filterOverdueSince: string;
  setFilterOverdueSince: (val: string) => void;
  uniqueClasses: string[];
  uniqueSections: string[];
  uniquePeriods: string[];
  filteredStudentsCount: number;
  filteredOutstandingPaise: number;
  onOpenFilterListModal: () => void;
  // Manual mode
  manualSearch: string;
  setManualSearch: (val: string) => void;
  selectedIds: Set<string>;
  manualFilteredRows: DuesReminderRow[];
  onSelectAllManual: () => void;
  onToggleSelectManual: (id: string) => void;
}

export function SendRemindersStep1SelectStudents({
  finalRecipientCount,
  selectionMode,
  setSelectionMode,
  filterDueStatus,
  setFilterDueStatus,
  filterClass,
  setFilterClass,
  filterSection,
  setFilterSection,
  filterPeriod,
  setFilterPeriod,
  filterOverdueSince,
  setFilterOverdueSince,
  uniqueClasses,
  uniqueSections,
  uniquePeriods,
  filteredStudentsCount,
  filteredOutstandingPaise,
  onOpenFilterListModal,
  manualSearch,
  setManualSearch,
  selectedIds,
  manualFilteredRows,
  onSelectAllManual,
  onToggleSelectManual,
}: Step1Props) {
  return (
    <div className="space-y-3.5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-[#141A2E] flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-emerald-100 text-[#0B7B49] text-xs flex items-center justify-center font-bold">
            1
          </span>
          Select Students
        </h3>
        <span className="text-xs text-[#5B6478]">
          {finalRecipientCount} eligible
        </span>
      </div>

      {/* Toggle: Filter vs Manual Selection */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
        <button
          type="button"
          onClick={() => setSelectionMode("filter")}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
            selectionMode === "filter"
              ? "bg-[#0B7B49] text-white shadow-xs"
              : "text-[#5B6478] hover:text-[#141A2E]"
          }`}
        >
          Filter
        </button>
        <button
          type="button"
          onClick={() => setSelectionMode("manual")}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
            selectionMode === "manual"
              ? "bg-[#0B7B49] text-white shadow-xs"
              : "text-[#5B6478] hover:text-[#141A2E]"
          }`}
        >
          Manual Selection
        </button>
      </div>

      {/* Mode: Filter */}
      {selectionMode === "filter" ? (
        <div className="p-3.5 bg-slate-50/80 rounded-xl border border-[#E6EAF3] space-y-3">
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label htmlFor="step1-due-status" className="block text-[11px] font-semibold text-[#5B6478] mb-1">
                Due Status
              </label>
              <select
                id="step1-due-status"
                aria-label="Due Status"
                value={filterDueStatus}
                onChange={(e) => setFilterDueStatus(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-[#E6EAF3] rounded-lg text-xs text-[#141A2E] focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="all">All Status</option>
                <option value="overdue">Overdue</option>
                <option value="due_today">Due Today</option>
                <option value="due_soon">Due Soon (7 Days)</option>
                <option value="upcoming">Upcoming</option>
              </select>
            </div>

            <div>
              <label htmlFor="step1-class" className="block text-[11px] font-semibold text-[#5B6478] mb-1">
                Class
              </label>
              <select
                id="step1-class"
                aria-label="Class"
                value={filterClass}
                onChange={(e) => setFilterClass(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-[#E6EAF3] rounded-lg text-xs text-[#141A2E] focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="all">All Classes</option>
                {uniqueClasses.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="step1-section" className="block text-[11px] font-semibold text-[#5B6478] mb-1">
                Section
              </label>
              <select
                id="step1-section"
                aria-label="Section"
                value={filterSection}
                onChange={(e) => setFilterSection(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-[#E6EAF3] rounded-lg text-xs text-[#141A2E] focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="all">All Sections</option>
                {uniqueSections.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="step1-period" className="block text-[11px] font-semibold text-[#5B6478] mb-1">
                Fee Period
              </label>
              <select
                id="step1-period"
                aria-label="Fee Period"
                value={filterPeriod}
                onChange={(e) => setFilterPeriod(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-[#E6EAF3] rounded-lg text-xs text-[#141A2E] focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="all">All Periods</option>
                {uniquePeriods.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex-1">
              <label htmlFor="step1-overdue-since" className="block text-[11px] font-semibold text-[#5B6478] mb-1">
                Overdue Since
              </label>
              <select
                id="step1-overdue-since"
                aria-label="Overdue Since"
                value={filterOverdueSince}
                onChange={(e) => setFilterOverdueSince(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-[#E6EAF3] rounded-lg text-xs text-[#141A2E] focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="all">All</option>
                <option value="7">&gt; 7 Days</option>
                <option value="15">&gt; 15 Days</option>
                <option value="30">&gt; 30 Days</option>
                <option value="60">&gt; 60 Days</option>
              </select>
            </div>
          </div>

          {/* Matched Summary Banner */}
          <div className="mt-2 p-3 bg-emerald-50/80 border border-emerald-200/80 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-emerald-900">
                  {filteredStudentsCount} students found
                </p>
                <p className="text-[11px] text-emerald-700">
                  Total outstanding: ₹{(filteredOutstandingPaise / 100).toLocaleString("en-IN")}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onOpenFilterListModal}
              className="px-2.5 py-1 bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-50 rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            >
              View List
            </button>
          </div>
        </div>
      ) : (
        /* Mode: Manual Selection */
        <div className="p-3.5 bg-slate-50/80 rounded-xl border border-[#E6EAF3] space-y-2.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-gray-400" />
            <input
              aria-label="Search students to remind"
              type="text"
              placeholder="Search student, adm no., invoice..."
              value={manualSearch}
              onChange={(e) => setManualSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-white border border-[#E6EAF3] rounded-lg text-xs text-[#141A2E] placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-[#5B6478] px-1">
            <span>
              {selectedIds.size} of {manualFilteredRows.length} selected
            </span>
            <button
              type="button"
              onClick={onSelectAllManual}
              className="font-semibold text-emerald-700 hover:underline cursor-pointer"
            >
              {selectedIds.size === manualFilteredRows.length ? "Deselect All" : "Select All"}
            </button>
          </div>

          {/* Student list */}
          <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
            {manualFilteredRows.length === 0 ? (
              <div className="py-6 text-center text-xs text-gray-400">No students found</div>
            ) : (
              manualFilteredRows.map((r) => {
                const isSelected = selectedIds.has(r.id);
                return (
                  <label
                    key={r.id}
                    className={`p-2 rounded-lg border flex items-center justify-between cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-emerald-50/50 border-emerald-300"
                        : "bg-white border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggleSelectManual(r.id)}
                        className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-[#141A2E] truncate">{r.studentName}</p>
                        <p className="text-[10px] text-[#5B6478] truncate">
                          {r.classSection} • {r.admissionNo}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-bold text-[#141A2E]">
                        ₹{(r.balancePaise / 100).toLocaleString("en-IN")}
                      </p>
                      <span
                        className={`text-[9px] font-semibold px-1.5 py-0.2 rounded-full ${
                          r.status === "overdue" ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {r.status === "overdue" ? "Overdue" : "Pending"}
                      </span>
                    </div>
                  </label>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export interface Step2Props {
  templates: ReminderTemplate[];
  selectedTemplateId: string;
  onTemplateChange: (tplId: string) => void;
  onOpenTemplates: () => void;
  isEditingTemplate: boolean;
  setIsEditingTemplate: (val: boolean) => void;
  editedBody: string;
  setEditedBody: (valOrUpdater: string | ((prev: string) => string)) => void;
  renderedPreview: string;
  channelWhatsApp: boolean;
  setChannelWhatsApp: (val: boolean) => void;
  channelSMS: boolean;
  setChannelSMS: (val: boolean) => void;
  scheduleMode: "now" | "later";
  setScheduleMode: (mode: "now" | "later") => void;
  scheduledDate: string;
  setScheduledDate: (val: string) => void;
  scheduledTime: string;
  setScheduledTime: (val: string) => void;
}

const TEMPLATE_VARIABLES = [
  "{student_name}",
  "{parent_name}",
  "{class_section}",
  "{amount}",
  "{invoice_no}",
  "{due_date}",
  "{school_name}",
];

export function SendRemindersStep2Message({
  templates,
  selectedTemplateId,
  onTemplateChange,
  onOpenTemplates,
  isEditingTemplate,
  setIsEditingTemplate,
  editedBody,
  setEditedBody,
  renderedPreview,
  channelWhatsApp,
  setChannelWhatsApp,
  channelSMS,
  setChannelSMS,
  scheduleMode,
  setScheduleMode,
  scheduledDate,
  setScheduledDate,
  scheduledTime,
  setScheduledTime,
}: Step2Props) {
  return (
    <div className="space-y-3.5 pt-2 border-t border-[#E6EAF3]">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-[#141A2E] flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-emerald-100 text-[#0B7B49] text-xs flex items-center justify-center font-bold">
            2
          </span>
          Reminder Message
        </h3>
        <button
          type="button"
          onClick={onOpenTemplates}
          className="text-xs font-semibold text-emerald-700 hover:underline cursor-pointer"
        >
          Manage Templates
        </button>
      </div>

      <div>
        <label htmlFor="step2-select-template" className="block text-[11px] font-semibold text-[#5B6478] mb-1">
          Select Template <span className="text-red-500">*</span>
        </label>
        <select
          id="step2-select-template"
          aria-label="Select Template"
          value={selectedTemplateId}
          onChange={(e) => onTemplateChange(e.target.value)}
          className="w-full px-3 py-2 bg-white border border-[#E6EAF3] rounded-xl text-xs text-[#141A2E] font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
        >
          {templates.map((t) => {
            const val = t.id || t.name;
            return (
              <option key={val} value={val}>
                {t.name}
              </option>
            );
          })}
        </select>
      </div>

      {/* Message Preview Box */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label htmlFor="step2-message-preview" className="text-[11px] font-semibold text-[#5B6478]">
            Message Preview
          </label>
          <button
            type="button"
            onClick={() => setIsEditingTemplate(!isEditingTemplate)}
            className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 cursor-pointer"
          >
            <Edit2 className="w-3 h-3" />
            {isEditingTemplate ? "Use Saved Template" : "Edit Template"}
          </button>
        </div>

        {isEditingTemplate ? (
          <div className="space-y-1.5">
            <textarea
              id="step2-message-preview"
              aria-label="Custom Message Body"
              rows={6}
              value={editedBody}
              onChange={(e) => setEditedBody(e.target.value)}
              className="w-full p-3 bg-white border border-[#E6EAF3] rounded-xl text-xs text-[#141A2E] font-sans leading-relaxed focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <div className="flex flex-wrap gap-1 text-[10px] text-[#5B6478]">
              <span className="font-semibold text-gray-500">Variables:</span>
              {TEMPLATE_VARIABLES.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setEditedBody((prev) => prev + " " + v)}
                  className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-mono cursor-pointer"
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-3.5 bg-slate-50 border border-slate-200/90 rounded-xl text-xs text-[#141A2E] leading-relaxed relative font-sans whitespace-pre-wrap">
            {renderedPreview}
          </div>
        )}
      </div>

      {/* Send Via Checkboxes */}
      <div>
        <label htmlFor="step2-send-via-whatsapp" className="block text-[11px] font-semibold text-[#5B6478] mb-1.5">
          Send via
        </label>
        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-[#141A2E]">
            <input
              id="step2-send-via-whatsapp"
              type="checkbox"
              checked={channelWhatsApp}
              onChange={(e) => setChannelWhatsApp(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
            />
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              WhatsApp
            </span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-[#141A2E]">
            <input
              id="step2-send-via-sms"
              type="checkbox"
              checked={channelSMS}
              onChange={(e) => setChannelSMS(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
            />
            <span className="flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5 text-blue-500" />
              SMS
            </span>
          </label>
        </div>
      </div>

      {/* Schedule Radio */}
      <div>
        <span className="block text-[11px] font-semibold text-[#5B6478] mb-1.5">
          Schedule
        </span>
        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-[#141A2E]">
            <input
              type="radio"
              name="scheduleMode"
              checked={scheduleMode === "now"}
              onChange={() => setScheduleMode("now")}
              className="text-emerald-600 focus:ring-emerald-500 cursor-pointer"
            />
            <span>Send Now</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-[#141A2E]">
            <input
              type="radio"
              name="scheduleMode"
              checked={scheduleMode === "later"}
              onChange={() => setScheduleMode("later")}
              className="text-emerald-600 focus:ring-emerald-500 cursor-pointer"
            />
            <span>Schedule for Later</span>
          </label>
        </div>

        {scheduleMode === "later" && (
          <div className="mt-3 p-3 bg-amber-50/60 border border-amber-200/80 rounded-xl space-y-2.5">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label htmlFor="step2-date" className="block text-[10px] font-semibold text-amber-900 mb-0.5">
                  Date
                </label>
                <input
                  id="step2-date"
                  aria-label="Date"
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-amber-200 rounded-lg text-xs"
                />
              </div>
              <div>
                <label htmlFor="step2-time" className="block text-[10px] font-semibold text-amber-900 mb-0.5">
                  Time (IST)
                </label>
                <input
                  id="step2-time"
                  aria-label="Time (IST)"
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-amber-200 rounded-lg text-xs"
                />
              </div>
            </div>
            <p className="text-[11px] text-amber-800">
              Automated queue runs according to IST quiet hours (9:00 PM – 8:00 AM suppressed).
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export interface Step3Props {
  finalRecipientRows: DuesReminderRow[];
  totalSelectedOutstandingPaise: number;
  scheduleMode: "now" | "later";
  scheduledDate: string;
  scheduledTime: string;
  channelWhatsApp: boolean;
  channelSMS: boolean;
  invalidPhoneCount: number;
}

export function SendRemindersStep3Review({
  finalRecipientRows,
  totalSelectedOutstandingPaise,
  scheduleMode,
  scheduledDate,
  scheduledTime,
  channelWhatsApp,
  channelSMS,
  invalidPhoneCount,
}: Step3Props) {
  const channelDisplay = [channelWhatsApp && "WhatsApp", channelSMS && "SMS"].filter(Boolean).join(" & ") || "WhatsApp";

  return (
    <div className="space-y-4">
      <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-2xl space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
            <Send className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-emerald-950">
              Ready to {scheduleMode === "later" ? "Schedule" : "Send"} Reminders
            </h4>
            <p className="text-xs text-emerald-800">
              {finalRecipientRows.length} students selected • ₹{(totalSelectedOutstandingPaise / 100).toLocaleString("en-IN")} total due
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-emerald-200/60 text-xs">
          <div>
            <span className="text-emerald-700 font-medium">Channel:</span>
            <p className="font-bold text-emerald-950">{channelDisplay}</p>
          </div>
          <div>
            <span className="text-emerald-700 font-medium">Execution:</span>
            <p className="font-bold text-emerald-950">
              {scheduleMode === "later" ? `Scheduled (${scheduledDate} ${scheduledTime})` : "Send Immediately"}
            </p>
          </div>
        </div>
      </div>

      {invalidPhoneCount > 0 && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">{invalidPhoneCount} students have invalid or missing phone numbers</p>
            <p className="text-[11px] text-amber-700">These records will be skipped during dispatch.</p>
          </div>
        </div>
      )}

      {/* Recipient breakdown list */}
      <div className="space-y-2">
        <h4 className="text-xs font-bold text-[#141A2E]">
          Recipients Preview ({finalRecipientRows.length})
        </h4>
        <div className="max-h-60 overflow-y-auto space-y-1.5 border border-[#E6EAF3] rounded-xl p-2 bg-slate-50/50">
          {finalRecipientRows.slice(0, 50).map((r) => (
            <div
              key={r.id}
              className="p-2 bg-white border border-slate-200/80 rounded-lg flex items-center justify-between text-xs"
            >
              <div className="min-w-0">
                <p className="font-semibold text-[#141A2E] truncate">{r.studentName}</p>
                <p className="text-[10px] text-[#5B6478]">
                  {r.classSection} • {r.invoiceNo} • {r.parentPhone || "No Phone"}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-bold text-[#141A2E]">₹{(r.balancePaise / 100).toLocaleString("en-IN")}</p>
                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded-full ${
                    r.hasValidPhone ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
                  }`}
                >
                  {r.hasValidPhone ? "Ready" : "Invalid Phone"}
                </span>
              </div>
            </div>
          ))}
          {finalRecipientRows.length > 50 && (
            <p className="text-center text-[11px] text-gray-500 py-1">
              + {finalRecipientRows.length - 50} more recipients
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export interface Step4Props {
  submitResult: SendRemindersResult;
}

export function SendRemindersStep4Complete({ submitResult }: Step4Props) {
  const isScheduled = submitResult.scheduledCount > 0;

  return (
    <div className="py-6 space-y-5 text-center">
      <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
        <CheckCircle2 className="w-10 h-10" />
      </div>

      <div className="space-y-1">
        <h3 className="text-lg font-bold text-[#141A2E]">
          {isScheduled ? "Reminders Scheduled Successfully" : "Reminders Dispatched"}
        </h3>
        <p className="text-xs text-[#5B6478]">
          {isScheduled
            ? `${submitResult.scheduledCount} messages have been added to the automated scheduler.`
            : `${submitResult.queuedCount} reminder messages have been queued in the notification outbox.`}
        </p>
      </div>

      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-left text-xs space-y-2">
        <div className="flex justify-between">
          <span className="text-gray-500">Processed Count:</span>
          <span className="font-bold">{submitResult.totalEligible}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Queued / Dispatched:</span>
          <span className="font-bold text-emerald-700">{submitResult.queuedCount}</span>
        </div>
        {submitResult.invalidPhoneCount > 0 && (
          <div className="flex justify-between">
            <span className="text-gray-500">Skipped (Invalid Phone):</span>
            <span className="font-bold text-amber-700">{submitResult.invalidPhoneCount}</span>
          </div>
        )}
      </div>

      <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl text-left text-xs text-blue-900">
        <p className="font-semibold mb-0.5">Delivery Status</p>
        <p className="text-[11px] text-blue-700">
          Track real-time WhatsApp & SMS transmission and webhooks under the Reminder History tab.
        </p>
      </div>
    </div>
  );
}

export interface FilterListModalProps {
  isOpen: boolean;
  onClose: () => void;
  filteredStudents: DuesReminderRow[];
}

export function FilteredStudentsListModal({
  isOpen,
  onClose,
  filteredStudents,
}: FilterListModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/40 backdrop-blur-2xs">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[80vh] flex flex-col shadow-2xl border border-slate-200">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-[#141A2E]">
            Filtered Students ({filteredStudents.length})
          </h3>
          <button
            aria-label="Close"
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-700 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 flex-1 overflow-y-auto space-y-2">
          {filteredStudents.map((s) => (
            <div
              key={s.id}
              className="p-2.5 border border-slate-200 rounded-xl flex items-center justify-between text-xs"
            >
              <div>
                <p className="font-bold text-[#141A2E]">{s.studentName}</p>
                <p className="text-[11px] text-[#5B6478]">
                  {s.classSection} • {s.admissionNo} • {s.parentPhone}
                </p>
              </div>
              <div className="text-right">
                <p className="font-bold text-[#141A2E]">₹{(s.balancePaise / 100).toLocaleString("en-IN")}</p>
                <span className="text-[10px] text-red-600 font-semibold">{s.daysOverdue} days overdue</span>
              </div>
            </div>
          ))}
        </div>
        <div className="p-3.5 border-t border-slate-100 text-right">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-[#0B7B49] text-white rounded-xl text-xs font-bold cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export function SendRemindersHeader({ onClose }: { onClose: () => void }) {
  return (
    <div className="px-5 py-4 border-b border-[#E6EAF3] flex items-center justify-between shrink-0 bg-white">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
          <Send className="w-4 h-4" />
        </div>
        <div>
          <h2 className="text-base font-bold text-[#141A2E]">Send Reminders</h2>
          <p className="text-[11px] text-[#5B6478]">Automate fee collection follow-ups</p>
        </div>
      </div>
      <button
        aria-label="Close"
        type="button"
        onClick={onClose}
        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-slate-100 transition-colors cursor-pointer"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  );
}

export function SendRemindersStepper({
  currentStep,
  onSelectStep,
}: {
  currentStep: 1 | 2 | 3 | 4;
  onSelectStep: (step: 1 | 2 | 3 | 4) => void;
}) {
  const stepItems: Array<{ step: 1 | 2 | 3 | 4; label: string }> = [
    { step: 1, label: "Select Students" },
    { step: 2, label: "Message" },
    { step: 3, label: "Preview" },
    { step: 4, label: "Send" },
  ];

  return (
    <div className="px-5 py-3 border-b border-[#E6EAF3] bg-slate-50/70 shrink-0">
      <div className="flex items-center justify-between text-xs">
        {stepItems.map((item, idx) => {
          const isCurrent = currentStep === item.step;
          const isPassed = currentStep > item.step;

          return (
            <React.Fragment key={item.step}>
              <button
                type="button"
                disabled={item.step === 4}
                onClick={() => item.step < 4 && onSelectStep(item.step)}
                className={`flex items-center gap-1.5 cursor-pointer disabled:cursor-default ${
                  isCurrent
                    ? "font-bold text-[#0B7B49]"
                    : isPassed
                    ? "font-medium text-emerald-700"
                    : "text-gray-400"
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    isCurrent
                      ? "bg-[#0B7B49] text-white shadow-xs"
                      : isPassed
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-200 text-gray-500"
                  }`}
                >
                  {isPassed ? <Check className="w-3.5 h-3.5" /> : item.step}
                </div>
                <span className="hidden sm:inline">{item.label}</span>
              </button>
              {idx < stepItems.length - 1 && <div className="w-6 h-0.5 bg-slate-200" />}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

export interface SendRemindersFooterProps {
  currentStep: 1 | 2 | 3 | 4;
  onClose: () => void;
  onBack: () => void;
  onNext: () => void;
  onSend: () => void;
  canProceed: boolean;
  isSubmitting: boolean;
  scheduleMode: "now" | "later";
}

export function SendRemindersFooter({
  currentStep,
  onClose,
  onBack,
  onNext,
  onSend,
  canProceed,
  isSubmitting,
  scheduleMode,
}: SendRemindersFooterProps) {
  if (currentStep === 4) {
    return (
      <div className="p-4 border-t border-[#E6EAF3] bg-white flex items-center justify-between shrink-0">
        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 bg-[#0B7B49] text-white rounded-xl text-xs font-bold hover:bg-[#096a3e] transition-colors cursor-pointer"
        >
          Done
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 border-t border-[#E6EAF3] bg-white flex items-center justify-between shrink-0">
      <button
        type="button"
        onClick={onClose}
        className="px-4 py-2 border border-[#E6EAF3] rounded-xl text-xs font-semibold text-[#5B6478] hover:bg-slate-50 transition-colors cursor-pointer"
      >
        Cancel
      </button>

      <div className="flex items-center gap-2">
        {currentStep > 1 && (
          <button
            type="button"
            onClick={onBack}
            className="px-3.5 py-2 border border-[#E6EAF3] rounded-xl text-xs font-semibold text-[#5B6478] hover:bg-slate-50 cursor-pointer"
          >
            Back
          </button>
        )}

        {currentStep < 3 ? (
          <button
            type="button"
            onClick={onNext}
            disabled={!canProceed}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#0B7B49] hover:bg-[#096a3e] disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            Next <ChevronRight className="w-3.5 h-3.5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={onSend}
            disabled={isSubmitting || !canProceed}
            className="flex items-center gap-1.5 px-5 py-2 bg-[#0B7B49] hover:bg-[#096a3e] disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            {isSubmitting ? (
              <>Processing...</>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                {scheduleMode === "later" ? "Schedule Reminders" : "Send Reminders"}
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

