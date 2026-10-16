import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  Users,
  Search,
  Check,
  ChevronRight,
  Clock,
  Calendar,
  AlertTriangle,
  Send,
  MessageSquare,
  Smartphone,
  Edit2,
  CheckCircle2,
  Filter,
  ListFilter,
  Sparkles,
} from "lucide-react";
import type {
  DuesReminderRow,
  ReminderTemplate,
  SendRemindersPayload,
  SendRemindersResult,
} from "../../../types/duesReminders";
import { interpolateTemplate, sendBulkReminders } from "../../../services/duesRemindersService";

interface SendRemindersDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  rows: DuesReminderRow[];
  templates: ReminderTemplate[];
  schoolId: string;
  schoolName: string;
  onSuccess: (result: SendRemindersResult) => void;
  onOpenTemplates: () => void;
  preSelectedRowIds?: string[];
}

export function SendRemindersDrawer({
  isOpen,
  onClose,
  rows,
  templates,
  schoolId,
  schoolName,
  onSuccess,
  onOpenTemplates,
  preSelectedRowIds = [],
}: SendRemindersDrawerProps) {
  // Stepper: 1: Select Students, 2: Message, 3: Preview, 4: Send
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1: Selection Mode ('filter' | 'manual')
  const [selectionMode, setSelectionMode] = useState<"filter" | "manual">("filter");
  const [filterDueStatus, setFilterDueStatus] = useState<string>("overdue");
  const [filterClass, setFilterClass] = useState<string>("all");
  const [filterSection, setFilterSection] = useState<string>("all");
  const [filterPeriod, setFilterPeriod] = useState<string>("all");
  const [filterOverdueSince, setFilterOverdueSince] = useState<string>("all");
  const [manualSearch, setManualSearch] = useState<string>("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showFilterListModal, setShowFilterListModal] = useState<boolean>(false);

  // Step 2: Message Settings
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [editedBody, setEditedBody] = useState<string>("");
  const [isEditingTemplate, setIsEditingTemplate] = useState<boolean>(false);
  const [channelWhatsApp, setChannelWhatsApp] = useState<boolean>(true);
  const [channelSMS, setChannelSMS] = useState<boolean>(false);
  const [scheduleMode, setScheduleMode] = useState<"now" | "later">("now");
  const [scheduledDate, setScheduledDate] = useState<string>("");
  const [scheduledTime, setScheduledTime] = useState<string>("10:00");

  // Step 4: Submission State
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitResult, setSubmitResult] = useState<SendRemindersResult | null>(null);

  // Initialize pre-selected students or template
  useEffect(() => {
    if (preSelectedRowIds.length > 0) {
      setSelectedIds(new Set(preSelectedRowIds));
      setSelectionMode("manual");
    } else {
      setSelectedIds(new Set());
    }
  }, [preSelectedRowIds, isOpen]);

  useEffect(() => {
    if (templates.length > 0 && !selectedTemplateId) {
      const defaultTpl = templates.find((t) => t.name.toLowerCase().includes("default")) || templates[0];
      setSelectedTemplateId(defaultTpl.id);
      setEditedBody(defaultTpl.body);
    }
  }, [templates, selectedTemplateId]);

  // Set default schedule date to tomorrow
  useEffect(() => {
    const tmrw = new Date();
    tmrw.setDate(tmrw.getDate() + 1);
    setScheduledDate(tmrw.toISOString().split("T")[0]);
  }, []);

  // Selected template object
  const activeTemplate = useMemo(() => {
    return templates.find((t) => t.id === selectedTemplateId) || templates[0];
  }, [templates, selectedTemplateId]);

  const handleTemplateChange = (tplId: string) => {
    setSelectedTemplateId(tplId);
    const tpl = templates.find((t) => t.id === tplId);
    if (tpl) {
      setEditedBody(tpl.body);
      setIsEditingTemplate(false);
    }
  };

  // Filter matched students
  const filteredStudents = useMemo(() => {
    return rows.filter((r) => {
      // Must have positive balance and not paid/cancelled
      if (r.balancePaise <= 0 || r.status === "paid") return false;

      if (filterDueStatus !== "all") {
        if (filterDueStatus === "overdue" && r.status !== "overdue") return false;
        if (filterDueStatus === "due_today" && r.status !== "due_today") return false;
        if (filterDueStatus === "due_soon" && r.status !== "due_soon") return false;
        if (filterDueStatus === "upcoming" && r.status !== "upcoming") return false;
      }

      if (filterClass !== "all" && r.className !== filterClass) return false;
      if (filterSection !== "all" && r.sectionName !== filterSection) return false;
      if (filterPeriod !== "all" && r.billingPeriod !== filterPeriod) return false;

      if (filterOverdueSince !== "all") {
        const days = r.daysOverdue;
        if (filterOverdueSince === "7" && days < 7) return false;
        if (filterOverdueSince === "15" && days < 15) return false;
        if (filterOverdueSince === "30" && days < 30) return false;
        if (filterOverdueSince === "60" && days < 60) return false;
      }

      return true;
    });
  }, [rows, filterDueStatus, filterClass, filterSection, filterPeriod, filterOverdueSince]);

  // Total outstanding of filtered
  const filteredOutstandingPaise = useMemo(() => {
    return filteredStudents.reduce((sum, s) => sum + s.balancePaise, 0);
  }, [filteredStudents]);

  // Final list of selected rows to send to
  const finalRecipientRows = useMemo(() => {
    if (selectionMode === "filter") {
      return filteredStudents;
    }
    return rows.filter((r) => selectedIds.has(r.id) && r.balancePaise > 0);
  }, [selectionMode, filteredStudents, rows, selectedIds]);

  const totalSelectedOutstandingPaise = useMemo(() => {
    return finalRecipientRows.reduce((sum, r) => sum + r.balancePaise, 0);
  }, [finalRecipientRows]);

  const invalidPhoneCount = useMemo(() => {
    return finalRecipientRows.filter((r) => !r.hasValidPhone).length;
  }, [finalRecipientRows]);

  // Sample student for live preview
  const sampleRow = finalRecipientRows[0] || rows[0];
  const renderedPreview = useMemo(() => {
    if (!sampleRow) return editedBody;
    const formattedAmount = (sampleRow.balancePaise / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 });
    return interpolateTemplate(editedBody, {
      student_name: sampleRow.studentName,
      parent_name: sampleRow.parentName,
      class_section: sampleRow.classSection,
      amount: formattedAmount,
      invoice_no: sampleRow.invoiceNo,
      due_date: sampleRow.dueDate,
      school_name: schoolName,
    });
  }, [editedBody, sampleRow, schoolName]);

  // Unique classes, sections, periods
  const uniqueClasses = useMemo(() => {
    return Array.from(new Set(rows.map((r) => r.className))).filter(Boolean);
  }, [rows]);

  const uniqueSections = useMemo(() => {
    return Array.from(new Set(rows.map((r) => r.sectionName))).filter(Boolean);
  }, [rows]);

  const uniquePeriods = useMemo(() => {
    return Array.from(new Set(rows.map((r) => r.billingPeriod))).filter(Boolean);
  }, [rows]);

  // Manual list filtered by search
  const manualFilteredRows = useMemo(() => {
    if (!manualSearch.trim()) return rows.filter((r) => r.balancePaise > 0);
    const q = manualSearch.toLowerCase();
    return rows.filter((r) => {
      if (r.balancePaise <= 0) return false;
      return (
        r.studentName.toLowerCase().includes(q) ||
        r.admissionNo.toLowerCase().includes(q) ||
        r.invoiceNo.toLowerCase().includes(q) ||
        r.parentPhone.includes(q)
      );
    });
  }, [rows, manualSearch]);

  const toggleSelectManual = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleSelectAllManual = () => {
    if (selectedIds.size === manualFilteredRows.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(manualFilteredRows.map((r) => r.id)));
    }
  };

  // Execution
  const handleExecuteSend = async () => {
    if (finalRecipientRows.length === 0) return;
    setIsSubmitting(true);
    try {
      const payload: SendRemindersPayload = {
        selectedRowIds: finalRecipientRows.map((r) => r.id),
        templateId: activeTemplate?.id || "default",
        templateBody: editedBody,
        channels: {
          whatsapp: channelWhatsApp,
          sms: channelSMS,
        },
        scheduleMode,
        scheduledDate: scheduleMode === "later" ? scheduledDate : undefined,
        scheduledTime: scheduleMode === "later" ? scheduledTime : undefined,
        timezone: "Asia/Kolkata",
      };

      const result = await sendBulkReminders(schoolId, payload, schoolName);
      setSubmitResult(result);
      setCurrentStep(4);
      onSuccess(result);
    } catch (err: any) {
      alert(`Error sending reminders: ${err.message || String(err)}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-2xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Drawer Container */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10">
        <aside
          aria-label="Send Reminders Drawer"
          className="w-screen max-w-lg bg-white shadow-2xl flex flex-col border-l border-[#E6EAF3] animate-in slide-in-from-right duration-300"
        >
          {/* Drawer Header */}
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
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Stepper Header */}
          <div className="px-5 py-3 border-b border-[#E6EAF3] bg-slate-50/70 shrink-0">
            <div className="flex items-center justify-between text-xs">
              {/* Step 1 */}
              <div
                className={`flex items-center gap-1.5 cursor-pointer ${
                  currentStep === 1
                    ? "font-bold text-[#0B7B49]"
                    : currentStep > 1
                    ? "font-medium text-emerald-700"
                    : "text-gray-400"
                }`}
                onClick={() => setCurrentStep(1)}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    currentStep === 1
                      ? "bg-[#0B7B49] text-white shadow-xs"
                      : currentStep > 1
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-200 text-gray-500"
                  }`}
                >
                  {currentStep > 1 ? <Check className="w-3.5 h-3.5" /> : "1"}
                </div>
                <span className="hidden sm:inline">Select Students</span>
              </div>

              <div className="w-6 h-0.5 bg-slate-200" />

              {/* Step 2 */}
              <div
                className={`flex items-center gap-1.5 cursor-pointer ${
                  currentStep === 2
                    ? "font-bold text-[#0B7B49]"
                    : currentStep > 2
                    ? "font-medium text-emerald-700"
                    : "text-gray-400"
                }`}
                onClick={() => setCurrentStep(2)}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    currentStep === 2
                      ? "bg-[#0B7B49] text-white shadow-xs"
                      : currentStep > 2
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-200 text-gray-500"
                  }`}
                >
                  {currentStep > 2 ? <Check className="w-3.5 h-3.5" /> : "2"}
                </div>
                <span className="hidden sm:inline">Message</span>
              </div>

              <div className="w-6 h-0.5 bg-slate-200" />

              {/* Step 3 */}
              <div
                className={`flex items-center gap-1.5 cursor-pointer ${
                  currentStep === 3
                    ? "font-bold text-[#0B7B49]"
                    : currentStep > 3
                    ? "font-medium text-emerald-700"
                    : "text-gray-400"
                }`}
                onClick={() => setCurrentStep(3)}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    currentStep === 3
                      ? "bg-[#0B7B49] text-white shadow-xs"
                      : currentStep > 3
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-200 text-gray-500"
                  }`}
                >
                  {currentStep > 3 ? <Check className="w-3.5 h-3.5" /> : "3"}
                </div>
                <span className="hidden sm:inline">Preview</span>
              </div>

              <div className="w-6 h-0.5 bg-slate-200" />

              {/* Step 4 */}
              <div
                className={`flex items-center gap-1.5 ${
                  currentStep === 4 ? "font-bold text-[#0B7B49]" : "text-gray-400"
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    currentStep === 4 ? "bg-[#0B7B49] text-white shadow-xs" : "bg-slate-200 text-gray-500"
                  }`}
                >
                  4
                </div>
                <span className="hidden sm:inline">Send</span>
              </div>
            </div>
          </div>

          {/* Drawer Body (Scrollable) */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            {/* ══════════════════════════════════════════════════════════════════
                STEPS 1 & 2 (COMBINED IN ACCORDION / INITIAL VIEW LIKE SCREENSHOT)
               ══════════════════════════════════════════════════════════════════ */}
            {currentStep <= 2 && (
              <>
                {/* 1. SELECT STUDENTS SECTION */}
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-[#141A2E] flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-emerald-100 text-[#0B7B49] text-xs flex items-center justify-center">1</span>
                      Select Students
                    </h3>
                    <span className="text-xs text-[#5B6478]">
                      {finalRecipientRows.length} eligible
                    </span>
                  </div>

                  {/* Toggle: Filter vs Manual Selection */}
                  <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setSelectionMode("filter")}
                      className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all ${
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
                      className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all ${
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
                          <label className="block text-[11px] font-semibold text-[#5B6478] mb-1">Due Status</label>
                          <select
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
                          <label className="block text-[11px] font-semibold text-[#5B6478] mb-1">Class</label>
                          <select
                            value={filterClass}
                            onChange={(e) => setFilterClass(e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-white border border-[#E6EAF3] rounded-lg text-xs text-[#141A2E] focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          >
                            <option value="all">All Classes</option>
                            {uniqueClasses.map((c) => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-[#5B6478] mb-1">Section</label>
                          <select
                            value={filterSection}
                            onChange={(e) => setFilterSection(e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-white border border-[#E6EAF3] rounded-lg text-xs text-[#141A2E] focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          >
                            <option value="all">All Sections</option>
                            {uniqueSections.map((s) => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-[#5B6478] mb-1">Fee Period</label>
                          <select
                            value={filterPeriod}
                            onChange={(e) => setFilterPeriod(e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-white border border-[#E6EAF3] rounded-lg text-xs text-[#141A2E] focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          >
                            <option value="all">All Periods</option>
                            {uniquePeriods.map((p) => (
                              <option key={p} value={p}>{p}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <label className="block text-[11px] font-semibold text-[#5B6478] mb-1">Overdue Since</label>
                          <select
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

                      {/* Matched Summary Banner (Matches screenshot) */}
                      <div className="mt-2 p-3 bg-emerald-50/80 border border-emerald-200/80 rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                            <Users className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-emerald-900">
                              {filteredStudents.length} students found
                            </p>
                            <p className="text-[11px] text-emerald-700">
                              Total outstanding: ₹{(filteredOutstandingPaise / 100).toLocaleString("en-IN")}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowFilterListModal(true)}
                          className="px-2.5 py-1 bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-50 rounded-lg text-xs font-semibold shadow-2xs transition-colors"
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
                          type="text"
                          placeholder="Search student, adm no., invoice..."
                          value={manualSearch}
                          onChange={(e) => setManualSearch(e.target.value)}
                          className="w-full pl-8 pr-3 py-1.5 bg-white border border-[#E6EAF3] rounded-lg text-xs text-[#141A2E] placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-[#5B6478] px-1">
                        <span>{selectedIds.size} of {manualFilteredRows.length} selected</span>
                        <button
                          type="button"
                          onClick={handleSelectAllManual}
                          className="font-semibold text-emerald-700 hover:underline"
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
                              <div
                                key={r.id}
                                onClick={() => toggleSelectManual(r.id)}
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
                                    onChange={() => {}}
                                    className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                                  />
                                  <div className="min-w-0">
                                    <p className="text-xs font-semibold text-[#141A2E] truncate">{r.studentName}</p>
                                    <p className="text-[10px] text-[#5B6478] truncate">{r.classSection} • {r.admissionNo}</p>
                                  </div>
                                </div>
                                <div className="text-right shrink-0">
                                  <p className="text-xs font-bold text-[#141A2E]">
                                    ₹{(r.balancePaise / 100).toLocaleString("en-IN")}
                                  </p>
                                  <span className={`text-[9px] font-semibold px-1.5 py-0.2 rounded-full ${
                                    r.status === "overdue" ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-700"
                                  }`}>
                                    {r.status === "overdue" ? "Overdue" : "Pending"}
                                  </span>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. REMINDER MESSAGE SECTION (Matches screenshot) */}
                <div className="space-y-3.5 pt-2 border-t border-[#E6EAF3]">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-[#141A2E] flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-emerald-100 text-[#0B7B49] text-xs flex items-center justify-center">2</span>
                      Reminder Message
                    </h3>
                    <button
                      type="button"
                      onClick={onOpenTemplates}
                      className="text-xs font-semibold text-emerald-700 hover:underline"
                    >
                      Manage Templates
                    </button>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#5B6478] mb-1">
                      Select Template <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={selectedTemplateId}
                      onChange={(e) => handleTemplateChange(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-[#E6EAF3] rounded-xl text-xs text-[#141A2E] font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    >
                      {templates.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Message Preview Box */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-semibold text-[#5B6478]">Message Preview</label>
                      <button
                        type="button"
                        onClick={() => setIsEditingTemplate(!isEditingTemplate)}
                        className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800"
                      >
                        <Edit2 className="w-3 h-3" />
                        {isEditingTemplate ? "Use Saved Template" : "Edit Template"}
                      </button>
                    </div>

                    {isEditingTemplate ? (
                      <div className="space-y-1.5">
                        <textarea
                          rows={6}
                          value={editedBody}
                          onChange={(e) => setEditedBody(e.target.value)}
                          className="w-full p-3 bg-white border border-[#E6EAF3] rounded-xl text-xs text-[#141A2E] font-sans leading-relaxed focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                        <div className="flex flex-wrap gap-1 text-[10px] text-[#5B6478]">
                          <span className="font-semibold text-gray-500">Variables:</span>
                          {["{student_name}", "{parent_name}", "{class_section}", "{amount}", "{invoice_no}", "{due_date}", "{school_name}"].map((v) => (
                            <button
                              key={v}
                              type="button"
                              onClick={() => setEditedBody((prev) => prev + " " + v)}
                              className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-mono"
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
                    <label className="block text-[11px] font-semibold text-[#5B6478] mb-1.5">Send via</label>
                    <div className="flex items-center gap-6">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-[#141A2E]">
                        <input
                          type="checkbox"
                          checked={channelWhatsApp}
                          onChange={(e) => setChannelWhatsApp(e.target.checked)}
                          className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          WhatsApp
                        </span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-[#141A2E]">
                        <input
                          type="checkbox"
                          checked={channelSMS}
                          onChange={(e) => setChannelSMS(e.target.checked)}
                          className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
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
                    <label className="block text-[11px] font-semibold text-[#5B6478] mb-1.5">Schedule</label>
                    <div className="flex items-center gap-6">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-[#141A2E]">
                        <input
                          type="radio"
                          name="scheduleMode"
                          checked={scheduleMode === "now"}
                          onChange={() => setScheduleMode("now")}
                          className="text-emerald-600 focus:ring-emerald-500"
                        />
                        <span>Send Now</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-[#141A2E]">
                        <input
                          type="radio"
                          name="scheduleMode"
                          checked={scheduleMode === "later"}
                          onChange={() => setScheduleMode("later")}
                          className="text-emerald-600 focus:ring-emerald-500"
                        />
                        <span>Schedule for Later</span>
                      </label>
                    </div>

                    {scheduleMode === "later" && (
                      <div className="mt-3 p-3 bg-amber-50/60 border border-amber-200/80 rounded-xl space-y-2.5">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] font-semibold text-amber-900 mb-0.5">Date</label>
                            <input
                              type="date"
                              value={scheduledDate}
                              onChange={(e) => setScheduledDate(e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-white border border-amber-200 rounded-lg text-xs"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-amber-900 mb-0.5">Time (IST)</label>
                            <input
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
              </>
            )}

            {/* ══════════════════════════════════════════════════════════════════
                STEP 3: REVIEW & CONFIRM
               ══════════════════════════════════════════════════════════════════ */}
            {currentStep === 3 && (
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
                      <p className="font-bold text-emerald-950">
                        {[channelWhatsApp && "WhatsApp", channelSMS && "SMS"].filter(Boolean).join(" & ") || "WhatsApp"}
                      </p>
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
                  <h4 className="text-xs font-bold text-[#141A2E]">Recipients Preview ({finalRecipientRows.length})</h4>
                  <div className="max-h-60 overflow-y-auto space-y-1.5 border border-[#E6EAF3] rounded-xl p-2 bg-slate-50/50">
                    {finalRecipientRows.slice(0, 50).map((r) => (
                      <div key={r.id} className="p-2 bg-white border border-slate-200/80 rounded-lg flex items-center justify-between text-xs">
                        <div className="min-w-0">
                          <p className="font-semibold text-[#141A2E] truncate">{r.studentName}</p>
                          <p className="text-[10px] text-[#5B6478]">{r.classSection} • {r.invoiceNo} • {r.parentPhone || "No Phone"}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-bold text-[#141A2E]">₹{(r.balancePaise / 100).toLocaleString("en-IN")}</p>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${r.hasValidPhone ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
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
            )}

            {/* ══════════════════════════════════════════════════════════════════
                STEP 4: SEND COMPLETION & SUMMARY
               ══════════════════════════════════════════════════════════════════ */}
            {currentStep === 4 && submitResult && (
              <div className="py-6 space-y-5 text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                  <CheckCircle2 className="w-10 h-10" />
                </div>

                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-[#141A2E]">
                    {submitResult.scheduledCount > 0 ? "Reminders Scheduled Successfully" : "Reminders Dispatched"}
                  </h3>
                  <p className="text-xs text-[#5B6478]">
                    {submitResult.scheduledCount > 0
                      ? `${submitResult.scheduledCount} messages have been added to the automated scheduler.`
                      : `${submitResult.queuedCount} reminder messages have been queued in the notification outbox.`}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 text-left">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="text-[10px] text-gray-500 uppercase font-semibold">Total Eligible</span>
                    <p className="text-lg font-bold text-[#141A2E]">{submitResult.totalEligible}</p>
                  </div>
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <span className="text-[10px] text-emerald-700 uppercase font-semibold">Queued / Scheduled</span>
                    <p className="text-lg font-bold text-emerald-900">
                      {submitResult.queuedCount + submitResult.scheduledCount}
                    </p>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="text-[10px] text-gray-500 uppercase font-semibold">Skipped (Duplicate Today)</span>
                    <p className="text-lg font-bold text-gray-700">{submitResult.skippedDuplicateCount}</p>
                  </div>
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                    <span className="text-[10px] text-amber-700 uppercase font-semibold">Skipped (Invalid Phone)</span>
                    <p className="text-lg font-bold text-amber-900">{submitResult.invalidPhoneCount}</p>
                  </div>
                </div>

                <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl text-left text-xs text-blue-900">
                  <p className="font-semibold mb-0.5">Delivery Status</p>
                  <p className="text-[11px] text-blue-700">
                    Track real-time WhatsApp & SMS transmission and webhooks under the Reminder History tab.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Drawer Footer Actions */}
          <div className="p-4 border-t border-[#E6EAF3] bg-white flex items-center justify-between shrink-0">
            {currentStep < 4 ? (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-[#E6EAF3] rounded-xl text-xs font-semibold text-[#5B6478] hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>

                <div className="flex items-center gap-2">
                  {currentStep > 1 && (
                    <button
                      type="button"
                      onClick={() => setCurrentStep((prev) => (prev - 1) as any)}
                      className="px-3.5 py-2 border border-[#E6EAF3] rounded-xl text-xs font-semibold text-[#5B6478] hover:bg-slate-50"
                    >
                      Back
                    </button>
                  )}

                  {currentStep < 3 ? (
                    <button
                      type="button"
                      onClick={() => setCurrentStep(3)}
                      disabled={finalRecipientRows.length === 0}
                      className="flex items-center gap-1.5 px-4 py-2 bg-[#0B7B49] hover:bg-[#096a3e] disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
                    >
                      Next <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleExecuteSend}
                      disabled={isSubmitting || finalRecipientRows.length === 0}
                      className="flex items-center gap-1.5 px-5 py-2 bg-[#0B7B49] hover:bg-[#096a3e] disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
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
              </>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 bg-[#0B7B49] text-white rounded-xl text-xs font-bold hover:bg-[#096a3e] transition-colors"
              >
                Done
              </button>
            )}
          </div>
        </aside>
      </div>

      {/* Filtered Students List Modal */}
      {showFilterListModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/40 backdrop-blur-2xs">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[80vh] flex flex-col shadow-2xl border border-slate-200">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#141A2E]">
                Filtered Students ({filteredStudents.length})
              </h3>
              <button
                type="button"
                onClick={() => setShowFilterListModal(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 flex-1 overflow-y-auto space-y-2">
              {filteredStudents.map((s) => (
                <div key={s.id} className="p-2.5 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold text-[#141A2E]">{s.studentName}</p>
                    <p className="text-[11px] text-[#5B6478]">{s.classSection} • {s.admissionNo} • {s.parentPhone}</p>
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
                onClick={() => setShowFilterListModal(false)}
                className="px-4 py-1.5 bg-[#0B7B49] text-white rounded-xl text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
